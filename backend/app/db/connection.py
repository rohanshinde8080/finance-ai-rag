from contextlib import contextmanager
from typing import Generator, Optional
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from pgvector.psycopg import register_vector
from app.core.config import settings
from app.utils.logger import logger

_db_pool: Optional[ConnectionPool] = None

def _configure_connection(conn: psycopg.Connection) -> None:
    """Configures each connection in the pool with pgvector support."""
    try:
        register_vector(conn)
    except Exception as e:
        logger.warning(f"pgvector registration deferred: {e}")

def init_db_pool() -> ConnectionPool:
    """Initializes the global psycopg connection pool with pgvector support."""
    global _db_pool
    if _db_pool is None:
        try:
            logger.info("Initializing PostgreSQL connection pool...")
            _db_pool = ConnectionPool(
                conninfo=settings.DATABASE_URL,
                min_size=settings.DB_MIN_CONNECTIONS,
                max_size=settings.DB_MAX_CONNECTIONS,
                timeout=settings.DB_TIMEOUT_SECONDS,
                kwargs={"connect_timeout": 3},
                open=True,
                configure=_configure_connection
            )
            logger.info("PostgreSQL connection pool initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL pool: {e}")
            raise
    return _db_pool

def close_db_pool() -> None:
    """Closes all connections in the pool."""
    global _db_pool
    if _db_pool is not None:
        try:
            logger.info("Closing PostgreSQL connection pool...")
            _db_pool.close()
            _db_pool = None
            logger.info("PostgreSQL connection pool closed.")
        except Exception as e:
            logger.error(f"Error closing PostgreSQL connection pool: {e}")

def get_pool() -> ConnectionPool:
    """Returns the active database pool, initializing if necessary."""
    global _db_pool
    if _db_pool is None:
        return init_db_pool()
    return _db_pool

@contextmanager
def get_db_connection() -> Generator[psycopg.Connection, None, None]:
    """Context manager to yield a pooled PostgreSQL connection."""
    pool = get_pool()
    with pool.connection() as conn:
        conn.row_factory = dict_row
        yield conn

@contextmanager
def get_db_cursor() -> Generator[psycopg.Cursor, None, None]:
    """Context manager to yield an auto-committing database cursor."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            yield cursor

def check_db_health() -> bool:
    """Performs a lightweight health check on the database."""
    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT 1 AS alive;")
            res = cur.fetchone()
            return res is not None and res.get("alive") == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
