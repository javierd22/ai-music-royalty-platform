#!/usr/bin/env python3
"""
Attribution Engine Simulation Script

Per PRD Section 11: Next 7-Day Execution
Simulates five generations using seeded track and logs results
"""

import asyncio
import json
import logging
import numpy as np
import time
from datetime import datetime
from typing import List, Dict, Any

from compare import load_audio_from_bytes, reference_tracks
from fingerprinting import ChromaprintFingerprinter, AudioPreprocessor
from embeddings import CLAPEmbedding, EmbeddingSimilarity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AttributionSimulator:
    """Simulates AI music generation and attribution detection"""
    
    def __init__(self):
        self.fingerprinter = ChromaprintFingerprinter()
        self.clap_model = CLAPEmbedding()
        self.embedding_similarity = EmbeddingSimilarity(self.clap_model)
        self.results = []
    
    def create_test_audio(self, duration_seconds: int = 5, base_frequency: float = 440.0) -> np.ndarray:
        """Create test audio with specific characteristics"""
        sample_rate = 22050
        t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds))
        
        # Create a simple sine wave with some harmonics
        audio = np.sin(2 * np.pi * base_frequency * t)
        audio += 0.3 * np.sin(2 * np.pi * base_frequency * 2 * t)  # Second harmonic
        audio += 0.1 * np.sin(2 * np.pi * base_frequency * 3 * t)  # Third harmonic
        
        # Add some noise
        audio += np.random.normal(0, 0.05, len(audio))
        
        # Normalize
        audio = audio / np.max(np.abs(audio))
        
        return audio
    
    def add_reference_track(self, track_id: str, audio_data: np.ndarray):
        """Add a reference track for comparison"""
        # Preprocess audio
        audio_data = AudioPreprocessor.normalize_audio(audio_data)
        audio_data = AudioPreprocessor.trim_silence(audio_data)
        
        # Extract fingerprint
        fingerprint = self.fingerprinter.extract_fingerprint(audio_data)
        
        # Store in reference tracks
        reference_tracks[track_id] = (audio_data, fingerprint)
        
        logger.info(f"Added reference track: {track_id}")
    
    async def simulate_generation(self, generation_id: str, base_track_id: str, 
                                variation_level: float = 0.1) -> Dict[str, Any]:
        """Simulate a single AI generation with attribution detection"""
        start_time = time.time()
        
        try:
            # Get base track
            if base_track_id not in reference_tracks:
                raise ValueError(f"Reference track {base_track_id} not found")
            
            base_audio, _ = reference_tracks[base_track_id]
            
            # Create variation (simulate AI generation)
            variation = np.random.normal(0, variation_level, len(base_audio))
            generated_audio = base_audio + variation
            generated_audio = AudioPreprocessor.normalize_audio(generated_audio)
            
            # Test Chromaprint attribution
            generated_fp = self.fingerprinter.extract_fingerprint(generated_audio)
            chromaprint_matches = []
            
            if generated_fp:
                ref_fps = [(tid, fp) for tid, (_, fp) in reference_tracks.items() if fp]
                chromaprint_matches = self.fingerprinter.find_matches(
                    generated_fp, ref_fps, threshold=0.7
                )
            
            # Test embedding attribution
            generated_emb = self.clap_model.extract_embedding(generated_audio, 22050)
            embedding_matches = []
            
            if generated_emb is not None:
                ref_embs = []
                for tid, (audio, _) in reference_tracks.items():
                    emb = self.clap_model.extract_embedding(audio, 22050)
                    if emb is not None:
                        ref_embs.append((tid, emb))
                
                embedding_matches = self.embedding_similarity.find_matches(
                    generated_emb, ref_embs, threshold=0.7
                )
            
            # Combine results
            all_matches = []
            
            # Add Chromaprint matches
            for track_id, similarity in chromaprint_matches:
                all_matches.append({
                    "track_id": track_id,
                    "similarity": similarity,
                    "method": "chromaprint",
                    "confidence": similarity
                })
            
            # Add embedding matches
            for track_id, similarity in embedding_matches:
                all_matches.append({
                    "track_id": track_id,
                    "similarity": similarity,
                    "method": "embedding",
                    "confidence": similarity
                })
            
            # Remove duplicates and sort by confidence
            unique_matches = {}
            for match in all_matches:
                track_id = match["track_id"]
                if track_id not in unique_matches or match["confidence"] > unique_matches[track_id]["confidence"]:
                    unique_matches[track_id] = match
            
            final_matches = list(unique_matches.values())
            final_matches.sort(key=lambda x: x["confidence"], reverse=True)
            
            processing_time = (time.time() - start_time) * 1000
            
            result = {
                "generation_id": generation_id,
                "base_track_id": base_track_id,
                "variation_level": variation_level,
                "matches": final_matches,
                "processing_time_ms": processing_time,
                "chromaprint_matches": len(chromaprint_matches),
                "embedding_matches": len(embedding_matches),
                "total_matches": len(final_matches),
                "timestamp": datetime.now().isoformat()
            }
            
            # Check if base track was correctly identified
            correct_match = any(
                match["track_id"] == base_track_id and match["confidence"] >= 0.85
                for match in final_matches
            )
            result["correct_identification"] = correct_match
            
            self.results.append(result)
            
            logger.info(f"Generation {generation_id}: {len(final_matches)} matches, "
                       f"correct={correct_match}, time={processing_time:.1f}ms")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in generation {generation_id}: {e}")
            return {
                "generation_id": generation_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def run_simulation(self, num_generations: int = 5) -> List[Dict[str, Any]]:
        """Run the complete simulation"""
        logger.info(f"Starting attribution simulation with {num_generations} generations")
        
        # Create reference tracks
        reference_track_ids = []
        for i in range(3):
            track_id = f"reference_track_{i+1}"
            base_freq = 440.0 * (i + 1)  # Different frequencies
            audio_data = self.create_test_audio(base_frequency=base_freq)
            self.add_reference_track(track_id, audio_data)
            reference_track_ids.append(track_id)
        
        # Run simulations
        tasks = []
        for i in range(num_generations):
            generation_id = f"generation_{i+1}"
            base_track_id = reference_track_ids[i % len(reference_track_ids)]
            variation_level = 0.05 + (i * 0.02)  # Increasing variation
            
            task = self.simulate_generation(generation_id, base_track_id, variation_level)
            tasks.append(task)
        
        # Wait for all simulations to complete
        results = await asyncio.gather(*tasks)
        
        # Calculate summary statistics
        correct_identifications = sum(1 for r in results if r.get("correct_identification", False))
        avg_processing_time = np.mean([r.get("processing_time_ms", 0) for r in results])
        total_matches = sum(r.get("total_matches", 0) for r in results)
        
        summary = {
            "total_generations": num_generations,
            "correct_identifications": correct_identifications,
            "accuracy_rate": correct_identifications / num_generations,
            "avg_processing_time_ms": avg_processing_time,
            "total_matches": total_matches,
            "reference_tracks": len(reference_tracks),
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Simulation complete: {correct_identifications}/{num_generations} correct "
                   f"({summary['accuracy_rate']:.1%}), avg time: {avg_processing_time:.1f}ms")
        
        return results, summary

async def main():
    """Main simulation function"""
    simulator = AttributionSimulator()
    
    # Run simulation
    results, summary = await simulator.run_simulation(num_generations=5)
    
    # Save results
    output_file = "attribution_simulation_results.json"
    with open(output_file, "w") as f:
        json.dump({
            "summary": summary,
            "results": results
        }, f, indent=2)
    
    logger.info(f"Results saved to {output_file}")
    
    # Print summary
    print("\n" + "="*50)
    print("ATTRIBUTION SIMULATION RESULTS")
    print("="*50)
    print(f"Total generations: {summary['total_generations']}")
    print(f"Correct identifications: {summary['correct_identifications']}")
    print(f"Accuracy rate: {summary['accuracy_rate']:.1%}")
    print(f"Average processing time: {summary['avg_processing_time_ms']:.1f}ms")
    print(f"Total matches found: {summary['total_matches']}")
    print(f"Reference tracks: {summary['reference_tracks']}")
    
    # Check if we met the requirements
    print("\n" + "="*50)
    print("REQUIREMENTS CHECK")
    print("="*50)
    
    # Requirement 1: At least 4 of 5 correct matches
    if summary['correct_identifications'] >= 4:
        print("✅ Accuracy requirement met: ≥4/5 correct identifications")
    else:
        print(f"❌ Accuracy requirement failed: {summary['correct_identifications']}/5 correct")
    
    # Requirement 2: Processing time under 2 seconds
    if summary['avg_processing_time_ms'] < 2000:
        print("✅ Performance requirement met: <2s processing time")
    else:
        print(f"❌ Performance requirement failed: {summary['avg_processing_time_ms']:.1f}ms")
    
    print("="*50)

if __name__ == "__main__":
    asyncio.run(main())
