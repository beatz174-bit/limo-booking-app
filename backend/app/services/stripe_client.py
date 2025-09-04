"""Stripe API convenience helpers."""

import uuid
from datetime import datetime

from app.core.config import get_settings

try:  # pragma: no cover - runtime import
    import stripe as real_stripe  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - tests provide stub
    real_stripe = None


class _StubIntent:
    def __init__(self, **data):
        self.__dict__.update(data)


class _StubStripe:  # type: ignore
    class SetupIntent:
        @staticmethod
        def create(**kwargs):
            return _StubIntent(client_secret="test")

    class PaymentIntent:
        @staticmethod
        def create(**kwargs):
            return _StubIntent(id="pi_test")


settings = get_settings()
if settings.env == "test" or not settings.stripe_secret_key or real_stripe is None:
    stripe = _StubStripe()  # type: ignore
else:
    stripe = real_stripe  # type: ignore
    stripe.api_key = settings.stripe_secret_key or ""


def create_setup_intent(
    customer_email: str, customer_name: str, booking_reference: str
):
    """Create a Stripe SetupIntent for the provided customer email."""
    return stripe.SetupIntent.create(
        payment_method_types=["card"],
        usage="off_session",
        metadata={
            "customer_email": customer_email,
            "customer_name": customer_name,
            "booking_reference": booking_reference,
        },
    )


def charge_deposit(
    amount_cents: int,
    booking_id: uuid.UUID,
    *,
    public_code: str | None = None,
    customer_email: str | None = None,
    pickup_address: str | None = None,
    dropoff_address: str | None = None,
    pickup_time: datetime | None = None,
    payment_method: str = "pm_card_visa",
):
    """Charge a deposit using a stored payment method."""

    params = {
        "amount": amount_cents,
        "currency": "aud",
        "payment_method": payment_method,
        "confirm": True,
        "automatic_payment_methods": {
            "enabled": True,
            "allow_redirects": "never",
        },
    }

    metadata = {
        "booking_id": str(booking_id),
        "payment_type": "deposit",
    }
    if public_code:
        metadata["public_code"] = public_code
    if customer_email:
        metadata["customer_email"] = customer_email
    if pickup_address:
        metadata["pickup_address"] = pickup_address
    if dropoff_address:
        metadata["dropoff_address"] = dropoff_address
    if pickup_time:
        metadata["pickup_time"] = pickup_time.isoformat()
    params["metadata"] = metadata

    if settings.stripe_return_url:
        params["return_url"] = settings.stripe_return_url

    return stripe.PaymentIntent.create(**params)


def charge_final(
    amount_cents: int,
    booking_id: uuid.UUID,
    *,
    public_code: str | None = None,
    customer_email: str | None = None,
    pickup_address: str | None = None,
    dropoff_address: str | None = None,
    pickup_time: datetime | None = None,
    payment_method: str = "pm_card_visa",
):
    """Charge the remaining fare amount."""
    params = {
        "amount": amount_cents,
        "currency": "aud",
        "payment_method": payment_method,
        "confirm": True,
        "automatic_payment_methods": {
            "enabled": True,
            "allow_redirects": "never",
        },
    }

    metadata = {
        "booking_id": str(booking_id),
        "payment_type": "final",
    }
    if public_code:
        metadata["public_code"] = public_code
    if customer_email:
        metadata["customer_email"] = customer_email
    if pickup_address:
        metadata["pickup_address"] = pickup_address
    if dropoff_address:
        metadata["dropoff_address"] = dropoff_address
    if pickup_time:
        metadata["pickup_time"] = pickup_time.isoformat()
    params["metadata"] = metadata

    if settings.stripe_return_url:
        params["return_url"] = settings.stripe_return_url

    return stripe.PaymentIntent.create(**params)
