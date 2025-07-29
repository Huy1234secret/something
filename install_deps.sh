#!/bin/bash
# Install dependencies for Maxwell Bot
set -e

install_node() {
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
}

install_python() {
    echo "Installing Python 3..."
    apt-get update
    apt-get install -y python3
}

# Ensure Node.js exists and is v16+
if ! command -v node >/dev/null 2>&1; then
    install_node
else
    NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -lt 16 ]; then
        install_node
    fi
fi

# Ensure python exists for yt-dlp-exec
if ! command -v python >/dev/null 2>&1; then
    if command -v python3 >/dev/null 2>&1; then
        ln -sf "$(command -v python3)" /usr/local/bin/python
    else
        install_python
        ln -sf "$(command -v python3)" /usr/local/bin/python
    fi
fi

npm install
