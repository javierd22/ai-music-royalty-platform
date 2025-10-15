#!/usr/bin/env python3
"""
Basic test script to verify the FastAPI app structure without heavy dependencies.
"""

# Test basic imports
try:
    from fastapi import FastAPI
    print("✓ FastAPI import successful")
except ImportError as e:
    print(f"✗ FastAPI import failed: {e}")

try:
    from pydantic import BaseModel
    print("✓ Pydantic import successful")
except ImportError as e:
    print(f"✗ Pydantic import failed: {e}")

# Test app creation
try:
    app = FastAPI(title="Audio Attribution Service", version="1.0.0")
    print("✓ FastAPI app created successfully")
except Exception as e:
    print(f"✗ FastAPI app creation failed: {e}")

print("\nTo install dependencies, run:")
print("pip install -r requirements.txt")
print("\nTo run the service, use:")
print("uvicorn main:app --reload --port 8000")
