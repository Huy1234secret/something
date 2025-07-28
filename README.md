# Maxwell Bot

This project is a Discord bot for playing music and managing various server functions.

## Handling Expired YouTube Streams

If you encounter an error like `MinigetError: Status code: 410`, it means the YouTube stream URL has expired. The bot automatically retries and falls back to `play-dl` for more robust fetching.

To ensure compatibility with YouTube, install the latest dependencies. You can run the
provided `install_deps.sh` script or execute the commands manually:

```bash
npm install ytdl-core@latest
npm install discord-player@latest
npm install @discordjs/voice@latest
```

Avoid caching YouTube links; always fetch a fresh stream.
