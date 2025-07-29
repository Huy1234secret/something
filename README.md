# Maxwell Bot

This project is a Discord bot for managing various server functions.

## Setup

1. Install [Node.js](https://nodejs.org/) (v16 or higher).
2. Install Python 3 and ensure the `python` command is available in your `PATH`. `yt-dlp-exec` depends on it for music playback. On Debian-based systems you can run:
   ```bash
   apt-get update && apt-get install -y python3
   ln -s $(command -v python3) /usr/local/bin/python
   ```
3. Install the Node.js dependencies:
   ```bash
   npm install
   ```
4. Start the bot with:
   ```bash
   node index.js
   ```
