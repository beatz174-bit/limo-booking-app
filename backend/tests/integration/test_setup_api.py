import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict

@pytest.mark.asyncio
async def test_setup_status_initial(client: AsyncClient):
    # No setup yet -> service returns None -> JSON null (or {} depending on serialization)
    resp = await client.get("/setup")
    assert resp.status_code == 200
    assert resp.json() in (None, {})

@pytest.mark.asyncio
async def test_setup_complete_and_idempotent(client: AsyncClient, async_session: AsyncSession):
    payload: Dict[str, object] = {
        "admin_email": "admin@example.com",
        "full_name": "Admin User",
        "admin_password": "supersecret",
        "settings": {
            "account_mode": "open",
            "google_maps_api_key": "XYZ",
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1
        }
    }
    # First run succeeds
    resp = await client.post("/setup", json=payload)
    assert resp.status_code == 200, resp.text
    assert resp.json().get("message") == "Setup complete"

    # Status now returns a config object
    resp2 = await client.get("/setup")
    assert resp2.status_code == 200
    data = resp2.json()
    assert isinstance(data, dict)
    assert data["allow_public_registration"] is True
    assert data["google_maps_api_key"] == "XYZ"
    assert data["flagfall"] == 10.5
    assert data["per_km_rate"] == 2.75
    assert data["per_min_rate"] == 1.1

    # Second run should be rejected
    resp3 = await client.post("/setup", json=payload)
    assert resp3.status_code == 400
    assert resp3.json()["detail"] in ("Setup already completed.", "Setup already completed")
