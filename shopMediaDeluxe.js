// shopMediaDeluxe.js
// Improved by Gemini: Converted static layout to a responsive, proportional design.
// "Deluxe Shop" – premium 3x2 grid with gold accents only (no header/tabs)
// npm i canvas
const { createCanvas } = require('canvas');
const { loadCachedImage, loadEmojiImage } = require('./imageCache');

// Image used for pricing coin
const COIN_IMG_URL = 'https://i.ibb.co/PXDPtHZ/Deluxe-Coin.png';

/* ------------------------ helpers (unchanged) ------------------------ */
function rrect(ctx, x, y, w, h, r = 18) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
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

async function drawCover(ctx, item, x, y, w, h, radius = 16) {
  ctx.save();
  rrect(ctx, x, y, w, h, radius);
  ctx.clip();

  const base = ctx.createLinearGradient(x, y, x + w, y + h);
  base.addColorStop(0, '#0c0f18');
  base.addColorStop(1, '#11131c');
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);

  const emoji = item.displayEmoji || item.emoji;
  let drawn = false;
  if (emoji) {
    const img = await loadEmojiImage(emoji);
    if (img) {
      const scale = Math.min(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, dx, dy, dw, dh);
      drawn = true;
    }
  }

  if (!drawn && emoji) {
    ctx.fillStyle = '#f5f9ff';
    ctx.font = `bold ${Math.floor(h * 0.6)}px Sans`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    drawn = true;
  }

  if (!drawn && item.image) {
    try {
      const img = await loadCachedImage(item.image);
      const s = Math.min(w / img.width, h / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      drawn = true;
    } catch {}
  }

  if (!drawn) {
    ctx.fillStyle = '#1a2235';
    ctx.fillRect(x, y, w, h);
  }

  const sp = ctx.createRadialGradient(x + w * 0.5, y + h * 0.45, 10, x + w * 0.5, y + h * 0.45, Math.max(w, h) * 0.7);
  sp.addColorStop(0, 'rgba(255,255,255,0.10)');
  sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(x, y, w, h);

  ctx.restore();
}

function goldGradient(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0.0, '#fff7c8');
  g.addColorStop(0.2, '#f2d069');
  g.addColorStop(0.5, '#b98919');
  g.addColorStop(0.8, '#f2d069');
  g.addColorStop(1.0, '#fff7c8');
  return g;
}

