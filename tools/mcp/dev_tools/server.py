from __future__ import annotations
import os, json, subprocess, shutil, sys
from pathlib import Path
from typing import Optional, Dict, Any, List

# pip dependency: fastmcp
from fastmcp import FastMCP

BASE = Path(__file__).resolve().parents[3]  # repo root
DOCS_DIR = BASE / "docs"
PRD_FILE = DOCS_DIR / "PRD.md"

mcp = FastMCP(name="dev-tools")

def _run(cmd: List[str], cwd: Optional[Path] = None) -> str:
    try:
        completed = subprocess.run(
            cmd, cwd=str(cwd) if cwd else None, capture_output=True, text=True
        )
        out = completed.stdout.strip()
        err = completed.stderr.strip()
        if completed.returncode != 0:
            return f"Command failed: {' '.join(cmd)}\n{out}\n{err}"
        return out or err or "OK"
    except FileNotFoundError:
        return f"Command not found: {cmd[0]}"

@mcp.resource("prd://read")
def read_prd() -> str:
    """
    Return the current PRD markdown so agents can cite requirements.
    """
    if not PRD_FILE.exists():
        return "PRD.md not found at /docs/PRD.md. Create it first."
    return PRD_FILE.read_text()

@mcp.tool()
def index_audio(path: str) -> str:
    """
    Placeholder to index audio into your attribution pipeline
    path: path to a local audio file
    """
    p = Path(path)
    if not p.exists():
        return f"File not found: {path}"
    return f"Indexed placeholder for {p.name}. Wire this to the Python FastAPI indexer."

@mcp.tool()
def run_migrations() -> str:
    """
    Run Supabase migrations if supabase CLI is installed
    """
    return _run(["supabase", "db", "push"])

@mcp.tool()
def seed_db() -> str:
    """
    Seed the database using a local script if present
    """
    script_py = BASE / "scripts" / "seed.py"
    script_ts = BASE / "scripts" / "seed.ts"
    if script_py.exists():
        return _run([sys.executable, str(script_py)])
    if script_ts.exists():
        return _run(["node", str(script_ts)])
    return "No seed script found. Expected scripts/seed.py or scripts/seed.ts"

@mcp.tool()
def run_tests() -> str:
    """
    Run unit tests for both JS and Python where available
    """
    parts = []
    if shutil.which("pnpm") or shutil.which("npm"):
        parts.append(_run(["pnpm" if shutil.which("pnpm") else "npm", "test"]))
    if shutil.which("pytest"):
        parts.append(_run(["pytest", "-q"]))
    return "\n\n".join(parts) or "No test runners detected."

@mcp.tool()
def run_attribution_job(sample_out: str) -> str:
    """
    Simulate attribution auditor check
    sample_out: path to a generated audio file
    """
    p = Path(sample_out)
    if not p.exists():
        return f"Sample not found: {sample_out}"
    # In real wiring, call your FastAPI /compare
    return f"Ran placeholder attribution on {p.name}. Connect this to FastAPI /compare."

@mcp.tool()
def verify_match(track_id: str, threshold: float = 0.85) -> str:
    """
    Verify a saved match against a threshold
    """
    return f"Verified match for track_id={track_id} at threshold={threshold}. Replace with vector DB query."

@mcp.prompt("implement_api_compare")
def prompt_impl_compare() -> str:
    """
    Prompt template to implement FastAPI /compare using PRD rules
    """
    return (
        "Use /docs/PRD.md as the source of truth. Implement FastAPI /compare that:\n"
        "1. Accepts uploaded audio\n"
        "2. Embeds and queries vector DB\n"
        "3. Returns top matches with similarity and percentInfluence\n"
        "4. Writes results to Supabase results table\n"
        "5. Emits event if SDK log + auditor match\n"
        "Return complete code and migration diffs."
    )

if __name__ == "__main__":
    # Ensure docs folder exists
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    mcp.run()
