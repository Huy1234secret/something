"""Rendering utilities for the `/level` command.

This module generates a stylised level card image using Pillow.  It
provides a single public function, :func:`render_level_card`, which accepts
user information and returns the path to the generated PNG file.

The implementation is adapted from the user's supplied UI design and
supports optional Discord avatar fetching (or a preloaded avatar image) and a
configurable progress bar opacity.
"""

from __future__ import annotations

from io import BytesIO
from urllib.request import urlopen
from functools import lru_cache

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

# Canvas size for the level card
W, H = 1100, 420


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Return a font of the requested ``size``.

    The function tries a couple of common system font locations before
    falling back to Pillow's default bitmap font.
    """

    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:  # pragma: no cover - font lookup best effort
            pass
    return ImageFont.load_default()


@lru_cache(maxsize=32)
def _fetch_png_cached(url: str, size: tuple[int, int] | None) -> Image.Image:
    with urlopen(url) as r:  # nosec - controlled URLs
        im = Image.open(BytesIO(r.read())).convert("RGBA")
    if size:
        im = im.resize(size, Image.LANCZOS)
    return im


def fetch_png(url: str, size: tuple[int, int] | None = None) -> Image.Image:
    """Retrieve a PNG image from ``url`` and return it as ``RGBA``."""

    return _fetch_png_cached(url, size).copy()


@lru_cache(maxsize=32)
def _fetch_image_cached(
    url: str, size: tuple[int, int] | None, to_rgba: bool
) -> Image.Image:
    with urlopen(url) as r:  # nosec - controlled URLs
        im = Image.open(BytesIO(r.read()))
    im = im.convert("RGBA" if to_rgba else "RGB")
    if size:
        im = im.resize(size, Image.LANCZOS)
    return im


def fetch_image(
    url: str, size: tuple[int, int] | None = None, to_rgba: bool = False
) -> Image.Image:
    """Fetch an image from ``url``."""

    return _fetch_image_cached(url, size, to_rgba).copy()


def discord_avatar_url(
    user_id: str, avatar_hash: str, ext: str = "png", size: int = 256
) -> str:
    """Return the Discord CDN URL for a user's avatar."""

    return (
        f"https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.{ext}?size={size}"
    )


