import secrets
from datetime import datetime, timezone
import bcrypt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from .database import SessionLocal, User, UserSession, get_db


def hash_password(password: str) -> str:
    """Hash password securely using bcrypt with automatic salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_session(db: Session, user_id: str) -> str:
    """Create a persistent user session token."""
    token = secrets.token_urlsafe(32)
    session = UserSession(token=token, user_id=user_id)
    db.add(session)
    db.commit()
    return token


def invalidate_session(db: Session, token: str) -> bool:
    """Invalidate session token on logout."""
    deleted = db.query(UserSession).filter(UserSession.token == token).delete()
    db.commit()
    return deleted > 0


def get_token_from_header(authorization: str | None = Header(None)) -> str | None:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return authorization


def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Enforce authentication; return authenticated User or 401."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = db.query(UserSession).filter(UserSession.token == token).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
    """Return User if valid token is provided, otherwise None."""
    token = get_token_from_header(authorization)
    if not token:
        return None

    session = db.query(UserSession).filter(UserSession.token == token).first()
    if not session:
        return None

    return db.query(User).filter(User.id == session.user_id).first()
