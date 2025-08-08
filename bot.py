import os
import discord
from dotenv import load_dotenv


def main() -> None:
    """Run the bot."""
    load_dotenv()
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN not set in environment")

    intents = discord.Intents.default()
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f"Logged in as {client.user} (ID: {client.user.id})")
        print("------")

    @client.event
    async def on_message(message: discord.Message):
        if message.author == client.user:
            return
        if message.content == "!ping":
            await message.channel.send("Pong!")

    client.run(token)


if __name__ == "__main__":
    main()
