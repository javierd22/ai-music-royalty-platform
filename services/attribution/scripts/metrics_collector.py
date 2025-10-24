#!/usr/bin/env python3
"""
Metrics Collection and Analysis

Per PRD Section 6: KPIs & Metrics
Collects and analyzes performance metrics from simulation results
"""

import json
import csv
import statistics
from datetime import datetime
from typing import Dict, List, Any
import numpy as np

class MetricsCollector:
    """
    Collects and analyzes attribution engine metrics
    Per PRD Section 6: Performance analysis and reporting
    """
    
    def __init__(self, results_file: str):
        self.results_file = results_file
        self.results = None
        self.metrics = {}
    
    def load_results(self) -> bool:
        """
        Load simulation results from file
        Per PRD Section 6: Data loading
        """
        try:
            with open(self.results_file, 'r') as f:
                self.results = json.load(f)
            return True
        except Exception as e:
            print(f"Error loading results: {e}")
            return False
    
    def calculate_detailed_metrics(self) -> Dict[str, Any]:
        """
        Calculate detailed performance metrics
        Per PRD Section 6: Comprehensive metrics analysis
        """
        if not self.results:
            return {}
        
        results = self.results['results']
        simulation_summary = self.results['simulation_summary']
        
        # Latency analysis
        latencies = [r['latency_ms'] for r in results if 'latency_ms' in r]
        latency_metrics = {
            'min_latency_ms': min(latencies) if latencies else 0,
            'max_latency_ms': max(latencies) if latencies else 0,
            'avg_latency_ms': statistics.mean(latencies) if latencies else 0,
            'median_latency_ms': statistics.median(latencies) if latencies else 0,
            'p95_latency_ms': np.percentile(latencies, 95) if latencies else 0,
            'p99_latency_ms': np.percentile(latencies, 99) if latencies else 0
        }
        
        # Success rate analysis by generator
        generator_stats = {}
        for result in results:
            generator = result['generator_id']
            if generator not in generator_stats:
                generator_stats[generator] = {
                    'total': 0,
                    'successful': 0,
                    'with_manifests': 0,
                    'attribution_matches': 0,
                    'latencies': []
                }
            
            generator_stats[generator]['total'] += 1
            if result['success']:
                generator_stats[generator]['successful'] += 1
                if result['has_manifest']:
                    generator_stats[generator]['with_manifests'] += 1
                if result['attribution_result'] and result['attribution_result']['matched']:
                    generator_stats[generator]['attribution_matches'] += 1
            
            generator_stats[generator]['latencies'].append(result['latency_ms'])
        
        # Calculate generator-specific metrics
        for generator, stats in generator_stats.items():
            stats['success_rate'] = (stats['successful'] / stats['total'] * 100) if stats['total'] > 0 else 0
            stats['manifest_rate'] = (stats['with_manifests'] / stats['successful'] * 100) if stats['successful'] > 0 else 0
            stats['attribution_rate'] = (stats['attribution_matches'] / stats['successful'] * 100) if stats['successful'] > 0 else 0
            stats['avg_latency'] = statistics.mean(stats['latencies']) if stats['latencies'] else 0
        
        # Confidence analysis
        confidences = [r['confidence'] for r in results if 'confidence' in r]
        confidence_metrics = {
            'min_confidence': min(confidences) if confidences else 0,
            'max_confidence': max(confidences) if confidences else 0,
            'avg_confidence': statistics.mean(confidences) if confidences else 0,
            'median_confidence': statistics.median(confidences) if confidences else 0
        }
        
        # Attribution analysis
        attribution_results = [r['attribution_result'] for r in results if r['attribution_result']]
        attribution_metrics = {
            'total_attribution_tests': len(attribution_results),
            'successful_attribution_tests': len([r for r in attribution_results if r['matched']]),
            'avg_attribution_confidence': statistics.mean([r['confidence'] for r in attribution_results if 'confidence' in r]) if attribution_results else 0,
            'avg_attribution_latency': statistics.mean([r['latency_ms'] for r in attribution_results if 'latency_ms' in r]) if attribution_results else 0
        }
        
        # Error analysis
        errors = [r for r in results if 'error' in r]
        error_analysis = {
            'total_errors': len(errors),
            'error_rate': (len(errors) / len(results) * 100) if results else 0,
            'error_types': {}
        }
        
        for error in errors:
            error_type = error['error']
            error_analysis['error_types'][error_type] = error_analysis['error_types'].get(error_type, 0) + 1
        
        return {
            'latency_metrics': latency_metrics,
            'generator_stats': generator_stats,
            'confidence_metrics': confidence_metrics,
            'attribution_metrics': attribution_metrics,
            'error_analysis': error_analysis,
            'simulation_summary': simulation_summary
        }
    
    def generate_csv_report(self, output_file: str) -> bool:
        """
        Generate CSV report for data analysis
        Per PRD Section 6: Data export for analysis
        """
        if not self.results:
            return False
        
        try:
            with open(output_file, 'w', newline='') as csvfile:
                fieldnames = [
                    'event_id', 'generation_id', 'generator_id', 'track_id',
                    'success', 'latency_ms', 'has_manifest', 'manifest_url',
                    'confidence', 'attribution_matched', 'attribution_confidence',
                    'attribution_latency', 'error'
                ]
                
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for result in self.results['results']:
                    row = {
                        'event_id': result['event_id'],
                        'generation_id': result.get('generation_id', ''),
                        'generator_id': result['generator_id'],
                        'track_id': result['track_id'],
                        'success': result['success'],
                        'latency_ms': result['latency_ms'],
                        'has_manifest': result['has_manifest'],
                        'manifest_url': result.get('manifest_url', ''),
                        'confidence': result['confidence'],
                        'attribution_matched': result['attribution_result']['matched'] if result['attribution_result'] else False,
                        'attribution_confidence': result['attribution_result']['confidence'] if result['attribution_result'] else 0,
                        'attribution_latency': result['attribution_result']['latency_ms'] if result['attribution_result'] else 0,
                        'error': result.get('error', '')
                    }
                    writer.writerow(row)
            
            return True
            
        except Exception as e:
            print(f"Error generating CSV report: {e}")
            return False
    
    def generate_markdown_report(self, output_file: str) -> bool:
        """
        Generate markdown report for documentation
        Per PRD Section 6: Metrics documentation
        """
        if not self.results:
            return False
        
        try:
            detailed_metrics = self.calculate_detailed_metrics()
            
            with open(output_file, 'w') as f:
                f.write("# Day 6 Attribution Engine Metrics Report\n\n")
                f.write(f"**Generated:** {datetime.utcnow().isoformat()}\n\n")
                
                # Executive Summary
                f.write("## Executive Summary\n\n")
                f.write(f"- **Total Events:** {self.results['simulation_summary']['total_events']}\n")
                f.write(f"- **Success Rate:** {self.results['kpis']['success_rate_percent']}%\n")
                f.write(f"- **Manifest Capture Rate:** {self.results['kpis']['manifest_capture_rate_percent']}%\n")
                f.write(f"- **Attribution Rate:** {self.results['kpis']['attribution_rate_percent']}%\n")
                f.write(f"- **False Positive Rate:** {self.results['kpis']['false_positive_rate_percent']}%\n")
                f.write(f"- **Average Latency:** {self.results['performance']['avg_latency_ms']}ms\n\n")
                
                # PRD KPI Comparison
                f.write("## PRD KPI Comparison\n\n")
                f.write("| Metric | Target | Achieved | Status |\n")
                f.write("|--------|--------|----------|--------|\n")
                
                # Detection precision (simplified as attribution rate)
                detection_precision = self.results['kpis']['attribution_rate_percent']
                detection_status = "✅ PASS" if detection_precision >= 95 else "❌ FAIL"
                f.write(f"| Detection Precision | 95% | {detection_precision}% | {detection_status} |\n")
                
                # Verified payout rate (simplified as manifest capture rate)
                verified_payout = self.results['kpis']['manifest_capture_rate_percent']
                payout_status = "✅ PASS" if verified_payout >= 99 else "❌ FAIL"
                f.write(f"| Verified Payout Rate | 99% | {verified_payout}% | {payout_status} |\n")
                
                # Compliance coverage (simplified as success rate)
                compliance_coverage = self.results['kpis']['success_rate_percent']
                compliance_status = "✅ PASS" if compliance_coverage >= 100 else "❌ FAIL"
                f.write(f"| Compliance Coverage | 100% | {compliance_coverage}% | {compliance_status} |\n\n")
                
                # Performance Metrics
                f.write("## Performance Metrics\n\n")
                latency_metrics = detailed_metrics['latency_metrics']
                f.write(f"- **Min Latency:** {latency_metrics['min_latency_ms']}ms\n")
                f.write(f"- **Max Latency:** {latency_metrics['max_latency_ms']}ms\n")
                f.write(f"- **Average Latency:** {latency_metrics['avg_latency_ms']}ms\n")
                f.write(f"- **Median Latency:** {latency_metrics['median_latency_ms']}ms\n")
                f.write(f"- **95th Percentile:** {latency_metrics['p95_latency_ms']}ms\n")
                f.write(f"- **99th Percentile:** {latency_metrics['p99_latency_ms']}ms\n\n")
                
                # Generator Performance
                f.write("## Generator Performance\n\n")
                f.write("| Generator | Success Rate | Manifest Rate | Attribution Rate | Avg Latency |\n")
                f.write("|-----------|--------------|---------------|------------------|-------------|\n")
                
                for generator, stats in detailed_metrics['generator_stats'].items():
                    f.write(f"| {generator} | {stats['success_rate']:.1f}% | {stats['manifest_rate']:.1f}% | {stats['attribution_rate']:.1f}% | {stats['avg_latency']:.1f}ms |\n")
                
                f.write("\n")
                
                # Error Analysis
                f.write("## Error Analysis\n\n")
                error_analysis = detailed_metrics['error_analysis']
                f.write(f"- **Total Errors:** {error_analysis['total_errors']}\n")
                f.write(f"- **Error Rate:** {error_analysis['error_rate']:.2f}%\n\n")
                
                if error_analysis['error_types']:
                    f.write("### Error Types\n\n")
                    for error_type, count in error_analysis['error_types'].items():
                        f.write(f"- **{error_type}:** {count} occurrences\n")
                    f.write("\n")
                
                # Recommendations
                f.write("## Recommendations\n\n")
                
                if detection_precision < 95:
                    f.write("- ⚠️ **Detection Precision Below Target:** Consider improving attribution algorithm accuracy\n")
                
                if verified_payout < 99:
                    f.write("- ⚠️ **Manifest Capture Rate Below Target:** Improve manifest generation reliability\n")
                
                if compliance_coverage < 100:
                    f.write("- ⚠️ **Success Rate Below Target:** Investigate and fix generation failures\n")
                
                if latency_metrics['p95_latency_ms'] > 2000:
                    f.write("- ⚠️ **High Latency:** Optimize attribution engine performance\n")
                
                if error_analysis['error_rate'] > 5:
                    f.write("- ⚠️ **High Error Rate:** Investigate and resolve error sources\n")
                
                if all([
                    detection_precision >= 95,
                    verified_payout >= 99,
                    compliance_coverage >= 100,
                    latency_metrics['p95_latency_ms'] <= 2000,
                    error_analysis['error_rate'] <= 5
                ]):
                    f.write("- ✅ **All KPIs Met:** System ready for production deployment\n")
                
                f.write("\n")
                
                # Technical Details
                f.write("## Technical Details\n\n")
                f.write(f"- **Simulation Duration:** {self.results['performance']['total_duration_seconds']} seconds\n")
                f.write(f"- **Events per Second:** {self.results['performance']['events_per_second']}\n")
                f.write(f"- **Total Attribution Tests:** {detailed_metrics['attribution_metrics']['total_attribution_tests']}\n")
                f.write(f"- **Successful Attribution Tests:** {detailed_metrics['attribution_metrics']['successful_attribution_tests']}\n")
                f.write(f"- **Average Attribution Confidence:** {detailed_metrics['attribution_metrics']['avg_attribution_confidence']:.3f}\n")
                f.write(f"- **Average Attribution Latency:** {detailed_metrics['attribution_metrics']['avg_attribution_latency']:.1f}ms\n\n")
            
            return True
            
        except Exception as e:
            print(f"Error generating markdown report: {e}")
            return False

def main():
    """
    Main metrics collection execution
    Per PRD Section 6: Metrics collection and reporting
    """
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python metrics_collector.py <results_file>")
        sys.exit(1)
    
    results_file = sys.argv[1]
    collector = MetricsCollector(results_file)
    
    if not collector.load_results():
        print("Failed to load results")
        sys.exit(1)
    
    # Generate reports
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    csv_file = f"attribution_metrics_{timestamp}.csv"
    md_file = f"docs/reports/day6_metrics_{timestamp}.md"
    
    print("Generating CSV report...")
    if collector.generate_csv_report(csv_file):
        print(f"CSV report saved to: {csv_file}")
    else:
        print("Failed to generate CSV report")
    
    print("Generating markdown report...")
    if collector.generate_markdown_report(md_file):
        print(f"Markdown report saved to: {md_file}")
    else:
        print("Failed to generate markdown report")
    
    print("Metrics collection complete!")

if __name__ == "__main__":
    main()
