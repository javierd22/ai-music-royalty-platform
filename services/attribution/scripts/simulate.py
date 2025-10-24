#!/usr/bin/env python3
"""
Attribution Simulation Script

Per PRD Section 6: KPIs & Metrics
Generates 200 simulated generation events for testing and metrics collection
"""

import asyncio
import json
import random
import time
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
import aiohttp
import numpy as np

# Configuration
SIMULATION_CONFIG = {
    'total_events': 200,
    'base_url': 'http://localhost:8001',
    'generators': ['suno-v3', 'udio-v2', 'stable-audio', 'musicgen', 'jukebox'],
    'confidence_range': (0.6, 0.95),
    'latency_range_ms': (100, 2000),
    'success_rate': 0.85,  # 85% of generations succeed
    'manifest_rate': 0.90,  # 90% of successful generations have manifests
    'batch_size': 10,  # Process in batches
    'delay_between_batches': 0.5  # seconds
}

class AttributionSimulator:
    """
    Simulates AI music generation events for testing attribution engine
    Per PRD Section 6: Performance testing and metrics collection
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.results = []
        self.metrics = {
            'total_events': 0,
            'successful_events': 0,
            'failed_events': 0,
            'events_with_manifests': 0,
            'total_latency_ms': 0,
            'attribution_matches': 0,
            'false_positives': 0,
            'start_time': None,
            'end_time': None
        }
    
    async def generate_test_tracks(self) -> List[Dict[str, Any]]:
        """
        Generate test track data for simulation
        Per PRD Section 6: Test data generation
        """
        tracks = []
        
        # Create some base tracks for attribution testing
        base_tracks = [
            {
                'title': 'Electronic Dreams',
                'genre': 'electronic',
                'tempo': 128,
                'key': 'C major',
                'duration': 180
            },
            {
                'title': 'Jazz Fusion',
                'genre': 'jazz',
                'tempo': 120,
                'key': 'F minor',
                'duration': 240
            },
            {
                'title': 'Rock Anthem',
                'genre': 'rock',
                'tempo': 140,
                'key': 'G major',
                'duration': 200
            },
            {
                'title': 'Classical Symphony',
                'genre': 'classical',
                'tempo': 80,
                'key': 'D major',
                'duration': 300
            },
            {
                'title': 'Hip Hop Beat',
                'genre': 'hip-hop',
                'tempo': 90,
                'key': 'A minor',
                'duration': 160
            }
        ]
        
        # Generate variations of base tracks
        for i in range(20):  # 20 base tracks
            base_track = random.choice(base_tracks)
            track = {
                'id': str(uuid.uuid4()),
                'title': f"{base_track['title']} v{i+1}",
                'genre': base_track['genre'],
                'tempo': base_track['tempo'] + random.randint(-10, 10),
                'key': base_track['key'],
                'duration': base_track['duration'] + random.randint(-30, 30),
                'created_at': datetime.utcnow() - timedelta(days=random.randint(1, 30))
            }
            tracks.append(track)
        
        return tracks
    
    async def simulate_generation_event(self, session: aiohttp.ClientSession, 
                                      track: Dict[str, Any], 
                                      generator_id: str) -> Dict[str, Any]:
        """
        Simulate a single generation event
        Per PRD Section 6: Event simulation
        """
        start_time = time.time()
        event_id = str(uuid.uuid4())
        
        # Generate event data
        event_data = {
            'generator_id': generator_id,
            'track_id': track['id'],
            'start_time': datetime.utcnow().isoformat(),
            'prompt': f"Generate {track['genre']} music in {track['key']} at {track['tempo']} BPM",
            'confidence': random.uniform(*self.config['confidence_range']),
            'metadata': {
                'genre': track['genre'],
                'tempo': track['tempo'],
                'key': track['key'],
                'duration': track['duration'],
                'simulation': True
            },
            'idempotency_key': f"sim_{event_id}"
        }
        
        try:
            # Start generation
            async with session.post(
                f"{self.config['base_url']}/api/events/start",
                json=event_data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    start_result = await response.json()
                    generation_id = start_result.get('id')
                    
                    # Simulate processing time
                    processing_time = random.uniform(0.1, 2.0)
                    await asyncio.sleep(processing_time)
                    
                    # Determine if generation succeeds
                    success = random.random() < self.config['success_rate']
                    
                    if success:
                        # End generation with success
                        end_data = {
                            'output_id': f"output_{event_id}",
                            'output_metadata': {
                                'duration': track['duration'],
                                'format': 'wav',
                                'sample_rate': 44100,
                                'bit_depth': 16
                            }
                        }
                        
                        async with session.post(
                            f"{self.config['base_url']}/api/events/end",
                            json={**end_data, 'generation_id': generation_id},
                            timeout=aiohttp.ClientTimeout(total=30)
                        ) as end_response:
                            if end_response.status == 200:
                                # Generate manifest if applicable
                                has_manifest = random.random() < self.config['manifest_rate']
                                manifest_url = None
                                if has_manifest:
                                    manifest_url = f"https://manifests.example.com/{generation_id}.json"
                                
                                # Update generation with manifest
                                if manifest_url:
                                    update_data = {
                                        'manifest_url': manifest_url,
                                        'metadata': {
                                            **event_data['metadata'],
                                            'manifest_generated': True,
                                            'c2pa_compliant': True
                                        }
                                    }
                                    
                                    async with session.patch(
                                        f"{self.config['base_url']}/api/events/{generation_id}",
                                        json=update_data,
                                        timeout=aiohttp.ClientTimeout(total=30)
                                    ) as update_response:
                                        pass  # Ignore update response for now
                                
                                # Test attribution
                                attribution_result = await self.test_attribution(
                                    session, track, event_data
                                )
                                
                                latency_ms = int((time.time() - start_time) * 1000)
                                
                                return {
                                    'event_id': event_id,
                                    'generation_id': generation_id,
                                    'generator_id': generator_id,
                                    'track_id': track['id'],
                                    'success': True,
                                    'latency_ms': latency_ms,
                                    'has_manifest': has_manifest,
                                    'manifest_url': manifest_url,
                                    'attribution_result': attribution_result,
                                    'confidence': event_data['confidence']
                                }
                    
                    # Generation failed
                    latency_ms = int((time.time() - start_time) * 1000)
                    return {
                        'event_id': event_id,
                        'generation_id': generation_id,
                        'generator_id': generator_id,
                        'track_id': track['id'],
                        'success': False,
                        'latency_ms': latency_ms,
                        'has_manifest': False,
                        'manifest_url': None,
                        'attribution_result': None,
                        'confidence': event_data['confidence'],
                        'error': 'Generation failed'
                    }
                else:
                    return {
                        'event_id': event_id,
                        'generator_id': generator_id,
                        'track_id': track['id'],
                        'success': False,
                        'latency_ms': int((time.time() - start_time) * 1000),
                        'has_manifest': False,
                        'manifest_url': None,
                        'attribution_result': None,
                        'confidence': event_data['confidence'],
                        'error': f'HTTP {response.status}'
                    }
        
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                'event_id': event_id,
                'generator_id': generator_id,
                'track_id': track['id'],
                'success': False,
                'latency_ms': latency_ms,
                'has_manifest': False,
                'manifest_url': None,
                'attribution_result': None,
                'confidence': event_data['confidence'],
                'error': str(e)
            }
    
    async def test_attribution(self, session: aiohttp.ClientSession, 
                              track: Dict[str, Any], 
                              event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test attribution engine with simulated data
        Per PRD Section 6: Attribution testing
        """
        try:
            # Create test audio data (simulated)
            test_audio_data = {
                'audio_url': f"https://test-audio.example.com/{track['id']}.wav",
                'duration': track['duration'],
                'sample_rate': 44100,
                'format': 'wav'
            }
            
            # Test attribution
            async with session.post(
                f"{self.config['base_url']}/compare",
                json=test_audio_data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return {
                        'matched': result.get('matched', False),
                        'confidence': result.get('confidence', 0.0),
                        'track_id': result.get('track_id'),
                        'match_type': result.get('match_type', 'unknown'),
                        'latency_ms': result.get('latency_ms', 0)
                    }
                else:
                    return {
                        'matched': False,
                        'confidence': 0.0,
                        'track_id': None,
                        'match_type': 'error',
                        'latency_ms': 0,
                        'error': f'HTTP {response.status}'
                    }
        
        except Exception as e:
            return {
                'matched': False,
                'confidence': 0.0,
                'track_id': None,
                'match_type': 'error',
                'latency_ms': 0,
                'error': str(e)
            }
    
    async def run_simulation(self) -> Dict[str, Any]:
        """
        Run the complete simulation
        Per PRD Section 6: Full simulation execution
        """
        print(f"Starting attribution simulation with {self.config['total_events']} events...")
        
        self.metrics['start_time'] = datetime.utcnow()
        
        # Generate test tracks
        tracks = await self.generate_test_tracks()
        
        # Run simulation
        async with aiohttp.ClientSession() as session:
            for batch_start in range(0, self.config['total_events'], self.config['batch_size']):
                batch_end = min(batch_start + self.config['batch_size'], self.config['total_events'])
                batch_tasks = []
                
                print(f"Processing batch {batch_start//self.config['batch_size'] + 1}: events {batch_start+1}-{batch_end}")
                
                for i in range(batch_start, batch_end):
                    track = random.choice(tracks)
                    generator_id = random.choice(self.config['generators'])
                    
                    task = self.simulate_generation_event(session, track, generator_id)
                    batch_tasks.append(task)
                
                # Execute batch
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Process results
                for result in batch_results:
                    if isinstance(result, Exception):
                        print(f"Error in batch: {result}")
                        continue
                    
                    self.results.append(result)
                    self.update_metrics(result)
                
                # Delay between batches
                if batch_end < self.config['total_events']:
                    await asyncio.sleep(self.config['delay_between_batches'])
        
        self.metrics['end_time'] = datetime.utcnow()
        return self.calculate_final_metrics()
    
    def update_metrics(self, result: Dict[str, Any]) -> None:
        """
        Update metrics with result data
        Per PRD Section 6: Metrics collection
        """
        self.metrics['total_events'] += 1
        
        if result['success']:
            self.metrics['successful_events'] += 1
            if result['has_manifest']:
                self.metrics['events_with_manifests'] += 1
        else:
            self.metrics['failed_events'] += 1
        
        self.metrics['total_latency_ms'] += result['latency_ms']
        
        if result['attribution_result']:
            if result['attribution_result']['matched']:
                self.metrics['attribution_matches'] += 1
                # Check for false positives (simplified)
                if result['attribution_result']['confidence'] < 0.7:
                    self.metrics['false_positives'] += 1
    
    def calculate_final_metrics(self) -> Dict[str, Any]:
        """
        Calculate final metrics and KPIs
        Per PRD Section 6: KPI calculation
        """
        total_events = self.metrics['total_events']
        successful_events = self.metrics['successful_events']
        events_with_manifests = self.metrics['events_with_manifests']
        attribution_matches = self.metrics['attribution_matches']
        false_positives = self.metrics['false_positives']
        
        # Calculate KPIs
        success_rate = (successful_events / total_events * 100) if total_events > 0 else 0
        manifest_capture_rate = (events_with_manifests / successful_events * 100) if successful_events > 0 else 0
        attribution_rate = (attribution_matches / successful_events * 100) if successful_events > 0 else 0
        false_positive_rate = (false_positives / attribution_matches * 100) if attribution_matches > 0 else 0
        
        # Calculate latency metrics
        avg_latency_ms = self.metrics['total_latency_ms'] / total_events if total_events > 0 else 0
        
        # Calculate duration
        duration = (self.metrics['end_time'] - self.metrics['start_time']).total_seconds()
        
        return {
            'simulation_summary': {
                'total_events': total_events,
                'successful_events': successful_events,
                'failed_events': self.metrics['failed_events'],
                'events_with_manifests': events_with_manifests,
                'attribution_matches': attribution_matches,
                'false_positives': false_positives
            },
            'kpis': {
                'success_rate_percent': round(success_rate, 2),
                'manifest_capture_rate_percent': round(manifest_capture_rate, 2),
                'attribution_rate_percent': round(attribution_rate, 2),
                'false_positive_rate_percent': round(false_positive_rate, 2)
            },
            'performance': {
                'avg_latency_ms': round(avg_latency_ms, 2),
                'total_duration_seconds': round(duration, 2),
                'events_per_second': round(total_events / duration, 2) if duration > 0 else 0
            },
            'prd_targets': {
                'detection_precision_target': 95.0,
                'verified_payout_rate_target': 99.0,
                'compliance_coverage_target': 100.0
            },
            'results': self.results
        }

async def main():
    """
    Main simulation execution
    Per PRD Section 6: Simulation execution
    """
    simulator = AttributionSimulator(SIMULATION_CONFIG)
    
    try:
        results = await simulator.run_simulation()
        
        # Save results to file
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        results_file = f"simulation_results_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n=== Simulation Complete ===")
        print(f"Total Events: {results['simulation_summary']['total_events']}")
        print(f"Success Rate: {results['kpis']['success_rate_percent']}%")
        print(f"Manifest Capture Rate: {results['kpis']['manifest_capture_rate_percent']}%")
        print(f"Attribution Rate: {results['kpis']['attribution_rate_percent']}%")
        print(f"False Positive Rate: {results['kpis']['false_positive_rate_percent']}%")
        print(f"Average Latency: {results['performance']['avg_latency_ms']}ms")
        print(f"Events/Second: {results['performance']['events_per_second']}")
        print(f"Results saved to: {results_file}")
        
        return results
        
    except Exception as e:
        print(f"Simulation failed: {e}")
        return None

if __name__ == "__main__":
    asyncio.run(main())
