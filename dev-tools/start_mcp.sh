#!/bin/bash
# Start the FastMCP development tools server

echo "🚀 Starting FastMCP Development Tools Server..."
echo "Server: dev-tools"
echo "Transport: STDIO"
echo ""

cd "$(dirname "$0")"
python mcp_server.py
