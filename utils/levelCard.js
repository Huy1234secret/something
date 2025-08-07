// ⚡ Ultra‑HUD Level Card Generator
// Completely re‑imagined "glass‑HUD" design with radial XP ring, metric chips, and animated‑ready layers.
// Requires @napi-rs/canvas ≥0.1.43
// Optional fonts: Orbitron (bold) & Rajdhani (regular) in ./assets

const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas');
const path = require('path');

// ────────────────────────────────────────────────────────────────────────────────
// FONT REGISTRATION (optional but recommended)
try {
  registerFont(path.join(__dirname, 'assets', 'Orbitron-Bold.ttf'), {
    family: 'Orbitron', weight: 'bold'
  });
  registerFont(path.join(__dirname, 'assets', 'Rajdhani-Regular.ttf'), {
    family: 'Rajdhani', weight: 'normal'
  });
} catch (_) { /* fall back to system fonts */ }

// ────────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
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
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 1.2 + 0.2;
    ctx.globalAlpha = Math.random() * 0.7 + 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ────────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS (JSDoc)
/**
 * @typedef {Object} LevelCardData
 * @property {string}  username
 * @property {string}  avatarURL
 * @property {number}  level
 * @property {number}  xp
 * @property {number}  xpNeeded
 * @property {number}  progressPercentage  // 0‑100
 * @property {number}  rank
 * @property {number} [prestige]
 * @property {number} [dailyXP]
 * @property {number} [streak]
 * @property {string[]} [badgeUrls]
 */

