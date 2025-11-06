import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session as DBSession
from fastapi import HTTPException, status
from app.models.session import Session

SESSION_EXPIRY_HOURS = 24

def create_session(db: DBSession, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=SESSION_EXPIRY_HOURS)

    session = Session(
        user_id=user_id,
        session_token=token,
        expires_at=expires
    )
    db.add(session)
    db.commit()
    return token


def get_user_by_session(db: DBSession, token: str):
    session = db.query(Session).filter(Session.session_token == token).first()

    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    return session.user


def delete_session(db: DBSession, token: str):
    db.query(Session).filter(Session.session_token == token).delete()
    db.commit()
