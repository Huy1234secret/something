// shopMedia.js
// A fresh, neon "game shop" UI renderer for Discord (Node Canvas)
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

function ticket(ctx, x, y, text) {
  const h = 28;
  const pad = 12;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#1ee2ff');
  g.addColorStop(1, '#1aa3ff');
  ctx.fillStyle = g;
  rrect(ctx, x, y, w, h, 6);
  ctx.fill();

  // notches
  ctx.fillStyle = '#0c1530';
  ctx.beginPath();
  ctx.arc(x + 6, y + h / 2, 3, 0, Math.PI * 2);
  ctx.arc(x + w - 6, y + h / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#051023';
  ctx.font = 'bold 14px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + 19);
  ctx.textAlign = 'left';
  return w;
}

/* ------------------------ background & chrome ------------------------ */
function bg(ctx, W, H) {
  // gradient base
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0b1020');
  g.addColorStop(1, '#0a0d18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // bokeh lights
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

  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function topBar(ctx, W, title, balanceText) {
  const barX = 24, barY = 24, barH = 86, barW = W - 48;

  // glass panel
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#131a2b';
  rrect(ctx, barX, barY, barW, barH, 18);
  ctx.fill();

  const shine = ctx.createLinearGradient(barX, barY, barX, barY + barH);
  shine.addColorStop(0, 'rgba(255,255,255,0.08)');
  shine.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = shine;
  rrect(ctx, barX, barY, barW, barH, 18);
  ctx.fill();
  ctx.restore();

  // neon title
  ctx.save();
  ctx.shadowColor = '#63f5ff';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#baf8ff';
  ctx.font = 'bold 42px Sans';
  ctx.fillText(title, barX + 24, barY + 58);
  ctx.restore();

  // balance (right)
  if (balanceText) {
    ctx.font = 'bold 26px Sans';
    ctx.fillStyle = '#e6f2ff';
    ctx.textAlign = 'right';
    ctx.fillText(balanceText, barX + barW - 24, barY + 56);
    ctx.textAlign = 'left';
  }
}

function tabs(ctx, W, labels = [], active = 0) {
  if (!labels.length) return;
  const x0 = 34, y = 118;
  let x = x0;
  for (let i = 0; i < labels.length; i++) {
    const text = labels[i];
    const isActive = i === active;
    const padX = 18, h = 34;
    const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
    const g = ctx.createLinearGradient(x, y, x, y + h);
    if (isActive) {
      g.addColorStop(0, '#2dd4ff');
      g.addColorStop(1, '#1d4ed8');
    } else {
      g.addColorStop(0, '#1f2937');
      g.addColorStop(1, '#111827');
    }
    ctx.fillStyle = g;
    rrect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.fillStyle = isActive ? '#051023' : '#b9c5db';
    ctx.font = 'bold 16px Sans';
    ctx.fillText(text, x + padX, y + 23);

    x += w + 12;
  }
}

/* ------------------------ card ------------------------ */
async function card(ctx, x, y, w, h, item = {}) {
  const theme = RARITY[(item.rarity || 'common').toLowerCase()] || RARITY.common;
  const glow = theme[1];

  // glow rim
  drawGlowBorder(ctx, x, y, w, h, glow);

  // base
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#182235';
  rrect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.restore();

  // glossy overlay
  const gloss = ctx.createLinearGradient(x, y, x, y + h);
  gloss.addColorStop(0, 'rgba(255,255,255,0.06)');
  gloss.addColorStop(0.55, 'rgba(255,255,255,0.02)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  rrect(ctx, x, y, w, h, 18);
  ctx.fill();

  // hero image
  const imgH = Math.floor(h * 0.5);
  await drawCover(ctx, item.image, x + 12, y + 12, w - 24, imgH - 12, 14);

  // sale ribbon
  if (item.salePct) {
    const text = `-${item.salePct}%`;
    ctx.save();
    const rw = 112, rh = 34;
    const rx = x + 16, ry = y + 16;
    const g = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    g.addColorStop(0, '#ff6b6b');
    g.addColorStop(1, '#c92a2a');
    ctx.fillStyle = g;
    rrect(ctx, rx, ry, rw, rh, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rx + rw * 0.22, ry + rh);
    ctx.lineTo(rx + rw * 0.32, ry + rh + 10);
    ctx.lineTo(rx + rw * 0.42, ry + rh);
    ctx.closePath();
    ctx.fillStyle = '#8f2323';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Sans';
    ctx.textAlign = 'center';
    ctx.fillText(text, rx + rw / 2, ry + 23);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // name + rarity chip
  let cy = y + imgH + 14;
  const pad = 18;
  ctx.fillStyle = '#eaf1ff';
  ctx.font = 'bold 24px Sans';
  ctx.fillText(item.name || 'Unknown Item', x + pad, cy);

  const rarityLabel = (item.rarity || 'common').toUpperCase();
  const chipW = chip(ctx, x + w - pad - (ctx.measureText(rarityLabel).width + 24), cy - 22, rarityLabel, theme[0], theme[1]);

  // description
  ctx.fillStyle = '#c4d1eb';
  ctx.font = '16px Sans';
  cy = wrap(ctx, item.note || '', x + pad, cy + 12, w - pad * 2, 20, 3);

  // tag row
  if (item.tag) {
    ctx.font = 'bold 12px Sans';
    ctx.fillStyle = '#9fb3d9';
    const tagW = ticket(ctx, x + pad, cy - 2, String(item.tag).toUpperCase());
    cy += 10;
  }

  // stock bar
  if (Number.isFinite(item.stock) && Number.isFinite(item.maxStock)) {
    const sbX = x + pad, sbY = y + h - 62, sbW = w - pad * 2, sbH = 8;
    const pct = Math.max(0, Math.min(1, item.stock / item.maxStock));
    ctx.fillStyle = '#0f172a';
    rrect(ctx, sbX, sbY, sbW, sbH, 4);
    ctx.fill();
    const g = ctx.createLinearGradient(sbX, sbY, sbX + sbW, sbY);
    g.addColorStop(0, theme[0]);
    g.addColorStop(1, theme[1]);
    ctx.fillStyle = g;
    rrect(ctx, sbX, sbY, Math.max(8, sbW * pct), sbH, 4);
    ctx.fill();

    ctx.fillStyle = '#9fb3d9';
    ctx.font = '12px Sans';
    ctx.textAlign = 'right';
    ctx.fillText(`Stock: ${item.stock}/${item.maxStock}`, x + w - pad, sbY - 6);
    ctx.textAlign = 'left';
  }

  // price + buy button
  const rowY = y + h - 20;
  const coinX = x + pad + 14;
  const coinY = rowY - 26;
  coin(ctx, coinX, coinY, 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Sans';
  ctx.fillText(String(item.price ?? '???'), coinX + 20, coinY + 7);

  const btnW = 120, btnH = 38, btnX = x + w - pad - btnW, btnY = rowY - btnH - 4;
  const bg = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  bg.addColorStop(0, '#66e3ff');
  bg.addColorStop(1, '#1ea1ff');
  ctx.fillStyle = bg;
  rrect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();

  ctx.fillStyle = '#031125';
  ctx.font = 'bold 18px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(item.buttonText || 'Buy', btnX + btnW / 2, btnY + 26);
  ctx.textAlign = 'left';
}

/* ------------------------ main renderer ------------------------ */
/**
 * Render a neon shop UI image.
 * @param {Array} items Array of objects: {name, price, note, image, rarity, salePct, stock, maxStock, tag, buttonText}
 * @param {Object} opts {width,height,cols,rows,title,balanceText,tabs,activeTab}
 * @returns {Buffer} PNG buffer
 */
async function renderShopMedia(items = [], opts = {}) {
  const W = Math.max(800, opts.width || 1200);
  const H = Math.max(600, opts.height || 800);
  const cols = Math.max(1, opts.cols || 3);
  const rows = Math.max(1, opts.rows || 2);
  const title = opts.title || 'Arcade Shop';
  const balanceText = opts.balanceText || '';
  const tabLabels = Array.isArray(opts.tabs) ? opts.tabs : ['Featured', 'Weapons', 'Boosts', 'Cosmetics'];
  const activeTab = Number.isInteger(opts.activeTab) ? opts.activeTab : 0;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // background & chrome
  bg(ctx, W, H);
  topBar(ctx, W, title, balanceText);

  // tabs
  ctx.font = 'bold 16px Sans';
  tabs(ctx, W, tabLabels, activeTab);

  // grid
  const gridTop = 160;
  const gapX = 28, gapY = 24;
  const innerW = W - gapX * (cols + 1);
  const innerH = H - gridTop - gapY - 24;
  const cardW = Math.floor(innerW / cols);
  const cardH = Math.floor(innerH / rows);

  const total = cols * rows;
  for (let i = 0; i < total; i++) {
    const it = items[i] || {};
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = gapX + c * (cardW + gapX);
    const y = gridTop + r * (cardH + gapY);

    if (items[i]) {
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
