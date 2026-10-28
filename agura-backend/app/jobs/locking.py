"""Advisory locks that are actually released when the work finishes.

A PostgreSQL session advisory lock lives as long as its *connection*. SQLAlchemy's
`Session.close()` only returns the connection to the pool, so a lock taken through
a pooled session survives the close. The next attempt then either re-acquires it
by luck (the pool hands back the same connection, and advisory locks are reentrant)
or silently fails (a different connection), and a survey job that should run simply
never starts.

These helpers take the lock on a dedicated connection from a NullPool engine, which
is closed for real, so the lock is released exactly when the holder is done.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.pool import NullPool

from app.config import get_settings

logger = logging.getLogger("agura.jobs.locking")

# Any integer namespace, kept away from the reminder scheduler's key.
JOB_LOCK_NAMESPACE = 4_200_000_000

_engine: Engine | None = None


def _lock_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(get_settings().database_url, poolclass=NullPool, future=True)
    return _engine


def job_lock_key(job_id: uuid.UUID) -> int:
    """A stable key per job, within PostgreSQL's signed 64 bit advisory range."""
    return JOB_LOCK_NAMESPACE + (job_id.int % 1_000_000)


@contextmanager
def try_job_lock(job_id: uuid.UUID) -> Iterator[bool]:
    """Yield True when this process owns the job, False when someone else does."""
    key = job_lock_key(job_id)
    connection: Connection = _lock_engine().connect()
    acquired = False
    try:
        acquired = bool(
            connection.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": key}).scalar()
        )
        yield acquired
    finally:
        try:
            if acquired:
                connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": key})
                connection.commit()
        except Exception:  # noqa: BLE001 - the close below is the real guarantee
            logger.debug("Advisory unlock failed, closing the connection instead", exc_info=True)
        finally:
            # Closing a NullPool connection ends the database session, which drops
            # any advisory lock still held on it.
            connection.close()


def reset_lock_engine() -> None:
    """Dispose the lock engine, used by tests that change the database URL."""
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None


__all__ = ["job_lock_key", "reset_lock_engine", "try_job_lock"]
