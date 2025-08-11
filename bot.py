import os
import json
from io import BytesIO
from typing import Any
import importlib
import asyncio

import discord
from discord import app_commands
from dotenv import load_dotenv
from PIL import Image
from level_card import render_level_card
from urllib.request import urlopen
import urllib.parse
import random
from datetime import datetime, timezone
from command.level import send_level_card
from command.wallet import send_wallet_card

DATA_FILE = "user_data.json"
user_card_settings: dict[int, dict[str, Any]] = {}
user_stats: dict[int, dict[str, int]] = {}
voice_sessions: dict[int, datetime] = {}
timed_roles: list[dict[str, float]] = []
DEFAULT_COLOR = (92, 220, 140)
DEFAULT_BACKGROUND = "https://i.ibb.co/9337ZnxF/wdwdwd.jpg"
CARD_SETTING_EMOJI = discord.PartialEmoji(name="Botgear", id=1403611995814629447)
XP_EMOJI = "<:xp:1403665761825980457>"
REPLY = "<:reply:1403665761825980456>"
REPLY1 = "<:reply1:1403665779404050562>"
WARNING_EMOJI = "<:warning:1404101025849147432> "
LEVEL_UP_CHANNEL_ID = 1373578620634665052
MAX_LEVEL = 9999

def xp_needed(level: int) -> int:
    return int(100 * (level ** 1.5))


def load_data() -> None:
    """Load user stats, card settings and timed roles from disk."""

    global user_stats, user_card_settings, timed_roles
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        user_stats = {int(k): v for k, v in data.get("user_stats", {}).items()}
        for stats in user_stats.values():
            stats.setdefault("coins", 0)
            stats.setdefault("diamonds", 0)
            stats.setdefault("deluxe_coins", 0)
        user_card_settings = {
            int(k): {
                "color": tuple(v.get("color", DEFAULT_COLOR)),
                "background_url": v.get("background_url", DEFAULT_BACKGROUND),
            }
            for k, v in data.get("user_card_settings", {}).items()
        }
        timed_roles = data.get("timed_roles", [])
    except (FileNotFoundError, json.JSONDecodeError):
        pass


def save_data() -> None:
    """Persist user stats, card settings and timed roles to disk."""

    data = {
        "user_stats": user_stats,
        "user_card_settings": user_card_settings,
        "timed_roles": timed_roles,
    }
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f)


async def add_xp(user: discord.abc.User, amount: int, client: discord.Client) -> None:
    stats = user_stats.setdefault(
        user.id,
        {
            "level": 1,
            "xp": 0,
            "total_xp": 0,
            "coins": 0,
            "diamonds": 0,
            "deluxe_coins": 0,
        },
    )
    stats["xp"] += amount
    stats["total_xp"] += amount
    prev_level = stats["level"]
    while stats["level"] < MAX_LEVEL and stats["xp"] >= xp_needed(stats["level"]):
        stats["xp"] -= xp_needed(stats["level"])
        stats["level"] += 1
    if stats["level"] >= MAX_LEVEL:
        stats["xp"] = 0
    if stats["level"] > prev_level:
        channel = client.get_channel(LEVEL_UP_CHANNEL_ID)
        if channel:
            embed = discord.Embed(
                color=0xFFFFFF,
                title="Leveled up",
                description=f"{user.mention} have leveled up from level {prev_level} to {stats['level']}",
            )
            await channel.send(embed=embed)
    save_data()


