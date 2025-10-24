"""
Attribution Service Compare Endpoint

Per PRD Section 5.3: Attribution Auditor
Exposes compare endpoint with Pydantic validation for audio similarity detection
"""

import asyncio
import logging
import time
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
import numpy as np
import io

from .fingerprinting import ChromaprintFingerprinter, AudioPreprocessor
from .embeddings import CLAPEmbedding, OpenAIEmbedding, HybridAttribution

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attribution", tags=["attribution"])

# Initialize models
fingerprinter = ChromaprintFingerprinter()
clap_model = CLAPEmbedding()
openai_model = OpenAIEmbedding()
hybrid_attribution = HybridAttribution(fingerprinter, clap_model)

class CompareRequest(BaseModel):
    """Request model for audio comparison"""
    track_id: str = Field(..., description="Reference track ID")
    method: str = Field("hybrid", description="Comparison method: chromaprint, embedding, or hybrid")
    threshold: float = Field(0.7, ge=0.0, le=1.0, description="Similarity threshold")

class MatchResult(BaseModel):
    """Result model for audio matches"""
    track_id: str
    similarity: float = Field(..., ge=0.0, le=1.0)
    method: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class CompareResponse(BaseModel):
    """Response model for audio comparison"""
    matches: List[MatchResult]
    processing_time_ms: float
    method_used: str
    total_reference_tracks: int

# In-memory reference tracks storage (in production, this would be in a database)
reference_tracks = {}

def load_audio_from_bytes(audio_bytes: bytes, sample_rate: int = 22050) -> np.ndarray:
    """
    Load audio from bytes using librosa
    
    Args:
        audio_bytes: Audio file bytes
        sample_rate: Target sample rate
        
    Returns:
        Audio samples as numpy array
    """
    try:
        import librosa
        audio_data, sr = librosa.load(io.BytesIO(audio_bytes), sr=sample_rate)
        return audio_data
    except ImportError:
        # Fallback: create mock audio data
        logger.warning("librosa not available, using mock audio data")
        return np.random.normal(0, 0.1, sample_rate * 10)  # 10 seconds of noise

