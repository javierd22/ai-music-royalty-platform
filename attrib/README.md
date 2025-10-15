# Audio Attribution Service

A production-ready FastAPI service for audio file comparison and attribution analysis.

## Features

- **Health Check**: `GET /health` - Returns service status
- **Audio Comparison**: `POST /compare` - Compares uploaded audio against reference catalog
- **Production Ready**: Configured for cloud deployment with proper CORS and environment handling
- **Lightweight**: Uses numpy and librosa for audio processing
- **CORS Enabled**: Configured for Next.js development and production

## Local Development

### Prerequisites

- Python 3.11+
- pip (Python package manager)

### Quick Start

```bash
# Navigate to the attrib directory
cd attrib

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn main:app --reload --port 8000
```

The service will be available at:

- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Environment Variables

- `PORT`: Port number (default: 8000)
- `ALLOWED_ORIGINS`: Comma-separated list of additional CORS origins (optional)

## API Endpoints

### GET /health

Returns service health status.

**Response:**

```json
{
  "ok": true
}
```

### POST /compare

Compares an uploaded audio file against the reference catalog.

**Request:**

- Method: POST
- Content-Type: multipart/form-data
- Body: Form field `file` containing audio file (MP3, WAV, etc.)

**Response:**

```json
{
  "matches": [
    {
      "trackTitle": "Echoes of You",
      "artist": "Josh Royal",
      "similarity": 0.856,
      "percentInfluence": 0.456
    },
    {
      "trackTitle": "Midnight Lies",
      "artist": "Ahna Mac",
      "similarity": 0.812,
      "percentInfluence": 0.301
    },
    {
      "trackTitle": "Amber Skyline",
      "artist": "Essyonna",
      "similarity": 0.789,
      "percentInfluence": 0.243
    }
  ]
}
```

## Production Deployment

### Deploy to Render

1. **Connect your repository** to Render
2. **Create a new Web Service** with these settings:
   - **Root Directory**: `attrib`
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: On main branch
3. **Environment Variables** (optional):
   - `ALLOWED_ORIGINS`: Additional CORS origins if needed
4. **Deploy** and get your public URL

### Deploy to Railway

1. **Connect your repository** to Railway
2. **Create a new project** from your repo
3. **Configure the service**:
   - **Root Directory**: `attrib`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. **Environment Variables** (optional):
   - `ALLOWED_ORIGINS`: Additional CORS origins if needed
5. **Deploy** and get your public URL

### Docker Deployment (Optional)

A Dockerfile is provided for containerized deployment:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8000
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]
```

Build and run:

```bash
docker build -t attribution-service .
docker run -p 8000:8000 attribution-service
```

## Post-Deployment Verification

After deployment, verify the service is working:

```bash
# Health check
curl -sSL https://your-service-url.com/health

# Test file upload (replace with your service URL)
curl -sSL -X POST https://your-service-url.com/compare \
  -F "file=@/path/to/test-audio.wav" | jq
```

## Technical Details

### Audio Processing

- Uses **librosa** for audio loading and MFCC feature extraction
- Extracts 10-dimensional MFCC features
- Normalizes fingerprints for consistent comparison
- Uses cosine similarity for matching

### Reference Catalog

The service includes a small in-memory catalog with 5 reference tracks:

- Echoes of You - Josh Royal
- Midnight Lies - Ahna Mac
- Amber Skyline - Essyonna
- Digital Dreams - Neon Pulse
- Urban Symphony - City Lights

### File Validation

- **Size Limit**: 10MB maximum
- **Content Types**: audio/\* (MP3, WAV, etc.)
- **Duration**: Limited to first 30 seconds for processing

### Error Handling

- Invalid file types return 400 Bad Request
- Files too large return 400 Bad Request
- Empty files return 400 Bad Request
- Audio processing errors return 400 Bad Request
- Server errors return 500 Internal Server Error

## CORS Configuration

The service is configured to allow requests from:

- `http://localhost:3000` (development)
- `http://127.0.0.1:3000` (development)
- `https://ai-music-royalty-platform.vercel.app` (production)

Additional origins can be added via the `ALLOWED_ORIGINS` environment variable.

## Dependencies

- **fastapi**: Web framework
- **uvicorn**: ASGI server
- **python-multipart**: File upload support
- **numpy**: Numerical computing
- **librosa**: Audio analysis
- **scipy**: Scientific computing
- **pydantic**: Data validation

## License

Part of the AI Music Royalty Platform project.
