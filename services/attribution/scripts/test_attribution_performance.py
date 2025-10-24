#!/usr/bin/env python3
"""
Attribution Engine Performance Test

Per PRD Section 6: KPIs & Metrics
Tests attribution engine performance with simulated data
"""

import asyncio
import time
import json
import random
from typing import List, Dict, Any
import aiohttp

class AttributionPerformanceTest:
    """
    Performance testing for attribution engine
    Per PRD Section 6: Performance measurement
    """
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.results = []
    
    async def test_single_attribution(self, session: aiohttp.ClientSession, 
                                   test_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test single attribution request
        Per PRD Section 6: Individual request testing
        """
        start_time = time.time()
        
        try:
            # Create test audio data
            audio_data = {
                'audio_url': test_data['audio_url'],
                'duration': test_data['duration'],
                'sample_rate': 44100,
                'format': 'wav'
            }
            
            # Make attribution request
            async with session.post(
                f"{self.base_url}/compare",
                json=audio_data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                
                if response.status == 200:
                    result = await response.json()
                    return {
                        'success': True,
                        'latency_ms': latency_ms,
                        'status_code': response.status,
                        'matches': result.get('total_matches', 0),
                        'threshold_exceeded': result.get('threshold_exceeded', 0),
                        'response_size': len(str(result))
                    }
                else:
                    return {
                        'success': False,
                        'latency_ms': latency_ms,
                        'status_code': response.status,
                        'error': f"HTTP {response.status}",
                        'matches': 0,
                        'threshold_exceeded': 0,
                        'response_size': 0
                    }
        
        except asyncio.TimeoutError:
            end_time = time.time()
            latency_ms = int((end_time - start_time) * 1000)
            return {
                'success': False,
                'latency_ms': latency_ms,
                'status_code': 408,
                'error': 'Timeout',
                'matches': 0,
                'threshold_exceeded': 0,
                'response_size': 0
            }
        
        except Exception as e:
            end_time = time.time()
            latency_ms = int((end_time - start_time) * 1000)
            return {
                'success': False,
                'latency_ms': latency_ms,
                'status_code': 500,
                'error': str(e),
                'matches': 0,
                'threshold_exceeded': 0,
                'response_size': 0
            }
    
    async def run_performance_test(self, num_requests: int = 50) -> Dict[str, Any]:
        """
        Run performance test with multiple requests
        Per PRD Section 6: Load testing
        """
        print(f"🧪 Running attribution performance test with {num_requests} requests...")
        
        # Generate test data
        test_data_list = []
        for i in range(num_requests):
            test_data = {
                'audio_url': f"https://test-audio.example.com/test_{i}.wav",
                'duration': random.randint(30, 300),
                'sample_rate': 44100,
                'format': 'wav'
            }
            test_data_list.append(test_data)
        
        # Run tests
        async with aiohttp.ClientSession() as session:
            tasks = []
            for test_data in test_data_list:
                task = self.test_single_attribution(session, test_data)
                tasks.append(task)
            
            # Execute all requests concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        successful_requests = []
        failed_requests = []
        
        for result in results:
            if isinstance(result, Exception):
                failed_requests.append({
                    'success': False,
                    'error': str(result),
                    'latency_ms': 0
                })
            elif result['success']:
                successful_requests.append(result)
            else:
                failed_requests.append(result)
        
        self.results = results
        
        # Calculate metrics
        total_requests = len(results)
        success_count = len(successful_requests)
        failure_count = len(failed_requests)
        success_rate = (success_count / total_requests * 100) if total_requests > 0 else 0
        
        # Latency metrics
        latencies = [r['latency_ms'] for r in successful_requests if 'latency_ms' in r]
        if latencies:
            avg_latency = sum(latencies) / len(latencies)
            min_latency = min(latencies)
            max_latency = max(latencies)
            p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
        else:
            avg_latency = min_latency = max_latency = p95_latency = 0
        
        # Throughput metrics
        total_matches = sum(r.get('matches', 0) for r in successful_requests)
        total_threshold_exceeded = sum(r.get('threshold_exceeded', 0) for r in successful_requests)
        
        return {
            'test_summary': {
                'total_requests': total_requests,
                'successful_requests': success_count,
                'failed_requests': failure_count,
                'success_rate_percent': round(success_rate, 2)
            },
            'latency_metrics': {
                'avg_latency_ms': round(avg_latency, 2),
                'min_latency_ms': min_latency,
                'max_latency_ms': max_latency,
                'p95_latency_ms': p95_latency
            },
            'attribution_metrics': {
                'total_matches': total_matches,
                'total_threshold_exceeded': total_threshold_exceeded,
                'avg_matches_per_request': round(total_matches / success_count, 2) if success_count > 0 else 0
            },
            'error_analysis': {
                'error_types': {},
                'timeout_count': len([r for r in failed_requests if r.get('error') == 'Timeout']),
                'http_error_count': len([r for r in failed_requests if r.get('status_code', 0) >= 400])
            },
            'detailed_results': results
        }
    
    def save_results(self, filename: str) -> bool:
        """
        Save test results to file
        Per PRD Section 6: Results persistence
        """
        try:
            with open(filename, 'w') as f:
                json.dump(self.results, f, indent=2, default=str)
            return True
        except Exception as e:
            print(f"Error saving results: {e}")
            return False

async def main():
    """
    Main performance test execution
    Per PRD Section 6: Performance testing workflow
    """
    tester = AttributionPerformanceTest()
    
    print("🚀 Starting Attribution Engine Performance Test")
    print("=" * 50)
    
    # Run performance test
    results = await tester.run_performance_test(num_requests=50)
    
    # Print results
    print("\n📊 Performance Test Results:")
    print("=" * 50)
    
    summary = results['test_summary']
    print(f"Total Requests: {summary['total_requests']}")
    print(f"Successful: {summary['successful_requests']}")
    print(f"Failed: {summary['failed_requests']}")
    print(f"Success Rate: {summary['success_rate_percent']}%")
    
    latency = results['latency_metrics']
    print(f"\n⏱️  Latency Metrics:")
    print(f"Average: {latency['avg_latency_ms']}ms")
    print(f"Min: {latency['min_latency_ms']}ms")
    print(f"Max: {latency['max_latency_ms']}ms")
    print(f"95th Percentile: {latency['p95_latency_ms']}ms")
    
    attribution = results['attribution_metrics']
    print(f"\n🎯 Attribution Metrics:")
    print(f"Total Matches: {attribution['total_matches']}")
    print(f"Threshold Exceeded: {attribution['total_threshold_exceeded']}")
    print(f"Avg Matches/Request: {attribution['avg_matches_per_request']}")
    
    # Save results
    timestamp = time.strftime('%Y%m%d_%H%M%S')
    results_file = f"attribution_performance_test_{timestamp}.json"
    
    if tester.save_results(results_file):
        print(f"\n💾 Results saved to: {results_file}")
    
    # Performance assessment
    print(f"\n🎯 Performance Assessment:")
    if latency['p95_latency_ms'] <= 2000:
        print("✅ Latency: PASS (95th percentile <= 2000ms)")
    else:
        print("❌ Latency: FAIL (95th percentile > 2000ms)")
    
    if summary['success_rate_percent'] >= 95:
        print("✅ Success Rate: PASS (>= 95%)")
    else:
        print("❌ Success Rate: FAIL (< 95%)")
    
    if attribution['total_matches'] > 0:
        print("✅ Attribution: PASS (matches found)")
    else:
        print("❌ Attribution: FAIL (no matches found)")
    
    print("\n🎉 Performance test complete!")

if __name__ == "__main__":
    asyncio.run(main())
