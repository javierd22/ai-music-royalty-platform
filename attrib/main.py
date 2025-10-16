"""
Minimal FastAPI attribution service for audio file comparison.
"""

import io
import os
from typing import List, Dict, Any
import numpy as np
import librosa
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from utils.logger import log_event

# Initialize FastAPI app
app = FastAPI(title="Audio Attribution Service", version="1.0.0")

# CORS configuration for Next.js development and production
import os
allowed_origins = [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "https://ai-music-royalty-platform.vercel.app"
]

# Add additional production origins from environment variable if set
production_origins = os.environ.get("ALLOWED_ORIGINS", "")
if production_origins:
    allowed_origins.extend(production_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response models
class HealthResponse(BaseModel):
    ok: bool

class Match(BaseModel):
    trackTitle: str
    artist: str
    similarity: float
    percentInfluence: float

class CompareResponse(BaseModel):
    matches: List[Match]

# In-memory catalog of reference tracks
REFERENCE_CATALOG = [
    {
        "trackTitle": "Echoes of You",
        "artist": "Josh Royal",
        "fingerprint": np.array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
    },
    {
        "trackTitle": "Midnight Lies", 
        "artist": "Ahna Mac",
        "fingerprint": np.array([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1])
    },
    {
        "trackTitle": "Amber Skyline",
        "artist": "Essyonna", 
        "fingerprint": np.array([0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2])
    },
    {
        "trackTitle": "Digital Dreams",
        "artist": "Neon Pulse",
        "fingerprint": np.array([0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2, 0.3])
    },
    {
        "trackTitle": "Urban Symphony",
        "artist": "City Lights",
        "fingerprint": np.array([0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2, 0.3, 0.4])
    }
]

def extract_audio_fingerprint(audio_data: bytes) -> np.ndarray:
    """
    Extract a simple audio fingerprint using MFCC features.
    """
    try:
        # Load audio from bytes
        audio, sr = librosa.load(io.BytesIO(audio_data), sr=22050, duration=30)
        
        # Extract MFCC features
        mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=10)
        
        # Compute mean across time to get a single vector
        fingerprint = np.mean(mfccs, axis=1)
        
        # Normalize the fingerprint
        fingerprint = (fingerprint - np.mean(fingerprint)) / (np.std(fingerprint) + 1e-8)
        
        return fingerprint
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing audio: {str(e)}")

def compute_similarity(fingerprint1: np.ndarray, fingerprint2: np.ndarray) -> float:
    """
    Compute cosine similarity between two fingerprints.
    """
    # Ensure both arrays have the same length
    min_len = min(len(fingerprint1), len(fingerprint2))
    fp1 = fingerprint1[:min_len]
    fp2 = fingerprint2[:min_len]
    
    # Compute cosine similarity
    dot_product = np.dot(fp1, fp2)
    norm1 = np.linalg.norm(fp1)
    norm2 = np.linalg.norm(fp2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    similarity = dot_product / (norm1 * norm2)
    return max(0.0, min(1.0, similarity))  # Clamp between 0 and 1

def normalize_influences(similarities: List[float]) -> List[float]:
    """
    Normalize similarities to sum to approximately 1.0.
    """
    total = sum(similarities)
    if total == 0:
        return [1.0 / len(similarities)] * len(similarities)
    return [s / total for s in similarities]

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    log_event("health_check", {"status": "ok"})
    return HealthResponse(ok=True)

@app.post("/compare", response_model=CompareResponse)
async def compare_audio(file: UploadFile = File(...)):
    """
    Compare uploaded audio file against reference catalog.
    """
    # Log the start of comparison
    log_event("comparison_started", {
        "filename": file.filename,
        "content_type": file.content_type,
        "file_size": 0  # Will be updated after reading
    })
    
    # Validate file
    if not file.content_type or not file.content_type.startswith('audio/'):
        log_event("comparison_error", {
            "error": "invalid_file_type",
            "content_type": file.content_type
        })
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    # Check file size (10MB limit)
    file_content = await file.read()
    file_size = len(file_content)
    
    # Update log with actual file size
    log_event("comparison_file_loaded", {
        "filename": file.filename,
        "file_size": file_size
    })
    
    if file_size > 10 * 1024 * 1024:  # 10MB
        log_event("comparison_error", {
            "error": "file_too_large",
            "file_size": file_size
        })
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    if file_size == 0:
        log_event("comparison_error", {
            "error": "empty_file"
        })
        raise HTTPException(status_code=400, detail="Empty file")
    
    try:
        # Extract fingerprint from uploaded file
        uploaded_fingerprint = extract_audio_fingerprint(file_content)
        
        # Compare against reference catalog
        similarities = []
        for track in REFERENCE_CATALOG:
            similarity = compute_similarity(uploaded_fingerprint, track["fingerprint"])
            similarities.append({
                "track": track,
                "similarity": similarity
            })
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Get top 3 matches
        top_matches = similarities[:3]
        
        # Extract similarities for normalization
        sim_values = [match["similarity"] for match in top_matches]
        
        # Normalize to get percent influences
        influences = normalize_influences(sim_values)
        
        # Create response
        matches = []
        for i, match in enumerate(top_matches):
            matches.append(Match(
                trackTitle=match["track"]["trackTitle"],
                artist=match["track"]["artist"],
                similarity=round(match["similarity"], 3),
                percentInfluence=round(influences[i], 3)
            ))
        
        # Log successful comparison
        log_event("comparison_completed", {
            "filename": file.filename,
            "matches_count": len(matches),
            "top_similarity": matches[0].similarity if matches else 0,
            "total_influence": sum(m.percentInfluence for m in matches)
        })
        
        return CompareResponse(matches=matches)
        
    except HTTPException:
        raise
    except Exception as e:
        # Log the error
        log_event("comparison_error", {
            "error": "internal_error",
            "error_message": str(e),
            "filename": file.filename
        })
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