def glass_rect(
    img: Image.Image,
    rect: tuple[int, int, int, int],
    radius: int = 16,
    fill: tuple[int, int, int, int] = (255, 255, 255, 36),
    stroke: tuple[int, int, int, int] = (255, 255, 255, 80),
) -> None:
    """Draw a semi-transparent rounded rectangle onto ``img``."""

    x0, y0, x1, y1 = rect
    layer = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(
        (0, 0, x1 - x0, y1 - y0), radius=radius, fill=fill, outline=stroke, width=1
    )
    hi = Image.new("RGBA", (x1 - x0, max(2, (y1 - y0) // 2)), (255, 255, 255, 28))
    hi = hi.filter(ImageFilter.GaussianBlur(3))
    layer.alpha_composite(hi, (0, 0))
    img.alpha_composite(layer, (x0, y0))


def progress_bar(
    img: Image.Image,
    rect: tuple[int, int, int, int],
    p: float,
    c0: tuple[int, int, int] = (92, 220, 140),
    c1: tuple[int, int, int] = (32, 170, 100),
    bar_opacity: float = 0.55,
) -> None:
    """Render a progress bar inside ``rect`` with fill percentage ``p``."""

    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    alpha = int(255 * max(0, min(1, bar_opacity)))
    glass_rect(
        img,
        rect,
        radius=16,
        fill=(255, 255, 255, alpha),
        stroke=(255, 255, 255, alpha + 20),
    )
    fill_w = max(0, min(w, int(w * p)))
    if fill_w > 0:
        grad = Image.new("RGBA", (fill_w, h))
        gdraw = ImageDraw.Draw(grad)
        for x in range(fill_w):
            t = x / max(1, fill_w - 1)
            r = round(c0[0] * (1 - t) + c1[0] * t)
            g = round(c0[1] * (1 - t) + c1[1] * t)
            b = round(c0[2] * (1 - t) + c1[2] * t)
            gdraw.line([(x, 0), (x, h)], fill=(r, g, b, 230))
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=16, fill=255)
        bar = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        bar.paste(grad, (0, 0))
        img.alpha_composite(
            Image.composite(bar, Image.new("RGBA", (w, h)), mask), (x0, y0)
        )


def badge_slot(
    img: Image.Image, rect: tuple[int, int, int, int], url: str | None = None
) -> None:
    """Render a badge placeholder or image at ``rect``."""

    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    if not url:
        ring = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(ring)
        r = min(w, h) // 2
        d.ellipse(
            (w // 2 - r, h // 2 - r, w // 2 + r, h // 2 + r),
            outline=(255, 255, 255, 110),
            width=4,
            fill=(255, 255, 255, 18),
        )
        ring = ring.filter(ImageFilter.GaussianBlur(0.6))
        img.alpha_composite(ring, (x0, y0))
    else:
        glass_rect(img, rect, radius=20, fill=(255, 255, 255, 38), stroke=(255, 255, 255, 85))
        try:
            ic = fetch_png(url, size=(w - 14, h - 14))
            img.alpha_composite(ic, (x0 + (w - ic.width) // 2, y0 + (h - ic.height) // 2))
        except Exception:  # pragma: no cover - network best effort
            pass


def paste_avatar(
    img: Image.Image,
    rect: tuple[int, int, int, int],
    avatar_url: str | None = None,
    discord_user_id: str | None = None,
    discord_avatar_hash: str | None = None,
    avatar_image: Image.Image | None = None,
) -> None:
    """Paste a Discord avatar clipped to a rounded rect inside ``rect``.

    The avatar can be provided directly via ``avatar_image`` to avoid network
    fetching.  If not supplied, the function will attempt to retrieve the
    image from ``avatar_url`` or by constructing a Discord CDN URL from
    ``discord_user_id`` and ``discord_avatar_hash``.
    """

    x0, y0, x1, y1 = rect
    pad = 10
    inner = (x0 + pad, y0 + pad, x1 - pad, y1 - pad)
    iw, ih = inner[2] - inner[0], inner[3] - inner[1]

    av = None
    if avatar_image is not None:
        av = avatar_image.resize((iw, ih), Image.LANCZOS)
    else:
        url = avatar_url
        if (not url) and discord_user_id and discord_avatar_hash:
            url = discord_avatar_url(
                discord_user_id, discord_avatar_hash, size=max(iw, ih)
            )

        if url:
            try:
                av = fetch_image(url, size=(iw, ih), to_rgba=True)
            except Exception:  # pragma: no cover - network best effort
                av = None

    if av is not None:
        mask = Image.new("L", (iw, ih), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, iw, ih), radius=18, fill=255)
        tile = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
        tile.paste(av, (0, 0))
        tile.putalpha(mask)
        img.alpha_composite(tile, (inner[0], inner[1]))
        return

    # Placeholder if URL missing or fetch failed
    d = ImageDraw.Draw(img)
    tw, th = d.multiline_textbbox((0, 0), "USER\nICON", font=font(22, True), align="center")[2:]
    d.multiline_text(
        (x0 + (x1 - x0 - tw) // 2, y0 + (y1 - y0 - th) // 2),
        "USER\nICON",
        font=font(22, True),
        fill=(235, 242, 255, 235),
        align="center",
    )


def render_level_card(
    *,
    username: str = "vietnamph",
    nickname: str = "VietnamPH",
    level: int = 1,
    xp: int = 0,
    xp_total: int = 100,
    rank: int = 0,
    prestige: int = 0,
    total_xp: int = 0,
    background_url: str = "https://i.ibb.co/9337ZnxF/wdwdwd.jpg",
    star_url: str = "https://i.ibb.co/fdtb13YH/d744eea4-bcd5-44cb-ae95-458044c0e3b7.png",
    medal_url: str = "https://i.ibb.co/7dw9RjgV/7cbb626b-1509-463f-a5b9-dce886ba4619.png",
    badges: tuple[str | None, str | None, str | None] = (None, None, None),
    stats_offset: int = 50,
    bar_opacity: float = 0.55,
    avatar_url: str | None = None,
    discord_user_id: str | None = None,
    discord_avatar_hash: str | None = None,
    avatar_image: Image.Image | None = None,
    outfile: str = "level_card.png",
) -> str:
    """Render a full level card and return the output file path."""

    base = fetch_image(background_url, size=(W, H), to_rgba=True)
    vign = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vign).rectangle((30, 20, W - 30, H - 20), fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(80))
    darken = Image.new("RGBA", (W, H), (0, 0, 0, 140))
    darken.putalpha(ImageChops.invert(vign))
    base.alpha_composite(darken)
    d = ImageDraw.Draw(base)

    pad = 26

    # Header
    d.text((pad, pad), username, font=font(46, True), fill=(245, 249, 255, 255))
    d.text((pad, pad + 50), nickname, font=font(22), fill=(225, 235, 248, 230))

    # Rank + medal
    try:
        medal = fetch_png(medal_url, size=(56, 56))
        mx = W - pad - medal.width
        my = pad - 2
        base.alpha_composite(medal, (mx, my))
        rtxt = f"#{rank}"
        rtw, rth = d.textbbox((0, 0), rtxt, font=font(28, True))[2:]
        d.text((mx - 12 - rtw, my + (medal.height - rth) // 2), rtxt, font=font(28, True), fill=(245, 249, 255, 255))
    except Exception:  # pragma: no cover - network best effort
        pass

    # Avatar glass tile + avatar image
    av_size = 180
    av_rect = (pad, 116, pad + av_size, 116 + av_size)
    glass_rect(base, av_rect, radius=22, fill=(255, 255, 255, 40), stroke=(255, 255, 255, 90))
    paste_avatar(
        base,
        av_rect,
        avatar_url=avatar_url,
        avatar_image=avatar_image,
        discord_user_id=discord_user_id,
        discord_avatar_hash=discord_avatar_hash,
    )

    # Level + XP bar
    info_x = av_rect[2] + 28
    d.text((info_x, 116), f"Level: {level}", font=font(26, True), fill=(245, 249, 255, 255))

    bar_rect = (info_x, 156, W - pad, 204)
    p = 0 if xp_total <= 0 else max(0, min(1, xp / xp_total))
    progress_bar(base, bar_rect, p, bar_opacity=bar_opacity)

    # Star + XP text
    try:
        star = fetch_png(star_url, size=(40, 40))
        base.alpha_composite(star, (bar_rect[0] + 8, bar_rect[1] + 3))
    except Exception:  # pragma: no cover - network best effort
        pass
    xp_txt = f"{xp:,} / {xp_total:,}"
    xp_f = font(22, True)
    for dx, dy, a in [(-1, 0, 180), (1, 0, 180), (0, -1, 180), (0, 1, 180)]:
        d.text(
            (
                bar_rect[0] + 56 + dx,
                bar_rect[1] + (bar_rect[3] - bar_rect[1] - xp_f.size) // 2 - 1 + dy,
            ),
            xp_txt,
            font=xp_f,
            fill=(0, 0, 0, a),
        )
    d.text(
        (
            bar_rect[0] + 56,
            bar_rect[1] + (bar_rect[3] - bar_rect[1] - xp_f.size) // 2 - 1,
        ),
        xp_txt,
        font=xp_f,
        fill=(255, 255, 255, 245),
    )

    # --- Two-row stats grid ---
    labels_y = av_rect[3] + stats_offset
    vals_y = labels_y + 30
    col_w = 240
    col1_x = pad
    col2_x = pad + col_w
    label_f = font(22, True)
    val_f = font(24, True)
    d.text((col1_x, labels_y), "Prestige", font=label_f, fill=(230, 240, 255, 240))
    d.text((col2_x, labels_y), "Total XP", font=label_f, fill=(230, 240, 255, 240))

    def value_pill(x: int, y: int, text: str) -> None:
        tw, th = d.textbbox((0, 0), str(text), font=val_f)[2:]
        pad_x, pad_y = 12, 6
        rect = (x - 8, y - 4, x + tw + pad_x * 2 - 8, y + th + pad_y * 2 - 4)
        glass_rect(base, rect, radius=14, fill=(255, 255, 255, 34), stroke=(255, 255, 255, 70))
        d.text((x + pad_x - 8, y + pad_y - 4), str(text), font=val_f, fill=(255, 255, 255, 255))

    value_pill(col1_x, vals_y, prestige)
    value_pill(col2_x, vals_y, f"{total_xp:,}")

    # Badges row
    badge_w, badge_h, gap = 108, 86, 26
    badges_y = 236
    for i in range(3):
        x = info_x + i * (badge_w + gap)
        badge_slot(
            base,
            (x, badges_y, x + badge_w, badges_y + badge_h),
            url=(badges[i] if i < len(badges) else None),
        )

    base.save(outfile)
    return outfile


if __name__ == "__main__":  # pragma: no cover - manual test
    render_level_card(
        username="vietnamph",
        nickname="VietnamPH",
        level=1,
        xp=0,
        xp_total=100,
        rank=0,
        prestige=0,
        total_xp=0,
        background_url="https://i.ibb.co/9337ZnxF/wdwdwd.jpg",
        bar_opacity=0.55,
        stats_offset=60,
        badges=(None, None, None),
        outfile="level_card.png",
    )
    print("Saved level_card.png")

