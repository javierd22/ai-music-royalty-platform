"""
/compare endpoint for audio attribution analysis.

Per PRD Section 5.3: Attribution Auditor
- Independent Python FastAPI microservice analyzing generated outputs
- Performs vector similarity search via Qdrant/Pinecone
- Cross-validation against logged SDK use
- Threshold verification to confirm true influence
- Reports matches back to Supabase results table
"""

from __future__ import annotations
import os
from typing import List
from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from pydantic import BaseModel

from server.utils.embeddings import (
    generate_embedding,
    query_vector_db,
    compute_percent_influence,
    VectorMatch
)
from server.utils.db import (
    Match,
    insert_results,
    trigger_royalty_event
)
from server.middleware.rate_limit import check_attribution_rate_limit


# Initialize router
router = APIRouter()


class CompareMatch(BaseModel):
    """
    Match response model per PRD Section 5.1.
    
    Displays matches: { trackTitle, artist, similarity, percentInfluence }
    """
    trackTitle: str
    artist: str
    similarity: float
    percentInfluence: float


class CompareResponse(BaseModel):
    """Response model for /compare endpoint."""
    matches: List[CompareMatch]
    total_matches: int
    threshold_exceeded: int
    source_file: str


@router.post("/compare", response_model=CompareResponse)
async def compare_audio(request: Request, file: UploadFile = File(...)):
    """
    Compare uploaded audio file against vector database and return matches.
    
    Per PRD Section 5.3 Attribution Auditor workflow:
    1. Accepts uploaded audio file (multipart/form-data)
    2. Generates embedding using configured model (OpenAI or CLAP placeholder)
    3. Queries vector database (Qdrant/Pinecone) for top N similar tracks
    4. Returns JSON list of matches with { trackTitle, artist, similarity, percentInfluence }
    5. Inserts matches into Supabase `results` table
    6. Triggers royalty event if similarity exceeds threshold (default: 0.85)
    
    Args:
        file: Audio file upload (WAV/MP3)
    
    Returns:
        CompareResponse with list of matches and metadata
    
    Raises:
        HTTPException: If file validation or processing fails
    
    Environment Variables:
        - SIMILARITY_THRESHOLD: Threshold for royalty events (default: 0.85)
        - EMBEDDING_MODEL: Model to use ('mfcc', 'openai', 'clap', default: 'mfcc')
        - VECTOR_DB_TYPE: Database type ('qdrant', 'pinecone', 'mock', default: 'mock')
        - TOP_K_MATCHES: Number of matches to return (default: 10)
    """
    # Check rate limit
    check_attribution_rate_limit(request)
    
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
        # Step 2: Generate embedding
        embedding_model = os.getenv("EMBEDDING_MODEL", "mfcc")
        embedding = generate_embedding(file_content, model=embedding_model)
        
        # Step 3: Query vector database
        db_type = os.getenv("VECTOR_DB_TYPE", "mock")
        top_k = int(os.getenv("TOP_K_MATCHES", "10"))
        vector_matches: List[VectorMatch] = query_vector_db(
            embedding,
            top_k=top_k,
            db_type=db_type
        )
        
        # Step 4: Compute percent influence and prepare response
        similarities = [match.similarity for match in vector_matches]
        influences = compute_percent_influence(similarities)
        
        matches = []
        db_matches = []
        
        for i, vector_match in enumerate(vector_matches):
            # Create response match
            matches.append(CompareMatch(
                trackTitle=vector_match.track_title,
                artist=vector_match.artist,
                similarity=round(vector_match.similarity, 3),
                percentInfluence=round(influences[i], 3)
            ))
            
            # Create database match object
            db_matches.append(Match(
                track_id=vector_match.track_id,
                track_title=vector_match.track_title,
                artist=vector_match.artist,
                similarity=vector_match.similarity,
                percent_influence=influences[i]
            ))
        
        # Step 5: Insert results into Supabase
        source_filename = file.filename or "unknown.audio"
        try:
            insert_results(db_matches, source_filename)
        except Exception as e:
            # Log error but don't fail the request
            print(f"Warning: Failed to insert results to Supabase: {str(e)}")
        
        # Step 6: Trigger royalty events for high-similarity matches
        threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.85"))
        threshold_exceeded_count = 0
        
        for db_match in db_matches:
            if db_match.similarity >= threshold:
                threshold_exceeded_count += 1
                try:
                    trigger_royalty_event(db_match, threshold=threshold)
                except Exception as e:
                    # Log error but don't fail the request
                    print(f"Warning: Failed to trigger royalty event: {str(e)}")
        
        # Return response
        return CompareResponse(
            matches=matches,
            total_matches=len(matches),
            threshold_exceeded=threshold_exceeded_count,
            source_file=source_filename
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error processing audio: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