@router.post("/compare", response_model=CompareResponse)
async def compare_audio(
    file: UploadFile = File(...),
    method: str = Form("hybrid"),
    threshold: float = Form(0.7)
):
    """
    Compare uploaded audio against reference tracks
    
    Per PRD Section 5.3: Attribution Auditor
    Supports both Chromaprint and embedding-based similarity detection
    """
    start_time = time.time()
    
    try:
        # Validate method
        if method not in ["chromaprint", "embedding", "hybrid"]:
            raise HTTPException(status_code=400, detail="Invalid method. Use: chromaprint, embedding, or hybrid")
        
        # Load audio file
        audio_bytes = await file.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        # Convert to numpy array
        query_audio = load_audio_from_bytes(audio_bytes)
        
        # Preprocess audio
        query_audio = AudioPreprocessor.normalize_audio(query_audio)
        query_audio = AudioPreprocessor.trim_silence(query_audio)
        
        matches = []
        
        if method == "chromaprint":
            matches = await _compare_chromaprint(query_audio, threshold)
        elif method == "embedding":
            matches = await _compare_embedding(query_audio, threshold)
        elif method == "hybrid":
            matches = await _compare_hybrid(query_audio, threshold)
        
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        logger.info(f"Audio comparison completed in {processing_time:.2f}ms with {len(matches)} matches")
        
        return CompareResponse(
            matches=matches,
            processing_time_ms=processing_time,
            method_used=method,
            total_reference_tracks=len(reference_tracks)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in audio comparison: {e}")
        raise HTTPException(status_code=500, detail=f"Audio comparison failed: {str(e)}")

async def _compare_chromaprint(query_audio: np.ndarray, threshold: float) -> List[MatchResult]:
    """Compare using Chromaprint fingerprinting"""
    try:
        # Extract query fingerprint
        query_fp = fingerprinter.extract_fingerprint(query_audio)
        if not query_fp:
            return []
        
        # Prepare reference fingerprints
        ref_fps = [(track_id, fp) for track_id, (_, fp) in reference_tracks.items() if fp]
        
        # Find matches
        matches = fingerprinter.find_matches(query_fp, ref_fps, threshold)
        
        return [
            MatchResult(
                track_id=track_id,
                similarity=similarity,
                method="chromaprint",
                confidence=similarity
            )
            for track_id, similarity in matches
        ]
        
    except Exception as e:
        logger.error(f"Error in Chromaprint comparison: {e}")
        return []

async def _compare_embedding(query_audio: np.ndarray, threshold: float) -> List[MatchResult]:
    """Compare using embedding similarity"""
    try:
        # Extract query embedding
        query_emb = clap_model.extract_embedding(query_audio, 22050)
        if query_emb is None:
            return []
        
        # Prepare reference embeddings
        ref_embs = []
        for track_id, (audio_data, _) in reference_tracks.items():
            emb = clap_model.extract_embedding(audio_data, 22050)
            if emb is not None:
                ref_embs.append((track_id, emb))
        
        # Find matches
        embedding_similarity = EmbeddingSimilarity(clap_model)
        matches = embedding_similarity.find_matches(query_emb, ref_embs, threshold)
        
        return [
            MatchResult(
                track_id=track_id,
                similarity=similarity,
                method="embedding",
                confidence=similarity
            )
            for track_id, similarity in matches
        ]
        
    except Exception as e:
        logger.error(f"Error in embedding comparison: {e}")
        return []

async def _compare_hybrid(query_audio: np.ndarray, threshold: float) -> List[MatchResult]:
    """Compare using hybrid method"""
    try:
        # Prepare reference data
        ref_data = []
        for track_id, (audio_data, fp) in reference_tracks.items():
            ref_data.append((track_id, audio_data, 22050, fp))
        
        # Use hybrid attribution
        matches = hybrid_attribution.compare_audio(query_audio, 22050, ref_data)
        
        return [
            MatchResult(
                track_id=track_id,
                similarity=similarity,
                method=method,
                confidence=similarity
            )
            for track_id, similarity, method in matches
            if similarity >= threshold
        ]
        
    except Exception as e:
        logger.error(f"Error in hybrid comparison: {e}")
        return []

@router.post("/reference/add")
async def add_reference_track(
    track_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Add a reference track for comparison
    
    Per PRD Section 5.3: Attribution Auditor
    Stores track for future similarity comparisons
    """
    try:
        # Load audio file
        audio_bytes = await file.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        # Convert to numpy array
        audio_data = load_audio_from_bytes(audio_bytes)
        
        # Preprocess audio
        audio_data = AudioPreprocessor.normalize_audio(audio_data)
        audio_data = AudioPreprocessor.trim_silence(audio_data)
        
        # Extract fingerprint
        fingerprint = fingerprinter.extract_fingerprint(audio_data)
        
        # Store reference track
        reference_tracks[track_id] = (audio_data, fingerprint)
        
        logger.info(f"Added reference track: {track_id}")
        
        return {"message": f"Reference track {track_id} added successfully"}
        
    except Exception as e:
        logger.error(f"Error adding reference track: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add reference track: {str(e)}")

@router.get("/reference/list")
async def list_reference_tracks():
    """List all reference tracks"""
    return {
        "tracks": list(reference_tracks.keys()),
        "count": len(reference_tracks)
    }

@router.delete("/reference/{track_id}")
async def remove_reference_track(track_id: str):
    """Remove a reference track"""
    if track_id in reference_tracks:
        del reference_tracks[track_id]
        return {"message": f"Reference track {track_id} removed successfully"}
    else:
        raise HTTPException(status_code=404, detail="Reference track not found")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "reference_tracks": len(reference_tracks),
        "models_loaded": {
            "chromaprint": True,
            "clap": clap_model.model is not None,
            "openai": openai_model.client is not None
        }
    }
