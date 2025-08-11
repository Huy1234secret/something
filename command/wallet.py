import discord
from discord import app_commands

# Placeholder for a database call; returns mock wallet data.
async def get_wallet(user_id: int) -> dict[str, int]:
    return {"coin": 12850, "diamonds": 42, "deluxe": 7}


def format_number(n: int) -> str:
    return f"{n:,}"


async def send_wallet(user: discord.abc.User, send) -> None:
    """Fetch and send a wallet embed for ``user`` using ``send``."""
    data = await get_wallet(user.id)
    display = getattr(user, "display_name", None)
    header = f"{user.name}'s Wallet" + (f" • aka {display}" if display and display != user.name else "")

    embed = discord.Embed(colour=0xF1C40F)
    embed.set_author(name=header, icon_url=user.display_avatar.with_size(128).url)
    embed.set_thumbnail(url=user.display_avatar.with_size(256).url)
    embed.add_field(
        name="Coin",
        value=f"[\u200b](https://i.ibb.co/LDbB8Db5/Coin.png) **{format_number(data['coin'])}**",
        inline=True,
    )
    embed.add_field(
        name="Diamonds",
        value=f"[\u200b](https://i.ibb.co/R400ZFyT/Diamond.png) **{format_number(data['diamonds'])}**",
        inline=True,
    )
    embed.add_field(
        name="Deluxe Coin",
        value=f"[\u200b](https://i.ibb.co/Q7LtJxXt/Deluxe-Coin.png) **{format_number(data['deluxe'])}**",
        inline=True,
    )
    embed.set_footer(text=f"ID: {user.id}")

    view = discord.ui.View()
    view.add_item(
        discord.ui.Button(
            custom_id="wallet_earn", label="Earn", style=discord.ButtonStyle.success
        )
    )
    view.add_item(
        discord.ui.Button(
            custom_id="wallet_shop", label="Shop", style=discord.ButtonStyle.primary
        )
    )
    view.add_item(
        discord.ui.Button(
            custom_id="wallet_transfer", label="Transfer", style=discord.ButtonStyle.secondary
        )
    )

    await send(embed=embed, view=view)


def setup(tree, *_args, **_kwargs) -> None:
    """Register the wallet slash command."""

    @tree.command(name="wallet", description="Show a user's wallet")
    @app_commands.describe(user="Whose wallet to view (default: you)")
    async def wallet(interaction: discord.Interaction, user: discord.User | None = None) -> None:
        await interaction.response.defer()
        target = user or interaction.user
        await send_wallet(target, interaction.followup.send)

