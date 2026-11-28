import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.db.connection import get_db_cursor
from app.core.config import settings

def list_users():
    db_host = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "configured database"
    print("=" * 80)
    print(f"Connecting to: {db_host}")
    print("=" * 80)

    try:
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT id, email, full_name, role, is_active, gender, mobile_number, created_at
                FROM users
                ORDER BY created_at DESC;
            """)
            users = cur.fetchall()

            if not users:
                print("No users found in database.")
                return

            print(f"\nTotal Registered Users: {len(users)}\n")
            print(f"{'EMAIL':<30} | {'NAME':<20} | {'ROLE':<8} | {'ACTIVE':<6} | {'CREATED AT'}")
            print("-" * 80)
            for u in users:
                created = u['created_at'].strftime("%Y-%m-%d %H:%M") if u.get('created_at') else "-"
                print(f"{u['email']:<30} | {(u['full_name'] or '-'):<20} | {u['role']:<8} | {str(u['is_active']):<6} | {created}")
            print("=" * 80)
    except Exception as e:
        print(f"Error fetching users: {e}")

if __name__ == "__main__":
    list_users()
