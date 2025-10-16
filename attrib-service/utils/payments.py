import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def transfer_to_connected_account(stripe_account_id: str, amount_cents: int, description: str):
    if not stripe.api_key:
        raise RuntimeError("STRIPE_SECRET_KEY is not set")
    if not stripe_account_id:
        raise RuntimeError("Missing stripe_account_id")
    return stripe.Transfer.create(
        amount=amount_cents,
        currency="usd",
        destination=stripe_account_id,
        description=description
    )