def main() -> None:
    """Run the bot."""
    load_data()
    load_dotenv()
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN not set in environment")

    intents = discord.Intents.default()
    intents.message_content = True
    intents.voice_states = True
    client = discord.Client(intents=intents)
    tree = app_commands.CommandTree(client)

    def schedule_role(
        user_id: int,
        guild_id: int,
        role_id: int,
        expires_at: float,
        *,
        save: bool = False,
    ) -> None:
        entry = {
            "user_id": user_id,
            "guild_id": guild_id,
            "role_id": role_id,
            "expires_at": expires_at,
        }
        if save:
            timed_roles.append(entry)
            save_data()

        async def remove_later() -> None:
            delay = expires_at - datetime.now(timezone.utc).timestamp()
            if delay > 0:
                await asyncio.sleep(delay)
            guild = client.get_guild(guild_id)
            if guild:
                member = guild.get_member(user_id)
                role = guild.get_role(role_id)
                if member and role:
                    try:
                        await member.remove_roles(role)
                    except discord.HTTPException:
                        pass
            if entry in timed_roles:
                timed_roles.remove(entry)
                save_data()

        asyncio.create_task(remove_later())

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
            await interaction.response.defer(thinking=True, ephemeral=True)

            try:
                parts = [int(p.strip()) for p in self.color_input.value.split(",")]
                if len(parts) != 3 or not all(0 <= c <= 255 for c in parts):
                    raise ValueError
            except Exception:
                await interaction.followup.send(
                    f"{WARNING_EMOJI}Invalid color. Use R,G,B between 0-255.",
                    ephemeral=True,
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
                await interaction.followup.send(
                    f"{WARNING_EMOJI}Invalid background URL.", ephemeral=True
                )
                return

            avatar_asset = (
                interaction.user.display_avatar.with_size(256).with_static_format("png")
            )
            avatar_bytes = await avatar_asset.read()
            avatar_image = Image.open(BytesIO(avatar_bytes)).convert("RGBA")
            try:
                stats = user_stats.setdefault(
                    interaction.user.id, {"level": 1, "xp": 0, "total_xp": 0}
                )
                path = render_level_card(
                    username=interaction.user.name,
                    nickname=getattr(
                        interaction.user, "display_name", interaction.user.name
                    ),
                    level=stats["level"],
                    xp=stats["xp"],
                    xp_total=xp_needed(stats["level"]),
                    rank=0,
                    prestige=0,
                    total_xp=stats["total_xp"],
                    avatar_image=avatar_image,
                    background_url=url,
                    bar_color=tuple(parts),
                    outfile=f"level_{interaction.user.id}.png",
                )
            except ValueError:
                await interaction.followup.send(
                    f"{WARNING_EMOJI}Background image could not be loaded.",
                    ephemeral=True,
                )
                return
            user_card_settings[interaction.user.id] = {
                "color": tuple(parts),
                "background_url": url,
            }
            save_data()
            view = CardSettingsView(tuple(parts), url, interaction.user.id)
            await self.message.edit(attachments=[discord.File(path)], view=view)
            try:
                os.remove(path)
            except OSError:
                pass
            await interaction.followup.send(
                "Card settings updated.", ephemeral=True
            )

    class CardSettingsView(discord.ui.View):
        def __init__(
            self, color: tuple[int, int, int], background_url: str, owner_id: int
        ) -> None:
            super().__init__(timeout=None)
            self.color = color
            self.background_url = background_url
            self.owner_id = owner_id

        async def interaction_check(self, interaction: discord.Interaction) -> bool:
            if interaction.user.id != self.owner_id:
                await interaction.response.send_message(
                    f"{WARNING_EMOJI}You can't interact with this command.",
                    ephemeral=True,
                )
                return False
            return True

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
        for entry in list(timed_roles):
            schedule_role(
                entry["user_id"],
                entry["guild_id"],
                entry["role_id"],
                entry["expires_at"],
            )

    @client.event
    async def on_message(message: discord.Message):
        if message.author == client.user:
            return
        await add_xp(message.author, random.randint(1, 10), client)
        content = message.content.strip()
        lower = content.lower()
        if lower.startswith("a."):
            cmd = lower[2:].lstrip()
            if cmd == "level":
                await send_level_card(
                    message.author,
                    message.channel.send,
                    user_stats,
                    user_card_settings,
                    save_data,
                    xp_needed,
                    DEFAULT_COLOR,
                    DEFAULT_BACKGROUND,
                    render_level_card,
                    CardSettingsView,
                    allow_ephemeral=False,
                )
                return
            if cmd == "wallet":
                await send_wallet_card(
                    message.author,
                    message.channel.send,
                    user_stats,
                    save_data,
                )
                return
        if message.content == "!ping":
            await message.channel.send("Pong!")

    @client.event
    async def on_voice_state_update(
        member: discord.Member,
        before: discord.VoiceState,
        after: discord.VoiceState,
    ) -> None:
        if before.channel is None and after.channel is not None:
            voice_sessions[member.id] = datetime.now(timezone.utc)
        elif before.channel is not None and after.channel is None:
            start = voice_sessions.pop(member.id, None)
            if start:
                duration = datetime.now(timezone.utc) - start
                minutes = int(duration.total_seconds() // 60)
                if minutes > 0:
                    xp = sum(random.randint(1, 3) for _ in range(minutes))
                    await add_xp(member, xp, client)
                    channel = client.get_channel(LEVEL_UP_CHANNEL_ID)
                    if channel:
                        desc = (
                            f"Hey {member.mention}, while you in Voice-chat you earned:\n"
                            f"{REPLY} {XP_EMOJI} {xp}"
                        )
                        embed = discord.Embed(
                            color=0xFFFFFF,
                            title="Voice Chat Reward Conclusion",
                            description=desc,
                        )
                        embed.set_footer(
                            text=f"Total Voice Time: {str(duration).split('.')[0]}"
                        )
                        await channel.send(embed=embed)

    def load_commands() -> None:
        """Dynamically load command modules from the command package."""
        for filename in os.listdir("command"):
            if filename.endswith(".py") and not filename.startswith("__"):
                module_name = filename[:-3]
                module = importlib.import_module(f"command.{module_name}")
                if hasattr(module, "setup"):
                    module.setup(
                        tree,
                        user_stats,
                        user_card_settings,
                        save_data,
                        xp_needed,
                        DEFAULT_COLOR,
                        DEFAULT_BACKGROUND,
                        render_level_card,
                        CardSettingsView,
                        schedule_role=schedule_role,
                    )

    load_commands()

    client.run(token)


if __name__ == "__main__":
    main()
