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

If you continue having problems with `ytdl-core`, consider switching to `play-dl` as the main
stream provider:

```bash
npm install play-dl@latest
```

Avoid caching YouTube links; always fetch a fresh stream.

## Handling YouTube verification

If `play-dl` fails with a message like `Sign in to confirm you're not a bot`,
YouTube requires a valid account cookie.  Set the cookie string in the `YT_COOKIE`
environment variable before starting the bot:

```bash
export YT_COOKIE="PREF=...; SID=...;"
```

The `musicSystem` module automatically applies this cookie when available.
