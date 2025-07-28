# Maxwell Bot

This project is a Discord bot for managing various server functions.

## YouTube Audio Streaming

The `/play` command streams audio from YouTube using the `play-dl` library.
Some videos may require authentication. Set the `YT_COOKIE` environment
variable with your YouTube cookie string if you encounter "Sign in to confirm
you're not a bot" errors.

Example `.env` entry:

```env
YT_COOKIE="SAPISID=...; HSID=...; SID=...; SSID=...;"
```

Never commit your cookie to version control.
