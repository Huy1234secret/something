import os
from io import BytesIO

import discord
from PIL import Image, ImageDraw, ImageFont
from urllib.request import urlopen

COIN_URL = "https://i.ibb.co/LDbB8Db5/Coin.png"
DIAMOND_URL = "https://i.ibb.co/R400ZFyT/Diamond.png"
DELUXE_URL = "https://i.ibb.co/Q7LtJxXt/Deluxe-Coin.png"

COIN_VALUE = 1
DIAMOND_VALUE = 20
DELUXE_VALUE = 100


def render_wallet_card(
    username: str,
    avatar_image: Image.Image,
    coins: int,
    diamonds: int,
    deluxe: int,
    total: int,
    outfile: str = "wallet.png",
) -> str:
    width, height = 600, 250
    card = Image.new("RGBA", (width, height), (30, 30, 30, 255))
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle(
        (20, 20, width - 20, height - 20), radius=25, fill=(70, 50, 40), outline=(120, 90, 70), width=4
    )

    avatar_size = 100
    avatar_image = avatar_image.resize((avatar_size, avatar_size))
    mask = Image.new("L", (avatar_size, avatar_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((0, 0, avatar_size, avatar_size), fill=255)
    card.paste(avatar_image, (40, 40), mask)

    font_big = ImageFont.load_default()
    font_small = ImageFont.load_default()
    draw.text((160, 50), username, font=font_big, fill=(255, 255, 255))
    draw.text((160, 80), f"Total value: {total}", font=font_small, fill=(255, 255, 255))

    coin_img = Image.open(BytesIO(urlopen(COIN_URL).read())).convert("RGBA").resize((40, 40))
    diamond_img = Image.open(BytesIO(urlopen(DIAMOND_URL).read())).convert("RGBA").resize((40, 40))
    deluxe_img = Image.open(BytesIO(urlopen(DELUXE_URL).read())).convert("RGBA").resize((40, 40))

    card.paste(coin_img, (60, 160), coin_img)
    draw.text((110, 170), str(coins), font=font_small, fill=(255, 255, 255))
    card.paste(diamond_img, (230, 160), diamond_img)
    draw.text((280, 170), str(diamonds), font=font_small, fill=(255, 255, 255))
    card.paste(deluxe_img, (400, 160), deluxe_img)
    draw.text((450, 170), str(deluxe), font=font_small, fill=(255, 255, 255))

    card.save(outfile)
    return outfile


async def send_wallet_card(
    user: discord.abc.User,
    send,
    user_stats: dict[int, dict[str, int]],
    save_data,
) -> None:
    user_id = user.id
    stats = user_stats.setdefault(
        user_id,
        {
            "level": 1,
            "xp": 0,
            "total_xp": 0,
            "coins": 0,
            "diamonds": 0,
            "deluxe_coins": 0,
        },
    )
    stats.setdefault("coins", 0)
    stats.setdefault("diamonds", 0)
    stats.setdefault("deluxe_coins", 0)
    save_data()

    coins = stats["coins"]
    diamonds = stats["diamonds"]
    deluxe = stats["deluxe_coins"]
    total = coins * COIN_VALUE + diamonds * DIAMOND_VALUE + deluxe * DELUXE_VALUE

    avatar_asset = user.display_avatar.with_size(128).with_static_format("png")
    avatar_bytes = await avatar_asset.read()
    avatar_image = Image.open(BytesIO(avatar_bytes)).convert("RGBA")

    path = render_wallet_card(
        user.name,
        avatar_image,
        coins,
        diamonds,
        deluxe,
        total,
        outfile=f"wallet_{user_id}.png",
    )
    await send(file=discord.File(path))
    try:
        os.remove(path)
    except OSError:
        pass


def setup(tree, user_stats, user_card_settings, save_data, *_, **__):
    @tree.command(name="wallet", description="Show your wallet")
    async def wallet_command(interaction: discord.Interaction):
        await interaction.response.defer()
        await send_wallet_card(
            interaction.user,
            interaction.followup.send,
            user_stats,
            save_data,
        )

