// shopMedia.js
// Improved by Gemini: Converted static layout to a responsive, proportional design.
// Normal Shop (3x2). No header/tabs. Image is fully visible (contain-fit) and centered.
// Coin icon uses a Discord emoji URL to ensure it loads correctly
// npm i canvas
const { createCanvas } = require('canvas');
const { loadCachedImage } = require('./imageCache');
const DISCOUNT_BADGE_URL = 'https://i.ibb.co/W8NJVd1/5cb0254a-d630-49ca-9819-65da6b536b4e.png';
const DISCOUNT_BADGE_IMG = loadCachedImage(DISCOUNT_BADGE_URL);

/* ------------------------ helpers (unchanged) ------------------------ */
function rrect(ctx, x, y, w, h, r = 16) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrap(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  if (!text) return y;
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = words[i] + ' ';
      lines++;
      if (lines >= maxLines - 1) {
        let last = line.trimEnd();
        while (ctx.measureText(last + '…').width > maxWidth && last.length) last = last.slice(0, -1);
        ctx.fillText(last + '…', x, y);
        return y + lineHeight;
      }
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function shrinkToFit(ctx, text, maxWidth, startSize, font = 'Sans') {
  let size = startSize;
  while (size > 8) { // Reduced min size for more flexibility
    ctx.font = `bold ${size}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size--;
  }
  return size;
}

async function drawContain(ctx, imgSrcOrImg, x, y, w, h, radius = 14) {
  ctx.save();
  rrect(ctx, x, y, w, h, radius);
  ctx.clip();

  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#0f172a');
  g.addColorStop(1, '#111827');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  if (imgSrcOrImg) {
    try {
      const img =
        typeof imgSrcOrImg === 'string'
          ? await loadCachedImage(imgSrcOrImg)
          : imgSrcOrImg;
      const scale = Math.min(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 18px Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Image not found', x + w / 2, y + h / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }
  ctx.restore();
}

const RARITY_COLORS = {
  common: '#ffffff',
  rare: '#5294ff',
  epic: '#ff7aff',
  legendary: '#ffff00',
  mythical: '#ff0000',
  godly: '#9500ff',
};

function rarityOutline(ctx, x, y, w, h, rarity, radius = 18, width = 6) {
  ctx.save();
  ctx.lineWidth = width;
  if (rarity === 'prismatic') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#ff0000');
    g.addColorStop(0.17, '#ff7f00');
    g.addColorStop(0.34, '#ffff00');
    g.addColorStop(0.51, '#00ff00');
    g.addColorStop(0.68, '#0000ff');
    g.addColorStop(0.85, '#4b0082');
    g.addColorStop(1, '#8b00ff');
    ctx.strokeStyle = g;
  } else {
    ctx.strokeStyle = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  }
  rrect(ctx, x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
}

function bg(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0b1020');
  g.addColorStop(1, '#0a0d18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 18; i++) {
    const cx = Math.random() * W, cy = Math.random() * H;
    const r = 80 + Math.random() * 140;
    const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const hue = 190 + Math.random() * 80;
    light.addColorStop(0, `hsla(${hue}, 90%, 60%, 0.12)`);
    light.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}


/* ------------------------ card (IMPROVED) ------------------------ */
async function card(ctx, x, y, w, h, item = {}, coinImg) {
  const rarity = (item.rarity || 'common').toLowerCase();

  // base
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#182235';
  rrect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.restore();

  // colored outline
  rarityOutline(ctx, x, y, w, h, rarity);

  // gloss
  const gloss = ctx.createLinearGradient(x, y, x, y + h);
  gloss.addColorStop(0, 'rgba(255,255,255,0.06)');
  gloss.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = gloss;
  rrect(ctx, x, y, w, h, 18);
  ctx.fill();

  // --- Proportional Layout Metrics ---
  const pad = w * 0.08;
  const titleSectionH = h * 0.23;
  const priceSectionH = h * 0.18;
  const noteSectionH = item.note ? h * 0.15 : 0;

  // --- TOP: Name ---
  ctx.fillStyle = '#eaf1ff';
  const name = item.name || 'Unknown Item';
  const nameY = y + titleSectionH * 0.65;
  const startNameSize = Math.floor(h * 0.085);
  shrinkToFit(ctx, name, w - pad * 2, startNameSize);
  ctx.fillText(name, x + pad, nameY);

  // --- BOTTOM: Price ---
  ctx.save(); // Isolate text alignment settings
  const priceY = y + h - priceSectionH;
  const coinSize = priceSectionH * 0.8;
  const coinX = x + pad;
  const coinY = priceY + (priceSectionH - coinSize) / 2;

  if (coinImg) {
    ctx.drawImage(coinImg, coinX, coinY, coinSize, coinSize);
  }

  ctx.textBaseline = 'middle';
  const priceText = String(item.price ?? '???');
  const priceMaxW = w - pad * 2 - coinSize - (w * 0.03);
  const startPriceSize = Math.floor(h * 0.1);
  if (item.discount && item.originalPrice) {
    ctx.save();
    ctx.fillStyle = '#ff0000';
    const oldSize = shrinkToFit(ctx, String(item.originalPrice), priceMaxW, startPriceSize * 0.7);
    ctx.fillText(String(item.originalPrice), coinX + coinSize + (w * 0.03), coinY + coinSize / 2 - oldSize);
    const width = ctx.measureText(String(item.originalPrice)).width;
    ctx.strokeStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(coinX + coinSize + (w * 0.03), coinY + coinSize / 2 - oldSize + 1);
    ctx.lineTo(coinX + coinSize + (w * 0.03) + width, coinY + coinSize / 2 - oldSize + 1);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#00ff00';
  } else {
    ctx.fillStyle = '#ffffff';
  }
  shrinkToFit(ctx, priceText, priceMaxW, startPriceSize);
  ctx.fillText(priceText, coinX + coinSize + (w * 0.03), coinY + coinSize / 2);
  ctx.restore(); // Restore text alignment

  // --- MIDDLE: Image and Note ---
  const imgBoxX = x + w * 0.04;
  const imgBoxW = w * 0.92;
  const imgBoxY = y + titleSectionH;
  const imgBoxH = h - titleSectionH - priceSectionH - noteSectionH;

  await drawContain(ctx, item._img || item.image, imgBoxX, imgBoxY, imgBoxW, imgBoxH);
  if (Number.isFinite(item.stock)) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(imgBoxH * 0.25)}px Sans`;
    ctx.textAlign = 'right';
    ctx.fillText(`×${item.stock}`, imgBoxX + imgBoxW - 8, imgBoxY + imgBoxH - 8);
    ctx.textAlign = 'left';
  }
  if (item.discount) {
    const dImg = await DISCOUNT_BADGE_IMG;
    const size = Math.min(50, imgBoxW * 0.3);
    ctx.drawImage(dImg, imgBoxX + 5, imgBoxY + imgBoxH - size - 5, size, size);
  }

  if (item.note) {
    ctx.fillStyle = '#c4d1eb';
    const noteFontSize = Math.max(12, Math.floor(h * 0.045));
    const lineHeight = noteFontSize * 1.25;
    ctx.font = `${noteFontSize}px Sans`;
    const noteY = imgBoxY + imgBoxH + lineHeight * 0.8;
    wrap(ctx, String(item.note), x + pad, noteY, w - pad * 2, lineHeight, 2);
  }

  if (item.stock !== undefined && item.stock <= 0) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    rrect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#ff0000';
    ctx.font = `bold ${Math.floor(h * 0.12)}px Sans`;
    ctx.textAlign = 'center';
    ctx.fillText('Out of Stock!', 0, 0);
    ctx.restore();
  }
}


