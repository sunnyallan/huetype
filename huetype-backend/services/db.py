import os
from supabase import create_client, Client

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Single service-role client shared across the process (bypasses RLS for backend writes)
db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Tier limits — enforced server-side; -1 means unlimited
TIER_LIMITS: dict = {
    "free": {
        "projects": 3,
        "glyphs": 20,
        "layers": 5,
        "formats": ["glyf_colr_1"],
    },
    "pro": {
        "projects": -1,
        "glyphs": 100,
        "layers": 8,
        "formats": ["glyf_colr_1", "glyf_colr_0"],
    },
    "studio": {
        "projects": -1,
        "glyphs": -1,
        "layers": 8,
        "formats": ["glyf_colr_1", "glyf_colr_0", "glyf_colr_1_and_colr_0"],
    },
}


def get_user_tier(user_id: str) -> str:
    result = (
        db.table("profiles")
        .select("subscription_tier")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if result.data:
        return result.data.get("subscription_tier", "free")
    return "free"


def get_tier_limits(user_id: str) -> dict:
    return TIER_LIMITS[get_user_tier(user_id)]
