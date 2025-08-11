import os
import inspect
from io import BytesIO
from typing import Any
import urllib.parse
from urllib.request import urlopen

import discord
from PIL import Image

WARNING_EMOJI = "<:warning:1404101025849147432> "
# Message flag enabling Discord's v2 component system
COMPONENTS_V2_FLAG = discord.MessageFlags._from_value(1 << 15)
CARD_SETTING_EMOJI = discord.PartialEmoji(name="Botgear", id=1403611995814629447)


class CardSettingsModal(discord.ui.Modal):
    def __init__(
        self,
        color: tuple[int, int, int],
        background_url: str,
        message: discord.Message,
        user_stats,
        save_data,
        xp_needed,
        render_level_card,
    ) -> None:
        super().__init__(title="Card Settings")
        self.color_input = discord.ui.TextInput(
            label="Color [RGB]", default=f"{color[0]},{color[1]},{color[2]}"
        )
        self.bg_input = discord.ui.TextInput(
            label="Background URL", default=background_url
        )
        self.message = message
        self.user_stats = user_stats
        self.save_data = save_data
        self.xp_needed = xp_needed
        self.render_level_card = render_level_card
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
            stats = self.user_stats.setdefault(
                interaction.user.id, {"level": 1, "xp": 0, "total_xp": 0}
            )
            path = self.render_level_card(
                username=interaction.user.name,
                nickname=getattr(
                    interaction.user, "display_name", interaction.user.name
                ),
                level=stats["level"],
                xp=stats["xp"],
                xp_total=self.xp_needed(stats["level"]),
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

        # Update user card settings
        if not hasattr(self, '_user_card_settings'):
            # Initialize if not provided - this should be passed in during setup
            self._user_card_settings = {}
        self._user_card_settings[interaction.user.id] = {
            "color": tuple(parts),
            "background_url": url,
        }
        self.save_data()
        
        view = CardSettingsView(tuple(parts), url, interaction.user.id, 
                               self.user_stats, self._user_card_settings, self.save_data, 
                               self.xp_needed, self.render_level_card)
        await self.message.edit(
            attachments=[discord.File(path)],
            view=view,
            flags=COMPONENTS_V2_FLAG,
        )
        try:
            os.remove(path)
        except OSError:
            pass
        await interaction.followup.send(
            "Card settings updated.", ephemeral=True
        )


class CardSettingsView(discord.ui.View):
    def __init__(
        self, 
        color: tuple[int, int, int], 
        background_url: str, 
        owner_id: int,
        user_stats,
        user_card_settings,
        save_data,
        xp_needed,
        render_level_card,
    ) -> None:
        super().__init__(timeout=None)
        self.color = color
        self.background_url = background_url
        self.owner_id = owner_id
        self.user_stats = user_stats
        self.user_card_settings = user_card_settings
        self.save_data = save_data
        self.xp_needed = xp_needed
        self.render_level_card = render_level_card

    def to_components(self) -> list[dict[str, Any]]:
        """Return components using Discord's v2 container layout."""

        # Extract the button components generated by :class:`discord.ui.View`
        base_components = super().to_components()[0]["components"]
        accent_color = (self.color[0] << 16) + (self.color[1] << 8) + self.color[2]

        # Compose container children: button row, separator, and text label
        container_children = [
            {"type": 1, "components": base_components},
            {"type": 14, "divider": True, "spacing": 1},
            {"type": 10, "content": "Customize your card"},
        ]

        # Wrap the children in a container (type 17) with the accent colour
        container = {
            "type": 17,
            "accent_color": accent_color,
            "components": container_children,
        }

        # The root must be an Action Row (type 1) containing the container
        return [{"type": 1, "components": [container]}]

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
        modal = CardSettingsModal(
            self.color, 
            self.background_url, 
            interaction.message,
            self.user_stats,
            self.save_data,
            self.xp_needed,
            self.render_level_card
        )
        modal._user_card_settings = self.user_card_settings
        await interaction.response.send_modal(modal)


async def send_level_card(
    user,
    send,
    user_stats,
    user_card_settings,
    save_data,
    xp_needed,
    DEFAULT_COLOR,
    DEFAULT_BACKGROUND,
    render_level_card,
    CardSettingsView_unused,  # Renamed to indicate we use our local implementation
    *,
    allow_ephemeral: bool = False,
):
    """Render and send a user's level card."""
    user_id = user.id
    settings = user_card_settings.setdefault(
        user_id, {"color": DEFAULT_COLOR, "background_url": DEFAULT_BACKGROUND}
    )
    stats = user_stats.setdefault(
        user_id, {"level": 1, "xp": 0, "total_xp": 0}
    )
    save_data()
    color = settings["color"]
    background_url = settings["background_url"]
    avatar_asset = user.display_avatar.with_size(256).with_static_format("png")
    avatar_bytes = await avatar_asset.read()
    avatar_image = Image.open(BytesIO(avatar_bytes)).convert("RGBA")
    try:
        path = render_level_card(
            username=user.name,
            nickname=getattr(user, "display_name", user.name),
            level=stats["level"],
            xp=stats["xp"],
            xp_total=xp_needed(stats["level"]),
            rank=0,
            prestige=0,
            total_xp=stats["total_xp"],
            avatar_image=avatar_image,
            background_url=background_url,
            bar_color=color,
            outfile=f"level_{user_id}.png",
        )
        file = discord.File(path, filename=f"level_{user_id}.png")
        # Include a blank description so component rows render within the embed
        # area when using Discord's v2 components.
        embed = discord.Embed(description="\u200b")
        embed.set_image(url=f"attachment://level_{user_id}.png")
        view = CardSettingsView(
            color, background_url, user_id, user_stats, user_card_settings, 
            save_data, xp_needed, render_level_card
        )
        send_kwargs = {"embed": embed, "file": file, "view": view}
        if "flags" in inspect.signature(send).parameters:
            send_kwargs["flags"] = COMPONENTS_V2_FLAG
        await send(**send_kwargs)
    except ValueError:
        settings["background_url"] = DEFAULT_BACKGROUND
        save_data()
        path = render_level_card(
            username=user.name,
            nickname=getattr(user, "display_name", user.name),
            level=stats["level"],
            xp=stats["xp"],
            xp_total=xp_needed(stats["level"]),
            rank=0,
            prestige=0,
            total_xp=stats["total_xp"],
            avatar_image=avatar_image,
            background_url=DEFAULT_BACKGROUND,
            bar_color=color,
            outfile=f"level_{user_id}.png",
        )
        file = discord.File(path, filename=f"level_{user_id}.png")
        # Maintain spacing so the separator and button are visually attached to the
        # embed image when an invalid background is provided.
        embed = discord.Embed(description="\u200b")
        embed.set_image(url=f"attachment://level_{user_id}.png")
        view = CardSettingsView(
            color, DEFAULT_BACKGROUND, user_id, user_stats, user_card_settings,
            save_data, xp_needed, render_level_card
        )
        kwargs = {"ephemeral": True} if allow_ephemeral else {}
        send_kwargs = {
            "content": f"{WARNING_EMOJI}Background image invalid; using default.",
            "embed": embed,
            "file": file,
            "view": view,
            **kwargs,
        }
        if "flags" in inspect.signature(send).parameters:
            send_kwargs["flags"] = COMPONENTS_V2_FLAG
        await send(**send_kwargs)
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


def setup(
    tree,
    user_stats,
    user_card_settings,
    save_data,
    xp_needed,
    DEFAULT_COLOR,
    DEFAULT_BACKGROUND,
    render_level_card,
    CardSettingsView_unused,  # Renamed to indicate we use our local implementation
    **__
):
    """Register the level command with the provided command tree."""

    @tree.command(name="level", description="Show your level card")
    async def level_command(interaction: discord.Interaction):
        await interaction.response.defer()
        await send_level_card(
            interaction.user,
            interaction.followup.send,
            user_stats,
            user_card_settings,
            save_data,
            xp_needed,
            DEFAULT_COLOR,
            DEFAULT_BACKGROUND,
            render_level_card,
            CardSettingsView_unused,  # Using local implementation instead
            allow_ephemeral=True,
        )