/* ------------------------ main (IMPROVED) ------------------------ */
/**
 * Render a 3x2 grid (6 cards). No header, no tabs, no buy button.
 * - Shows full item image centered inside the card (no cropping).
 * items: {name, price, note, image, rarity}
 * opts: {width,height}
 */
async function renderShopMedia(items = [], opts = {}) {
  // Match deluxe shop media dimensions (4:3 aspect ratio)
  const W = opts.width || 960;
  const H = opts.height || 720;
  const cols = 3, rows = 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // background
  bg(ctx, W, H);

  // preload coin image once
  let coinImg = null;
  try {
    coinImg = await loadCachedImage('https://cdn.discordapp.com/emojis/1405595571141480570.png?size=48&quality=lossless');
  } catch {
    coinImg = null;
  }

  // preload all item images concurrently
  await Promise.all(
    items.map(async (it) => {
      if (it && it.image) {
        try {
          it._img = await loadCachedImage(it.image);
        } catch {
          it._img = null;
        }
      }
    })
  );

  // --- Proportional Grid Metrics ---
  const sidePadding = W * 0.03;
  const topPadding = H * 0.04;
  const gap = W * 0.025;
  const innerW = W - sidePadding * 2 - gap * (cols - 1);
  const innerH = H - topPadding * 2 - gap * (rows - 1);
  const cardW = Math.floor(innerW / cols);
  const cardH = Math.floor(innerH / rows);

  for (let i = 0; i < cols * rows; i++) {
    const it = items[i];
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = sidePadding + c * (cardW + gap);
    const y = topPadding + r * (cardH + gap);

    if (it) {
      // eslint-disable-next-line no-await-in-loop
      await card(ctx, x, y, cardW, cardH, it, coinImg);
    } else {
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      rrect(ctx, x, y, cardW, cardH, 18);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.font = `bold ${Math.max(16, cardW * 0.08)}px Sans`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('More items soon', x + cardW / 2, y + cardH / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = { renderShopMedia };

