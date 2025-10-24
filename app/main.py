"""
Main API Service App Module
Re-exports the main API service app for deployment
"""
import sys
import os

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Import the main API service app
from server.main import app

# Export the app for uvicorn
__all__ = ["app"]
