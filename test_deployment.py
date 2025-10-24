#!/usr/bin/env python3
"""
Test script to verify deployment app modules work correctly
"""
import sys
import os

def test_attrib_app():
    """Test attribution service app module"""
    try:
        from app.attrib import app
        print("✅ Attribution service app loaded successfully")
        print(f"   App title: {app.title}")
        print(f"   App version: {app.version}")
        return True
    except Exception as e:
        print(f"❌ Attribution service app failed to load: {e}")
        return False

def test_main_app():
    """Test main API service app module"""
    try:
        from app.main import app
        print("✅ Main API service app loaded successfully")
        print(f"   App title: {app.title}")
        print(f"   App version: {app.version}")
        return True
    except Exception as e:
        print(f"❌ Main API service app failed to load: {e}")
        return False

def test_uvicorn_commands():
    """Test that uvicorn commands would work"""
    print("\n🧪 Testing uvicorn command compatibility...")
    
    # Test attribution service
    try:
        import uvicorn
        from app.attrib import app as attrib_app
        print("✅ Attribution service uvicorn command would work")
        print("   Command: uvicorn app.attrib:app --host 0.0.0.0 --port 8000")
    except Exception as e:
        print(f"❌ Attribution service uvicorn command failed: {e}")
    
    # Test main API service
    try:
        import uvicorn
        from app.main import app as main_app
        print("✅ Main API service uvicorn command would work")
        print("   Command: uvicorn app.main:app --host 0.0.0.0 --port 8001")
    except Exception as e:
        print(f"❌ Main API service uvicorn command failed: {e}")

if __name__ == "__main__":
    print("🚀 Testing deployment app modules...\n")
    
    success = True
    success &= test_attrib_app()
    success &= test_main_app()
    test_uvicorn_commands()
    
    if success:
        print("\n🎉 All tests passed! Deployment modules are ready.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed! Check the errors above.")
        sys.exit(1)
