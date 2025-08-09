import os
from io import BytesIO
from typing import Any

import discord
from discord import app_commands
from dotenv import load_dotenv
from PIL import Image
from level_card import render_level_card
from urllib.request import urlopen
import urllib.parse

user_card_settings: dict[int, dict[str, Any]] = {}
DEFAULT_COLOR = (92, 220, 140)
DEFAULT_BACKGROUND = "https://i.ibb.co/9337ZnxF/wdwdwd.jpg"
CARD_SETTING_EMOJI = discord.PartialEmoji(name="Botgear", id=1403611995814629447)


def main() -> None:
    """Run the bot."""
    load_dotenv()
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN not set in environment")

    intents = discord.Intents.default()
    client = discord.Client(intents=intents)
    tree = app_commands.CommandTree(client)

    class CardSettingsModal(discord.ui.Modal):
        def __init__(
            self,
            color: tuple[int, int, int],
            background_url: str,
            message: discord.Message,
        ) -> None:
            super().__init__(title="Card Settings")
            self.color_input = discord.ui.TextInput(
                label="Color [RGB]", default=f"{color[0]},{color[1]},{color[2]}"
            )
            self.bg_input = discord.ui.TextInput(
                label="Background URL", default=background_url
            )
            self.message = message
            self.add_item(self.color_input)
            self.add_item(self.bg_input)

        async def on_submit(self, interaction: discord.Interaction) -> None:
            try:
                parts = [int(p.strip()) for p in self.color_input.value.split(",")]
                if len(parts) != 3 or not all(0 <= c <= 255 for c in parts):
                    raise ValueError
            except Exception:
                await interaction.response.send_message(
                    "Invalid color. Use R,G,B between 0-255.", ephemeral=True
                )
                return
            url = self.bg_input.value.strip()
            try:
                parsed = urllib.parse.urlparse(url)
                if parsed.scheme not in ("http", "https"):
                    raise ValueError
                with urlopen(url) as r:
                    r.read(1)
            except Exception:
                await interaction.response.send_message(
                    "Invalid background URL.", ephemeral=True
                )
                return
            await interaction.response.defer()
            avatar_asset = (
                interaction.user.display_avatar.with_size(256).with_static_format("png")
            )
            avatar_bytes = await avatar_asset.read()
            avatar_image = Image.open(BytesIO(avatar_bytes)).convert("RGBA")
            try:
                path = render_level_card(
                    username=interaction.user.name,
                    nickname=getattr(
                        interaction.user, "display_name", interaction.user.name
                    ),
                    level=1,
                    xp=0,
                    xp_total=100,
                    rank=0,
                    prestige=0,
                    total_xp=0,
                    avatar_image=avatar_image,
                    background_url=url,
                    bar_color=tuple(parts),
                    outfile=f"level_{interaction.user.id}.png",
                )
            except ValueError:
                await interaction.followup.send(
                    "Background image could not be loaded.", ephemeral=True
                )
                return
            user_card_settings[interaction.user.id] = {
                "color": tuple(parts),
                "background_url": url,
            }
            view = CardSettingsView(tuple(parts), url)
            await self.message.edit(attachments=[discord.File(path)], view=view)
            try:
                os.remove(path)
            except OSError:
                pass
            await interaction.followup.send(
                "Card settings updated.", ephemeral=True
            )

    class CardSettingsView(discord.ui.View):
        def __init__(self, color: tuple[int, int, int], background_url: str) -> None:
            super().__init__(timeout=None)
            self.color = color
            self.background_url = background_url

        @discord.ui.button(
            label="Card Setting",
            style=discord.ButtonStyle.gray,
            emoji=CARD_SETTING_EMOJI,
        )
        async def card_setting(
            self, interaction: discord.Interaction, button: discord.ui.Button
        ) -> None:
            await interaction.response.send_modal(
                CardSettingsModal(self.color, self.background_url, interaction.message)
            )

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
        user_id = interaction.user.id
        settings = user_card_settings.setdefault(
            user_id,
            {"color": DEFAULT_COLOR, "background_url": DEFAULT_BACKGROUND},
        )
        color = settings["color"]
        background_url = settings["background_url"]
        avatar_asset = (
            interaction.user.display_avatar.with_size(256).with_static_format("png")
        )
        avatar_bytes = await avatar_asset.read()
        avatar_image = Image.open(BytesIO(avatar_bytes)).convert("RGBA")
        try:
            path = render_level_card(
                username=interaction.user.name,
                nickname=getattr(interaction.user, "display_name", interaction.user.name),
                level=1,
                xp=0,
                xp_total=100,
                rank=0,
                prestige=0,
                total_xp=0,
                avatar_image=avatar_image,
                background_url=background_url,
                bar_color=color,
                outfile=f"level_{user_id}.png",
            )
            view = CardSettingsView(color, background_url)
            await interaction.followup.send(file=discord.File(path), view=view)
        except ValueError:
            settings["background_url"] = DEFAULT_BACKGROUND
            path = render_level_card(
                username=interaction.user.name,
                nickname=getattr(interaction.user, "display_name", interaction.user.name),
                level=1,
                xp=0,
                xp_total=100,
                rank=0,
                prestige=0,
                total_xp=0,
                avatar_image=avatar_image,
                background_url=DEFAULT_BACKGROUND,
                bar_color=color,
                outfile=f"level_{user_id}.png",
            )
            view = CardSettingsView(color, DEFAULT_BACKGROUND)
            await interaction.followup.send(
                "Background image invalid; using default.",
                file=discord.File(path),
                view=view,
            )
        finally:
            try:
                os.remove(path)
            except OSError:
                pass

    client.run(token)


if __name__ == "__main__":
    main()