// ────────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
/**
 * Generate an ultra‑HUD style level card.
 * @param {LevelCardData} d
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateLevelCard(d) {
  const W = 1080, H = 420;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // 1⃣  BACKGROUND – Deep gradient + subtle starfield
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#051021');
  g.addColorStop(0.5, '#071e35');
  g.addColorStop(1, '#04101c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, W, H, 160);

  // 2⃣  GLASS FRAME with layered neon edges
  ctx.save();
  roundedRect(ctx, 18, 18, W - 36, H - 36, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.lineWidth   = 2;
  ctx.shadowColor = '#00e1ff';
  ctx.shadowBlur  = 18;
  ctx.strokeStyle = '#00e1ff';
  ctx.stroke();
  ctx.shadowColor = '#007bff';
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = 'rgba(0,123,255,0.8)';
  ctx.stroke();
  ctx.restore();

  // 3⃣  AVATAR with radial progress ring ----------------------------------
  const AV_SIZE = 200;
  const avX = 100, avY = H / 2;
  try {
    const avatar = await loadImage(d.avatarURL);
    ctx.save();
    // Clip avatar circle
    ctx.beginPath();
    ctx.arc(avX, avY, AV_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avX - AV_SIZE / 2, avY - AV_SIZE / 2, AV_SIZE, AV_SIZE);
    ctx.restore();
  } catch (_) {}

  // Glow ring background
  ctx.beginPath();
  ctx.arc(avX, avY, AV_SIZE / 2 + 6, 0, Math.PI * 2);
  ctx.shadowColor = '#24faff';
  ctx.shadowBlur  = 25;
  ctx.lineWidth   = 6;
  ctx.strokeStyle = '#24faff';
  ctx.stroke();
  ctx.shadowBlur = 0;

  // XP progress ring (360° arc proportionate to progress)
  const pct = Math.max(0, Math.min(1, d.progressPercentage / 100));
  const startAng = -Math.PI / 2;
  const endAng   = startAng + pct * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(avX, avY, AV_SIZE / 2 + 16, startAng, endAng);
  const ringGrad = ctx.createLinearGradient(avX, avY - AV_SIZE / 2 - 16, avX, avY + AV_SIZE / 2 + 16);
  ringGrad.addColorStop(0, '#29ffe4');
  ringGrad.addColorStop(1, '#2a7dff');
  ctx.lineWidth   = 10;
  ctx.strokeStyle = ringGrad;
  ctx.shadowColor = '#00d1ff';
  ctx.shadowBlur  = 15;
  ctx.lineCap     = 'round';
  ctx.stroke();
  ctx.shadowBlur  = 0;

  // 4⃣  USERNAME & LEVEL ----------------------------------------------------
  const fontTitle  = "'Orbitron', sans-serif";
  const fontMetric = "'Rajdhani', sans-serif";

  ctx.fillStyle = '#eafcff';
  ctx.font = `bold 56px ${fontTitle}`;
  ctx.fillText(d.username, 260, 110);

  ctx.font = `34px ${fontMetric}`;
  ctx.fillStyle = '#8dfaff';
  ctx.fillText(`LEVEL ${d.level}`, 260, 160);

  // 5⃣  METRIC CHIPS --------------------------------------------------------
  const chips = [
    { label: 'RANK',   value: `#${d.rank}` },
    { label: 'PRESTIGE', value: d.prestige ?? 0 },
    { label: 'STREAK',  value: d.streak ?? 0 },
    { label: 'DAILY XP', value: d.dailyXP?.toLocaleString() ?? 0 }
  ];
  let chipX = 260, chipY = 200;
  const chipH = 36, padH = 14, padV = 8;
  ctx.font = `20px ${fontMetric}`;
  chips.forEach(c => {
    const txt = `${c.label}: ${c.value}`;
    const txtW = ctx.measureText(txt).width;
    const chipW = txtW + padH * 2;

    // Background pill
    roundedRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fillStyle   = 'rgba(255,255,255,0.08)';
    ctx.shadowColor = 'rgba(0,224,255,0.7)';
    ctx.shadowBlur  = 6;
    ctx.fill();
    ctx.shadowBlur  = 0;

    // Text
    ctx.fillStyle = '#b3f4ff';
    ctx.fillText(txt, chipX + padH, chipY + chipH / 1.5);

    // Move to next chip position
    chipX += chipW + 18;
    if (chipX > W - 260) {
      chipX = 260;
      chipY += chipH + 14;
    }
  });

  // 6⃣  HORIZONTAL PROGRESS BAR -------------------------------------------
  const bar = { x: 260, y: H - 130, w: W - 320, h: 40, r: 20 };
  roundedRect(ctx, bar.x, bar.y, bar.w, bar.h, bar.r);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  if (pct > 0) {
    const innerW = bar.w * pct;
    roundedRect(ctx, bar.x, bar.y, innerW, bar.h, bar.r);
    const grad = ctx.createLinearGradient(bar.x, bar.y, bar.x + innerW, bar.y);
    grad.addColorStop(0, '#23fbff');
    grad.addColorStop(1, '#2b6dff');
    ctx.shadowColor = '#22e9ff';
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = grad;
    ctx.fill();
    ctx.shadowBlur  = 0;
  }

  // Progress text overlay
  const barTxt = `${d.xp.toLocaleString()} / ${d.xpNeeded > 0 ? d.xpNeeded.toLocaleString() : '-'} • ${d.progressPercentage.toFixed(1)}%`;
  ctx.font = `22px ${fontMetric}`;
  ctx.fillStyle = '#eafcff';
  const tW = ctx.measureText(barTxt).width;
  ctx.fillText(barTxt, bar.x + (bar.w - tW) / 2, bar.y + bar.h / 1.6);

  // 7⃣  BADGE ROW -----------------------------------------------------------
  if (Array.isArray(d.badgeUrls) && d.badgeUrls.length) {
    const B = 48;
    const startX = bar.x;
    const y = bar.y + 60;
    for (let i = 0; i < Math.min(d.badgeUrls.length, 10); i++) {
      const x = startX + i * (B + 12);
      // Badge placeholder background
      roundedRect(ctx, x, y, B, B, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();
      try {
        const img = await loadImage(d.badgeUrls[i]);
        ctx.drawImage(img, x, y, B, B);
      } catch (_) {}
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateLevelCard };
