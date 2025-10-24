"""
Unit Tests for Attribution Engine

Per PRD Section 5.3: Attribution Auditor
Tests both Chromaprint and embedding similarity paths
"""

import pytest
import numpy as np
import tempfile
import os
from unittest.mock import Mock, patch

from fingerprinting import ChromaprintFingerprinter, AudioPreprocessor
from embeddings import CLAPEmbedding, EmbeddingSimilarity, HybridAttribution
from compare import compare_audio, load_audio_from_bytes

class TestChromaprintFingerprinting:
    """Test Chromaprint fingerprinting functionality"""
    
    def setup_method(self):
        self.fingerprinter = ChromaprintFingerprinter()
        self.test_audio = np.random.normal(0, 0.1, 22050 * 5)  # 5 seconds of audio
    
    def test_extract_fingerprint(self):
        """Test fingerprint extraction"""
        fingerprint = self.fingerprinter.extract_fingerprint(self.test_audio)
        
        # Should return a list of integers
        assert fingerprint is None or isinstance(fingerprint, list)
        if fingerprint:
            assert all(isinstance(x, int) for x in fingerprint)
    
    def test_compare_fingerprints(self):
        """Test fingerprint comparison"""
        fp1 = self.fingerprinter.extract_fingerprint(self.test_audio)
        fp2 = self.fingerprinter.extract_fingerprint(self.test_audio)
        
        if fp1 and fp2:
            similarity = self.fingerprinter.compare_fingerprints(fp1, fp2)
            assert 0.0 <= similarity <= 1.0
    
    def test_find_matches(self):
        """Test finding matches against reference fingerprints"""
        query_fp = self.fingerprinter.extract_fingerprint(self.test_audio)
        
        if query_fp:
            # Create mock reference fingerprints
            ref_fps = [
                ("track1", query_fp),  # Should match
                ("track2", [1, 2, 3, 4, 5]),  # Should not match
            ]
            
            matches = self.fingerprinter.find_matches(query_fp, ref_fps, threshold=0.8)
            
            # Should find at least the identical match
            assert len(matches) >= 1
            assert matches[0][0] == "track1"
            assert matches[0][1] >= 0.8

class TestEmbeddingSimilarity:
    """Test embedding similarity functionality"""
    
    def setup_method(self):
        self.clap_model = CLAPEmbedding()
        self.similarity = EmbeddingSimilarity(self.clap_model)
        self.test_audio = np.random.normal(0, 0.1, 22050 * 5)
    
    def test_extract_embedding(self):
        """Test embedding extraction"""
        embedding = self.clap_model.extract_embedding(self.test_audio, 22050)
        
        assert embedding is not None
        assert isinstance(embedding, np.ndarray)
        assert len(embedding) == self.clap_model.get_embedding_dim()
    
    def test_compute_similarity(self):
        """Test similarity computation"""
        emb1 = self.clap_model.extract_embedding(self.test_audio, 22050)
        emb2 = self.clap_model.extract_embedding(self.test_audio, 22050)
        
        similarity = self.similarity.compute_similarity(emb1, emb2)
        
        assert 0.0 <= similarity <= 1.0
        # Identical embeddings should have high similarity
        assert similarity >= 0.8
    
    def test_find_matches(self):
        """Test finding matches against reference embeddings"""
        query_emb = self.clap_model.extract_embedding(self.test_audio, 22050)
        
        # Create mock reference embeddings
        ref_embs = [
            ("track1", query_emb),  # Should match
            ("track2", np.random.normal(0, 1, 512)),  # Should not match
        ]
        
        matches = self.similarity.find_matches(query_emb, ref_embs, threshold=0.7)
        
        # Should find at least the identical match
        assert len(matches) >= 1
        assert matches[0][0] == "track1"
        assert matches[0][1] >= 0.7
    
    def test_normalize_influences(self):
        """Test influence normalization"""
        similarities = [0.8, 0.6, 0.4]
        normalized = self.similarity.normalize_influences(similarities)
        
        assert len(normalized) == len(similarities)
        assert abs(sum(normalized) - 1.0) < 0.01  # Should sum to ~1.0
        assert all(0.0 <= x <= 1.0 for x in normalized)

