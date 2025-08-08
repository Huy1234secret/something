import os
import discord
from discord import app_commands
from dotenv import load_dotenv
from level_card import render_level_card


def main() -> None:
    """Run the bot."""
    load_dotenv()
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN not set in environment")

    intents = discord.Intents.default()
    client = discord.Client(intents=intents)
    tree = app_commands.CommandTree(client)

    @client.event
    async def on_ready():
        print(f"Logged in as {client.user} (ID: {client.user.id})")
        print("------")
        await tree.sync()

    @client.event
    async def on_message(message: discord.Message):
        if message.author == client.user:
            return
        if message.content == "!ping":
            await message.channel.send("Pong!")

    @tree.command(name="level", description="Show your level card")
    async def level_command(interaction: discord.Interaction):
        await interaction.response.defer()
        avatar_hash = (
            interaction.user.avatar.key if interaction.user.avatar else None
        )
        avatar_url = None if avatar_hash else interaction.user.display_avatar.url
        path = render_level_card(
            username=interaction.user.name,
            nickname=getattr(interaction.user, "display_name", interaction.user.name),
            level=1,
            xp=0,
            xp_total=100,
            rank=0,
            prestige=0,
            total_xp=0,
            avatar_url=avatar_url,
            discord_user_id=str(interaction.user.id),
            discord_avatar_hash=avatar_hash,
            outfile=f"level_{interaction.user.id}.png",
        )
        await interaction.followup.send(file=discord.File(path))
        try:
            os.remove(path)
        except OSError:
            pass

    client.run(token)


if __name__ == "__main__":
    main()
