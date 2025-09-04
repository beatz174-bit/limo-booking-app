import pytest

from app.core.security import hash_password
from app.models.user_v2 import User
from app.services import stripe_client
from app.services.user_service import save_payment_method


def test_create_setup_intent_enables_automatic_payment_methods(mocker):
    captured: dict = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return stripe_client._StubIntent(client_secret="sec")

    mocker.patch.object(stripe_client.stripe.SetupIntent, "create", fake_create)

    stripe_client.create_setup_intent("cus_test", "booking")

    assert captured["automatic_payment_methods"] == {"enabled": True}
    assert "payment_method_types" not in captured


@pytest.mark.asyncio
async def test_save_payment_method_stores_id(async_session, mocker):
    user = User(
        email="u@example.com",
        full_name="User",
        hashed_password=hash_password("pass"),
    )
    async_session.add(user)
    await async_session.flush()

    mock_set_default = mocker.patch(
        "app.services.stripe_client.set_default_payment_method"
    )

    await save_payment_method(async_session, user, "pm_gpay")

    mock_set_default.assert_called_once_with("cus_test", "pm_gpay")
    assert user.stripe_payment_method_id == "pm_gpay"
