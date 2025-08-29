from datetime import datetime, timedelta, timezone

import pytest
from _pytest.monkeypatch import MonkeyPatch
from app.models.settings import AdminConfig
from httpx import AsyncClient
from sqlalchemy import delete

pytestmark = pytest.mark.asyncio


async def test_create_booking_success(
    async_session, client: AsyncClient, monkeypatch: MonkeyPatch
):
    await async_session.merge(
        AdminConfig(
            id=1, account_mode=False, flagfall=5, per_km_rate=2, per_minute_rate=1
        )
    )
    await async_session.commit()

    async def fake_route(*args, **kwargs):
        return 10.0, 15.0

    monkeypatch.setattr("app.services.routing.estimate_route", fake_route)

    class FakeSI:
        client_secret = "sec_test"

    def fake_si(email: str):
        return FakeSI()

    monkeypatch.setattr("app.services.stripe_client.create_setup_intent", fake_si)

    payload = {
        "customer": {"name": "Jane", "email": "jane@example.com", "phone": "123"},
        "pickup_when": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "pickup": {"address": "A", "lat": -27.47, "lng": 153.02},
        "dropoff": {"address": "B", "lat": -27.5, "lng": 153.03},
        "passengers": 2,
        "notes": "hi",
    }
    res = await client.post("/api/v1/bookings", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["booking"]["status"] == "PENDING"
    assert data["stripe"]["setup_intent_client_secret"] == "sec_test"
    await async_session.execute(delete(AdminConfig))
    await async_session.commit()


async def test_create_booking_past_forbidden(async_session, client: AsyncClient):
    await async_session.merge(
        AdminConfig(
            id=1, account_mode=False, flagfall=5, per_km_rate=2, per_minute_rate=1
        )
    )
    await async_session.commit()
    payload = {
        "customer": {"name": "Jane", "email": "jane@example.com"},
        "pickup_when": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        "pickup": {"address": "A", "lat": -27.47, "lng": 153.02},
        "dropoff": {"address": "B", "lat": -27.5, "lng": 153.03},
        "passengers": 2,
    }
    res = await client.post("/api/v1/bookings", json=payload)
    assert res.status_code == 400
    await async_session.execute(delete(AdminConfig))
    await async_session.commit()


async def test_create_booking_route_not_found(
    client: AsyncClient, monkeypatch: MonkeyPatch
):
    async def fake_route(*args, **kwargs):
        raise ValueError("no route found")

    monkeypatch.setattr("app.services.routing.estimate_route", fake_route)

    payload = {
        "customer": {"name": "Jane", "email": "jane@example.com", "phone": "123"},
        "pickup_when": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "pickup": {"address": "A", "lat": -27.47, "lng": 153.02},
        "dropoff": {"address": "B", "lat": -27.5, "lng": 153.03},
        "passengers": 2,
        "notes": "hi",
    }
    res = await client.post("/api/v1/bookings", json=payload)
    assert res.status_code == 400
    assert res.json()["detail"] == "no route found"
