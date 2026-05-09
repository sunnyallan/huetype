import os
from supabase import create_client

_SUPABASE_URL = os.environ["SUPABASE_URL"]
_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

_storage = create_client(_SUPABASE_URL, _SERVICE_KEY).storage

SVG_BUCKET = "svgs"
FONT_BUCKET = "fonts"


def upload_svg(storage_path: str, file_bytes: bytes) -> None:
    _storage.from_(SVG_BUCKET).upload(
        storage_path,
        file_bytes,
        {"content-type": "image/svg+xml", "upsert": "true"},
    )


def upload_font(storage_path: str, file_bytes: bytes, content_type: str = "font/woff2") -> None:
    _storage.from_(FONT_BUCKET).upload(
        storage_path,
        file_bytes,
        {"content-type": content_type, "upsert": "true"},
    )


def download_file(bucket: str, storage_path: str) -> bytes:
    return _storage.from_(bucket).download(storage_path)


def get_signed_url(bucket: str, storage_path: str, expires_in: int = 3600) -> str:
    result = _storage.from_(bucket).create_signed_url(storage_path, expires_in)
    return result["signedURL"]


def delete_files(bucket: str, paths: list[str]) -> None:
    if paths:
        _storage.from_(bucket).remove(paths)


def list_files(bucket: str, prefix: str) -> list[str]:
    """Returns storage paths of all files under a prefix folder."""
    try:
        items = _storage.from_(bucket).list(prefix)
        return [f"{prefix}/{item['name']}" for item in items if item.get("name")]
    except Exception:
        return []
