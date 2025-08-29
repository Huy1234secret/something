#!/usr/bin/env bash
set -e

REQUIRED_VERSION="22.0.0"
REQUIRED_MAJOR=22

# Get current Node major version, or empty if Node not installed
CURRENT_MAJOR=$(node -v 2>/dev/null | sed 's/^v//' | cut -d'.' -f1)

if [ -z "$CURRENT_MAJOR" ] || [ "$CURRENT_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
  echo "Installing Node.js v$REQUIRED_VERSION..."
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "nvm not found; installing..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash >/tmp/nvm-install.log && tail -n 20 /tmp/nvm-install.log
  fi
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm install "$REQUIRED_VERSION"
  nvm use "$REQUIRED_VERSION"
else
  echo "Using existing Node.js $(node -v)"
fi

npm install
node bot.js
