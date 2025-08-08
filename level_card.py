from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
from urllib.request import urlopen
from io import BytesIO
import math

W, H = 1100, 420  # full canvas (no inner card)

def font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()

def fetch_png(url, size=None):
    with urlopen(url) as r:
        im = Image.open(BytesIO(r.read())).convert("RGBA")
    if size:
        im = im.resize(size, Image.LANCZOS)
    return im

def grad_h(w, h, c0, c1):
    g = Image.new("RGB", (w, 1))
    d = ImageDraw.Draw(g)
    for x in range(w):
        t = x / max(1, w - 1)
        r = round(c0[0] * (1 - t) + c1[0] * t)
        g_ = round(c0[1] * (1 - t) + c1[1] * t)
        b = round(c0[2] * (1 - t) + c1[2] * t)
        d.point((x, 0), (r, g_, b))
    return g.resize((w, h))

def cool_background(img):
    w, h = img.size
    base = grad_h(w, h, (25, 35, 60), (10, 12, 20)).convert("RGBA")

    # Mesh blobs
    mesh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    md = ImageDraw.Draw(mesh)

    def blob(cx, cy, r, rgba):
        b = Image.new("L", (r * 2, r * 2), 0)
        bd = ImageDraw.Draw(b)
        bd.ellipse((0, 0, r * 2, r * 2), fill=255)
        b = b.filter(ImageFilter.GaussianBlur(r * 0.6))
        circle = Image.new("RGBA", (r * 2, r * 2), rgba)
        mesh.paste(circle, (cx - r, cy - r), b)

    blob(int(w * 0.25), int(h * 0.25), 240, (74, 144, 255, 120))
    blob(int(w * 0.70), int(h * 0.35), 260, (120, 255, 190, 110))
    blob(int(w * 0.55), int(h * 0.78), 300, (255, 175, 95, 100))
    base.alpha_composite(mesh)

    # Subtle vignette
    vig = Image.new("L", (w, h), 0)
    vg = ImageDraw.Draw(vig)
    vg.rectangle((40, 30, w - 40, h - 30), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(80))
    fade = Image.new("RGBA", (w, h), (0, 0, 0, 130))
    fade.putalpha(ImageChops.invert(vig))
    base.alpha_composite(fade)

    # Light film
    film = Image.new("RGBA", (w, h), (255, 255, 255, 10))
    base.alpha_composite(film)
    img.paste(base, (0, 0))

