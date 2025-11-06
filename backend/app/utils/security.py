from passlib.context import CryptContext
import bcrypt

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MAX_BCRYPT_LENGTH = 72


def hash_password(password: str) -> str:
    if not isinstance(password, str):
        password = str(password)
    password = password[:MAX_BCRYPT_LENGTH]

    try:
        return pwd_context.hash(password)
    except ValueError:
    
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not isinstance(plain_password, str):
        plain_password = str(plain_password)
    plain_password = plain_password[:MAX_BCRYPT_LENGTH]

    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # fallback verify using bcrypt directly
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
