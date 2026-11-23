import json
from typing import Any, Dict, Optional
from uuid import UUID
from app.db.connection import get_db_cursor
from app.utils.logger import logger

def log_audit_event(
    action: str,
    entity_type: str,
    user_id: Optional[UUID] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> None:
    """
    Records an administrative or security event into the audit_logs table.
    Fails safely without interrupting the primary transaction.
    """
    try:
        details_json = json.dumps(details or {})
        with get_db_cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_logs 
                (user_id, action, entity_type, entity_id, details, ip_address)
                VALUES (%s, %s, %s, %s, %s::jsonb, %s);
                """,
                (user_id, action, entity_type, entity_id, details_json, ip_address)
            )
        logger.info(f"Audit log recorded: Action='{action}', Entity='{entity_type}:{entity_id}'")
    except Exception as e:
        logger.error(f"Failed to record audit log event: {e}")

