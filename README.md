# Maxwell Bot

This project is now a minimal Discord bot that supports only the `/level` command.

## Setup

Install dependencies:

```bash
npm install
```

Deploy the slash command (optional, run once per guild):

```bash
node deploy-commands.js
```

Start the bot:

```bash
node index.js
```

Create a `.env` file with the following variables:

```
TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_guild_id
```

`CLIENT_ID` and `GUILD_ID` are required for deploying commands.
