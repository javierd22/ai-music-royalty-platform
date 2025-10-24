#!/usr/bin/env python3
"""
FastMCP Development Tools Server

This MCP server provides development tools for the AI Music Royalty Platform.
It includes tools for running tests, linting, and other development tasks.
"""

from fastmcp import FastMCP
import subprocess
import os
import sys
from pathlib import Path

# Initialize the MCP server
mcp = FastMCP(name="dev-tools")

@mcp.tool()
def test_pyproject() -> str:
    """Run unit tests and return summary"""
    try:
        # Check if we're in a directory with pytest
        result = subprocess.run(["pytest", "-q", "--tb=short"], 
                              capture_output=True, text=True, cwd=os.getcwd())
        output = result.stdout + result.stderr
        
        if result.returncode == 0:
            return f"✅ Tests passed!\n{output}"
        else:
            return f"❌ Tests failed (exit code: {result.returncode})\n{output}"
    except FileNotFoundError:
        return "❌ pytest not found. Please install pytest: pip install pytest"
    except Exception as e:
        return f"❌ Error running tests: {str(e)}"

@mcp.tool()
def test_attrib_service() -> str:
    """Run tests for the attribution service"""
    try:
        attrib_path = Path(__file__).parent.parent / "attrib"
        if not attrib_path.exists():
            return "❌ Attribution service directory not found"
            
        result = subprocess.run(["python", "-m", "pytest", "-q", "test_basic.py"], 
                              capture_output=True, text=True, cwd=str(attrib_path))
        output = result.stdout + result.stderr
        
        if result.returncode == 0:
            return f"✅ Attribution service tests passed!\n{output}"
        else:
            return f"❌ Attribution service tests failed (exit code: {result.returncode})\n{output}"
    except Exception as e:
        return f"❌ Error running attribution service tests: {str(e)}"

@mcp.tool()
def lint_python() -> str:
    """Run Python linting (flake8 or ruff)"""
    try:
        # Try ruff first, then flake8
        for linter in ["ruff", "flake8"]:
            try:
                result = subprocess.run([linter, "."], 
                                      capture_output=True, text=True, cwd=os.getcwd())
                output = result.stdout + result.stderr
                
                if result.returncode == 0:
                    return f"✅ {linter} linting passed!\n{output}"
                else:
                    return f"⚠️ {linter} found issues:\n{output}"
            except FileNotFoundError:
                continue
        
        return "❌ No Python linter found. Please install ruff or flake8"
    except Exception as e:
        return f"❌ Error running linter: {str(e)}"

@mcp.tool()
def check_dependencies() -> str:
    """Check if all required dependencies are installed"""
    try:
        # Check Python dependencies
        python_deps = []
        for service in ["attrib", "attrib-service"]:
            req_file = Path(__file__).parent.parent / service / "requirements.txt"
            if req_file.exists():
                python_deps.append(f"  - {service}/requirements.txt")
        
        # Check Node.js dependencies
        package_json = Path(__file__).parent.parent / "package.json"
        node_deps = "✅ package.json found" if package_json.exists() else "❌ package.json not found"
        
        output = "📦 Dependency Status:\n"
        output += f"Node.js: {node_deps}\n"
        output += "Python requirements files:\n"
        output += "\n".join(python_deps) if python_deps else "  - No Python requirements found"
        
        return output
    except Exception as e:
        return f"❌ Error checking dependencies: {str(e)}"

@mcp.tool()
def run_attrib_service() -> str:
    """Start the attribution service"""
    try:
        attrib_path = Path(__file__).parent.parent / "attrib"
        if not attrib_path.exists():
            return "❌ Attribution service directory not found"
        
        # Check if virtual environment exists
        venv_path = attrib_path / "venv"
        if not venv_path.exists():
            return "❌ Virtual environment not found. Run 'cd attrib && python -m venv venv' first"
        
        # Start the service (this will run in background)
        result = subprocess.run(["python", "main.py"], 
                              capture_output=True, text=True, cwd=str(attrib_path))
        
        if result.returncode == 0:
            return f"✅ Attribution service started successfully!\n{result.stdout}"
        else:
            return f"❌ Failed to start attribution service:\n{result.stderr}"
    except Exception as e:
        return f"❌ Error starting attribution service: {str(e)}"

if __name__ == "__main__":
    mcp.run()
