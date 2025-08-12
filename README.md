# Discord Bot (JavaScript)

This is a simple Discord bot rewritten in JavaScript using [`discord.js`](https://www.npmjs.com/package/discord.js) and [`canvas`](https://www.npmjs.com/package/canvas). It requires **Node.js 22** or newer.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file with your bot token:

   ```env
   BOT_TOKEN=your_bot_token_here
   ```

3. Run the bot:

   ```bash
   npm start
   ```

The bot responds to `!ping` messages with `Pong!` and exposes slash commands such as `/level`, `/wallet`, `/add-role`, and `/level-button`.

User level statistics and card design preferences are stored in `user_data.json` so they persist between restarts.
