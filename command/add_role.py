import asyncio

import discord
from discord import app_commands


def parse_duration(time_str: str) -> int | None:
    """Convert a duration string like '1h' or '7w' to seconds."""
    units = {"h": 3600, "d": 86400, "w": 604800, "m": 2592000}
    try:
        amount = int(time_str[:-1])
        unit = time_str[-1].lower()
        return amount * units[unit]
    except (ValueError, KeyError):
        return None


def setup(tree, *_, **__):
    """Register the add-role command with the provided command tree."""

    @tree.command(
        name="add-role", description="Give a role to a user, optionally for a limited time"
    )
    @app_commands.describe(
        user="User to give the role",
        role="Role to assign",
        time="Duration to keep the role (e.g. 1h, 1d, 7w, 1m)",
    )
    @app_commands.checks.has_permissions(manage_roles=True)
    async def add_role_command(
        interaction: discord.Interaction,
        user: discord.Member,
        role: discord.Role,
        time: str | None = None,
    ) -> None:
        await interaction.response.defer(ephemeral=True)
        try:
            await user.add_roles(role)
        except discord.Forbidden:
            await interaction.followup.send(
                "I don't have permission to assign that role.", ephemeral=True
            )
            return
        except discord.HTTPException:
            await interaction.followup.send(
                "Failed to assign the role.", ephemeral=True
            )
            return

        await interaction.followup.send(
            f"Added {role.mention} to {user.mention}.", ephemeral=True
        )

        if time:
            seconds = parse_duration(time)
            if seconds is None:
                await interaction.followup.send(
                    "Invalid time format. Use number followed by h/d/w/m.",
                    ephemeral=True,
                )
                return

            async def remove_later() -> None:
                await asyncio.sleep(seconds)
                try:
                    await user.remove_roles(role)
                except discord.HTTPException:
                    pass

            asyncio.create_task(remove_later())
