import uuid

import pytest

from app.core.security import hash_password
from app.models.user_v2 import User
from app.services import stripe_client
from app.services.user_service import save_payment_method


def test_create_setup_intent_sets_payment_method_type(mocker):
    captured: dict = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return stripe_client._StubIntent(client_secret="sec")

    mocker.patch.object(stripe_client.stripe.SetupIntent, "create", fake_create)

    stripe_client.create_setup_intent("cus_test", "booking")

    assert captured["payment_method_types"] == ["card"]
    assert "automatic_payment_methods" not in captured


@pytest.mark.asyncio
async def test_save_payment_method_stores_id(async_session, mocker):
    user = User(
        email="u@example.com",
        full_name="User",
        hashed_password=hash_password("pass"),
    )
    async_session.add(user)
    await async_session.flush()

    mock_create_customer = mocker.patch(
        "app.services.stripe_client.create_customer",
        return_value=stripe_client._StubIntent(id="cus_test"),
    )
    mock_set_default = mocker.patch(
        "app.services.stripe_client.set_default_payment_method",
    )

    await save_payment_method(async_session, user, "pm_gpay")
    mock_create_customer.assert_called_once()
    mock_set_default.assert_called_once_with("cus_test", "pm_gpay")

    await async_session.commit()
    refreshed = await async_session.get(User, user.id)
    assert refreshed.stripe_customer_id == "cus_test"
    assert refreshed.stripe_payment_method_id == "pm_gpay"


def test_charge_deposit_with_google_pay_payment_method(mocker):
    captured: dict = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return stripe_client._StubIntent(id="pi_test")

    mocker.patch.object(stripe_client.stripe.PaymentIntent, "create", fake_create)

    stripe_client.charge_deposit(
        amount_cents=5000,
        booking_id=uuid.uuid4(),
        payment_method="pm_gpay",
    )

    assert captured["payment_method"] == "pm_gpay"


def test_charge_final_with_google_pay_payment_method(mocker):
    captured: dict = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return stripe_client._StubIntent(id="pi_test")

    mocker.patch.object(stripe_client.stripe.PaymentIntent, "create", fake_create)

    stripe_client.charge_final(
        amount_cents=5000,
        booking_id=uuid.uuid4(),
        payment_method="pm_gpay",
    )

    assert captured["payment_method"] == "pm_gpay"
