#!/bin/bash
# Install dependencies for Maxwell Bot
set -e

install_node() {
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
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

npm install
