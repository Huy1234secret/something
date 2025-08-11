const { createCanvas, loadImage } = require('canvas');

async function renderLevelCard({
  username,
  level,
  xp,
  xpTotal,
  avatarUrl,
  backgroundUrl,
  barColor = [92,220,140]
}) {
  const width = 600;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  try {
    const bg = await loadImage(backgroundUrl);
    ctx.drawImage(bg, 0, 0, width, height);
  } catch (_) {
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0,0,width,height);
  }

  // avatar
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(75, 100, 60, 0, Math.PI*2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 15, 40, 120, 120);
    ctx.restore();
  } catch (_) {}

  // username & level
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(username, 150, 80);
  ctx.font = '20px sans-serif';
  ctx.fillText(`Level ${level}`, 150, 110);

  // xp bar
  const progress = Math.min(1, xp / xpTotal);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(150, 130, 400, 25);
  ctx.fillStyle = `rgb(${barColor[0]},${barColor[1]},${barColor[2]})`;
  ctx.fillRect(150, 130, 400 * progress, 25);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`${xp}/${xpTotal} XP`, 150, 150);

  return canvas.toBuffer('image/png');
}

module.exports = { renderLevelCard };
