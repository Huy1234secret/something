// ⚡ Ultra-HUD Level Card Generator — v2 "HoloFlux"
// Extra sauce: nebula bg, scanlines, holographic text, ring ticks, sparks, brackets, glass glare.
// Requires @napi-rs/canvas ≥0.1.43

const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// FONT REGISTRATION (optional but recommended)
try {
  registerFont(path.join(__dirname, 'assets', 'Orbitron-Bold.ttf'), {
    family: 'Orbitron', weight: 'bold'
  });
  registerFont(path.join(__dirname, 'assets', 'Rajdhani-Regular.ttf'), {
    family: 'Rajdhani', weight: 'normal'
  });
} catch (_) { /* fall back to system fonts */ }

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
function roundedRect(ctx, x, y, w, h, r = 20) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStars(ctx, w, h, count) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 1.2 + 0.2;
    ctx.globalAlpha = Math.random() * 0.6 + 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // occasional cross-twinkle
    if (Math.random() < 0.06) {
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x - r * 3, y, r * 6, 0.6);
      ctx.fillRect(x, y - r * 3, 0.6, r * 6);
    }
  }
  ctx.globalAlpha = 1;
}

function drawNebula(ctx, w, h) {
  // soft color blobs for a cheap “nebula”
  const blobs = [
    { x: w * 0.15, y: h * 0.2, r: 280, c1: 'rgba(46,199,255,0.08)', c2: 'rgba(0,0,0,0)' },
    { x: w * 0.85, y: h * 0.25, r: 240, c1: 'rgba(0,255,200,0.07)', c2: 'rgba(0,0,0,0)' },
    { x: w * 0.45, y: h * 0.75, r: 360, c1: 'rgba(64,150,255,0.06)', c2: 'rgba(0,0,0,0)' },
  ];
  blobs.forEach(b => {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.c1);
    g.addColorStop(1, b.c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.2, w/2, h/2, Math.max(w,h)*0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function scanlines(ctx, w, h) {
  const sl = ctx.createLinearGradient(0, 0, 0, 6);
  sl.addColorStop(0, 'rgba(255,255,255,0.06)');
  sl.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  sl.addColorStop(1, 'rgba(255,255,255,0.06)');
  ctx.fillStyle = sl;
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 3);
}

function ring(ctx, cx, cy, r, lw, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function degToRad(d){ return d * Math.PI / 180; }

function drawCornerBrackets(ctx, x, y, w, h, len = 22, t = 2, color = 'rgba(36,250,255,0.9)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = t;
  // TL
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len); ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h); ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len); ctx.stroke();
  ctx.restore();
}

