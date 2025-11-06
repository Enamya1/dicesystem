from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User

SESSION_COOKIE_NAME = "session_user_id"


def create_session(response, user_id: int):
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=str(user_id),
        httponly=True,
        secure=False,     
        samesite="lax",
        max_age=60*60*24   
    )


def destroy_session(response):
    response.delete_cookie(SESSION_COOKIE_NAME)


def get_current_user(request: Request, db: Session) -> User:
    user_id = request.cookies.get(SESSION_COOKIE_NAME)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    return user
