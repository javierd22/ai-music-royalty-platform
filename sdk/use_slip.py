"""
AI Music Royalty Platform - Partner SDK
Per PRD Section 5.2: AI Partner SDK

Lightweight client library for AI music generators to log track usage.
This creates "use slip" records for dual proof verification.

Example usage:
    from sdk.use_slip import log_use

    log_use(
        model_id="suno-v3",
        track_id="123e4567-e89b-12d3-a456-426614174000",
        prompt="upbeat electronic dance music",
        confidence=0.92
    )
"""

import os
from typing import Optional

import requests


class SDKError(Exception):
    """Base exception for SDK errors"""

    pass


class SDKConfigError(SDKError):
    """Configuration error"""

    pass


class SDKAPIError(SDKError):
    """API request error"""

    pass


def get_api_base_url() -> str:
    """
    Get API base URL from environment or default.

    Environment variables:
    - ROYALTY_API_URL: Full API URL (default: http://localhost:8001)
    """
    return os.getenv("ROYALTY_API_URL", "http://localhost:8001")


def log_use(
    model_id: str,
    track_id: str,
    prompt: Optional[str] = None,
    confidence: Optional[float] = None,
    metadata: Optional[dict] = None,
    api_key: Optional[str] = None,
) -> dict:
    """
    Log AI SDK track usage event.

    Creates a use slip record that can be cross-validated with
    attribution auditor results for dual proof verification.

    Args:
        model_id: AI model identifier (e.g., "suno-v3", "udio-pro")
        track_id: UUID of the reference track that influenced generation
        prompt: Optional generation prompt text
        confidence: Optional SDK-reported influence confidence (0-1)
        metadata: Optional additional metadata dict
        api_key: Optional API key for authentication (defaults to ROYALTY_API_KEY env var)

    Returns:
        dict: Created SDK log record with id, created_at, etc.

    Raises:
        SDKConfigError: If configuration is invalid
        SDKAPIError: If API request fails

    Example:
        >>> log = log_use(
        ...     model_id="suno-v3",
        ...     track_id="123e4567-e89b-12d3-a456-426614174000",
        ...     prompt="upbeat electronic dance music",
        ...     confidence=0.92
        ... )
        >>> print(f"SDK log created: {log['id']}")
    """
    # Validate inputs
    if not model_id or not isinstance(model_id, str):
        raise SDKConfigError("model_id must be a non-empty string")

    if not track_id or not isinstance(track_id, str):
        raise SDKConfigError("track_id must be a non-empty string (UUID)")

    if confidence is not None and (not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1):
        raise SDKConfigError("confidence must be a number between 0 and 1")

    # Get API configuration
    base_url = get_api_base_url()
    endpoint = f"{base_url}/sdk/log_use"

    # Prepare request payload
    payload = {
        "model_id": model_id,
        "track_id": track_id,
    }

    if prompt is not None:
        payload["prompt"] = prompt

    if confidence is not None:
        payload["confidence"] = confidence

    if metadata is not None:
        payload["metadata"] = metadata

    # Prepare headers
    headers = {"Content-Type": "application/json"}

    # Add API key if provided
    api_key = api_key or os.getenv("ROYALTY_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # Make API request
    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        response.raise_for_status()

        return response.json()

    except requests.exceptions.RequestException as e:
        raise SDKAPIError(f"API request failed: {e!s}") from e
    except ValueError as e:
        raise SDKAPIError(f"Invalid JSON response: {e!s}") from e


def get_logs(
    track_id: Optional[str] = None,
    model_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    api_key: Optional[str] = None,
) -> dict:
    """
    Retrieve SDK use logs with optional filters.

    Args:
        track_id: Optional filter by track UUID
        model_id: Optional filter by AI model identifier
        limit: Maximum number of results (default: 50)
        offset: Pagination offset (default: 0)
        api_key: Optional API key for authentication

    Returns:
        dict: Response with 'logs' list and 'count'

    Raises:
        SDKAPIError: If API request fails

    Example:
        >>> logs = get_logs(model_id="suno-v3", limit=10)
        >>> print(f"Found {logs['count']} logs")
    """
    base_url = get_api_base_url()
    endpoint = f"{base_url}/sdk/log_use"

    # Prepare query parameters
    params = {"limit": limit, "offset": offset}

    if track_id:
        params["track_id"] = track_id

    if model_id:
        params["model_id"] = model_id

    # Prepare headers
    headers = {}
    api_key = api_key or os.getenv("ROYALTY_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # Make API request
    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=30)
        response.raise_for_status()

        return response.json()

    except requests.exceptions.RequestException as e:
        raise SDKAPIError(f"API request failed: {e!s}") from e
    except ValueError as e:
        raise SDKAPIError(f"Invalid JSON response: {e!s}") from e


# Example usage
if __name__ == "__main__":
    # Example: Log a track usage
    print("Example: Logging AI SDK track usage...")

    try:
        # In production, set ROYALTY_API_URL environment variable
        # export ROYALTY_API_URL=https://your-api.example.com

        log = log_use(
            model_id="suno-v3",
            track_id="demo-track-uuid-replace-with-real",
            prompt="upbeat electronic dance music with heavy bass",
            confidence=0.89,
            metadata={
                "session_id": "session-123",
                "output_id": "output-456",
                "user_id": "user-789",
            },
        )

        print(f"✓ SDK log created successfully!")
        print(f"  Log ID: {log['id']}")
        print(f"  Model ID: {log['model_id']}")
        print(f"  Created at: {log['created_at']}")
        print()
        print("This log will be cross-validated with auditor detection for dual proof.")

    except SDKError as e:
        print(f"✗ SDK Error: {e}")

    # Example: Retrieve logs
    print("\nExample: Retrieving SDK logs...")

    try:
        response = get_logs(limit=5)
        print(f"✓ Found {response['count']} logs")

        for log in response.get("logs", []):
            print(f"  - {log['model_id']} @ {log['created_at']}")

    except SDKError as e:
        print(f"✗ SDK Error: {e}")

