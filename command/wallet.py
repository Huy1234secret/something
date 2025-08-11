"""Wallet command renderer using a stylised card UI.

This module defines :func:`render_wallet_card`, which produces a
leather-textured wallet style image summarising a user's currency holdings.
The rest of the public API mirrors the previous implementation so other
modules can continue to call :func:`send_wallet_card` unchanged.
"""

from __future__ import annotations

import os
from io import BytesIO
from urllib.request import urlopen

import discord
from PIL import (
    Image,
    ImageChops,
    ImageDraw,
    ImageFilter,
    ImageFont,
    ImageOps,
)

COIN_URL = "https://i.ibb.co/LDbB8Db5/Coin.png"
DIAMOND_URL = "https://i.ibb.co/R400ZFyT/Diamond.png"
DELUXE_URL = "https://i.ibb.co/Q7LtJxXt/Deluxe-Coin.png"

COIN_VALUE = 1
DIAMOND_VALUE = 20
DELUXE_VALUE = 100


# ---------------------------
# Helpers (fonts, textures, shapes)
# ---------------------------

_ICON_CACHE: dict[str, Image.Image] = {}


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Return a truetype font of ``size``; fall back to Pillow default."""

    try:
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        return ImageFont.truetype(name, size)
    except Exception:  # pragma: no cover - font lookup best effort
        return ImageFont.load_default()


def _text_size(text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _fit_font(
    text: str, max_w: int, max_h: int, start_size: int, bold: bool = False
) -> ImageFont.FreeTypeFont:
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
        return _ICON_CACHE[url].copy()
    try:
        with urlopen(url, timeout=5) as r:  # nosec - controlled URLs
            im = Image.open(BytesIO(r.read())).convert("RGBA")
    except Exception:
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse((0, 0, size - 1, size - 1), fill=(230, 200, 120, 255))
        d.ellipse(
            (size * 0.2, size * 0.2, size * 0.8, size * 0.8),
            outline=(140, 110, 60, 255),
            width=max(1, size // 16),
        )
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
    base_img = Image.composite(
        base_img, Image.new("RGB", size, (38, 25, 18)), ImageOps.invert(vignette)
    )

    try:
        noise = Image.effect_noise(size, 20).convert("L")
        noise = ImageOps.autocontrast(noise)
        noise = noise.filter(ImageFilter.GaussianBlur(radius=1))
        grain = Image.merge("RGB", (noise, noise, noise))
        base_img = ImageChops.screen(
            base_img, ImageChops.multiply(grain, Image.new("RGB", size, (60, 40, 30)))
        )
    except Exception:  # pragma: no cover - effect_noise best effort
        pass
    return base_img


def _rounded_rect_mask(size: tuple[int, int], radius: int) -> Image.Image:
    w, h = size
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    return m


def _inner_shadow(img: Image.Image, radius: int = 20, opacity: int = 120) -> Image.Image:
    alpha = img.split()[-1] if img.mode == "RGBA" else None
    if alpha is None:
        alpha = Image.new("L", img.size, 255)
    inv = ImageOps.invert(alpha).filter(ImageFilter.GaussianBlur(radius=radius))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow.putalpha(
        Image.eval(inv, lambda p: min(int(p * (opacity / 255)), 255))
    )
    return Image.alpha_composite(img.convert("RGBA"), shadow)


def _draw_stitches(
    draw: ImageDraw.ImageDraw,
    bbox: tuple[int, int, int, int],
    radius: int,
    spacing: int,
    stitch_color=(245, 225, 190),
    width: int = 2,
) -> None:
    x0, y0, x1, y1 = bbox
    path: list[tuple[tuple[int, int], tuple[int, int]]] = []
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


def _emboss_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    base_color: tuple[int, int, int],
) -> None:
    x, y = xy
    draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 160))
    draw.text((x - 1, y - 1), text, font=font, fill=(255, 255, 255, 80))
    draw.text((x, y), text, font=font, fill=base_color)


def _avatar_badge(avatar: Image.Image, diameter: int) -> Image.Image:
    avatar = avatar.resize((diameter, diameter), Image.LANCZOS)
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    badge = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    ring = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse(
        (0, 0, diameter - 1, diameter - 1),
        outline=(250, 240, 210, 220),
        width=max(2, diameter // 28),
    )
    ring = ring.filter(ImageFilter.GaussianBlur(radius=1))
    badge.paste(avatar, (0, 0), mask)
    badge = Image.alpha_composite(badge, ring)
    shadow = Image.new("RGBA", badge.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((2, 2, diameter, diameter), fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=6))
    out = Image.new("RGBA", (diameter + 6, diameter + 6), (0, 0, 0, 0))
    out.alpha_composite(shadow, (0, 0))
    out.alpha_composite(badge, (3, 3))
    return out


# ---------------------------
# Wallet renderer
# ---------------------------


def render_wallet_card(
    username: str,
    avatar_image: Image.Image,
    coins: int,
    diamonds: int,
    deluxe: int,
    total: int,
    outfile: str = "wallet.png",
) -> str:
    W, H, SCALE = 900, 450, 2
    w, h = W * SCALE, H * SCALE

    leather = _leather_base((w, h), base=(74, 49, 36))
    wallet = Image.new("RGBA", (w, h))
    wallet.paste(leather.convert("RGBA"))

    corner = max(24, W // 18) * SCALE // 2
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

    flap_h = int(h * 0.26)
    flap_bbox = (inset * 2, inset * 2, w - inset * 2, inset * 2 + flap_h)
    flap = Image.new("RGBA", (w, flap_h + 2 * inset))
    flap_leather = _leather_base(flap.size, base=(62, 41, 30))
    flap.putalpha(255)
    flap = Image.alpha_composite(flap, flap_leather.convert("RGBA"))
    flap_mask = _rounded_rect_mask(flap.size, radius=int(corner * 0.8))
    flap.putalpha(flap_mask)
    flap = _inner_shadow(flap, radius=18, opacity=160)
    wallet.alpha_composite(flap, (inset * 2, inset * 2))

    _draw_stitches(
        draw,
        (
            flap_bbox[0] + 12 * SCALE,
            flap_bbox[1] + 10 * SCALE,
            flap_bbox[2] - 12 * SCALE,
            flap_bbox[3] - 10 * SCALE,
        ),
        radius=int(corner * 0.6),
        spacing=24 * SCALE // 2,
        stitch_color=(240, 220, 185),
        width=2 * SCALE // 2,
    )

    avatar_badge = _avatar_badge(avatar_image.convert("RGBA"), diameter=int(flap_h * 0.75))
    wallet.alpha_composite(
        avatar_badge,
        (flap_bbox[0] + 16 * SCALE, flap_bbox[1] + int(flap_h * 0.5) - avatar_badge.size[1] // 2),
    )

    name_left = flap_bbox[0] + int(flap_h * 0.75) + 40 * SCALE
    name_top = flap_bbox[1] + int(flap_h * 0.20)
    name_w = (flap_bbox[2] - 20 * SCALE) - name_left
    name_h = int(flap_h * 0.40)

    font_name = _fit_font(username, name_w, name_h, start_size=48 * SCALE // 2, bold=True)
    _emboss_text(draw, (name_left, name_top), username, font_name, base_color=(235, 220, 200))

    total_txt = f"Total: {total:,}"
    plate_h = int(flap_h * 0.46)
    plate_w = min(int(name_w * 0.55), 350 * SCALE)
    plate_x = flap_bbox[2] - plate_w - 20 * SCALE
    plate_y = flap_bbox[1] + int((flap_h - plate_h) / 2)
    plate = Image.new("RGBA", (plate_w, plate_h), (90, 62, 47, 255))
    plate_mask = _rounded_rect_mask((plate_w, plate_h), radius=int(plate_h * 0.4))
    plate.putalpha(plate_mask)
    plate = _inner_shadow(plate, radius=10, opacity=120)
    wallet.alpha_composite(plate, (plate_x, plate_y))
    rd = ImageDraw.Draw(wallet)
    r = max(4, SCALE * 3)
    for cx in (plate_x + plate_h // 3, plate_x + plate_w - plate_h // 3):
        cy = plate_y + plate_h // 2
        rd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(230, 215, 180, 255))
        rd.ellipse((cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2), fill=(160, 140, 110, 255))

    font_total = _fit_font(
        total_txt, plate_w - 24 * SCALE, plate_h - 10 * SCALE, start_size=40 * SCALE // 2, bold=True
    )
    tw, th = _text_size(total_txt, font_total)
    _emboss_text(
        draw,
        (plate_x + (plate_w - tw) // 2, plate_y + (plate_h - th) // 2),
        total_txt,
        font_total,
        base_color=(250, 235, 210),
    )

    pockets_top = flap_bbox[3] + 18 * SCALE
    pocket_h = int((h - pockets_top - inset * 3) / 3)
    pocket_gap = 12 * SCALE
    pocket_radius = int(pocket_h * 0.22)
    icon_size = int(pocket_h * 0.54)
    label_pad = 20 * SCALE

    items = [
        ("Coins", coins, COIN_VALUE, COIN_URL),
        ("Diamonds", diamonds, DIAMOND_VALUE, DIAMOND_URL),
        ("Deluxe", deluxe, DELUXE_VALUE, DELUXE_URL),
    ]

    for i, (label, count, unit, url) in enumerate(items):
        y0 = pockets_top + i * (pocket_h + pocket_gap)
        y1 = y0 + pocket_h
        x0 = inset * 2
        x1 = w - inset * 2
        pocket = Image.new("RGBA", (x1 - x0, pocket_h), (82, 55, 41, 255))
        pocket_mask = _rounded_rect_mask(pocket.size, radius=pocket_radius)
        pocket.putalpha(pocket_mask)
        pocket = _inner_shadow(pocket, radius=14, opacity=120)
        wallet.alpha_composite(pocket, (x0, y0))

        _draw_stitches(
            draw,
            (x0 + 14 * SCALE, y0 + 10 * SCALE, x1 - 14 * SCALE, y1 - 10 * SCALE),
            radius=int(pocket_radius * 0.8),
            spacing=24 * SCALE // 2,
            stitch_color=(245, 225, 190),
            width=2 * SCALE // 2,
        )

        icon = _safe_open_icon(url, icon_size)
        wallet.alpha_composite(icon, (x0 + 22 * SCALE, y0 + (pocket_h - icon_size) // 2))

        label_color = (242, 229, 210)
        count_color = (255, 247, 230)
        small = _fit_font(label, max(1, (x1 - x0) // 3), pocket_h // 3, start_size=30 * SCALE // 2, bold=True)
        big = _fit_font(
            f"{count:,}", (x1 - x0) - (icon_size + 120 * SCALE), int(pocket_h * 0.7), start_size=54 * SCALE // 2, bold=True
        )

        lx = x0 + 22 * SCALE + icon_size + label_pad
        ly = y0 + int(pocket_h * 0.20)
        _emboss_text(draw, (lx, ly), label, small, base_color=label_color)

        cx = lx
        cy = y0 + int(pocket_h * 0.50)
        count_txt = f"{count:,}  (×{unit})"
        count_main = f"{count:,}"
        unit_txt = f"  (×{unit})"
        _emboss_text(draw, (cx, cy), count_main, big, base_color=count_color)
        small_unit = _fit_font(
            unit_txt, (x1 - cx) - 20 * SCALE, pocket_h // 3, start_size=28 * SCALE // 2, bold=False
        )
        offx = _text_size(count_main, big)[0]
        _emboss_text(draw, (cx + offx, cy + max(2, SCALE)), unit_txt, small_unit, base_color=label_color)

    final_img = wallet.resize((W, H), Image.LANCZOS)
    final_img.save(outfile)
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

