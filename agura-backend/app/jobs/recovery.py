"""Recover survey jobs that no process is working on any more.

A job runs in a thread of the web process, or in the standalone worker. Either
way, when the process dies (a code reload, a restart, an out of memory kill) the
job row is left behind and nothing ever looks at it again: `queued` never starts,
`running` never finishes, and the data never lands in the database.

This module runs once at startup and puts those jobs back on the queue. It is
safe to run while another instance is alive, because `run_job` takes a per job
PostgreSQL advisory lock and returns immediately if the job is already in hand.
"""

from __future__ import annotations

import logging
import threading
import uuid

from sqlalchemy import select

from app.models.enums import JobStatus, SurveyStatus
from app.models.survey import JobEvent, Survey, SurveyJob

logger = logging.getLogger("agura.jobs.recovery")

# Statuses that mean "this job was in flight and its process is gone". A job
# waiting for the admin to confirm the mapping is deliberately not included: it
# is not stuck, it is waiting for a person.
ORPHANED_STATUSES = (JobStatus.QUEUED, JobStatus.RUNNING)


def find_orphaned_job_ids(db) -> list[uuid.UUID]:
    """Jobs left in flight by a process that is no longer running."""
    rows = db.scalars(
        select(SurveyJob.id)
        .join(Survey, Survey.id == SurveyJob.survey_id)
        .where(
            SurveyJob.status.in_([status.value for status in ORPHANED_STATUSES]),
            Survey.deleted_at.is_(None),
            Survey.status != SurveyStatus.DELETED.value,
        )
        .order_by(SurveyJob.created_at)
    )
    return list(rows)


def requeue_orphaned_jobs(db) -> list[uuid.UUID]:
    """Reset interrupted jobs to queued and record why. Returns the job ids."""
    job_ids = find_orphaned_job_ids(db)
    if not job_ids:
        return []

    for job_id in job_ids:
        job = db.get(SurveyJob, job_id)
        if job is None:
            continue
        was_running = job.status == JobStatus.RUNNING
        previous_status = job.status.value
        job.status = JobStatus.QUEUED
        job.error_code = None
        job.error_message = None
        job.error_translation_key = None
        job.error_stage = None
        if was_running:
            # The stage is kept on purpose: the pipeline resumes from it rather
            # than redoing work that already succeeded.
            job.finished_at = None
        db.add(
            JobEvent(
                job_id=job.id,
                survey_id=job.survey_id,
                type="job.requeued",
                stage=job.stage.value,
                payload={
                    "reason": "interrupted" if was_running else "never_started",
                    "previous_status": previous_status,
                    "resumed_from_stage": job.stage.value,
                },
            )
        )
    db.commit()
    logger.info("Requeued %s interrupted survey job(s)", len(job_ids))
    return job_ids


def recover_in_background() -> None:
    """Run recovery on a daemon thread so application startup is not delayed.

    The recovery itself is cheap, but each requeued job can then take minutes, and
    that work belongs on the job pool rather than in front of the HTTP listener.
    """
    thread = threading.Thread(target=_recover_and_submit, name="agura-job-recovery", daemon=True)
    thread.start()


def _recover_and_submit() -> None:
    from app.db import get_session_factory
    from app.jobs import queue

    session = get_session_factory()()
    try:
        job_ids = requeue_orphaned_jobs(session)
    except Exception:  # noqa: BLE001 - recovery must never stop the API booting
        logger.exception("Survey job recovery failed")
        return
    finally:
        session.close()

    for job_id in job_ids:
        try:
            queue.submit_job(job_id)
        except Exception:  # noqa: BLE001 - one bad job must not block the others
            logger.exception("Could not resubmit job %s", job_id)


__all__ = [
    "find_orphaned_job_ids",
    "recover_in_background",
    "requeue_orphaned_jobs",
]
