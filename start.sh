#!/bin/bash
set -e

# Ensure all required dependencies are installed
echo "Checking and installing dependencies..."
bash "$(dirname "$0")/install_deps.sh"

# Start the Discord bot
node index.js