def glass_rect(img, rect, radius=18, fill=(255, 255, 255, 40), stroke=(255, 255, 255, 60)):
    x0, y0, x1, y1 = rect
    layer = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((0, 0, x1 - x0, y1 - y0), radius=radius, fill=fill, outline=stroke, width=2)
    # top highlight
    hi = Image.new("RGBA", (x1 - x0, max(2, (y1 - y0) // 2)), (255, 255, 255, 35))
    hi = hi.filter(ImageFilter.GaussianBlur(4))
    layer.alpha_composite(hi, (0, 0))
    img.alpha_composite(layer, (x0, y0))

def progress_bar(img, rect, p, c0=(92, 220, 140), c1=(32, 170, 100)):
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    glass_rect(img, rect, radius=16, fill=(255, 255, 255, 45), stroke=(255, 255, 255, 70))
    fill_w = max(0, min(w, int(w * p)))
    if fill_w > 0:
        grad = grad_h(fill_w, h, c0, c1).convert("RGBA")
        mask = Image.new("L", (w, h), 0)
        d = ImageDraw.Draw(mask)
        d.rounded_rectangle((0, 0, w, h), radius=16, fill=255)
        bar = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        bar.paste(grad, (0, 0))
        img.alpha_composite(Image.composite(bar, Image.new("RGBA", (w, h)), mask), (x0, y0))

def badge_slot(img, rect, url=None):
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    if not url:
        ring = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(ring)
        r = min(w, h) // 2
        d.ellipse((w // 2 - r, h // 2 - r, w // 2 + r, h // 2 + r), outline=(255, 255, 255, 90), width=4, fill=(255, 255, 255, 12))
        ring = ring.filter(ImageFilter.GaussianBlur(0.5))
        img.alpha_composite(ring, (x0, y0))
    else:
        glass_rect(img, rect, radius=20, fill=(255, 255, 255, 35), stroke=(255, 255, 255, 70))
        try:
            ic = fetch_png(url, size=(w - 14, h - 14))
            img.alpha_composite(ic, (x0 + (w - ic.width) // 2, y0 + (h - ic.height) // 2))
        except Exception:
            pass

def render_level_card(
    username="vietnamph",
    nickname="VietnamPH",
    level=1,
    xp=0,
    xp_total=100,
    rank=0,
    prestige=0,
    total_xp=0,
    star_url="https://i.ibb.co/fdtb13YH/d744eea4-bcd5-44cb-ae95-458044c0e3b7.png",
    medal_url="https://i.ibb.co/7dw9RjgV/7cbb626b-1509-463f-a5b9-dce886ba4619.png",
    badges=(None, None, None),
    outfile="level_card.png",
):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cool_background(img)
    d = ImageDraw.Draw(img)

    # Header: name, nickname, rank+medal (top)
    pad = 26
    name_f = font(44, True)
    nick_f = font(22)
    d.text((pad, pad), username, font=name_f, fill=(245, 249, 255, 255))
    d.text((pad, pad + 48), nickname, font=nick_f, fill=(220, 232, 245, 230))

    try:
        medal = fetch_png(medal_url, size=(56, 56))
        mx = W - pad - medal.width
        my = pad - 2
        img.alpha_composite(medal, (mx, my))
        rf = font(28, True)
        rtxt = f"#{rank}"
        rtw, rth = d.textbbox((0, 0), rtxt, font=rf)[2:]
        d.text((mx - 12 - rtw, my + (medal.height - rth) // 2), rtxt, font=rf, fill=(245, 249, 255, 255))
    except Exception:
        pass

    # Avatar placeholder (glass square)
    av_size = 180
    av_rect = (pad, 120, pad + av_size, 120 + av_size)
    glass_rect(img, av_rect, radius=22, fill=(255, 255, 255, 35))
    av_tw, av_th = d.multiline_textbbox((0, 0), "USER\nICON", font=font(22, True), align="center")[2:]
    d.multiline_text(
        (
            av_rect[0] + (av_size - av_tw) / 2,
            av_rect[1] + (av_size - av_th) / 2,
        ),
        "USER\nICON",
        font=font(22, True),
        fill=(230, 240, 255, 230),
        align="center",
    )

    # Stats (left, under avatar)
    lab_f = font(20, True)
    val_f = font(18, True)

    def pill(x, y, label, val, bg):
        d.text((x, y), label, font=lab_f, fill=(225, 235, 250, 255))
        tw, th = d.textbbox((0, 0), str(val), font=val_f)[2:]
        w = tw + 18 * 2
        h = th + int(th * 0.6)
        glass_rect(img, (x, y + th + 6, x + w, y + th + 6 + h), radius=14, fill=(255, 255, 255, 38))
        d.text(
            (x + (w - tw) / 2, y + th + 6 + (h - th) / 2 - 1),
            str(val),
            font=val_f,
            fill=(255, 255, 255, 255),
        )

    pill(pad, av_rect[3] + 14, "Prestige", prestige, (38, 120, 215))
    pill(pad, av_rect[3] + 70, "Total XP", f"{total_xp:,}", (28, 160, 125))

    # Level + XP bar (right of avatar)
    info_x = av_rect[2] + 28
    d.text((info_x, 120), f"Level: {level}", font=font(26, True), fill=(245, 249, 255, 255))

    bar_rect = (info_x, 160, W - pad, 208)
    p = 0 if xp_total <= 0 else max(0, min(1, xp / xp_total))
    progress_bar(img, bar_rect, p)

    # star + xp text
    try:
        star = fetch_png(star_url, size=(40, 40))
        img.alpha_composite(star, (bar_rect[0] + 8, bar_rect[1] + 3))
    except Exception:
        pass
    xp_txt = f"{xp:,} / {xp_total:,}"
    xp_f = font(22, True)
    for dx, dy, a in [(-1, 0, 180), (1, 0, 180), (0, -1, 180), (0, 1, 180)]:
        d.text(
            (bar_rect[0] + 56 + dx, bar_rect[1] + (bar_rect[3] - bar_rect[1] - xp_f.size) // 2 - 1 + dy),
            xp_txt,
            font=xp_f,
            fill=(0, 0, 0, a),
        )
    d.text(
        (bar_rect[0] + 56, bar_rect[1] + (bar_rect[3] - bar_rect[1] - xp_f.size) // 2 - 1),
        xp_txt,
        font=xp_f,
        fill=(255, 255, 255, 245),
    )

    # Badges row (full-bleed style)
    badge_w, badge_h, gap = 108, 86, 26
    y = 230
    for i in range(3):
        x = info_x + i * (badge_w + gap)
        badge_slot(img, (x, y, x + badge_w, y + badge_h), url=(badges[i] if i < len(badges) else None))

    # Footer tip (soft)
    d.text(
        (pad, H - 28),
        "Tip: Earn XP to level up faster • Daily quests reset at 00:00",
        font=font(16),
        fill=(220, 232, 245, 200),
    )

    img.save(outfile)
    return outfile

if __name__ == "__main__":
    render_level_card(
        username="vietnamph",
        nickname="VietnamPH",
        level=1,
        xp=0,
        xp_total=100,
        rank=0,
        prestige=0,
        total_xp=0,
        badges=(None, None, None),
        outfile="level_card.png",
    )
    print("Saved level_card.png")
