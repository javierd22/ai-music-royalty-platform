#!/bin/bash
# Run script for the audio attribution service

echo "🎵 Starting Audio Attribution Service..."
echo

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run ./install.sh first."
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "❌ Dependencies not installed. Please run ./install.sh first."
    exit 1
fi

echo "✓ Dependencies found"
echo "🚀 Starting server on http://localhost:8000"
echo "📚 API documentation available at http://localhost:8000/docs"
echo "❤️  Health check available at http://localhost:8000/health"
echo
echo "Press Ctrl+C to stop the server"
echo

# Run the service
uvicorn main:app --reload --port 8000
