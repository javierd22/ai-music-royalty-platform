#!/usr/bin/env python3
"""
Day 6 Simulation Runner

Per PRD Section 6: KPIs & Metrics
Runs the attribution simulation and generates metrics reports
"""

import asyncio
import subprocess
import sys
import os
from datetime import datetime
from pathlib import Path

def run_simulation():
    """
    Run the attribution simulation
    Per PRD Section 6: Simulation execution
    """
    print("🚀 Starting Day 6 Attribution Simulation...")
    print(f"⏰ Started at: {datetime.utcnow().isoformat()}")
    
    # Change to attribution service directory
    attribution_dir = Path(__file__).parent.parent / "services" / "attribution"
    os.chdir(attribution_dir)
    
    try:
        # Run simulation
        result = subprocess.run([
            sys.executable, "scripts/simulate.py"
        ], capture_output=True, text=True, timeout=300)  # 5 minute timeout
        
        if result.returncode == 0:
            print("✅ Simulation completed successfully")
            print("📊 Simulation output:")
            print(result.stdout)
            
            # Find the results file
            results_files = list(Path(".").glob("simulation_results_*.json"))
            if results_files:
                latest_results = max(results_files, key=lambda p: p.stat().st_mtime)
                print(f"📁 Results saved to: {latest_results}")
                return str(latest_results)
            else:
                print("❌ No results file found")
                return None
        else:
            print("❌ Simulation failed")
            print("Error output:")
            print(result.stderr)
            return None
            
    except subprocess.TimeoutExpired:
        print("❌ Simulation timed out after 5 minutes")
        return None
    except Exception as e:
        print(f"❌ Error running simulation: {e}")
        return None

def generate_metrics_report(results_file: str):
    """
    Generate metrics report from simulation results
    Per PRD Section 6: Metrics reporting
    """
    print("\n📈 Generating metrics report...")
    
    # Change to attribution service directory
    attribution_dir = Path(__file__).parent.parent / "services" / "attribution"
    os.chdir(attribution_dir)
    
    try:
        # Run metrics collector
        result = subprocess.run([
            sys.executable, "scripts/metrics_collector.py", results_file
        ], capture_output=True, text=True, timeout=60)  # 1 minute timeout
        
        if result.returncode == 0:
            print("✅ Metrics report generated successfully")
            print("📊 Metrics output:")
            print(result.stdout)
            return True
        else:
            print("❌ Metrics generation failed")
            print("Error output:")
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Metrics generation timed out")
        return False
    except Exception as e:
        print(f"❌ Error generating metrics: {e}")
        return False

def create_reports_directory():
    """
    Create reports directory structure
    Per PRD Section 6: Report organization
    """
    reports_dir = Path(__file__).parent.parent / "docs" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    return reports_dir

def main():
    """
    Main simulation runner
    Per PRD Section 6: Complete simulation and reporting workflow
    """
    print("=" * 60)
    print("🎯 Day 6: Attribution Simulation & Metrics Collection")
    print("=" * 60)
    
    # Create reports directory
    reports_dir = create_reports_directory()
    print(f"📁 Reports directory: {reports_dir}")
    
    # Run simulation
    results_file = run_simulation()
    if not results_file:
        print("❌ Simulation failed, cannot generate metrics")
        sys.exit(1)
    
    # Generate metrics report
    success = generate_metrics_report(results_file)
    if not success:
        print("❌ Metrics generation failed")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✅ Day 6 Simulation Complete!")
    print("=" * 60)
    print(f"📊 Results file: {results_file}")
    print(f"📁 Reports directory: {reports_dir}")
    print(f"⏰ Completed at: {datetime.utcnow().isoformat()}")
    
    # List generated files
    print("\n📋 Generated files:")
    for file_path in reports_dir.glob("day6_metrics_*"):
        print(f"  - {file_path}")
    
    for file_path in Path(".").glob("attribution_metrics_*.csv"):
        print(f"  - {file_path}")
    
    print("\n🎉 Ready for Day 7 decision analysis!")

if __name__ == "__main__":
    main()
