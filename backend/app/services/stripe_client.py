"""Stripe API convenience helpers."""

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


def create_setup_intent(customer_email: str):
    """Create a Stripe SetupIntent for the provided customer email."""
    return stripe.SetupIntent.create(
        payment_method_types=["card"],
        usage="off_session",
        metadata={"customer_email": customer_email},
    )


def charge_deposit(amount_cents: int, payment_method: str = "pm_card_visa"):
    """Charge a deposit using a stored payment method.

    Parameters
    ----------
    amount_cents: int
        The amount to charge in cents.
    payment_method: str
        The Stripe payment method identifier to use. Defaults to Stripe's test
        card so unit tests can run without real card details.
    """

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

    if settings.stripe_return_url:
        params["return_url"] = settings.stripe_return_url

    return stripe.PaymentIntent.create(**params)


def charge_final(amount_cents: int, payment_method: str = "pm_card_visa"):
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

    if settings.stripe_return_url:
        params["return_url"] = settings.stripe_return_url

    return stripe.PaymentIntent.create(**params)
