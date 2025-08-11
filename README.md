# Discord Bot (JavaScript)

This project provides a simple Discord bot written in Node.js using [`discord.js`](https://www.npmjs.com/package/discord.js).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with your bot token:

```env
BOT_TOKEN=your_bot_token_here
```

3. Run the bot:

```bash
node bot.js
```

The bot responds to `!ping` and supports the `a.level` and `a.wallet` prefix commands.
