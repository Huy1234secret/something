from PIL import Image, ImageDraw, ImageFont, ImageFilter
from urllib.request import urlopen
from urllib.error import URLError
from io import BytesIO
import math

CARD_W, CARD_H = 1024, 360
RADIUS = 24

def load_font(size, bold=False):
    paths_try = [
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        ("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for p in paths_try:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

def rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def load_png_from_url(url, size=None):
    try:
        with urlopen(url) as r:
            im = Image.open(BytesIO(r.read())).convert("RGBA")
    except URLError:
        im = Image.new("RGBA", size or (64, 64), (255, 255, 255, 0))
    if size and im.size != size:
        im = im.resize(size, Image.LANCZOS)
    return im

def add_shadow(base, rect, radius=20, blur=30, color=(0, 0, 0, 140)):
    x0, y0, x1, y1 = rect
    w = x1 - x0
    h = y1 - y0
    shadow = Image.new("RGBA", (w + blur * 2, h + blur * 2), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((blur, blur, blur + w, blur + h), radius=radius, fill=color)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur / 2))
    base.alpha_composite(shadow, (x0 - blur, y0 - blur))

def gradient_horizontal(width, height, left_rgb, right_rgb):
    grad = Image.new("RGB", (width, 1), color=0)
    draw = ImageDraw.Draw(grad)
    for x in range(width):
        t = x / max(1, width - 1)
        r = round(left_rgb[0] * (1 - t) + right_rgb[0] * t)
        g = round(left_rgb[1] * (1 - t) + right_rgb[1] * t)
        b = round(left_rgb[2] * (1 - t) + right_rgb[2] * t)
        draw.point((x, 0), (r, g, b))
    return grad.resize((width, height))

def center_text(draw, text, font, box, fill=(0, 0, 0), y_offset=0):
    x0, y0, x1, y1 = box
    w = x1 - x0
    h = y1 - y0
    tw, th = draw.textbbox((0, 0), text, font=font)[2:]
    tx = x0 + (w - tw) / 2
    ty = y0 + (h - th) / 2 + y_offset
    draw.text((tx, ty), text, font=font, fill=fill)

def pill(draw, xy, text, font, bg, fg=(255, 255, 255), pad=10, radius=12):
    x0, y0 = xy
    tw, th = draw.textbbox((0, 0), text, font=font)[2:]
    w = tw + pad * 2
    h = th + math.ceil(th * 0.35)
    rect = (x0, y0, x0 + w, y0 + h)
    draw.rounded_rectangle(rect, radius=radius, fill=bg)
    tx = x0 + (w - tw) / 2
    ty = y0 + (h - th) / 2 - 1
    draw.text((tx, ty), text, font=font, fill=fg)
    return rect

def progress_bar(img, rect, progress, left_rgb, right_rgb, bg=(230, 240, 230), radius=14, gloss=True):
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    bar = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    bd.rounded_rectangle((0, 0, w, h), radius=radius, fill=bg)
    fill_w = max(0, min(w, int(w * progress)))
    if fill_w > 0:
        grad = gradient_horizontal(fill_w, h, left_rgb, right_rgb).convert("RGBA")
        if gloss:
            gloss_h = max(2, h // 2)
            gloss_img = Image.new("RGBA", (fill_w, gloss_h), (255, 255, 255, 0))
            gd = ImageDraw.Draw(gloss_img)
            for i in range(gloss_h):
                alpha = int(90 * (1 - i / gloss_h))
                gd.rectangle((0, i, fill_w, i), fill=(255, 255, 255, alpha))
            grad.alpha_composite(gloss_img, (0, 0))
        mask = Image.new("L", (w, h), 0)
        md = ImageDraw.Draw(mask)
        md.rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
        fill_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        fill_layer.paste(grad, (0, 0))
        bar = Image.composite(fill_layer, bar, mask)
    img.alpha_composite(bar, (x0, y0))

def render_level_card(
    username="USERNAME",
    nickname="Nickname",
    level=27,
    xp=111,
    xp_total=222,
    rank=42,
    prestige=3,
    total_xp=12345,
    star_url="https://i.ibb.co/fdtb13YH/d744eea4-bcd5-44cb-ae95-458044c0e3b7.png",
    medal_url="https://i.ibb.co/7dw9RjgV/7cbb626b-1509-463f-a5b9-dce886ba4619.png",
    outfile="level_card.png",
):
    img = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    bg = Image.new("RGB", (CARD_W, CARD_H), (242, 247, 252))
    img.paste(bg, (0, 0))
    margin = 18
    card_rect = (margin, margin, CARD_W - margin, CARD_H - margin)
    add_shadow(img, card_rect, radius=RADIUS, blur=36, color=(0, 0, 0, 110))
    rounded_rect(draw, card_rect, RADIUS, fill=(255, 255, 255), outline=(20, 30, 60, 30))
    left_pad = 26
    col_w = 180
    left_x0 = card_rect[0] + left_pad
    top = card_rect[1] + 22
    avatar_rect = (left_x0, top, left_x0 + col_w, top + col_w)
    rounded_rect(draw, avatar_rect, 22, fill=(236, 242, 248))
    center_text(draw, "USER\nICON", load_font(22, bold=True), avatar_rect, fill=(90, 110, 135))
    label_font = load_font(20, bold=True)
    value_font = load_font(20, bold=True)
    y_stats = avatar_rect[3] + 20
    draw.text((left_x0, y_stats), "Prestige", font=label_font, fill=(70, 88, 112))
    pill(draw, (left_x0, y_stats + 26), str(prestige), value_font, bg=(38, 120, 215))
    draw.text((left_x0, y_stats + 70), "Total XP", font=label_font, fill=(70, 88, 112))
    pill(draw, (left_x0, y_stats + 96), f"{total_xp:,}", value_font, bg=(28, 160, 125))
    header_x0 = left_x0 + col_w + 26
    header_y = top
    title_font = load_font(40, bold=True)
    nick_font = load_font(22)
    draw.text((header_x0, header_y), username, font=title_font, fill=(28, 42, 66))
    draw.text((header_x0, header_y + 46), f"{nickname}", font=nick_font, fill=(98, 115, 140))
    medal = load_png_from_url(medal_url, size=(64, 64))
    mx = card_rect[2] - 32 - medal.width
    my = header_y - 4
    img.alpha_composite(medal, (mx, my))
    rank_font = load_font(28, bold=True)
    draw.text((mx - 10 - draw.textbbox((0, 0), f"#{rank}", font=rank_font)[2], my + 18), f"#{rank}", font=rank_font, fill=(28, 42, 66))
    level_font = load_font(24, bold=True)
    draw.text((header_x0, header_y + 86), f"Level: {level}", font=level_font, fill=(50, 70, 95))
    bar_x0 = header_x0
    bar_y0 = header_y + 120
    bar_w = card_rect[2] - bar_x0 - 26
    bar_h = 44
    progress = 0 if xp_total <= 0 else min(1.0, max(0.0, xp / xp_total))
    progress_bar(
        img,
        (bar_x0, bar_y0, bar_x0 + bar_w, bar_y0 + bar_h),
        progress,
        left_rgb=(84, 216, 130),
        right_rgb=(38, 176, 95),
        bg=(223, 243, 224),
    )
    star = load_png_from_url(star_url, size=(40, 40))
    img.alpha_composite(star, (bar_x0 + 8, bar_y0 + 2))
    xp_text = f"{xp:,} / {xp_total:,}"
    xp_font = load_font(22, bold=True)
    for dx, dy, a in [(-1, 0, 180), (1, 0, 180), (0, -1, 180), (0, 1, 180)]:
        draw.text(
            (bar_x0 + 60 + dx, bar_y0 + (bar_h - xp_font.size) // 2 - 1 + dy),
            xp_text,
            font=xp_font,
            fill=(0, 0, 0, a),
        )
    draw.text(
        (bar_x0 + 60, bar_y0 + (bar_h - xp_font.size) // 2 - 1),
        xp_text,
        font=xp_font,
        fill=(255, 255, 255, 245),
    )
    badge_w, badge_h = 110, 80
    gap = 24
    b_y = bar_y0 + bar_h + 26
    b1_x = header_x0
    for idx in range(3):
        x0 = b1_x + idx * (badge_w + gap)
        rect = (x0, b_y, x0 + badge_w, b_y + badge_h)
        rounded_rect(draw, rect, 16, fill=(8, 82, 110), outline=(0, 0, 0, 40), width=3)
        center_text(draw, f"BADGE {idx + 1}", load_font(18, bold=True), rect, fill=(230, 245, 255))
    sub_font = load_font(16)
    draw.text(
        (card_rect[0] + 16, card_rect[3] - 28),
        "Tip: Earn XP to level up faster • Daily quests reset at 00:00",
        font=sub_font,
        fill=(120, 140, 160),
    )
    img.save(outfile)
    return outfile

if __name__ == "__main__":
    path = render_level_card(
        username="AURASTORM",
        nickname="“Stormy”",
        level=31,
        xp=111,
        xp_total=222,
        rank=7,
        prestige=2,
        total_xp=98765,
    )
    print("Saved:", path)
