"""Stripe API convenience helpers."""
import stripe
from app.core.config import get_settings

settings = get_settings()
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

    return stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="aud",
        payment_method=payment_method,
        confirm=True,
    )

