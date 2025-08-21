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