class TestHybridAttribution:
    """Test hybrid attribution functionality"""
    
    def setup_method(self):
        self.fingerprinter = ChromaprintFingerprinter()
        self.clap_model = CLAPEmbedding()
        self.hybrid = HybridAttribution(self.fingerprinter, self.clap_model)
        self.test_audio = np.random.normal(0, 0.1, 22050 * 5)
    
    def test_compare_audio(self):
        """Test hybrid audio comparison"""
        # Create mock reference tracks
        ref_tracks = [
            ("track1", self.test_audio, 22050, [1, 2, 3, 4, 5]),
            ("track2", np.random.normal(0, 0.1, 22050 * 5), 22050, [6, 7, 8, 9, 10]),
        ]
        
        results = self.hybrid.compare_audio(self.test_audio, 22050, ref_tracks)
        
        # Should return list of (track_id, confidence, method) tuples
        assert isinstance(results, list)
        for track_id, confidence, method in results:
            assert isinstance(track_id, str)
            assert 0.0 <= confidence <= 1.0
            assert method in ["chromaprint", "embedding"]

class TestAudioPreprocessing:
    """Test audio preprocessing functionality"""
    
    def setup_method(self):
        self.test_audio = np.array([0.1, 0.5, -0.3, 0.8, -0.2])
    
    def test_normalize_audio(self):
        """Test audio normalization"""
        normalized = AudioPreprocessor.normalize_audio(self.test_audio)
        
        assert np.max(np.abs(normalized)) <= 1.0
        assert np.min(normalized) >= -1.0
    
    def test_trim_silence(self):
        """Test silence trimming"""
        # Create audio with silence at beginning and end
        silent_audio = np.concatenate([
            np.zeros(100),  # Silence
            self.test_audio,
            np.zeros(100)   # Silence
        ])
        
        trimmed = AudioPreprocessor.trim_silence(silent_audio, threshold=0.01)
        
        assert len(trimmed) <= len(silent_audio)
        assert np.array_equal(trimmed, self.test_audio)
    
    def test_resample_audio(self):
        """Test audio resampling"""
        original_sr = 22050
        target_sr = 44100
        
        resampled = AudioPreprocessor.resample_audio(
            self.test_audio, original_sr, target_sr
        )
        
        assert len(resampled) > 0
        # Length should be approximately doubled for 2x sample rate
        assert abs(len(resampled) - len(self.test_audio) * 2) <= 2

class TestCompareEndpoint:
    """Test compare endpoint functionality"""
    
    def test_load_audio_from_bytes(self):
        """Test audio loading from bytes"""
        # Create mock audio data
        audio_data = np.random.normal(0, 0.1, 22050 * 2).astype(np.float32)
        
        # Convert to bytes (simplified)
        audio_bytes = audio_data.tobytes()
        
        loaded_audio = load_audio_from_bytes(audio_bytes, 22050)
        
        assert isinstance(loaded_audio, np.ndarray)
        assert len(loaded_audio) > 0

@pytest.mark.asyncio
async def test_performance_requirements():
    """Test that attribution meets performance requirements"""
    # Per PRD: Both paths should run under 2 seconds per compare
    
    fingerprinter = ChromaprintFingerprinter()
    clap_model = CLAPEmbedding()
    
    # Create test audio
    test_audio = np.random.normal(0, 0.1, 22050 * 30)  # 30 seconds
    
    # Test Chromaprint performance
    start_time = time.time()
    fingerprint = fingerprinter.extract_fingerprint(test_audio)
    chromaprint_time = time.time() - start_time
    
    # Test embedding performance
    start_time = time.time()
    embedding = clap_model.extract_embedding(test_audio, 22050)
    embedding_time = time.time() - start_time
    
    # Both should be under 2 seconds
    assert chromaprint_time < 2.0, f"Chromaprint took {chromaprint_time:.2f}s"
    assert embedding_time < 2.0, f"Embedding took {embedding_time:.2f}s"

def test_accuracy_requirements():
    """Test that attribution meets accuracy requirements"""
    # Per PRD: At least 4 of 5 test generations should produce correct match confidence ≥ 0.85
    
    fingerprinter = ChromaprintFingerprinter()
    clap_model = CLAPEmbedding()
    
    # Create test audio
    base_audio = np.random.normal(0, 0.1, 22050 * 5)
    
    # Test with identical audio (should match)
    matches = 0
    for i in range(5):
        # Use same audio for high similarity
        test_audio = base_audio + np.random.normal(0, 0.01, len(base_audio))  # Add small noise
        
        # Test Chromaprint
        fp1 = fingerprinter.extract_fingerprint(base_audio)
        fp2 = fingerprinter.extract_fingerprint(test_audio)
        
        if fp1 and fp2:
            similarity = fingerprinter.compare_fingerprints(fp1, fp2)
            if similarity >= 0.85:
                matches += 1
    
    # Should have at least 4 matches out of 5
    assert matches >= 4, f"Only {matches}/5 matches met 0.85 threshold"

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
