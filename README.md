# Maxwell Bot

This project is a Discord bot for managing various server functions.

## YouTube Audio Streaming

The `/play` command streams audio from YouTube using the `play-dl` library.
Authentication is handled via a cookie configured directly in
`commands/play.js`. Update the cookie string there if you encounter
"Sign in to confirm you're not a bot" errors.
