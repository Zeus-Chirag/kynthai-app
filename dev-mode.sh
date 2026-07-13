#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔧 Starting OpenHands in DEVELOPMENT mode..."
export DEBUG=true
export DEBUG_LLM=true
export LOG_LEVEL=DEBUG
uv run openhands --config config.toml --debug "$@"
