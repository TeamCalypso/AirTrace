import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from app.aqi import category_for, pm25_to_aqi  # noqa: E402
from app.main import app  # noqa: E402
from app.neighborhoods import all_neighborhoods  # noqa: E402
from app.providers.mock import MockProvider  # noqa: E402
from app.stores import memory  # noqa: E402
import app.stores as stores  # noqa: E402

GOLDEN = json.loads(
    (Path(__file__).parent / "fixtures" / "forecast_golden.json").read_text()
)


@pytest.fixture()
def client():
    stores._store = memory.MemoryAlertStore()
    return TestClient(app)


@pytest.mark.parametrize("nb", all_neighborhoods(), ids=lambda n: n["id"])
def test_mock_pm25_matches_web_app_engine(nb):
    """PM2.5 is scale independent, so it must match the web app's engine exactly."""
    want = GOLDEN[nb["id"]]
    got = MockProvider().build(nb)
    assert got["seedHex"] == want["seedHex"]
    assert [p["pm"] for p in got["points"]] == want["pm"]
    assert got["confidence"] == want["confidence"]


@pytest.mark.parametrize(
    "pm,aqi,name",
    [
        (0, 0, "Good"),
        (30, 50, "Good"),
        (30.5, 51, "Satisfactory"),
        (60, 100, "Satisfactory"),
        (90, 200, "Moderate"),
        (120, 300, "Poor"),
        (250, 400, "Very Poor"),
        (380, 500, "Severe"),
        (900, 500, "Severe"),
    ],
)
def test_naqi_breakpoints(pm, aqi, name):
    assert pm25_to_aqi(pm) == aqi
    assert category_for(aqi)["name"] == name


def test_forecast_is_internally_consistent():
    nb = all_neighborhoods()[0]
    f = MockProvider().build(nb)
    assert f["scale"].startswith("India NAQI")
    for p in f["points"]:
        # AQI derives from unrounded PM2.5; the displayed value is rounded to 0.1.
        assert pm25_to_aqi(p["pm"] - 0.05) <= p["aqi"] <= pm25_to_aqi(p["pm"] + 0.05)
        assert p["category"] == category_for(p["aqi"])
    assert f["peak"]["aqi"] == max(p["aqi"] for p in f["points"])


@pytest.mark.parametrize("prefix", ["/api", "/v1"])
def test_health(client, prefix):
    r = client.get(f"{prefix}/health")
    assert r.status_code == 200 and r.json()["ok"] is True


def test_search_quick_picks_and_query(client):
    r = client.get("/api/search")
    assert r.status_code == 200 and len(r.json()["results"]) == 6
    r = client.get("/api/search", params={"q": "dwar"})
    assert [x["id"] for x in r.json()["results"]] == ["dwarka"]
    assert client.get("/api/search", params={"q": "x" * 61}).status_code == 400


def test_forecast_by_id_name_and_unknown(client):
    r = client.get("/api/forecast", params={"id": "dwarka"})
    data = r.json()["data"]
    assert len(data["points"]) == 48 and data["neighborhood"]["id"] == "dwarka"
    assert client.get("/api/forecast", params={"name": "Karol Bagh"}).status_code == 200
    r = client.get("/api/forecast", params={"id": "atlantis"})
    assert r.status_code == 400 and "error" in r.json()


def _alert(**over):
    body = {
        "email": "A@Example.com",
        "neighborhoodId": "dwarka",
        "neighborhoodName": "Dwarka",
        "threshold": 150,
    }
    body.update(over)
    return body


def test_alert_create_then_idempotent(client):
    r = client.post("/api/alerts", json=_alert())
    assert r.status_code == 201
    assert r.json()["created"] is True and r.json()["email"] == "a@example.com"
    r = client.post("/api/alerts", json=_alert(email="a@example.com"))
    assert r.status_code == 200 and r.json()["created"] is False


@pytest.mark.parametrize(
    "over",
    [
        {"email": "nope"},
        {"neighborhoodId": ""},
        {"threshold": 10},
        {"threshold": 501},
        {"threshold": 150.5},
        {"threshold": True},
        {"threshold": "150"},
        {"neighborhoodId": "atlantis"},
    ],
)
def test_alert_validation(client, over):
    r = client.post("/api/alerts", json=_alert(**over))
    assert r.status_code == 400 and r.json()["ok"] is False


def test_alert_bad_json(client):
    r = client.post("/api/alerts", content=b"not json", headers={"Content-Type": "application/json"})
    assert r.status_code == 400 and r.json()["ok"] is False
