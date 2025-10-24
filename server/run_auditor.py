#!/usr/bin/env python3
"""
Attribution Auditor CLI

Simple Python entry point for running the auditor.
Can be used directly or via run_auditor.sh

Usage:
    python run_auditor.py                   # Run continuously
    python run_auditor.py --once            # Run once and exit
    python run_auditor.py --dry-run         # Dry run mode
    python run_auditor.py --once --dry-run  # Dry run once
"""

import sys
from pathlib import Path

# Add server directory to path
server_dir = Path(__file__).parent
sys.path.insert(0, str(server_dir))

# Import and run auditor
from jobs.auditor import main

if __name__ == "__main__":
    main()
