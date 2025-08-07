// Sci‑Fi themed Level Card generator for Discord bots
// Requires @napi-rs/canvas ≥0.1.43
// Optional: place a copy of the free "Orbitron" font in ./assets/Orbitron-Bold.ttf for a better futuristic look.

const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas');
const path = require('path');

// ---- OPTIONAL CUSTOM FONT --------------------------------------------------
try {
  registerFont(path.join(__dirname, 'assets', 'Orbitron-Bold.ttf'), { family: 'Orbitron', weight: 'bold' });
} catch (_) {
  // Font registration fails silently; default system sans-serif will be used.
}

// ---------------------------------------------------------------------------
// Helper to draw rounded rectangles (with option for glow)
function drawRoundedRect(ctx, x, y, w, h, r) {
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

/**
 * Generate a neon‑styled level card.
 * @param {Object} data – same contract as the previous implementation.
 * @returns {Promise<Buffer>} PNG buffer.
 */
async function generateLevelCard(data) {
  const width  = 940;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  // 1️⃣  Cosmic gradient backdrop ------------------------------------------------
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0,  '#0d0a1a');  // deep space violet
  bgGrad.addColorStop(0.5,'#141e30');  // dark indigo
  bgGrad.addColorStop(1,  '#1f4068');  // star‑blue
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Scatter a subtle starfield (≈ 120 stars)
  for (let i = 0; i < 120; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height;
    const r  = Math.random() * 1.6 + 0.2;
    ctx.globalAlpha = Math.random() * 0.8 + 0.2;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 2️⃣  Central neon panel ------------------------------------------------------
  const panel = { x: 24, y: 24, w: width - 48, h: height - 48, r: 28 };
  ctx.save();
  drawRoundedRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.fillStyle = 'rgba(5, 8, 20, 0.65)'; // translucent midnight overlay
  ctx.fill();

  // Outer glow
  ctx.shadowColor = '#00d0ff';
  ctx.shadowBlur  = 25;
  ctx.lineWidth   = 2;
  ctx.strokeStyle = '#00d0ff';
  ctx.stroke();
  ctx.restore();

  // 3️⃣  Optional level icon -----------------------------------------------------
  if (data.levelIconUrl) {
    try {
      const iconImg  = await loadImage(data.levelIconUrl);
      const iconSize = 86;
      ctx.drawImage(iconImg, panel.x + panel.w - iconSize - 20, panel.y + 20, iconSize, iconSize);
    } catch (_) {}
  }

  // 4️⃣  Avatar ---------------------------------------------------------------
  try {
    const avatar = await loadImage(data.avatarURL);
    const size   = 176;
    const ax     = panel.x + 30;
    const ay     = panel.y + (panel.h - size) / 2;

    ctx.save();
    // Avatar glow ring
    ctx.shadowColor = '#03e9f4';
    ctx.shadowBlur  = 25;
    ctx.beginPath();
    ctx.arc(ax + size/2, ay + size/2, size/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = '#03e9f4';
    ctx.lineWidth   = 6;
    ctx.stroke();
    ctx.clip();

    // Draw avatar
    ctx.shadowBlur = 0; // disable glow for image
    ctx.drawImage(avatar, ax, ay, size, size);
    ctx.restore();
  } catch (_) {}

  // 5️⃣  Text block -------------------------------------------------------------
  const textX = panel.x + 250;
  const titleFont = ctx.measureText(' ').actualBoundingBoxAscent ? 'Orbitron' : 'sans-serif';

  ctx.fillStyle = '#e4f7ff';
  ctx.font = `bold 42px "${titleFont}"`;
  ctx.fillText(data.username, textX, panel.y + 70);

  ctx.font = `28px "${titleFont}"`;
  ctx.fillStyle = '#8be9ff';
  ctx.fillText(`LEVEL ${data.level}`, textX, panel.y + 110);

  ctx.fillStyle = '#ffffff';
  ctx.font = `24px "${titleFont}"`;
  ctx.fillText(`RANK #${data.rank}`, textX, panel.y + 150);
  if (data.highestRoleName) ctx.fillText(`ROLE • ${data.highestRoleName}`, textX, panel.y + 190);
  ctx.fillText(`TO NEXT • ${data.xpToNextDisplay}`, textX, panel.y + 230);

  // 6️⃣  Neon progress bar ------------------------------------------------------
  const bar = { x: textX, y: panel.y + panel.h - 70, w: panel.w - (textX - panel.x) - 30, h: 32, r: 16 };
  drawRoundedRect(ctx, bar.x, bar.y, bar.w, bar.h, bar.r);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  const progress = Math.max(0, Math.min(1, data.progressPercentage / 100));
  if (progress > 0) {
    const innerW = bar.w * progress;
    drawRoundedRect(ctx, bar.x, bar.y, innerW, bar.h, bar.r);
    const grad = ctx.createLinearGradient(bar.x, bar.y, bar.x + innerW, bar.y);
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(1, '#3a7dff');
    ctx.shadowColor = '#00cfff';
    ctx.shadowBlur  = 15;
    ctx.fillStyle   = grad;
    ctx.fill();
    ctx.shadowBlur  = 0; // reset glow
  }

  // Progress text (centered)
  const progressTxt = `${data.xp.toLocaleString()} / ${data.xpNeeded ? data.xpNeeded.toLocaleString() : '-'}  •  ${data.progressPercentage.toFixed(1)}%`;
  ctx.font = `20px "${titleFont}"`;
  ctx.fillStyle = '#e4f7ff';
  const txtWidth = ctx.measureText(progressTxt).width;
  ctx.fillText(progressTxt, bar.x + (bar.w - txtWidth) / 2, bar.y + bar.h / 1.6);

  return canvas.toBuffer('image/png');
}

module.exports = { generateLevelCard };

