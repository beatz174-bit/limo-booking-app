from types import SimpleNamespace

import httpx
import pytest
from _pytest.monkeypatch import MonkeyPatch
from jose import jwt

from app.models.notification import NotificationType
from app.models.user_v2 import UserRole
from app.services.notifications import _send_fcm


@pytest.mark.asyncio
async def test_send_fcm_uses_async_client(monkeypatch: MonkeyPatch):
    dummy_settings = SimpleNamespace(
        fcm_project_id="pid",
        fcm_client_email="email@example.com",
        fcm_private_key="key",
    )
    monkeypatch.setattr(
        "app.services.notifications.get_settings", lambda: dummy_settings
    )
    monkeypatch.setattr(jwt, "encode", lambda *args, **kwargs: "assertion")

    class Response:
        def __init__(self, status_code=200, data=None):
            self.status_code = status_code
            self._data = data or {}

        def json(self):
            return self._data

    class DummyClient:
        def __init__(self, *args, **kwargs):
            self.calls = []

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def post(self, url, **kwargs):
            self.calls.append((url, kwargs))
            if "oauth2.googleapis.com/token" in url:
                return Response(200, {"access_token": "abc"})
            return Response(200)

    dummy_client = DummyClient()
    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: dummy_client)

    await _send_fcm(UserRole.DRIVER, NotificationType.ON_THE_WAY, {"foo": "bar"})

    assert len(dummy_client.calls) == 2
    token_call = dummy_client.calls[0]
    msg_call = dummy_client.calls[1]
    assert "oauth2.googleapis.com/token" in token_call[0]
    assert msg_call[1]["headers"]["Authorization"] == "Bearer abc"
