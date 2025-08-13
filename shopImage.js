const { createCanvas, loadImage } = require('canvas');

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const words = text.split(/\s+/);
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

async function renderShopImage(items = []) {
  const W = 1200;
  const H = 800;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, W, H);

  const cols = 3;
  const rows = 2;
  const cardW = 300;
  const cardH = 300;
  const marginX = (W - cols * cardW) / (cols + 1);
  const marginY = (H - rows * cardH) / (rows + 1);

  for (let i = 0; i < 6; i++) {
    const item = items[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = marginX + col * (cardW + marginX);
    const y = marginY + row * (cardH + marginY);

    ctx.fillStyle = '#2e2e2e';
    roundRect(ctx, x, y, cardW, cardH, 20);
    ctx.fill();

    if (item) {
      if (item.image) {
        try {
          const img = await loadImage(item.image);
          const imgH = 150;
          ctx.save();
          ctx.beginPath();
          roundRect(ctx, x, y, cardW, imgH, 20);
          ctx.clip();
          ctx.drawImage(img, x, y, cardW, imgH);
          ctx.restore();
        } catch {
          /* ignore load errors */
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Sans';
      ctx.fillText(item.name || '???', x + 20, y + 180);

      ctx.font = '20px Sans';
      ctx.fillText(`Price: ${item.price ?? '???'}`, x + 20, y + 210);

      ctx.font = '16px Sans';
      wrapText(ctx, item.note || '', x + 20, y + 240, cardW - 40, 18);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Sans';
      ctx.fillText('Coming soon', x + 20, y + 150);
    }
  }

  return canvas.toBuffer();
}

module.exports = { renderShopImage };
