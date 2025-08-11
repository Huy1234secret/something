# Wallet command renderer using a stylised card UI (flat + bigger elements).
from __future__ import annotations

import os
from io import BytesIO
from urllib.request import urlopen

import discord
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

COIN_URL    = "https://i.ibb.co/LDbB8Db5/Coin.png"
DIAMOND_URL = os.getenv("DIAMOND_URL", "https://i.ibb.co/R400ZFyT/Diamond.png")
DELUXE_URL  = "https://i.ibb.co/Q7LtJxXt/Deluxe-Coin.png"

COIN_VALUE    = 1
DIAMOND_VALUE = 20
DELUXE_VALUE  = 100

# --------- Style Toggles ---------
FLAT_MODE = True              # no shadows
CARD_SIZE = (900, 520)        # default size
CARD_CORNER_SCALE = 1.2       # rounder outer corners
POCKET_CORNER = 0.28          # pocket corner as a fraction of height
ICON_SCALE = 0.72             # icon size relative to pocket height (bigger)
COUNT_HEIGHT = 0.78           # numbers occupy this fraction of pocket height
LABEL_MARGIN_TOP = 8          # px (at 1x) gap between label and bar
LABEL_AFTER_ICON_GAP = 16     # px (at 1x) gap to the right of icon

_ICON_CACHE: dict[str, Image.Image] = {}


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", size)
    except Exception:
        return ImageFont.load_default()


