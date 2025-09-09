"""Stripe API convenience helpers."""

import logging
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
    class Customer:
        @staticmethod
        def create(**kwargs):
            return _StubIntent(id="cus_test")

        @staticmethod
        def retrieve(customer_id):
            return _StubIntent(
                id=customer_id,
                invoice_settings={"default_payment_method": "pm_test"},
            )

        @staticmethod
        def modify(customer_id, **kwargs):
            return _StubIntent(id=customer_id, **kwargs)

    class SetupIntent:
        @staticmethod
        def create(**kwargs):
            return _StubIntent(client_secret="test")

    class PaymentIntent:
        @staticmethod
        def create(**kwargs):
            return _StubIntent(id="pi_test")

    class PaymentMethod:
        @staticmethod
        def attach(payment_method, **kwargs):
            return _StubIntent(id=payment_method)

        @staticmethod
        def retrieve(payment_method):
            return _StubIntent(
                id=payment_method, card={"brand": "visa", "last4": "4242"}
            )

        @staticmethod
        def detach(payment_method):
            return _StubIntent(id=payment_method)


settings = get_settings()
if settings.env == "test" or not settings.stripe_secret_key or real_stripe is None:
    stripe = _StubStripe()  # type: ignore
else:
    stripe = real_stripe  # type: ignore
    stripe.api_key = settings.stripe_secret_key or ""


logger = logging.getLogger(__name__)


def create_customer(email: str, name: str, phone: str | None = None):
    """Create a Stripe customer."""

    return stripe.Customer.create(email=email, name=name, phone=phone)


def create_setup_intent(customer_id: str, booking_reference: str):
    """Create a SetupIntent for the specified customer."""
    return stripe.SetupIntent.create(
        customer=customer_id,
        usage="off_session",
        metadata={"booking_reference": booking_reference},
        automatic_payment_methods={"enabled": True},
    )


def get_default_payment_method(customer_id: str) -> str | None:
    """Return the default payment method ID for a customer if set."""
    logger.info(
        "stripe.Customer.retrieve:start",
        extra={"customer_id": customer_id},
    )
    try:
        customer = stripe.Customer.retrieve(customer_id)
    except Exception:
        logger.exception(
            "stripe.Customer.retrieve:error",
            extra={"customer_id": customer_id},
        )
        raise
    logger.info(
        "stripe.Customer.retrieve:success",
        extra={"customer_id": customer_id},
    )
    invoice_settings = getattr(customer, "invoice_settings", {})
    return invoice_settings.get("default_payment_method")


def set_default_payment_method(customer_id: str, payment_method: str) -> None:
    """Attach and set the default payment method for a customer."""
    logger.info(
        "stripe.PaymentMethod.retrieve:start",
        extra={"payment_method_id": payment_method, "customer_id": customer_id},
    )
    try:
        payment_method_obj = stripe.PaymentMethod.retrieve(payment_method)
    except Exception:
        logger.exception(
            "stripe.PaymentMethod.retrieve:error",
            extra={"payment_method_id": payment_method, "customer_id": customer_id},
        )
        raise
    logger.info(
        "stripe.PaymentMethod.retrieve:success",
        extra={"payment_method_id": payment_method, "customer_id": customer_id},
    )
    if getattr(payment_method_obj, "customer", None) is None:
        logger.info(
            "stripe.PaymentMethod.attach:start",
            extra={
                "payment_method_id": payment_method,
                "customer_id": customer_id,
            },
        )
        try:
            stripe.PaymentMethod.attach(payment_method, customer=customer_id)
        except Exception:
            logger.exception(
                "stripe.PaymentMethod.attach:error",
                extra={
                    "payment_method_id": payment_method,
                    "customer_id": customer_id,
                },
            )
            raise
        logger.info(
            "stripe.PaymentMethod.attach:success",
            extra={
                "payment_method_id": payment_method,
                "customer_id": customer_id,
            },
        )
    logger.info(
        "stripe.Customer.modify:start",
        extra={"payment_method_id": payment_method, "customer_id": customer_id},
    )
    try:
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method},
        )
    except Exception:
        logger.exception(
            "stripe.Customer.modify:error",
            extra={"payment_method_id": payment_method, "customer_id": customer_id},
        )
        raise
    logger.info(
        "stripe.Customer.modify:success",
        extra={"payment_method_id": payment_method, "customer_id": customer_id},
    )


def detach_payment_method(payment_method: str) -> None:
    """Detach a payment method from any customer."""

    stripe.PaymentMethod.detach(payment_method)


def get_payment_method_details(payment_method_id: str) -> dict:
    """Retrieve basic card details for a payment method."""
    logger.info(
        "stripe.PaymentMethod.retrieve:start",
        extra={"payment_method_id": payment_method_id},
    )
    try:
        payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
    except Exception:
        logger.exception(
            "stripe.PaymentMethod.retrieve:error",
            extra={"payment_method_id": payment_method_id},
        )
        raise
    logger.info(
        "stripe.PaymentMethod.retrieve:success",
        extra={"payment_method_id": payment_method_id},
    )
    card = getattr(payment_method, "card", {}) or {}
    return {"brand": card.get("brand"), "last4": card.get("last4")}


def charge_deposit(
    amount_cents: int,
    booking_id: uuid.UUID,
    *,
    public_code: str | None = None,
    customer_email: str | None = None,
    pickup_address: str | None = None,
    dropoff_address: str | None = None,
    pickup_time: datetime | None = None,
    payment_method: str,
):
    """Charge a deposit using a stored payment method."""

    if not payment_method:
        raise ValueError("payment_method is required")

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
    payment_method: str,
):
    """Charge the remaining fare amount."""
    if not payment_method:
        raise ValueError("payment_method is required")

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