function goldStroke(ctx, x, y, w, h, r = 18, width = 3) {
  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = goldGradient(ctx, x, y, w, h);
  ctx.shadowColor = 'rgba(255,215,100,0.55)';
  ctx.shadowBlur = 16;
  rrect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

function crown(ctx, x, y, w = 26, h = 18) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ffd666';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.18, h * 0.35);
  ctx.lineTo(w * 0.36, h);
  ctx.lineTo(w * 0.52, h * 0.3);
  ctx.lineTo(w * 0.68, h);
  ctx.lineTo(w * 0.86, h * 0.35);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
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

function rarityOutline(ctx, x, y, w, h, rarity, radius = 16, width = 3) {
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

/* ------------------------ background ------------------------ */
function deluxeBackground(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#090b12');
  g.addColorStop(1, '#0b0e16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#7a5d1a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const y = (H / 6) * i + Math.random() * 40;
    ctx.beginPath();
    ctx.moveTo(-50, y);
    for (let x = 0; x < W + 60; x += 60) {
      const off = (Math.sin((i * 13 + x) * 0.015) + Math.cos((i * 7 + x) * 0.02)) * 20;
      ctx.lineTo(x, y + off);
    }
    ctx.stroke();
  }
  ctx.restore();

  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = Math.random() * 1.5 + 0.3;
    ctx.fillStyle = Math.random() < 0.7 ? 'rgba(255,255,255,0.25)' : 'rgba(255,220,120,0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------ card (IMPROVED) ------------------------ */
async function deluxeCard(ctx, x, y, w, h, item = {}, coinImg, priceFontSize) {
  const rarity = (item.rarity || 'common').toLowerCase();
  const cardRadius = h * 0.05;

  // Base shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = h * 0.07;
  ctx.shadowOffsetY = h * 0.025;
  ctx.fillStyle = '#121726';
  rrect(ctx, x, y, w, h, cardRadius);
  ctx.fill();
  ctx.restore();

  // Inner panel
  const innerPad = h * 0.02;
  const gx = x + innerPad;
  const gy = y + innerPad;
  const gw = w - innerPad * 2;
  const gh = h - innerPad * 2;
  const innerRadius = cardRadius * 0.8;
  const panelGrad = ctx.createLinearGradient(gx, gy, gx, gy + gh);
  panelGrad.addColorStop(0, '#0e1322');
  panelGrad.addColorStop(1, '#151a2a');
  ctx.fillStyle = panelGrad;
  rrect(ctx, gx, gy, gw, gh, innerRadius);
  ctx.fill();

  // Rarity outline
  rarityOutline(ctx, gx, gy, gw, gh, rarity, innerRadius, Math.max(2, h * 0.0075));

  // --- Proportional Layout ---
  const coverH = gh * 0.52;
  const contentPad = gw * 0.06;
  const priceSectionH = gh * 0.2;

  // Cover Image
    const coverPad = gw * 0.03;
    await drawCover(ctx, item, gx + coverPad, gy + coverPad, gw - coverPad * 2, coverH - coverPad, innerRadius * 0.8);

  // EXCLUSIVE banner
  if (item.exclusive) {
    ctx.save();
    const bh = gh * 0.08;
    const bw = gw * 0.35;
    const bx = gx + gw - bw - (gw * 0.04);
    const by = gy + (gw * 0.04);
    const bannerRadius = bh * 0.25;
    ctx.fillStyle = goldGradient(ctx, bx, by, bw, bh);
    rrect(ctx, bx, by, bw, bh, bannerRadius);
    ctx.fill();

    const crownH = bh * 0.8;
    const crownW = crownH * 1.2;
    crown(ctx, bx + bh * 0.2, by + (bh - crownH) / 2, crownW, crownH);
    ctx.fillStyle = '#0a0d15';
    const fontSize = bh * 0.5;
    ctx.font = `bold ${fontSize}px Sans`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXCLUSIVE', bx + bw / 2 + crownW * 0.2, by + bh / 2);
    ctx.restore();
  }

  // Content Area
  let cy = gy + coverH + gh * 0.04;

  // Title
  ctx.fillStyle = '#f1f5ff';
  const title = item.displayName || item.name || 'Deluxe Item';
  const titleSize = Math.floor(gh * 0.065);
  shrinkToFit(ctx, title, gw - contentPad * 2, titleSize);
  ctx.fillText(title, gx + contentPad, cy);
  cy += titleSize * 1.2;

  // Note
  ctx.fillStyle = '#c7d2f0';
  const noteSize = Math.floor(gh * 0.045);
  const lineHeight = noteSize * 1.25;
  ctx.font = `${noteSize}px Sans`;
  cy = wrap(ctx, item.note || '', gx + contentPad, cy, gw - contentPad * 2, lineHeight, 3);

  // Divider
  const dividerY = gy + gh - priceSectionH - (gh * 0.02);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx + contentPad * 0.5, dividerY);
  ctx.lineTo(gx + gw - contentPad * 0.5, dividerY);
  ctx.stroke();

  // Price Row
  const rowY = gy + gh - priceSectionH / 2;
  const coinSize = priceFontSize * 2.2;
  const coinR = coinSize / 2;
  const coinX = gx + contentPad + coinR;
  if (coinImg) {
    ctx.drawImage(coinImg, coinX - coinR, rowY - coinR, coinSize, coinSize);
  } else {
    ctx.fillStyle = '#c99700';
    ctx.beginPath();
    ctx.arc(coinX, rowY, coinR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Price Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${priceFontSize}px Sans`;
  const priceText = String(item.price ?? '???');
  ctx.fillText(priceText, coinX + coinR + (gw * 0.025), rowY);

  // Stock
  if (Number.isFinite(item.stock) && Number.isFinite(item.maxStock)) {
    ctx.fillStyle = '#9aa6c4';
    const stockSize = Math.max(10, gh * 0.03);
    ctx.font = `${stockSize}px Sans`;
    ctx.textBaseline = 'alphabetic';
    const stockY = rowY - coinR - stockSize * 0.5;
    ctx.fillText(`Stock: ${item.stock}/${item.maxStock}`, gx + contentPad, stockY);
  }

  if (item.stock !== undefined && item.stock <= 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rrect(ctx, x, y, w, h, cardRadius);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ff0000';
    ctx.font = `bold ${Math.floor(h * 0.12)}px Sans`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Out of Stock!', x + w / 2, y + h / 2);
    ctx.restore();
  }
}

/* ------------------------ main (IMPROVED) ------------------------ */
/**
 * Render "Deluxe Shop" 3x2 grid (6 cards). No header/tabs.
 * items: {name, price, note, image, rarity, exclusive, buttonText, stock, maxStock}
 * opts: {width, height}
 * @returns Buffer (PNG)
 */
async function renderDeluxeMedia(items = [], opts = {}) {
  // A slightly taller aspect ratio for a more premium feel
  const W = opts.width || 960;
  const H = opts.height || 720;
  const cols = 3, rows = 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  deluxeBackground(ctx, W, H);

  // --- Proportional Grid Metrics ---
  const sidePadding = W * 0.03;
  const topPadding = H * 0.04;
  const gap = W * 0.025;
  const innerW = W - sidePadding * 2 - gap * (cols - 1);
  const innerH = H - topPadding * 2 - gap * (rows - 1);
  const cardW = Math.floor(innerW / cols);
  const cardH = Math.floor(innerH / rows);

  // Preload images to speed up rendering
  let coinImg = null;
  try {
    coinImg = await loadCachedImage(COIN_IMG_URL);
  } catch {
    coinImg = null;
  }

  await Promise.all(items.map(async (it) => {
    if (it && it.image) {
      try {
        it._img = await loadCachedImage(it.image);
      } catch {
        it._img = null;
      }
    }
  }));

  // Use a fixed price font size so all cards match
  const priceFontSize = 25;

  for (let i = 0; i < cols * rows; i++) {
    const it = items[i];
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = sidePadding + c * (cardW + gap);
    const y = topPadding + r * (cardH + gap);

    if (it) {
      // eslint-disable-next-line no-await-in-loop
      await deluxeCard(ctx, x, y, cardW, cardH, it, coinImg, priceFontSize);
    } else {
      // Premium empty slot
      const emptyRadius = cardH * 0.05;
      rrect(ctx, x, y, cardW, cardH, emptyRadius);
      ctx.save();
      ctx.clip();
      const subtle = ctx.createLinearGradient(x, y, x, y + cardH);
      subtle.addColorStop(0, 'rgba(255,255,255,0.04)');
      subtle.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.fillStyle = subtle;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.restore();

      const strokePad = cardH * 0.015;
      goldStroke(ctx, x + strokePad, y + strokePad, cardW - strokePad * 2, cardH - strokePad * 2, emptyRadius * 0.8, 2);

      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.font = `bold ${Math.max(16, cardW * 0.08)}px Sans`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Reserved for Deluxe', x + cardW / 2, y + cardH / 2);
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = { renderDeluxeMedia };
