"""
Blockchain abstraction layer for payouts.

Per PRD Section 5.4: Royalty Event Engine
Provides a stable interface for both DEMO_MODE and future on-chain implementations.

This module abstracts blockchain operations to enable easy switching between:
- DEMO_MODE: Mock transactions with demo tx_hash
- Production: Real blockchain transactions (Ethereum, Polygon, etc.)
"""

from __future__ import annotations
import uuid
from typing import Dict, List, Any
from pydantic import BaseModel


class PayoutRequest(BaseModel):
    """Request model for payout operations."""
    artist_wallet: str | None  # Can be None in demo mode
    amount_cents: int
    event_ids: List[str]
    demo: bool = True


class PayoutResult(BaseModel):
    """Result model for payout operations."""
    tx_hash: str
    success: bool
    error_message: str | None = None
    gas_used: int | None = None  # For real blockchain
    block_number: int | None = None  # For real blockchain


async def send_payout(
    artist_wallet: str | None,
    amount_cents: int,
    event_ids: List[str],
    demo: bool = True
) -> PayoutResult:
    """
    Send a payout to an artist.
    
    Args:
        artist_wallet: Artist's wallet address (can be None in demo mode)
        amount_cents: Amount to pay in cents (USD)
        event_ids: List of royalty event IDs being paid
        demo: Whether to use demo mode (default: True)
    
    Returns:
        PayoutResult with transaction details
    """
    if demo:
        return _send_demo_payout(artist_wallet, amount_cents, event_ids)
    else:
        return await _send_real_payout(artist_wallet, amount_cents, event_ids)


def _send_demo_payout(
    artist_wallet: str | None,
    amount_cents: int,
    event_ids: List[str]
) -> PayoutResult:
    """
    Send a demo payout (mock transaction).
    
    In demo mode, we generate a mock transaction hash and simulate success.
    This allows full end-to-end testing without blockchain integration.
    """
    # Generate a demo transaction hash
    demo_tx_hash = f"demo_{uuid.uuid4().hex[:16]}"
    
    # Simulate some processing time
    import time
    time.sleep(0.1)  # Simulate network delay
    
    return PayoutResult(
        tx_hash=demo_tx_hash,
        success=True,
        error_message=None,
        gas_used=None,
        block_number=None
    )


async def _send_real_payout(
    artist_wallet: str | None,
    amount_cents: int,
    event_ids: List[str]
) -> PayoutResult:
    """
    Send a real blockchain payout.
    
    This is a placeholder for future blockchain integration.
    Will implement actual smart contract calls here.
    """
    if not artist_wallet:
        return PayoutResult(
            tx_hash="",
            success=False,
            error_message="Artist wallet address required for real payouts"
        )
    
    # TODO: Implement real blockchain integration
    # - Connect to Ethereum/Polygon network
    # - Call smart contract payout function
    # - Wait for transaction confirmation
    # - Return real tx_hash and block details
    
    raise NotImplementedError(
        "Real blockchain payouts not yet implemented. "
        "Use demo=True for testing."
    )


async def verify_payout_status(tx_hash: str, demo: bool = True) -> Dict[str, Any]:
    """
    Verify the status of a payout transaction.
    
    Args:
        tx_hash: Transaction hash to verify
        demo: Whether to use demo mode
    
    Returns:
        Dict with transaction status details
    """
    if demo:
        return _verify_demo_payout_status(tx_hash)
    else:
        return await _verify_real_payout_status(tx_hash)


def _verify_demo_payout_status(tx_hash: str) -> Dict[str, Any]:
    """Verify demo payout status (always successful)."""
    if not tx_hash.startswith("demo_"):
        return {
            "status": "invalid",
            "error": "Invalid demo transaction hash"
        }
    
    return {
        "status": "confirmed",
        "block_number": 12345,  # Mock block number
        "confirmations": 12,
        "gas_used": 21000,
        "success": True
    }


async def _verify_real_payout_status(tx_hash: str) -> Dict[str, Any]:
    """Verify real blockchain payout status."""
    # TODO: Implement real blockchain status checking
    raise NotImplementedError(
        "Real blockchain status verification not yet implemented. "
        "Use demo=True for testing."
    )


# Utility functions for future blockchain integration
def get_network_config(demo: bool = True) -> Dict[str, Any]:
    """Get network configuration for blockchain operations."""
    if demo:
        return {
            "network": "demo",
            "chain_id": None,
            "rpc_url": None,
            "contract_address": None
        }
    else:
        # TODO: Return real network configuration
        return {
            "network": "polygon",
            "chain_id": 137,
            "rpc_url": "https://polygon-rpc.com",
            "contract_address": "0x..."  # Payout contract address
        }


def estimate_gas_cost(amount_cents: int, demo: bool = True) -> int:
    """Estimate gas cost for a payout transaction."""
    if demo:
        return 21000  # Standard transaction gas limit
    else:
        # TODO: Implement real gas estimation
        return 50000  # Estimated gas for payout contract call
