#!/bin/bash
# Install Node.js dependencies without requiring root privileges.
# Useful for bot-hosting environments that already provide Node.js.
set -e

if [ ! -d node_modules/yt-dlp-exec ]; then
    echo "Installing Node.js packages..."
    npm install
else
    echo "Dependencies already installed."
fi
