// shopMediaDeluxe.js
// "Deluxe Shop" – premium 3x2 grid with gold accents only (no header/tabs)
// npm i canvas
const { createCanvas, loadImage } = require('canvas');

/* ------------------------ helpers ------------------------ */
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

async function drawCover(ctx, imgSrc, x, y, w, h, radius = 16) {
  ctx.save();
  rrect(ctx, x, y, w, h, radius);
  ctx.clip();

  if (!imgSrc) {
    // velvet placeholder
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#0c0f18');
    g.addColorStop(1, '#11131c');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else {
    try {
      const img = await loadImage(imgSrc);
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      ctx.fillStyle = '#10131d';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#3a4259';
      ctx.font = 'bold 18px Sans';
      ctx.textAlign = 'center';
      ctx.fillText('image not found', x + w / 2, y + h / 2 + 6);
      ctx.textAlign = 'left';
    }
  }

  // soft spotlight
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

function coinGold(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.6, r * 0.2, cx, cy, r);
  g.addColorStop(0, '#fff5b0');
  g.addColorStop(1, '#c99700');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // inner ring
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(120,80,0,0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // shine
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, -Math.PI * 0.2, Math.PI * 0.3);
  ctx.stroke();
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
  common: ['#cbd5e1', '#94a3b8'],
  uncommon: ['#a7f3d0', '#34d399'],
  rare: ['#bfdbfe', '#60a5fa'],
  epic: ['#ddd6fe', '#8b5cf6'],
  legendary: ['#ffe08a', '#f59e0b'],
};

/* ------------------------ background ------------------------ */
function deluxeBackground(ctx, W, H) {
  // deep velvet base
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#090b12');
  g.addColorStop(1, '#0b0e16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // subtle marble veins (golden)
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

  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // star dust
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

/* ------------------------ card ------------------------ */
async function deluxeCard(ctx, x, y, w, h, item = {}) {
  // base shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#121726';
  rrect(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.restore();

  // inner panel
  const innerPad = 8;
  const gx = x + innerPad;
  const gy = y + innerPad;
  const gw = w - innerPad * 2;
  const gh = h - innerPad * 2;
  const panelGrad = ctx.createLinearGradient(gx, gy, gx, gy + gh);
  panelGrad.addColorStop(0, '#0e1322');
  panelGrad.addColorStop(1, '#151a2a');
  ctx.fillStyle = panelGrad;
  rrect(ctx, gx, gy, gw, gh, 16);
  ctx.fill();

  // gold frame
  goldStroke(ctx, gx, gy, gw, gh, 16, 3);

  // cover
  const coverH = Math.floor(gh * 0.52);
  await drawCover(ctx, item.image, gx + 12, gy + 12, gw - 24, coverH - 12, 14);

  // crown EXCLUSIVE
  if (item.exclusive) {
    ctx.save();
    const bx = gx + gw - 150, by = gy + 14, bw = 136, bh = 32;
    ctx.fillStyle = goldGradient(ctx, bx, by, bw, bh);
    rrect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    crown(ctx, bx + 8, by + 7, 22, 14);
    ctx.fillStyle = '#0a0d15';
    ctx.font = 'bold 16px Sans';
    ctx.textAlign = 'center';
    ctx.fillText('EXCLUSIVE', bx + bw / 2 + 6, by + 22);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // content
  const pad = 20;
  let cy = gy + coverH + 14;
  ctx.fillStyle = '#f1f5ff';
  ctx.font = 'bold 24px Sans';
  ctx.fillText(item.name || 'Deluxe Item', gx + pad, cy);

  // rarity chip (right)
  const rarity = (item.rarity || 'legendary').toLowerCase();
  const [c1, c2] = RARITY[rarity] || RARITY.legendary;
  const label = (item.rarity || 'LEGENDARY').toUpperCase();
  chip(ctx, gx + gw - pad - (ctx.measureText(label).width + 24), cy - 22, label, c1, c2);

  // note
  ctx.fillStyle = '#c7d2f0';
  ctx.font = '16px Sans';
  cy = wrap(ctx, item.note || '', gx + pad, cy + 12, gw - pad * 2, 20, 3);

  // divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx + 14, gy + gh - 66);
  ctx.lineTo(gx + gw - 14, gy + gh - 66);
  ctx.stroke();

  // price + button row
  const rowY = gy + gh - 18;
  const coinX = gx + pad + 16;
  const coinY = rowY - 28;
  coinGold(ctx, coinX, coinY, 13);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Sans';
  ctx.fillText(String(item.price ?? '???'), coinX + 22, coinY + 7);

  // button (gold foil)
  const btnW = 132, btnH = 40;
  const btnX = gx + gw - pad - btnW;
  const btnY = rowY - btnH - 6;

  const foil = goldGradient(ctx, btnX, btnY, btnW, btnH);
  ctx.fillStyle = foil;
  rrect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();

  // bevel
  const bevel = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  bevel.addColorStop(0, 'rgba(255,255,255,0.35)');
  bevel.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  bevel.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = bevel;
  rrect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();

  ctx.fillStyle = '#0b0f18';
  ctx.font = 'bold 18px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(item.buttonText || 'Purchase', btnX + btnW / 2, btnY + 26);
  ctx.textAlign = 'left';

  // stock
  if (Number.isFinite(item.stock) && Number.isFinite(item.maxStock)) {
    ctx.fillStyle = '#9aa6c4';
    ctx.font = '12px Sans';
    ctx.fillText(`Stock: ${item.stock}/${item.maxStock}`, gx + pad, btnY - 8);
  }
}

/* ------------------------ main ------------------------ */
/**
 * Render "Deluxe Shop" 3x2 grid (6 cards). No header/tabs.
 * items: {name, price, note, image, rarity, exclusive, buttonText, stock, maxStock}
 * opts: {width, height}
 * @returns Buffer (PNG)
 */
async function renderDeluxeMedia(items = [], opts = {}) {
  const W = Math.max(800, opts.width || 1200);
  const H = Math.max(600, opts.height || 800);
  const cols = 3, rows = 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  deluxeBackground(ctx, W, H);

  // grid metrics
  const top = 28, side = 28, gapX = 28, gapY = 24;
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
      await deluxeCard(ctx, x, y, cardW, cardH, it);
    } else {
      // premium empty slot
      rrect(ctx, x, y, cardW, cardH, 20);
      ctx.save();
      ctx.clip();
      const subtle = ctx.createLinearGradient(x, y, x, y + cardH);
      subtle.addColorStop(0, 'rgba(255,255,255,0.04)');
      subtle.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.fillStyle = subtle;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.restore();

      goldStroke(ctx, x + 6, y + 6, cardW - 12, cardH - 12, 16, 2);

      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.font = 'bold 20px Sans';
      ctx.textAlign = 'center';
      ctx.fillText('Reserved for Deluxe', x + cardW / 2, y + cardH / 2 + 8);
      ctx.textAlign = 'left';
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = { renderDeluxeMedia };

