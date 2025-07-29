# Maxwell Bot

This project is a Discord bot for managing various server functions.

## Setup

Run the installation script which automatically installs all required dependencies:

```bash
sudo bash install_deps.sh
```

This script ensures Node.js (v16 or higher) is installed and then installs the required Node.js packages with `npm install`.

You can then start the bot with:

```bash
node index.js
```

Alternatively, run the provided **start.sh** script which will run `install_deps.sh` on every startup to ensure everything is installed and then launch the bot automatically:

```bash
bash start.sh
```

### BotHosting.net quick setup

If your hosting provider already has Node.js installed (for example, on
BotHosting.net), you can install only the Node packages by running:

```bash
bash install_npm_deps.sh
```

Then launch the bot normally with:

```bash
node index.js
```

## Troubleshooting
If you encounter missing package errors, ensure dependencies are installed by running `npm install` or the provided `install_deps.sh` script.
