import os
import discord
from discord import app_commands

COMMAND_TO_REMOVE = os.getenv("COMMAND_TO_REMOVE", "command_name")
GUILD_ID = int(os.getenv("GUILD_ID", "0")) or None

class MyBot(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        guild = discord.Object(id=GUILD_ID) if GUILD_ID else None
        self.tree.remove_command(COMMAND_TO_REMOVE, guild=guild)
        await self.tree.sync(guild=guild)

    async def on_ready(self):
        print(f"Logged in as {self.user}")

bot = MyBot()
bot.run(os.getenv("TOKEN"))
