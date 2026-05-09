import os
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_security = HTTPBearer()

# Found in: Supabase Dashboard → Project Settings → API → JWT Secret
_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Security(_security)) -> str:
    """Validates a Supabase-issued JWT and returns the user's UUID (sub claim)."""
    if not _JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    try:
        payload = jwt.decode(
            credentials.credentials,
            _JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id: str = payload.get("sub", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub claim")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
