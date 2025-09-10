from types import SimpleNamespace

import httpx
import pytest
from _pytest.monkeypatch import MonkeyPatch
from app.models.notification import NotificationType
from app.models.user_v2 import UserRole
from app.services.notifications import _send_onesignal, notification_map


@pytest.mark.asyncio
async def test_send_onesignal_uses_async_client(monkeypatch: MonkeyPatch):
    dummy_settings = SimpleNamespace(
        onesignal_app_id="aid",
        onesignal_api_key="key",
    )
    monkeypatch.setattr(
        "app.services.notifications.get_settings", lambda: dummy_settings
    )

    class Response:
        def __init__(self, status_code=200, data=None):
            self.status_code = status_code
            self._data = data or {}

        def json(self):
            return self._data

        def raise_for_status(self):
            if self.status_code >= 400:
                raise httpx.HTTPStatusError("error", request=None, response=None)

    class DummyClient:
        def __init__(self, *args, **kwargs):
            self.calls = []

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def post(self, url, **kwargs):
            self.calls.append((url, kwargs))
            return Response(200)

    dummy_client = DummyClient()
    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: dummy_client)

    class DummyResult:
        def scalars(self):
            class _Scalar:
                def all(self):
                    return ["tok"]

            return _Scalar()

    class DummyDB:
        async def execute(self, *args, **kwargs):
            return DummyResult()

    await _send_onesignal(
        DummyDB(), UserRole.DRIVER, NotificationType.ON_THE_WAY, {"foo": "bar"}
    )

    assert len(dummy_client.calls) == 1
    url, kwargs = dummy_client.calls[0]
    assert "onesignal.com/api/v1/notifications" in url
    assert kwargs["headers"]["Authorization"] == "Basic key"
    assert kwargs["json"]["include_player_ids"] == ["tok"]
    notif = kwargs["json"]["headings"]
    assert notif == {"en": notification_map[NotificationType.ON_THE_WAY]["headings"]}
    assert all(isinstance(v, str) for v in kwargs["json"]["data"].values())
