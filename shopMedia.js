// shopMedia.js
// Grid-only neon shop UI (6 cards). No header or tabs.
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
        while (ctx.measureText(last + '…').width > maxWidth && last.length) {
          last = last.slice(0, -1);
        }
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

async function drawCover(ctx, imgSrc, x, y, w, h, radius = 14) {
  ctx.save();
  rrect(ctx, x, y, w, h, radius);
  ctx.clip();
  if (!imgSrc) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(1, '#111827');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else {
    try {
      const img = await loadImage(imgSrc);
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      ctx.fillStyle = '#121826';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 20px Sans';
      ctx.textAlign = 'center';
      ctx.fillText('image not found', x + w / 2, y + h / 2 + 8);
      ctx.textAlign = 'left';
    }
  }
  ctx.restore();
}

function coin(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.2, cx, cy, r);
  g.addColorStop(0, '#fff4b8');
  g.addColorStop(1, '#e0a400');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(90,60,0,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
}

function chip(ctx, x, y, text, c1, c2) {
  const padX = 12, h = 26;
  const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  rrect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = '#0b0d12';
  ctx.font = 'bold 14px Sans';
  ctx.fillText(text, x + padX, y + 18);
  return w;
}

const RARITY = {
  common: ['#a8b1c7', '#7b8498'],
  uncommon: ['#6ee7b7', '#10b981'],
  rare: ['#93c5fd', '#3b82f6'],
  epic: ['#c4b5fd', '#8b5cf6'],
  legendary: ['#fde68a', '#f59e0b'],
};

function drawGlowBorder(ctx, x, y, w, h, color = '#60a5fa') {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  rrect(ctx, x, y, w, h, 18);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------ background ------------------------ */
function bg(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0b1020');
  g.addColorStop(1, '#0a0d18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 18; i++) {
    const cx = Math.random() * W;
    const cy = Math.random() * H;
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
async function card(ctx, x, y, w, h, item = {}) {
  const theme = RARITY[(item.rarity || 'common').toLowerCase()] || RARITY.common;
  const glow = theme[1];

  drawGlowBorder(ctx, x, y, w, h, glow);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#182235';
  rrect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.restore();

  const gloss = ctx.createLinearGradient(x, y, x, y + h);
  gloss.addColorStop(0, 'rgba(255,255,255,0.06)');
  gloss.addColorStop(0.55, 'rgba(255,255,255,0.02)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  rrect(ctx, x, y, w, h, 18);
  ctx.fill();

  const imgH = Math.floor(h * 0.5);
  await drawCover(ctx, item.image, x + 12, y + 12, w - 24, imgH - 12, 14);

  let cy = y + imgH + 14;
  const pad = 18;
  ctx.fillStyle = '#eaf1ff';
  ctx.font = 'bold 24px Sans';
  ctx.fillText(item.name || 'Unknown Item', x + pad, cy);

  const rarityLabel = (item.rarity || 'common').toUpperCase();
  chip(ctx, x + w - pad - (ctx.measureText(rarityLabel).width + 24), cy - 22, rarityLabel, theme[0], theme[1]);

  ctx.fillStyle = '#c4d1eb';
  ctx.font = '16px Sans';
  cy = wrap(ctx, item.note || '', x + pad, cy + 12, w - pad * 2, 20, 3);

  const rowY = y + h - 20;
  const coinX = x + pad + 14;
  const coinY = rowY - 26;
  coin(ctx, coinX, coinY, 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Sans';
  ctx.fillText(String(item.price ?? '???'), coinX + 20, coinY + 7);

  const btnW = 120, btnH = 38, btnX = x + w - pad - btnW, btnY = rowY - btnH - 4;
  const bgBtn = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  bgBtn.addColorStop(0, '#66e3ff');
  bgBtn.addColorStop(1, '#1ea1ff');
  ctx.fillStyle = bgBtn;
  rrect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();

  ctx.fillStyle = '#031125';
  ctx.font = 'bold 18px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(item.buttonText || 'Buy', btnX + btnW / 2, btnY + 26);
  ctx.textAlign = 'left';
}

/* ------------------------ main (grid-only) ------------------------ */
/**
 * Render a 3x2 grid (6 cards). No header, no tabs.
 * @param {Array} items objects: {name, price, note, image, rarity, buttonText}
 * @param {Object} opts {width,height}
 * @returns {Buffer} PNG buffer
 */
async function renderShopMedia(items = [], opts = {}) {
  const W = Math.max(800, opts.width || 1200);
  const H = Math.max(600, opts.height || 800);
  const cols = 3, rows = 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  bg(ctx, W, H);

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
      await card(ctx, x, y, cardW, cardH, it);
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
