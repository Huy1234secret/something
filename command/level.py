import os
from io import BytesIO

import discord
from PIL import Image


def setup(tree,
          user_stats,
          user_card_settings,
          save_data,
          xp_needed,
          DEFAULT_COLOR,
          DEFAULT_BACKGROUND,
          render_level_card,
          CardSettingsView,
          **__):
    """Register the level command with the provided command tree."""

    @tree.command(name="level", description="Show your level card")
    async def level_command(interaction: discord.Interaction):
        await interaction.response.defer()
        user_id = interaction.user.id
        settings = user_card_settings.setdefault(
            user_id, {"color": DEFAULT_COLOR, "background_url": DEFAULT_BACKGROUND}
        )
        stats = user_stats.setdefault(
            user_id, {"level": 1, "xp": 0, "total_xp": 0}
        )
        save_data()
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
            view = CardSettingsView(color, background_url, interaction.user.id)
            await interaction.followup.send(file=discord.File(path), view=view)
        except ValueError:
            settings["background_url"] = DEFAULT_BACKGROUND
            save_data()
            path = render_level_card(
                username=interaction.user.name,
                nickname=getattr(interaction.user, "display_name", interaction.user.name),
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
            view = CardSettingsView(color, DEFAULT_BACKGROUND, interaction.user.id)
            await interaction.followup.send(
                "Background image invalid; using default.",
                file=discord.File(path),
                view=view,
                ephemeral=True,
            )
        finally:
            try:
                os.remove(path)
            except OSError:
                pass
