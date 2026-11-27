import os
from pathlib import Path
import psycopg
from app.core.config import settings
from app.core.security import hash_password
from app.utils.logger import logger

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"

def run_migrations():
    """Executes all pending SQL migrations against PostgreSQL."""
    logger.info(f"Connecting to PostgreSQL for migration runner: {settings.DATABASE_URL.split('@')[-1]}")
    
    with psycopg.connect(settings.DATABASE_URL, autocommit=True, connect_timeout=15) as conn:
        with conn.cursor() as cur:
            # 1. Ensure migrations tracking table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    migration_name VARCHAR(255) UNIQUE NOT NULL,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)

            # 2. Fetch applied migrations
            cur.execute("SELECT migration_name FROM schema_migrations;")
            applied_migrations = {row[0] for row in cur.fetchall()}

            # 3. Read migration files sorted by name
            migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
            if not migration_files:
                logger.warning(f"No SQL migration files found in {MIGRATIONS_DIR}")

            for mig_file in migration_files:
                mig_name = mig_file.name
                if mig_name in applied_migrations:
                    logger.info(f"Migration already applied: {mig_name}")
                    continue

                logger.info(f"Applying migration: {mig_name}...")
                sql_content = mig_file.read_text(encoding="utf-8")
                
                # Execute migration
                cur.execute(sql_content)

                # Record migration
                cur.execute(
                    "INSERT INTO schema_migrations (migration_name) VALUES (%s);",
                    (mig_name,)
                )
                logger.info(f"Successfully applied migration: {mig_name}")

            # 4. Seed initial default admin if none exists
            seed_initial_admin(cur)

    logger.info("Database migration check completed successfully.")

def seed_initial_admin(cur: psycopg.Cursor):
    """Seeds the initial administrator account if no admin currently exists."""
    cur.execute("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1;")
    admin = cur.fetchone()
    if admin:
        logger.info(f"Admin account already present in database ({admin[1]}). Skipping seed.")
        return

    logger.info(f"Seeding default administrator account ({settings.INITIAL_ADMIN_EMAIL})...")
    hashed_pwd = hash_password(settings.INITIAL_ADMIN_PASSWORD)
    cur.execute("""
        INSERT INTO users (email, full_name, password_hash, role, is_active)
        VALUES (%s, %s, %s, 'admin', TRUE)
        ON CONFLICT (email) DO UPDATE 
        SET role = 'admin', password_hash = EXCLUDED.password_hash;
    """, (
        settings.INITIAL_ADMIN_EMAIL,
        settings.INITIAL_ADMIN_NAME,
        hashed_pwd
    ))
    logger.info("Default administrator account successfully created and verified.")

if __name__ == "__main__":
    run_migrations()

