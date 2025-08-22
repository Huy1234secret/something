// shopMedia.js
// Normal Shop (3x2). No header/tabs. Image is fully visible (contain-fit) and centered.
// Coin icon uses a Discord emoji URL to ensure it loads correctly
// npm i canvas
const { createCanvas, loadImage } = require('canvas');

/* ------------------------ helpers ------------------------ */
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

// draw an image fully visible inside box (contain-fit), centered
async function drawContain(ctx, imgSrc, x, y, w, h, radius = 14) {
  ctx.save();
  rrect(ctx, x, y, w, h, radius);
  ctx.clip();

  // subtle panel behind images
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#0f172a');
  g.addColorStop(1, '#111827');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  if (imgSrc) {
    try {
      const img = await loadImage(imgSrc);
      const scale = Math.min(w / img.width, h / img.height); // contain
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      // fallback text
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 18px Sans';
      ctx.textAlign = 'center';
      ctx.fillText('image not found', x + w / 2, y + h / 2 + 8);
      ctx.textAlign = 'left';
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

/* ------------------------ card ------------------------ */
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

  const pad = 18;

  // --- TOP: name only ---
  // shift down to create more breathing room at the top
  let topY = y + pad + 16;
  ctx.fillStyle = '#eaf1ff';
  ctx.font = 'bold 26px Sans';
  const name = item.name || 'Unknown Item';
  ctx.fillText(name, x + pad, topY);

  // --- MIDDLE: image box (contain-fit, centered; not cut off) ---
  const imgTop = topY + 24;                // below the top title row
  const imgBottom = y + h - 72;            // above the price row
  const imgH = Math.max(80, imgBottom - imgTop);
  await drawContain(ctx, item.image, x + 12, imgTop, w - 24, imgH, 14);

  // optional short note under image (kept brief)
  if (item.note) {
    ctx.fillStyle = '#c4d1eb';
    ctx.font = '16px Sans';
    wrap(ctx, String(item.note), x + pad, imgTop + imgH + 8, w - pad * 2, 20, 2);
  }

  // --- BOTTOM: price only (no buy button) ---
  const rowY = y + h - 20;
  const coinSize = 36;
  const coinX = x + pad;
  const coinY = rowY - coinSize - 2;

  if (coinImg) {
    ctx.drawImage(coinImg, coinX, coinY, coinSize, coinSize);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Sans';
  ctx.fillText(String(item.price ?? '???'), coinX + coinSize + 8, coinY + coinSize - 2);
}

/* ------------------------ main (grid-only) ------------------------ */
/**
 * Render a 3x2 grid (6 cards). No header, no tabs, no buy button.
 * - Shows full item image centered inside the card (no cropping).
 * items: {name, price, note, image, rarity}
 * opts: {width,height}
 */
async function renderShopMedia(items = [], opts = {}) {
  const W = Math.max(800, opts.width || 960);
  const H = Math.max(600, opts.height || 640);
  const cols = 3, rows = 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // background
  bg(ctx, W, H);

  // preload coin image once
  let coinImg = null;
  try {
    coinImg = await loadImage('https://cdn.discordapp.com/emojis/1405595571141480570.png?size=48&quality=lossless');
  } catch {
    coinImg = null;
  }

  // grid metrics
  const gapX = 28, gapY = 24, top = 28, side = gapX;
  const innerW = W - side * 2 - gapX * (cols - 1);
  const innerH = H - top * 2 - gapY * (rows - 1);
  const cardW = Math.floor(innerW / cols);
  const cardH = Math.floor(innerH / rows);

  for (let i = 0; i < cols * rows; i++) {
    const it = items[i];
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = side + c * (cardW + gapX);
    const y = top + r * (cardH + gapY);

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
      ctx.font = 'bold 20px Sans';
      ctx.textAlign = 'center';
      ctx.fillText('More items soon', x + cardW / 2, y + cardH / 2 + 8);
      ctx.textAlign = 'left';
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = { renderShopMedia };

