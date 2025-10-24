"""
Audio embedding generation and vector database queries.

This module handles:
- Audio embedding generation using OpenAI or CLAP models
- Vector similarity search via Qdrant/Pinecone
- Fingerprint extraction and normalization

Per PRD Section 5.3: Attribution Auditor performs vector similarity search
via Qdrant/Pinecone and threshold verification.
"""

from __future__ import annotations
import io
import os
from typing import List, Optional, Dict, Any
import numpy as np
import librosa
from pydantic import BaseModel


class VectorMatch(BaseModel):
    """Represents a match from vector database search."""
    track_id: str
    track_title: str
    artist: str
    similarity: float
    metadata: Dict[str, Any] = {}


def generate_embedding(audio_bytes: bytes, model: str = "mfcc") -> np.ndarray:
    """
    Generate audio embedding from raw audio bytes.
    
    Args:
        audio_bytes: Raw audio file bytes (WAV/MP3)
        model: Embedding model to use ('mfcc', 'openai', or 'clap')
    
    Returns:
        np.ndarray: Audio embedding vector
    
    Raises:
        ValueError: If audio processing fails
    
    Note:
        Per PRD Section 8: Supports OpenAI Audio Embeddings or custom CLAP model.
        Currently using MFCC as placeholder for MVP.
    """
    try:
        # Load audio from bytes
        audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050, duration=30)
        
        if model == "mfcc":
            # Extract MFCC features (placeholder for production embedding model)
            mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=128)
            
            # Compute mean across time to get a single vector
            embedding = np.mean(mfccs, axis=1)
            
            # Normalize the embedding
            embedding = (embedding - np.mean(embedding)) / (np.std(embedding) + 1e-8)
            
            return embedding
        
        elif model == "openai":
            # Placeholder for OpenAI audio embeddings API
            # TODO: Implement OpenAI Whisper or future audio embedding API
            raise NotImplementedError("OpenAI embeddings not yet implemented. Set model='mfcc'")
        
        elif model == "clap":
            # Placeholder for CLAP (Contrastive Language-Audio Pretraining) model
            # TODO: Implement CLAP model integration
            raise NotImplementedError("CLAP embeddings not yet implemented. Set model='mfcc'")
        
        else:
            raise ValueError(f"Unknown model: {model}. Use 'mfcc', 'openai', or 'clap'")
    
    except Exception as e:
        raise ValueError(f"Error generating embedding: {str(e)}")


def query_vector_db(
    embedding: np.ndarray,
    top_k: int = 10,
    db_type: str = "mock"
) -> List[VectorMatch]:
    """
    Query vector database for similar audio tracks.
    
    Args:
        embedding: Query embedding vector
        top_k: Number of top matches to return
        db_type: Database type ('qdrant', 'pinecone', or 'mock')
    
    Returns:
        List[VectorMatch]: Top K similar tracks with similarity scores
    
    Note:
        Per PRD Section 5.3: Vector similarity search via Qdrant/Pinecone.
        Currently using mock database for MVP development.
    """
    if db_type == "qdrant":
        return _query_qdrant(embedding, top_k)
    elif db_type == "pinecone":
        return _query_pinecone(embedding, top_k)
    elif db_type == "mock":
        return _query_mock_db(embedding, top_k)
    else:
        raise ValueError(f"Unknown database type: {db_type}")


def _query_qdrant(embedding: np.ndarray, top_k: int) -> List[VectorMatch]:
    """
    Query Qdrant vector database.
    
    Requires environment variables:
    - QDRANT_URL: Qdrant instance URL
    - QDRANT_API_KEY: API key (optional for local instances)
    - QDRANT_COLLECTION: Collection name (default: 'audio_tracks')
    """
    try:
        from qdrant_client import QdrantClient
        
        url = os.getenv("QDRANT_URL", "http://localhost:6333")
        api_key = os.getenv("QDRANT_API_KEY")
        collection = os.getenv("QDRANT_COLLECTION", "audio_tracks")
        
        # Initialize Qdrant client
        client = QdrantClient(url=url, api_key=api_key)
        
        # Search for similar vectors
        results = client.search(
            collection_name=collection,
            query_vector=embedding.tolist(),
            limit=top_k
        )
        
        # Convert to VectorMatch objects
        matches = []
        for result in results:
            matches.append(VectorMatch(
                track_id=str(result.id),
                track_title=result.payload.get("title", "Unknown"),
                artist=result.payload.get("artist", "Unknown"),
                similarity=result.score,
                metadata=result.payload
            ))
        
        return matches
    
    except ImportError:
        raise ImportError("Qdrant client not installed. Run: pip install qdrant-client")
    except Exception as e:
        raise ValueError(f"Error querying Qdrant: {str(e)}")


