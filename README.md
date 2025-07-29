# Maxwell Bot

This project is a Discord bot for managing various server functions.

## Setup

Run the installation script which automatically installs all required dependencies:

```bash
sudo bash install_deps.sh
```

This script ensures Node.js (v16 or higher) and Python 3 are present, creates the `python` symlink needed for `yt-dlp-exec`, and installs the Node.js packages with `npm install`.

You can then start the bot with:

```bash
node index.js
```

Alternatively, run the provided **start.sh** script which will run `install_deps.sh` on every startup to ensure everything is installed and then launch the bot automatically:

```bash
bash start.sh
```

## Troubleshooting
If you see an error like `Cannot find module 'yt-dlp-exec'`, make sure you have installed dependencies by running `npm install` or the provided `install_deps.sh` script.
