import re
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..neighborhoods import find_neighborhood, search_neighborhoods
from ..providers import get_provider
from ..stores import get_store

router = APIRouter()

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


def _err(message: str, status: int = 400, ok_flag: bool = False, key: str = "error"):
    body = {key: message}
    if ok_flag:
        body = {"ok": False, **body}
    return JSONResponse(body, status_code=status)


@router.get("/health")
def health():
    return {
        "ok": True,
        "service": "airtrace-api",
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/search")
def search(q: str = ""):
    q = q.strip()
    if len(q) > 60:
        return _err("Query too long.")
    results = [
        {k: n[k] for k in ("id", "name", "zone", "lat", "lng")}
        for n in search_neighborhoods(q)
    ]
    return {"demo": True, "results": results}


@router.get("/forecast")
def forecast(id: str | None = None, name: str | None = None):
    nb = find_neighborhood(id if id is not None else (name or ""))
    if not nb:
        return _err(
            "Location not found in the illustrative Delhi–NCR dataset. "
            "Try one of the quick picks."
        )
    return {"data": get_provider().build(nb)}


def _validate_alert(body) -> tuple[dict | None, str | None]:
    if not isinstance(body, dict):
        return None, "Request body must be a JSON object."

    raw_email = body.get("email")
    email = raw_email.strip() if isinstance(raw_email, str) else ""
    if not email:
        return None, "Email is required."
    if len(email) > 254:
        return None, "Email is too long."
    if not EMAIL_RE.match(email):
        return None, "Enter a valid email address."

    raw_id = body.get("neighborhoodId")
    nb_id = raw_id.strip() if isinstance(raw_id, str) else ""
    if not nb_id or len(nb_id) > 64:
        return None, "A valid neighborhood id is required."

    raw_name = body.get("neighborhoodName")
    nb_name = raw_name.strip()[:64] if isinstance(raw_name, str) else nb_id

    threshold = body.get("threshold")
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)):
        return None, "Threshold must be an integer AQI value."
    if isinstance(threshold, float) and not threshold.is_integer():
        return None, "Threshold must be an integer AQI value."
    threshold = int(threshold)
    if threshold < 51 or threshold > 500:
        return None, "Threshold must be between 51 and 500."

    return {
        "email": email.lower(),
        "neighborhood_id": nb_id,
        "neighborhood_name": nb_name,
        "threshold": threshold,
    }, None


@router.post("/alerts")
async def alerts(request: Request):
    try:
        body = await request.json()
    except Exception:
        return _err("Request body must be a JSON object.", ok_flag=True)

    data, error = _validate_alert(body)
    if error:
        return _err(error, ok_flag=True)

    nb = find_neighborhood(data["neighborhood_id"])
    if not nb:
        return _err("Unknown neighborhood id.", ok_flag=True)

    created = get_store().add(
        data["email"], nb["id"], nb["name"], data["threshold"]
    )
    payload = {
        "ok": True,
        "created": created,
        "email": data["email"],
        "neighborhood": nb["name"],
        "threshold": data["threshold"],
        "message": (
            f"You're on the list for {nb['name']} at AQI ≥ {data['threshold']}."
            if created
            else f"You're already set up for {nb['name']} at AQI ≥ {data['threshold']}."
        ),
        "note": "Subscription saved.",
    }
    return JSONResponse(payload, status_code=201 if created else 200)
