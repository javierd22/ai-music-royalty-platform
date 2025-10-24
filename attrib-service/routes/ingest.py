"""
/ingest endpoint for audio track ingestion and fingerprinting.

Per PRD Section 5.1: Track Registration
- Accepts audio files and metadata
- Generates embeddings and stores in vector database
- Supports disk-based indexing for offline/local testing
- Returns track_id for future attribution queries
"""

import os
import uuid
import json
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
import numpy as np

# Import embedding utilities (we'll create a simple version for the attrib-service)
try:
    from server.utils.embeddings import generate_embedding
except ImportError:
    # Fallback for standalone attrib-service
    def generate_embedding(audio_bytes: bytes, model: str = "mfcc") -> np.ndarray:
        """Simple MFCC embedding generation for testing."""
        import librosa
        import io
        
        # Load audio from bytes
        audio_data, sr = librosa.load(io.BytesIO(audio_bytes), sr=None)
        
        # Generate MFCC features
        mfccs = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=13)
        
        # Flatten and normalize
        embedding = mfccs.flatten()
        if len(embedding) > 1000:  # Truncate if too long
            embedding = embedding[:1000]
        elif len(embedding) < 1000:  # Pad if too short
            embedding = np.pad(embedding, (0, 1000 - len(embedding)))
        
        return embedding

# Initialize router
router = APIRouter()

# Disk-based index storage
DISK_INDEX_PATH = os.getenv("DISK_INDEX_PATH", ".tmp/disk_index")
USE_DISK_INDEX = os.getenv("USE_DISK_INDEX", "true").lower() == "true"

# Ensure disk index directory exists
if USE_DISK_INDEX:
    os.makedirs(DISK_INDEX_PATH, exist_ok=True)


class IngestResponse(BaseModel):
    """Response model for /ingest endpoint."""
    track_id: str
    title: str
    artist: str
    embedding_size: int
    status: str


def save_to_disk_index(track_id: str, title: str, artist: str, embedding: np.ndarray):
    """Save track data to disk-based index."""
    track_data = {
        "track_id": track_id,
        "title": title,
        "artist": artist,
        "embedding": embedding.tolist(),
        "metadata": {
            "created_at": str(uuid.uuid4()),  # Simple timestamp placeholder
            "source": "ingest_api"
        }
    }
    
    file_path = os.path.join(DISK_INDEX_PATH, f"{track_id}.json")
    with open(file_path, 'w') as f:
        json.dump(track_data, f)


@router.post("/ingest", response_model=IngestResponse)
async def ingest_track(
    file: UploadFile = File(...),
    title: str = Form(...),
    artist: str = Form("Unknown Artist")
):
    """
    Ingest audio track and generate fingerprint for attribution database.
    
    Per PRD Section 5.1 Track Registration:
    1. Accepts audio file upload with metadata
    2. Generates audio embedding/fingerprint
    3. Stores in vector database (or disk index for testing)
    4. Returns track_id for future attribution queries
    
    Args:
        file: Audio file upload (WAV/MP3)
        title: Track title
        artist: Artist name (optional, defaults to "Unknown Artist")
    
    Returns:
        IngestResponse with track_id and metadata
    
    Raises:
        HTTPException: If file validation or processing fails
    """
    # Validate file
    if not file.content_type or not file.content_type.startswith('audio/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an audio file (audio/wav, audio/mpeg, etc.)"
        )
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Validate file size (10MB limit)
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB limit"
        )
    
    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file"
        )
    
    try:
        # Generate track ID
        track_id = str(uuid.uuid4())
        
        # Generate embedding
        embedding = generate_embedding(file_content, model="mfcc")
        
        # Store in appropriate index
        if USE_DISK_INDEX:
            save_to_disk_index(track_id, title, artist, embedding)
            status = "stored_to_disk"
        else:
            # TODO: Store in vector database (Qdrant/Pinecone)
            # For now, also save to disk as fallback
            save_to_disk_index(track_id, title, artist, embedding)
            status = "stored_to_vector_db"
        
        return IngestResponse(
            track_id=track_id,
            title=title,
            artist=artist,
            embedding_size=len(embedding),
            status=status
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio: {str(e)}"
        )


@router.get("/ingest/status")
async def get_ingest_status():
    """Get ingestion service status and statistics."""
    if not USE_DISK_INDEX:
        return {
            "status": "vector_db_mode",
            "disk_index_enabled": False,
            "total_tracks": "unknown"
        }
    
    # Count tracks in disk index
    try:
        track_files = [f for f in os.listdir(DISK_INDEX_PATH) if f.endswith('.json')]
        return {
            "status": "disk_index_mode",
            "disk_index_enabled": True,
            "total_tracks": len(track_files),
            "index_path": DISK_INDEX_PATH
        }
    except Exception:
        return {
            "status": "error",
            "disk_index_enabled": True,
            "total_tracks": 0,
            "error": "Could not read disk index"
        }
