#!/usr/bin/env python3
"""
Demo Script: Signed API Request
Demonstrates complete flow of creating, signing, and sending a request to the SDK API

Per Threat Model T2: HMAC signature prevents tampering and replay
"""

import hashlib
import hmac
import json
import sys
from datetime import datetime
from uuid import uuid4

try:
    import requests
except ImportError:
    print("Error: requests library not installed")
    print("Install with: pip install requests")
    sys.exit(1)


def sign_request(method, path, body, api_key, timestamp):
    """
    Generate HMAC-SHA256 signature for request

    Args:
        method: HTTP method (e.g., "POST")
        path: Request path (e.g., "/sdk/log_use")
        body: Request body as dict
        api_key: Full API key (pk_live_prefix.secret)
        timestamp: ISO 8601 timestamp string

    Returns:
        Tuple of (signature, nonce)
    """
    # Extract secret portion from API key
    if "." not in api_key:
        raise ValueError("Invalid API key format. Expected: pk_live_prefix.secret")

    secret = api_key.split(".")[-1]

    # Construct payload: method + path + timestamp + body
    body_bytes = json.dumps(body, separators=(",", ":")).encode("utf-8")
    payload = f"{method}\n{path}\n{timestamp}\n".encode("utf-8") + body_bytes

    # Compute HMAC-SHA256
    signature = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()

    # Generate unique nonce
    nonce = str(uuid4())

    return signature, nonce


def demo_signed_request(api_url, api_key, track_id):
    """
    Demonstrate complete signed request flow

    Args:
        api_url: API base URL (e.g., http://localhost:8001)
        api_key: Full API key (pk_live_prefix.secret)
        track_id: UUID of track to log usage for
    """
    print("=" * 80)
    print("DEMO: Signed API Request to Partner SDK Endpoint")
    print("=" * 80)
    print()

    # Step 1: Prepare request
    print("Step 1: Prepare request body")
    print("-" * 80)

    method = "POST"
    path = "/sdk/log_use"
    body = {
        "model_id": "suno-v3",
        "track_id": track_id,
        "prompt": "Generate lo-fi hip hop beat with vinyl crackle",
        "confidence": 0.87,
    }

    print(f"Method: {method}")
    print(f"Path: {path}")
    print(f"Body: {json.dumps(body, indent=2)}")
    print()

    # Step 2: Generate timestamp and nonce
    print("Step 2: Generate timestamp and nonce")
    print("-" * 80)

    timestamp = datetime.utcnow().isoformat() + "Z"
    nonce = str(uuid4())

    print(f"Timestamp: {timestamp}")
    print(f"Nonce: {nonce}")
    print()

    # Step 3: Compute HMAC signature
    print("Step 3: Compute HMAC-SHA256 signature")
    print("-" * 80)

    signature, _ = sign_request(method, path, body, api_key, timestamp)

    print(f"API Key Prefix: {api_key.split('.')[0]}")
    print(f"Signature: {signature}")
    print()
    print("Signature Computation:")
    print("  1. Extract secret from API key")
    print("  2. Build payload: method + path + timestamp + body")
    print("  3. HMAC-SHA256(secret, payload)")
    print("  4. Hex-encode result")
    print()

    # Step 4: Prepare headers
    print("Step 4: Prepare request headers")
    print("-" * 80)

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "x-timestamp": timestamp,
        "x-nonce": nonce,
        "x-signature": signature,
    }

    for key, value in headers.items():
        display_value = value if key != "x-api-key" else f"{value[:20]}..."
        print(f"  {key}: {display_value}")
    print()

    # Step 5: Send request
    print("Step 5: Send signed request")
    print("-" * 80)

    url = f"{api_url}{path}"
    print(f"URL: {url}")
    print()

    try:
        response = requests.post(url, headers=headers, json=body)

        print(f"Status Code: {response.status_code}")
        print(f"Response:")
        print(json.dumps(response.json(), indent=2))
        print()

        if response.status_code == 201:
            print("✅ SUCCESS: SDK log created")
            print()
            print("Server verified:")
            print("  ✓ API key is valid and active")
            print("  ✓ Timestamp is within 5-minute window")
            print("  ✓ Nonce has not been used before")
            print("  ✓ HMAC signature matches expected value")
            print("  ✓ Request body is valid")
            print()
            print("The log can now be viewed at:")
            print(f"  http://localhost:3000/dashboard/logs/{response.json()['id']}")
        elif response.status_code == 401:
            print("❌ AUTHENTICATION FAILED")
            print()
            print("Possible reasons:")
            print("  - Invalid API key")
            print("  - Timestamp too old (>5 minutes)")
            print("  - Nonce already used (replay attack)")
            print("  - Invalid signature")
        elif response.status_code == 404:
            print("❌ TRACK NOT FOUND")
            print()
            print("The track_id does not exist in the database.")
            print("Create a track first or use an existing track UUID.")
        elif response.status_code == 429:
            print("❌ RATE LIMIT EXCEEDED")
            print()
            print("You have exceeded 60 requests per minute.")
            retry_after = response.headers.get("Retry-After", "unknown")
            print(f"Retry after {retry_after} seconds.")
        else:
            print(f"❌ UNEXPECTED ERROR: {response.status_code}")

    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR")
        print()
        print("Could not connect to API server.")
        print("Make sure the server is running:")
        print("  cd server && uvicorn main:app --reload --port 8001")
    except Exception as e:
        print(f"❌ ERROR: {e}")

    print()
    print("=" * 80)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Demo: Send signed request to Partner SDK API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example Usage:
  python demo_signed_request.py \\
    --api-url http://localhost:8001 \\
    --api-key pk_live_abc123.xyz789secret \\
    --track-id 550e8400-e29b-41d4-a716-446655440000

To get an API key:
  1. Create partner: curl -X POST http://localhost:8001/keys/partners ...
  2. Create key: curl -X POST http://localhost:8001/keys/create ...
  3. Save the full_key from response

For complete documentation, see README.md Security section.
        """,
    )

    parser.add_argument(
        "--api-url",
        default="http://localhost:8001",
        help="API base URL (default: http://localhost:8001)",
    )
    parser.add_argument(
        "--api-key",
        required=True,
        help="Full API key (pk_live_prefix.secret)",
    )
    parser.add_argument(
        "--track-id",
        required=True,
        help="UUID of track to log usage for",
    )

    args = parser.parse_args()

    demo_signed_request(args.api_url, args.api_key, args.track_id)


if __name__ == "__main__":
    main()

