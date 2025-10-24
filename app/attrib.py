"""
Attribution Service App Module
Re-exports the attribution service app for deployment
"""
import sys
import os

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Add the attrib-service directory to Python path
attrib_service_path = os.path.join(project_root, 'attrib-service')
sys.path.insert(0, attrib_service_path)

# Import the attribution service app
from main import app

# Export the app for uvicorn
__all__ = ["app"]
