# Discord Bot

This is a simple Discord bot written in Python using [`discord.py`](https://pypi.org/project/discord.py/).

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the project root with your bot token:

   ```env
   BOT_TOKEN=your_bot_token_here
   ```

3. Run the bot:

   ```bash
   python bot.py
   ```

The bot will respond to `!ping` messages with `Pong!`.

The level card can also be requested with the `a.` or `A.` prefix. For example,
you can type `a. level` or `A.level` to see your card.

Use `/wallet` or the prefix `a.wallet` to view a wallet-style card showing your
coins, diamonds and deluxe coins along with their total value.

A slash command `/add-role` can give a role to a user, optionally for a
limited time (`1h`, `1d`, `7w`, `1m`). Timed roles are stored so they persist
even if the bot restarts.

User level statistics and card design preferences are stored in
`user_data.json` so they persist between restarts.
