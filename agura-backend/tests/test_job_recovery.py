"""Interrupted survey jobs must be picked up again, not stranded forever."""

from __future__ import annotations

import uuid

from sqlalchemy import text

from app.jobs import recovery
from app.models.enums import JobStage, JobStatus, SurveyStatus
from app.models.survey import Survey, SurveyJob


def make_survey(db, **overrides) -> Survey:
    survey = Survey(
        name="Recovery probe",
        year=2022,
        original_filename="r.dta",
        stored_path="r/r.dta",
        file_size_bytes=1,
        checksum_sha256="c" * 64,
        status=SurveyStatus.PROCESSING.value,
    )
    for key, value in overrides.items():
        setattr(survey, key, value)
    db.add(survey)
    db.commit()
    db.refresh(survey)
    return survey


def make_job(
    db, survey: Survey, status: JobStatus, stage: JobStage = JobStage.CLEANED
) -> SurveyJob:
    job = SurveyJob(survey_id=survey.id, status=status, stage=stage, progress_percent=75)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def test_a_running_job_left_by_a_dead_process_is_requeued(db):
    survey = make_survey(db)
    job = make_job(db, survey, JobStatus.RUNNING)

    requeued = recovery.requeue_orphaned_jobs(db)

    assert job.id in requeued
    db.refresh(job)
    assert job.status == JobStatus.QUEUED
    # The stage is kept so the pipeline resumes rather than restarts.
    assert job.stage == JobStage.CLEANED


def test_a_job_that_was_never_started_is_requeued(db):
    survey = make_survey(db)
    job = make_job(db, survey, JobStatus.QUEUED, stage=JobStage.RECEIVED)

    requeued = recovery.requeue_orphaned_jobs(db)

    assert job.id in requeued
    db.refresh(job)
    assert job.status == JobStatus.QUEUED


def test_a_job_waiting_for_the_mapping_is_not_touched(db):
    """Waiting for a person is not the same as being stuck."""
    survey = make_survey(db)
    job = make_job(db, survey, JobStatus.AWAITING_MAPPING, stage=JobStage.MAPPED)

    assert recovery.requeue_orphaned_jobs(db) == []
    db.refresh(job)
    assert job.status == JobStatus.AWAITING_MAPPING


def test_completed_and_failed_jobs_are_not_requeued(db):
    survey = make_survey(db)
    done = make_job(db, survey, JobStatus.COMPLETED, stage=JobStage.COMPLETED)
    failed = make_job(db, survey, JobStatus.FAILED)

    assert recovery.requeue_orphaned_jobs(db) == []
    db.refresh(done)
    db.refresh(failed)
    assert done.status == JobStatus.COMPLETED
    assert failed.status == JobStatus.FAILED


def test_jobs_of_a_deleted_survey_are_not_requeued(db):
    """Rolling back an upload must not resurrect its job."""
    survey = make_survey(db, status=SurveyStatus.DELETED.value)
    job = make_job(db, survey, JobStatus.RUNNING)

    assert recovery.requeue_orphaned_jobs(db) == []
    db.refresh(job)
    assert job.status == JobStatus.RUNNING


def test_recovery_records_why_it_resumed(db):
    survey = make_survey(db)
    job = make_job(db, survey, JobStatus.RUNNING)

    recovery.requeue_orphaned_jobs(db)

    events = db.execute(
        text(
            "SELECT type, payload FROM job_events WHERE job_id = :job "
            "ORDER BY created_at DESC LIMIT 1"
        ),
        {"job": str(job.id)},
    ).one()
    db.rollback()
    assert events.type == "job.requeued"
    assert events.payload["reason"] == "interrupted"
    assert events.payload["previous_status"] == "running"


def test_recovery_is_idempotent(db):
    survey = make_survey(db)
    make_job(db, survey, JobStatus.RUNNING)

    first = recovery.requeue_orphaned_jobs(db)
    db.commit()
    # The requeued job is still queued and no process claimed it yet, so a second
    # pass must not duplicate the work or the event history grows without limit.
    second = recovery.requeue_orphaned_jobs(db)
    assert len(first) == 1
    assert second == first


def test_the_job_lock_is_released_when_the_work_finishes(db):
    """A leaked advisory lock makes the next attempt to run a job do nothing.

    Regression: the lock was taken on a pooled session, whose close() only returns
    the connection to the pool. Running the same job again then either re-entered
    by luck or silently skipped, so an upload could stall with no explanation.
    """
    from sqlalchemy import text

    from app.jobs import locking

    job_id = uuid.uuid4()

    with locking.try_job_lock(job_id) as first:
        assert first is True
        held = db.execute(
            text("SELECT count(*) FROM pg_locks WHERE locktype = 'advisory'")
        ).scalar()
        db.rollback()
        assert held and held > 0

    # After the context manager exits the lock must be gone.
    db.rollback()
    remaining = db.execute(
        text("SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND objid = :key"),
        {"key": locking.job_lock_key(job_id) % 2**32},
    ).scalar()
    db.rollback()
    assert remaining == 0

    # And the same job can be locked again straight away.
    with locking.try_job_lock(job_id) as second:
        assert second is True


def test_two_holders_cannot_own_the_same_job_at_once(db):
    from app.jobs import locking

    job_id = uuid.uuid4()
    with locking.try_job_lock(job_id) as outer:
        assert outer is True
        with locking.try_job_lock(job_id) as inner:
            assert inner is False


def test_different_jobs_do_not_block_each_other(db):
    from app.jobs import locking

    with locking.try_job_lock(uuid.uuid4()) as first:
        assert first is True
        with locking.try_job_lock(uuid.uuid4()) as second:
            assert second is True
