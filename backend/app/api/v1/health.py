from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint.
    Performs an actual database connectivity test using 'SELECT 1'.
    Distinguishes overall application health from database status.
    """
    db_status = "disconnected"
    overall_status = "degraded"

    try:
        # Execute lightweight ping query
        result = db.execute(text("SELECT 1")).scalar()
        if result == 1:
            db_status = "connected"
            overall_status = "healthy"
    except Exception:
        db_status = "disconnected"
        overall_status = "degraded"

    return {
        "success": True,
        "data": {
            "status": overall_status,
            "database": db_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