def _text_size(text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    b = font.getbbox(text)
    return b[2] - b[0], b[3] - b[1]


def _fit_font(text: str, max_w: int, max_h: int, start_size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > 10:
        f = _load_font(size, bold=bold)
        w, h = _text_size(text, f)
        if w <= max_w and h <= max_h:
            return f
        size -= 1
    return _load_font(10, bold=bold)


def _safe_open_icon(url: str, size: int) -> Image.Image:
    if url in _ICON_CACHE:
        return _ICON_CACHE[url].copy().resize((size, size), Image.LANCZOS)
    try:
        with urlopen(url, timeout=5) as r:
            im = Image.open(BytesIO(r.read())).convert("RGBA")
    except Exception:
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse((0, 0, size - 1, size - 1), fill=(230, 200, 120, 255))
        d.ellipse((size * 0.2, size * 0.2, size * 0.8, size * 0.8), outline=(140, 110, 60, 255), width=max(1, size // 16))
    im = im.resize((size, size), Image.LANCZOS)
    _ICON_CACHE[url] = im.copy()
    return im


def _leather_base(size: tuple[int, int], base=(73, 48, 36)) -> Image.Image:
    w, h = size
    base_img = Image.new("RGB", size, base)
    vignette = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse((-int(0.2 * w), -int(0.35 * h), int(1.2 * w), int(1.35 * h)), fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=max(8, w // 60)))
    base_img = Image.composite(base_img, Image.new("RGB", size, (38, 25, 18)), ImageOps.invert(vignette))
    try:
        noise = Image.effect_noise(size, 20).convert("L")
        noise = ImageOps.autocontrast(noise).filter(ImageFilter.GaussianBlur(radius=1))
        grain = Image.merge("RGB", (noise, noise, noise))
        base_img = ImageChops.screen(base_img, ImageChops.multiply(grain, Image.new("RGB", size, (60, 40, 30))))
    except Exception:
        pass
    return base_img


def _rounded_rect_mask(size: tuple[int, int], radius: int) -> Image.Image:
    w, h = size
    scale = 4
    mw, mh = w * scale, h * scale
    mr = max(1, radius * scale)
    m = Image.new("L", (mw, mh), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, mw - 1, mh - 1), radius=mr, fill=255)
    m = m.resize((w, h), Image.LANCZOS)
    return m  # flat mode → no extra blur to avoid any fuzzy "sharp" artifacts


def _inner_shadow(img: Image.Image, radius: int = 20, opacity: int = 120) -> Image.Image:
    if FLAT_MODE:
        # return unchanged in flat mode
        return img.convert("RGBA")
    alpha = img.split()[-1] if img.mode == "RGBA" else Image.new("L", img.size, 255)
    inv = ImageOps.invert(alpha).filter(ImageFilter.GaussianBlur(radius=radius))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow.putalpha(Image.eval(inv, lambda p: min(int(p * (opacity / 255)), 255)))
    return Image.alpha_composite(img.convert("RGBA"), shadow)


def _draw_stitches(draw: ImageDraw.ImageDraw, bbox, radius, spacing, stitch_color=(245, 225, 190), width=2) -> None:
    # stitches kept but slightly lighter; they already have rounded geometry
    x0, y0, x1, y1 = bbox
    path = []
    x = x0 + radius
    while x < x1 - radius:
        path.append(((x, y0), (min(x + spacing // 2, x1 - radius), y0)))
        x += spacing
    x = x0 + radius
    while x < x1 - radius:
        path.append(((x, y1), (min(x + spacing // 2, x1 - radius), y1)))
        x += spacing
    y = y0 + radius
    while y < y1 - radius:
        path.append(((x0, y), (x0, min(y + spacing // 2, y1 - radius))))
        y += spacing
    y = y0 + radius
    while y < y1 - radius:
        path.append(((x1, y), (x1, min(y + spacing // 2, y1 - radius))))
        y += spacing
    for seg in path:
        draw.line(seg, fill=stitch_color, width=width)


def _emboss_text(draw: ImageDraw.ImageDraw, xy, text, font, base_color):
    # flat text (no shadow/emboss) when FLAT_MODE
    x, y = xy
    if FLAT_MODE:
        draw.text((x, y), text, font=font, fill=base_color)
    else:
        draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 160))
        draw.text((x - 1, y - 1), text, font=font, fill=(255, 255, 255, 80))
        draw.text((x, y), text, font=font, fill=base_color)


def _avatar_badge(avatar: Image.Image, diameter: int) -> Image.Image:
    # flat avatar, no drop shadow
    avatar = avatar.resize((diameter, diameter), Image.LANCZOS)
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    badge = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    badge.paste(avatar, (0, 0), mask)
    return badge


# ---------------------------


def render_wallet_card(
    username: str,
    avatar_image: Image.Image,
    coins: int,
    diamonds: int,
    deluxe: int,
    total: int,
    outfile: str = "wallet.png",
    size: tuple[int, int] = CARD_SIZE,  # taller card
) -> str:
    W, H = size
    SCALE = 2
    w, h = W * SCALE, H * SCALE

    leather = _leather_base((w, h), base=(74, 49, 36))
    wallet = Image.new("RGBA", (w, h))
    wallet.paste(leather.convert("RGBA"))

    corner = int(max(24, W // 18) * SCALE // 2 * CARD_CORNER_SCALE)
    mask = _rounded_rect_mask((w, h), radius=corner)
    wallet.putalpha(mask)
    wallet = _inner_shadow(wallet, radius=28 * SCALE // 2, opacity=140)
    draw = ImageDraw.Draw(wallet)

    inset = 20 * SCALE
    _draw_stitches(
        draw,
        (inset, inset, w - inset, h - inset),
        radius=corner - inset // 2,
        spacing=26 * SCALE // 2,
        stitch_color=(245, 225, 190),
        width=3 * SCALE // 2,
    )

    # flap
    flap_h = int(h * 0.26)
    flap_bbox = (inset * 2, inset * 2, w - inset * 2, inset * 2 + flap_h)
    flap_w = flap_bbox[2] - flap_bbox[0]
    flap = Image.new("RGBA", (flap_w, flap_h), (62, 41, 30, 255))
    flap_mask = _rounded_rect_mask((flap_w, flap_h), radius=int(corner * 0.95))
    flap.putalpha(flap_mask)
    flap = _inner_shadow(flap, radius=18, opacity=160)
    wallet.alpha_composite(flap, (flap_bbox[0], flap_bbox[1]))

    _draw_stitches(
        draw,
        (
            flap_bbox[0] + 12 * SCALE,
            flap_bbox[1] + 10 * SCALE,
            flap_bbox[2] - 12 * SCALE,
            flap_bbox[3] - 10 * SCALE,
        ),
        radius=int(corner * 0.7),
        spacing=24 * SCALE // 2,
        stitch_color=(240, 220, 185),
        width=2 * SCALE // 2,
    )

    avatar_badge = _avatar_badge(avatar_image.convert("RGBA"), diameter=int(flap_h * 0.75))
    wallet.alpha_composite(
        avatar_badge,
        (
            flap_bbox[0] + 16 * SCALE,
            flap_bbox[1] + int(flap_h * 0.5) - avatar_badge.size[1] // 2,
        ),
    )

    # name
    name_left = flap_bbox[0] + int(flap_h * 0.75) + 40 * SCALE
    name_top = flap_bbox[1] + int(flap_h * 0.20)
    name_w = (flap_bbox[2] - 20 * SCALE) - name_left
    name_h = int(flap_h * 0.40)
    font_name = _fit_font(username, name_w, name_h, start_size=50 * SCALE // 2, bold=True)
    _emboss_text(draw, (name_left, name_top), username, font_name, base_color=(235, 220, 200))

    # total plate (flat, no rivets)
    total_txt = f"Total Value: {total:,}"
    plate_h = int(flap_h * 0.46)
    plate_w = min(int(name_w * 0.58), 360 * SCALE)
    plate_x = flap_bbox[2] - plate_w - 20 * SCALE
    plate_y = flap_bbox[1] + int((flap_h - plate_h) / 2)
    plate = Image.new("RGBA", (plate_w, plate_h), (90, 62, 47, 255))
    plate_mask = _rounded_rect_mask((plate_w, plate_h), radius=int(plate_h * 0.5))
    plate.putalpha(plate_mask)
    plate = _inner_shadow(plate, radius=10, opacity=100)
    wallet.alpha_composite(plate, (plate_x, plate_y))
    font_total = _fit_font(total_txt, plate_w - 24 * SCALE, plate_h - 10 * SCALE, start_size=42 * SCALE // 2, bold=True)
    tw, th = _text_size(total_txt, font_total)
    _emboss_text(draw, (plate_x + (plate_w - tw) // 2, plate_y + (plate_h - th) // 2), total_txt, font_total, base_color=(250, 235, 210))

    # pockets
    pockets_top = flap_bbox[3] + 22 * SCALE
    pocket_h = int((h - pockets_top - inset * 3) / 3)
    pocket_gap = 14 * SCALE
    pocket_radius = int(pocket_h * POCKET_CORNER)
    icon_size = int(pocket_h * ICON_SCALE)

    items = [
        ("Coin", coins, COIN_URL),
        ("Diamond", diamonds, DIAMOND_URL),
        ("Deluxe Coin", deluxe, DELUXE_URL),
    ]

    for i, (label, count, url) in enumerate(items):
        y0 = pockets_top + i * (pocket_h + pocket_gap)
        y1 = y0 + pocket_h
        x0 = inset * 2
        x1 = w - inset * 2

        # pocket bar
        pocket = Image.new("RGBA", (x1 - x0, pocket_h), (82, 55, 41, 255))
        pocket.putalpha(_rounded_rect_mask(pocket.size, radius=pocket_radius))
        pocket = _inner_shadow(pocket, radius=14, opacity=120)
        wallet.alpha_composite(pocket, (x0, y0))

        # stitches
        _draw_stitches(
            draw,
            (x0 + 14 * SCALE, y0 + 10 * SCALE, x1 - 14 * SCALE, y1 - 10 * SCALE),
            radius=int(pocket_radius * 0.9),
            spacing=24 * SCALE // 2,
            stitch_color=(245, 225, 190),
            width=2 * SCALE // 2,
        )

        # icon
        icon = _safe_open_icon(url, icon_size)
        icon_left = x0 + 22 * SCALE
        wallet.alpha_composite(icon, (icon_left, y0 + (pocket_h - icon_size) // 2))

        # count (exact vertical center, bigger size)
        num_text = f"{count:,}"
        count_color = (255, 247, 230)
        big = _fit_font(num_text, (x1 - x0) - (icon_size + 180 * SCALE), int(pocket_h * COUNT_HEIGHT), start_size=64 * SCALE // 2, bold=True)
        bbox = big.getbbox(num_text)
        th = bbox[3] - bbox[1]
        cx = icon_left + icon_size + 24 * SCALE
        # Adjust y by bbox[1] so text baseline sits exactly centered
        cy = y0 + (pocket_h - th) // 2 - bbox[1]
        _emboss_text(draw, (cx, cy), num_text, big, base_color=count_color)

        # label ABOVE bar, a bit to the right of the icon
        label_font = _fit_font(label, (x1 - x0) // 2, int(pocket_h * 0.38), start_size=32 * SCALE // 2, bold=True)
        lw, lh = _text_size(label, label_font)
        label_x = icon_left + icon_size + LABEL_AFTER_ICON_GAP * SCALE // 2
        margin = LABEL_MARGIN_TOP * SCALE // 2
        label_y = y0 - lh - margin
        _emboss_text(draw, (label_x, label_y), label, label_font, base_color=(245, 232, 214))

    final_img = wallet.resize((W, H), Image.LANCZOS)
    final_img.save(outfile)
    return outfile


async def send_wallet_card(user: discord.abc.User, send, user_stats: dict[int, dict[str, int]], save_data) -> None:
    user_id = user.id
    stats = user_stats.setdefault(user_id, {"level": 1, "xp": 0, "total_xp": 0, "coins": 0, "diamonds": 0, "deluxe_coins": 0})
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
        size=CARD_SIZE,
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
        await send_wallet_card(interaction.user, interaction.followup.send, user_stats, save_data)