def _query_pinecone(embedding: np.ndarray, top_k: int) -> List[VectorMatch]:
    """
    Query Pinecone vector database.
    
    Requires environment variables:
    - PINECONE_API_KEY: Pinecone API key
    - PINECONE_ENVIRONMENT: Pinecone environment
    - PINECONE_INDEX: Index name (default: 'audio-tracks')
    """
    try:
        import pinecone
        
        api_key = os.getenv("PINECONE_API_KEY")
        environment = os.getenv("PINECONE_ENVIRONMENT")
        index_name = os.getenv("PINECONE_INDEX", "audio-tracks")
        
        if not api_key or not environment:
            raise ValueError("PINECONE_API_KEY and PINECONE_ENVIRONMENT must be set")
        
        # Initialize Pinecone
        pinecone.init(api_key=api_key, environment=environment)
        index = pinecone.Index(index_name)
        
        # Query the index
        results = index.query(
            vector=embedding.tolist(),
            top_k=top_k,
            include_metadata=True
        )
        
        # Convert to VectorMatch objects
        matches = []
        for match in results['matches']:
            matches.append(VectorMatch(
                track_id=match['id'],
                track_title=match['metadata'].get('title', 'Unknown'),
                artist=match['metadata'].get('artist', 'Unknown'),
                similarity=match['score'],
                metadata=match['metadata']
            ))
        
        return matches
    
    except ImportError:
        raise ImportError("Pinecone client not installed. Run: pip install pinecone-client")
    except Exception as e:
        raise ValueError(f"Error querying Pinecone: {str(e)}")


def _query_mock_db(embedding: np.ndarray, top_k: int) -> List[VectorMatch]:
    """
    Query mock in-memory database for development/testing.
    
    Per PRD Section 5.1: Displays matches with trackTitle, artist, similarity, percentInfluence.
    This mock database simulates the vector search behavior.
    """
    # Mock reference catalog with pre-computed embeddings
    mock_catalog = [
        {
            "track_id": "trk_001",
            "title": "Echoes of You",
            "artist": "Josh Royal",
            "embedding": np.random.randn(128)
        },
        {
            "track_id": "trk_002",
            "title": "Midnight Lies",
            "artist": "Ahna Mac",
            "embedding": np.random.randn(128)
        },
        {
            "track_id": "trk_003",
            "title": "Amber Skyline",
            "artist": "Essyonna",
            "embedding": np.random.randn(128)
        },
        {
            "track_id": "trk_004",
            "title": "Digital Dreams",
            "artist": "Neon Pulse",
            "embedding": np.random.randn(128)
        },
        {
            "track_id": "trk_005",
            "title": "Urban Symphony",
            "artist": "City Lights",
            "embedding": np.random.randn(128)
        }
    ]
    
    # Compute cosine similarity for each track
    similarities = []
    for track in mock_catalog:
        track_embedding = track["embedding"]
        
        # Ensure both vectors have same dimension
        min_dim = min(len(embedding), len(track_embedding))
        emb1 = embedding[:min_dim]
        emb2 = track_embedding[:min_dim]
        
        # Cosine similarity
        dot_product = np.dot(emb1, emb2)
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        
        if norm1 > 0 and norm2 > 0:
            similarity = dot_product / (norm1 * norm2)
            # Clamp to [0, 1] and add some randomness for demo
            similarity = max(0.0, min(1.0, (similarity + 1) / 2))
            # Add noise to make it realistic
            similarity = max(0.0, min(1.0, similarity + np.random.uniform(-0.1, 0.1)))
        else:
            similarity = 0.0
        
        similarities.append({
            "track": track,
            "similarity": similarity
        })
    
    # Sort by similarity descending
    similarities.sort(key=lambda x: x["similarity"], reverse=True)
    
    # Return top K matches
    matches = []
    for item in similarities[:top_k]:
        matches.append(VectorMatch(
            track_id=item["track"]["track_id"],
            track_title=item["track"]["title"],
            artist=item["track"]["artist"],
            similarity=round(item["similarity"], 3),
            metadata={"embedding_model": "mfcc_mock"}
        ))
    
    return matches


def compute_percent_influence(similarities: List[float]) -> List[float]:
    """
    Normalize similarities to compute percent influence.
    
    Per PRD Section 5.1: Display percentInfluence for each match.
    This ensures all influences sum to approximately 1.0 (100%).
    
    Args:
        similarities: List of similarity scores
    
    Returns:
        List[float]: Normalized percent influence values
    """
    total = sum(similarities)
    if total == 0:
        # Equal distribution if all similarities are 0
        return [1.0 / len(similarities)] * len(similarities)
    
    return [s / total for s in similarities]
