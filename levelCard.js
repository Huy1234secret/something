const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// Optional font
// registerFont(path.join(__dirname, 'assets/fonts/Manrope-SemiBold.ttf'), { family: 'Manrope' });

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function glowCircle(ctx, cx, cy, r, color) {
  const [cr, cg, cb] = color;
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},0.45)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.6)`;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBadgeSlot(ctx, cx, cy, r, color) {
  const [cr, cg, cb] = color;
  // subtle fill
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},0.14)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // crisp ring
  ctx.lineWidth = 3;
  ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawProgressBar(ctx, x, y, w, h, progress, label, starImg, color) {
  const [r, g, b] = color;
  // Track
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (progress > 0) {
    // Fill
    const fillW = Math.max(h, Math.min(w * progress, w));
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    const col = `rgba(${r},${g},${b},1)`;
    grad.addColorStop(0, col);
    grad.addColorStop(1, col);
    ctx.fillStyle = grad;

    // draw full rounded bar, clipped to progress width for smooth edges
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, fillW, h);
    ctx.clip();
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.restore();
  }

  // Star icon
  let textLeft = x + 18;
  if (starImg) {
    const iconSize = Math.floor(h * 0.75);
    const iconY = y + (h - iconSize) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12;
    ctx.drawImage(starImg, x + 16, iconY, iconSize, iconSize);
    ctx.restore();
    textLeft = x + 16 + iconSize + 12;
  }

  // Label
  ctx.font = 'bold 28px Manrope, Arial, Sans-Serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeText(label, textLeft, y + h / 2);
  ctx.fillText(label, textLeft, y + h / 2);
}

// draw image as CSS `background-size: cover`
function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

async function renderLevelCard({
  username = 'Username',
  tag = '',
  avatarURL,
  level = 3,
  prestige = 0,
  currentXP = 487,
  nextLevelXP = 519,
  totalXP = 869,
  rankText = '#0',

  // 🔽 your assets
  backgroundURL = 'https://i.ibb.co/9337ZnxF/wdwdwd.jpg',
  starURL = null,
  medalURL = 'https://i.ibb.co/7dw9RjgV/7cbb626b-1509-463f-a5b9-dce886ba4619.png',
  color = [92,220,140],
  chatXpEmoji = 'XP',
}) {
  const W = 1100;
  const H = 420;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const [r, g, b] = color;

  // Background
  try {
    const bg = await loadImage(backgroundURL);
    drawCover(ctx, bg, 0, 0, W, H);
  } catch {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0f1022');
    g.addColorStop(1, '#0b2238');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Readability panel
  ctx.fillStyle = 'rgba(2, 10, 18, 0.35)';
  roundRect(ctx, 18, 18, W - 36, H - 36, 16);
  ctx.fill();

  // Preload images
  let av = null, starImg = null, medalImg = null;
  try { if (avatarURL) av = await loadImage(avatarURL); } catch {}
  if (starURL) {
    try { starImg = await loadImage(starURL); } catch {}
  }
  try { medalImg = await loadImage(medalURL); } catch {}

  // ----- Profile
  const avatarSize = 140;
  const avatarX = 36;
  const avatarY = 36;

  if (av) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(av, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.lineWidth = 6;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Username + Level
  const nameX = avatarX + avatarSize + 24;
  const nameY = avatarY + 40;

  ctx.fillStyle = '#E9FCFF';
  ctx.font = '900 56px Manrope, Arial, Sans-Serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(username, nameX, nameY);

  if (tag) {
    ctx.font = 'bold 22px Manrope, Arial, Sans-Serif';
    ctx.fillStyle = 'rgba(233,252,255,0.75)';
    ctx.fillText(tag, nameX, nameY + 26);
  }

  // Level pill
  const lvlText = `Level: ${level}`;
  ctx.font = 'bold 30px Manrope, Arial, Sans-Serif';
  const lvlW = ctx.measureText(lvlText).width + 36;
  const lvlH = 42;
  const lvlX = nameX;
  const lvlY = nameY + 40;

  ctx.fillStyle = `rgba(${r},${g},${b},0.18)`;
  roundRect(ctx, lvlX, lvlY, lvlW, lvlH, 18);
  ctx.fill();

  ctx.fillStyle = '#BFFAFF';
  ctx.fillText(lvlText, lvlX + 18, lvlY + 30);

  // Rank + Medal
  const rightPad = 36;
  const medalSize = 44;
  const medalX = W - rightPad - medalSize;
  const medalY = 28;

  if (medalImg) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 14;
    ctx.drawImage(medalImg, medalX, medalY, medalSize, medalSize);
    ctx.restore();
  }

  ctx.font = '800 40px Manrope, Arial, Sans-Serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#E9FCFF';
  ctx.fillText(rankText, medalX - 10, medalY + 36);

  // ----- Row above the progress bar
  const rowTop = lvlY + lvlH + 36;
  const leftPad = 36;

  function statCard(label, value, x) {
    const cardW = 260;
    const cardH = 70;
    const y = rowTop;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.06)`;
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();

    ctx.font = 'bold 20px Manrope, Arial, Sans-Serif';
    ctx.fillStyle = 'rgba(200,250,255,0.85)';
    ctx.textAlign = 'left';
    ctx.fillText(label.toUpperCase(), x + 16, y + 26);

    ctx.font = '900 32px Manrope, Arial, Sans-Serif';
    ctx.fillStyle = '#E9FCFF';
    ctx.fillText(String(value), x + 16, y + 56);
  }

  statCard('Prestige', prestige, leftPad);
  statCard('Total XP', `${totalXP} ${chatXpEmoji}`, leftPad + 280);

  // --- Badge slots (three separate circles, not overlapping)
  const cy = rowTop + 35;
  const badgeR = 42;      // circle radius
  const badgeGap = 36;    // extra space between circles

  // rightmost center; adjust the -10 padding if needed
  const rightmostCx = W - rightPad - badgeR - 10;

  // compute evenly spaced centers (left, middle, right)
  const step = badgeR * 2 + badgeGap; // center-to-center distance
  const centers = [rightmostCx - step * 2, rightmostCx - step, rightmostCx];

  centers.forEach((cx) => drawBadgeSlot(ctx, cx, cy, badgeR, color));

  // ----- Progress bar (below everything)
  const barW = W - 72;
  const barH = 56;
  const barX = 36;
  const barY = rowTop + 70 + 28;

  const progress = Math.max(0, Math.min(1, currentXP / nextLevelXP));
  const progressLabel = `${currentXP} ${chatXpEmoji} / ${nextLevelXP} ${chatXpEmoji}`;
  drawProgressBar(ctx, barX, barY, barW, barH, progress, progressLabel, starImg, color);

  return canvas.toBuffer('image/png');
}

module.exports = { renderLevelCard };