function drawDataGrid(ctx, x, y, w, h, step = 22, alpha = 0.08) {
  ctx.save();
  ctx.strokeStyle = `rgba(200,255,255,${alpha})`;
  ctx.lineWidth = 1;
  for (let gx = x; gx <= x + w; gx += step) {
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
  }
  for (let gy = y; gy <= y + h; gy += step) {
    ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
/**
 * @typedef {Object} LevelCardData
 * @property {string}  username
 * @property {string}  avatarURL
 * @property {number}  level
 * @property {number}  xp
 * @property {number}  xpNeeded
 * @property {number}  progressPercentage  // 0-100
 * @property {number}  rank
 * @property {number} [prestige]
 * @property {number} [dailyXP]
 * @property {number} [streak]
 * @property {string[]} [badgeUrls]
 * @property {string} [accent] // optional hex like "#24faff" to recolor the theme
 */

/**
 * Generate an ultra-HUD style level card.
 * @param {LevelCardData} d
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateLevelCard(d) {
  const W = 1080, H = 420;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // THEME
  const ACCENT = d.accent || '#24faff';
  const ACCENT_2 = '#2a7dff';

  // 1) BACKGROUND: gradient + nebula + stars + scanlines + vignette
  let g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#050b18');
  g.addColorStop(0.55, '#0b1f36');
  g.addColorStop(1, '#04111e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  drawNebula(ctx, W, H);
  drawStars(ctx, W, H, 180);
  scanlines(ctx, W, H);
  vignette(ctx, W, H);

  // 2) GLASS FRAME: body + inner stroke + glow + glare band
  ctx.save();
  roundedRect(ctx, 18, 18, W - 36, H - 36, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();

  // outer glow edge
  ctx.lineWidth = 2;
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur  = 18;
  ctx.strokeStyle = ACCENT;
  ctx.stroke();

  // inner stroke for depth
  ctx.shadowBlur = 0;
  ctx.clip();
  ctx.globalAlpha = 0.6;
  ring(ctx, W/2, H/2, Math.max(W,H), 1.2, 'rgba(255,255,255,0.22)');
  ctx.globalAlpha = 1;

  // diagonal glare
  const glare = ctx.createLinearGradient(0, 0, W, H);
  glare.addColorStop(0.0, 'rgba(255,255,255,0.00)');
  glare.addColorStop(0.45, 'rgba(255,255,255,0.06)');
  glare.addColorStop(0.55, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = glare;
  ctx.fillRect(18, 18, W - 36, H - 36);
  ctx.restore();

  // decorative brackets + HUD grid
  drawCornerBrackets(ctx, 18, 18, W - 36, H - 36, 28, 2, 'rgba(36,250,255,0.65)');
  drawDataGrid(ctx, 40, 40, W - 80, H - 80, 24, 0.06);

  // 3) AVATAR + PROGRESS RING
  const AV_SIZE = 200;
  const avX = 110, avY = H / 2;

  try {
    const avatar = await loadImage(d.avatarURL);
    ctx.save();
    // circular clip
    ctx.beginPath();
    ctx.arc(avX, avY, AV_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // subtle backlight
    const bl = ctx.createRadialGradient(avX, avY, 10, avX, avY, AV_SIZE/2);
    bl.addColorStop(0, 'rgba(255,255,255,0.06)');
    bl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bl;
    ctx.fillRect(avX - AV_SIZE/2, avY - AV_SIZE/2, AV_SIZE, AV_SIZE);

    ctx.drawImage(avatar, avX - AV_SIZE / 2, avY - AV_SIZE / 2, AV_SIZE, AV_SIZE);
    ctx.restore();
  } catch (_) {}

  // avatar glow ring
  ring(ctx, avX, avY, AV_SIZE/2 + 6, 6, ACCENT);

  // base dashed track
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = 2;
  ring(ctx, avX, avY, AV_SIZE/2 + 16, 10, 'rgba(255,255,255,0.12)');
  ctx.restore();

  // XP progress ring with gradient
  const pct = Math.max(0, Math.min(1, d.progressPercentage / 100));
  const startAng = -Math.PI / 2;
  const endAng   = startAng + pct * Math.PI * 2;

  ctx.beginPath();
  ctx.arc(avX, avY, AV_SIZE/2 + 16, startAng, endAng);
  const ringGrad = ctx.createLinearGradient(avX, avY - AV_SIZE, avX, avY + AV_SIZE);
  ringGrad.addColorStop(0, ACCENT);
  ringGrad.addColorStop(1, ACCENT_2);
  ctx.lineWidth   = 10;
  ctx.strokeStyle = ringGrad;
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur  = 18;
  ctx.lineCap     = 'round';
  ctx.stroke();
  ctx.shadowBlur  = 0;

  // tick marks every 10%
  ctx.save();
  ctx.translate(avX, avY);
  for (let i = 0; i < 100; i += 10) {
    const a = startAng + (i/100)*Math.PI*2;
    const r0 = AV_SIZE/2 + 16 + 8;
    const r1 = r0 + (i % 20 === 0 ? 10 : 6);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*r0, Math.sin(a)*r0);
    ctx.lineTo(Math.cos(a)*r1, Math.sin(a)*r1);
    ctx.strokeStyle = i/100 <= pct ? ACCENT : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // spark particles along progress end
  if (pct > 0) {
    const spA = endAng;
    for (let i = 0; i < 8; i++) {
      const off = (Math.random()*14) - 7;
      const r = AV_SIZE/2 + 16 + 8 + Math.random()*14;
      const x = avX + Math.cos(spA) * r + off;
      const y = avY + Math.sin(spA) * r + off;
      const s = Math.random()*2.4 + 0.8;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, s*4);
      grad.addColorStop(0, ACCENT);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, s*3, 0, Math.PI*2); ctx.fill();
    }
  }

  // 4) USERNAME & LEVEL — holographic text + underline bar
  const fontTitle  = "'Orbitron', sans-serif";
  const fontMetric = "'Rajdhani', sans-serif";

  // username with vertical gradient & slight chromatic shadow
  const nameX = 260, nameY = 108;
  const nameGrad = ctx.createLinearGradient(0, nameY-40, 0, nameY+10);
  nameGrad.addColorStop(0, '#eaffff');
  nameGrad.addColorStop(1, '#9fe9ff');

  ctx.font = `bold 56px ${fontTitle}`;
  ctx.shadowBlur = 0;
  // faux chromatic fringe
  ctx.fillStyle = '#00aaff';
  ctx.fillText(d.username, nameX+1.5, nameY+1.5);
  ctx.fillStyle = '#ff00ff';
  ctx.fillText(d.username, nameX-1.2, nameY-1.2);
  // main fill
  ctx.fillStyle = nameGrad;
  ctx.fillText(d.username, nameX, nameY);

  // neon underline
  ctx.beginPath();
  ctx.moveTo(nameX, nameY + 12);
  ctx.lineTo(nameX + Math.min(520, ctx.measureText(d.username).width + 36), nameY + 12);
  ctx.lineWidth = 3;
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = ACCENT;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = `34px ${fontMetric}`;
  ctx.fillStyle = '#8dfaff';
  ctx.fillText(`LEVEL ${d.level}`, nameX, 160);

  // 5) METRIC CHIPS — inner stroke + shine band
  const chips = [
    { label: 'RANK',    value: `#${d.rank}` },
    { label: 'PRESTIGE',value: d.prestige ?? 0 },
    { label: 'STREAK',  value: d.streak ?? 0 },
    { label: 'DAILY XP',value: d.dailyXP?.toLocaleString() ?? 0 }
  ];
  let chipX = 260, chipY = 198;
  const chipH = 36, padH = 14, padV = 8;
  ctx.font = `20px ${fontMetric}`;
  chips.forEach(c => {
    const txt = `${c.label}: ${c.value}`;
    const txtW = ctx.measureText(txt).width;
    const chipW = txtW + padH * 2;

    // background pill
    roundedRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fillStyle   = 'rgba(255,255,255,0.08)';
    ctx.shadowColor = 'rgba(0,224,255,0.6)';
    ctx.shadowBlur  = 6;
    ctx.fill();
    ctx.shadowBlur  = 0;

    // inner stroke
    roundedRect(ctx, chipX+1, chipY+1, chipW-2, chipH-2, chipH/2);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // shine sweep band (static friendly)
    const shine = ctx.createLinearGradient(chipX, chipY, chipX+chipW, chipY+chipH);
    shine.addColorStop(0, 'rgba(255,255,255,0.0)');
    shine.addColorStop(0.45, 'rgba(255,255,255,0.18)');
    shine.addColorStop(0.55, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = shine;
    roundedRect(ctx, chipX, chipY, chipW, chipH, chipH/2);
    ctx.fill();

    // text
    ctx.fillStyle = '#bff7ff';
    ctx.fillText(txt, chipX + padH, chipY + chipH / 1.55);

    chipX += chipW + 18;
    if (chipX > W - 260) { chipX = 260; chipY += chipH + 14; }
  });

  // 6) HORIZONTAL PROGRESS BAR — dual layer + center text
  const bar = { x: 260, y: H - 130, w: W - 320, h: 40, r: 20 };
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, bar.r);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  // subtle inner track
  roundedRect(ctx, bar.x+2, bar.y+2, bar.w-4, bar.h-4, bar.r-2);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (pct > 0) {
    const innerW = Math.max(6, bar.w * pct);
    roundedRect(ctx, bar.x, bar.y, innerW, bar.h, bar.r);
    const grad = ctx.createLinearGradient(bar.x, bar.y, bar.x + innerW, bar.y);
    grad.addColorStop(0, ACCENT);
    grad.addColorStop(1, ACCENT_2);
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = grad;
    ctx.fill();
    ctx.shadowBlur  = 0;

    // cap glow at end
    const capX = bar.x + innerW;
    const capG = ctx.createRadialGradient(capX, bar.y + bar.h/2, 0, capX, bar.y + bar.h/2, 26);
    capG.addColorStop(0, ACCENT);
    capG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = capG;
    ctx.beginPath(); ctx.arc(capX, bar.y + bar.h/2, 22, 0, Math.PI*2); ctx.fill();
  }

  const barTxt = `${d.xp.toLocaleString()} / ${d.xpNeeded > 0 ? d.xpNeeded.toLocaleString() : '-'} • ${d.progressPercentage.toFixed(1)}%`;
  ctx.font = `22px ${fontMetric}`;
  ctx.fillStyle = '#eafcff';
  const tW = ctx.measureText(barTxt).width;
  ctx.fillText(barTxt, bar.x + (bar.w - tW) / 2, bar.y + bar.h / 1.6);

  // 7) BADGE ROW
  if (Array.isArray(d.badgeUrls) && d.badgeUrls.length) {
    const B = 48;
    const startX = bar.x;
    const y = bar.y + 60;
    for (let i = 0; i < Math.min(d.badgeUrls.length, 10); i++) {
      const x = startX + i * (B + 12);
      // frame
      roundedRect(ctx, x, y, B, B, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();
      roundedRect(ctx, x+1, y+1, B-2, B-2, 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      try {
        const img = await loadImage(d.badgeUrls[i]);
        ctx.drawImage(img, x, y, B, B);
      } catch (_) {}
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateLevelCard };

