import os
from io import BytesIO

import discord
from PIL import Image

WARNING_EMOJI = "<:warning:1404101025849147432> "


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
    CardSettingsView,
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
        embed = discord.Embed()
        embed.set_image(url=f"attachment://level_{user_id}.png")
        view = CardSettingsView(color, background_url, user_id)
        await send(embed=embed, file=file, view=view)
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
        embed = discord.Embed()
        embed.set_image(url=f"attachment://level_{user_id}.png")
        view = CardSettingsView(color, DEFAULT_BACKGROUND, user_id)
        kwargs = {"ephemeral": True} if allow_ephemeral else {}
        await send(
            f"{WARNING_EMOJI}Background image invalid; using default.",
            embed=embed,
            file=file,
            view=view,
            **kwargs,
        )
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
    CardSettingsView,
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
            CardSettingsView,
            allow_ephemeral=True,
        )
