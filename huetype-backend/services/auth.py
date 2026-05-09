import os
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_security = HTTPBearer()

_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

# Lazily initialised — one client reused across requests
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not _SUPABASE_URL:
            raise HTTPException(status_code=500, detail="SUPABASE_URL not configured")
        _jwks_client = PyJWKClient(f"{_SUPABASE_URL}/auth/v1/.well-known/jwks.json")
    return _jwks_client


def verify_token(credentials: HTTPAuthorizationCredentials = Security(_security)) -> str:
    """Validates a Supabase-issued JWT (ES256 or HS256) and returns the user's UUID."""
    token = credentials.credentials

    # Detect algorithm from header so we handle both ES256 (new) and HS256 (legacy)
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    alg = header.get("alg", "")

    try:
        if alg == "HS256":
            if not _JWT_SECRET:
                raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
            payload = jwt.decode(
                token,
                _JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub claim")
    return user_id
