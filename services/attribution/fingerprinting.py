"""
Chromaprint Fingerprinting for Audio Attribution

Per PRD Section 5.3: Attribution Auditor
Implements exact reuse checking using Chromaprint audio fingerprinting
"""

import chromaprint
import numpy as np
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class ChromaprintFingerprinter:
    """
    Chromaprint-based audio fingerprinting for exact reuse detection
    
    Per PRD Section 5.3: Hybrid fingerprinting + embedding similarity model
    """
    
    def __init__(self, sample_rate: int = 22050):
        self.sample_rate = sample_rate
        self.fp = chromaprint.Fingerprinter()
    
    def extract_fingerprint(self, audio_data: np.ndarray) -> Optional[List[int]]:
        """
        Extract Chromaprint fingerprint from audio data
        
        Args:
            audio_data: Audio samples as numpy array
            
        Returns:
            Chromaprint fingerprint as list of integers, or None if failed
        """
        try:
            # Ensure audio is in the correct format
            if audio_data.dtype != np.int16:
                audio_data = (audio_data * 32767).astype(np.int16)
            
            # Extract fingerprint
            fingerprint = self.fp.fingerprint(audio_data.tobytes(), self.sample_rate)
            
            if fingerprint:
                return fingerprint
            else:
                logger.warning("Failed to extract Chromaprint fingerprint")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting Chromaprint fingerprint: {e}")
            return None
    
    def compare_fingerprints(self, fp1: List[int], fp2: List[int]) -> float:
        """
        Compare two Chromaprint fingerprints and return similarity score
        
        Args:
            fp1: First fingerprint
            fp2: Second fingerprint
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        try:
            if not fp1 or not fp2:
                return 0.0
            
            # Use Chromaprint's built-in comparison
            similarity = chromaprint.compare_fingerprints(fp1, fp2)
            
            # Normalize to 0-1 range
            return max(0.0, min(1.0, similarity / 100.0))
            
        except Exception as e:
            logger.error(f"Error comparing fingerprints: {e}")
            return 0.0
    
    def find_matches(self, query_fp: List[int], reference_fps: List[Tuple[str, List[int]]], 
                    threshold: float = 0.8) -> List[Tuple[str, float]]:
        """
        Find matches for a query fingerprint against reference fingerprints
        
        Args:
            query_fp: Query fingerprint
            reference_fps: List of (track_id, fingerprint) tuples
            threshold: Minimum similarity threshold
            
        Returns:
            List of (track_id, similarity) tuples above threshold
        """
        matches = []
        
        for track_id, ref_fp in reference_fps:
            similarity = self.compare_fingerprints(query_fp, ref_fp)
            
            if similarity >= threshold:
                matches.append((track_id, similarity))
        
        # Sort by similarity (descending)
        matches.sort(key=lambda x: x[1], reverse=True)
        
        return matches

class AudioPreprocessor:
    """
    Audio preprocessing utilities for fingerprinting
    """
    
    @staticmethod
    def normalize_audio(audio_data: np.ndarray) -> np.ndarray:
        """
        Normalize audio data to [-1, 1] range
        
        Args:
            audio_data: Raw audio samples
            
        Returns:
            Normalized audio data
        """
        if len(audio_data) == 0:
            return audio_data
        
        # Normalize to [-1, 1]
        max_val = np.max(np.abs(audio_data))
        if max_val > 0:
            return audio_data / max_val
        
        return audio_data
    
    @staticmethod
    def resample_audio(audio_data: np.ndarray, original_sr: int, target_sr: int) -> np.ndarray:
        """
        Resample audio to target sample rate
        
        Args:
            audio_data: Audio samples
            original_sr: Original sample rate
            target_sr: Target sample rate
            
        Returns:
            Resampled audio data
        """
        if original_sr == target_sr:
            return audio_data
        
        try:
            import librosa
            return librosa.resample(audio_data, orig_sr=original_sr, target_sr=target_sr)
        except ImportError:
            # Fallback to simple decimation/interpolation
            ratio = target_sr / original_sr
            if ratio < 1:
                # Decimation
                step = int(1 / ratio)
                return audio_data[::step]
            else:
                # Interpolation
                return np.repeat(audio_data, int(ratio))
    
    @staticmethod
    def trim_silence(audio_data: np.ndarray, threshold: float = 0.01) -> np.ndarray:
        """
        Trim silence from beginning and end of audio
        
        Args:
            audio_data: Audio samples
            threshold: Silence threshold
            
        Returns:
            Trimmed audio data
        """
        # Find non-silent regions
        non_silent = np.abs(audio_data) > threshold
        
        if not np.any(non_silent):
            return audio_data
        
        # Find first and last non-silent samples
        first_non_silent = np.argmax(non_silent)
        last_non_silent = len(audio_data) - np.argmax(non_silent[::-1])
        
        return audio_data[first_non_silent:last_non_silent]
