import pytest
from httpx import AsyncClient
from typing import Dict


@pytest.mark.asyncio
async def test_setup_status_order_agnostic(client: AsyncClient):
    """Make the test robust regardless of prior tests creating settings.

    If no setup exists yet, the API may return null/{}.
    If setup already exists (because another test created it), the API
    returns the current settings object. Accept both cases.
    """
    resp = await client.get("/setup")
    assert resp.status_code == 200
    data = resp.json()

    # Not configured state
    if data in (None, {}):
        return

    # Already configured state: expect a dict with known keys
    assert isinstance(data, dict)
    expected_keys = {"account_mode", "google_maps_api_key", "flagfall", "per_km_rate", "per_minute_rate"}
    assert expected_keys.issubset(set(data.keys())) # type: Ignore


@pytest.mark.asyncio
async def test_setup_complete_and_idempotent_order_agnostic(client: AsyncClient):
    """First POST may be 200/201 or 400 depending on prior state; second must be 400."""
    payload: Dict[str, object] = {
        "admin_email": "admin@example.com",
        "full_name": "Admin User",
        "admin_password": "supersecret",
        "settings": {
            "account_mode": True,
            "google_maps_api_key": "XYZ",
            "flagfall": 10.5,
            "per_km_rate": 2.75,
            "per_minute_rate": 1.1,
        },
    }

    first = await client.post("/setup", json=payload)
    assert first.status_code in (200, 201, 400)

    # Regardless of first result, a second attempt must be rejected as already completed
    second = await client.post("/setup", json=payload)
    assert second.status_code == 400

    # And GET /setup should now return a populated settings object
    get_resp = await client.get("/setup")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert isinstance(data, dict)
    assert data.get("account_mode") is False                # type: ignore
    assert data.get("google_maps_api_key") == 'ABC-123'     # type: ignore
    assert data.get("flagfall") == 12.0                     # type: ignore
    assert data.get("per_km_rate") == 3.0                   # type: ignore
    assert data.get("per_minute_rate") == 1.25              # type: ignore
