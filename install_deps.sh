#!/bin/bash
# Install dependencies for Maxwell Bot
set -e

# Ensure python exists for yt-dlp-exec
if ! command -v python >/dev/null 2>&1; then
    if command -v python3 >/dev/null 2>&1; then
        ln -sf "$(command -v python3)" /usr/local/bin/python
    else
        echo "Python is required for yt-dlp-exec. Please install python3." >&2
        exit 1
    fi
fi

npm install
