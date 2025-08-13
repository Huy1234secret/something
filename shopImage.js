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

async function renderShopImage(items = [], opts = {}) {
  const {
    width = 1200,
    height = 800,
    cols = 3,
    rows = 2,
    title = '',
    balanceText = '',
  } = opts;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, width, height);

  // header
  const headerHeight = 80;
  ctx.fillStyle = '#ffffff';
  if (title) {
    ctx.font = 'bold 36px Sans';
    ctx.fillText(title, 40, 50);
  }
  if (balanceText) {
    ctx.font = '24px Sans';
    const bw = ctx.measureText(balanceText).width;
    ctx.fillText(balanceText, width - bw - 40, 50);
  }

  const marginX = 20;
  const marginY = 20;
  const cardW = (width - (cols + 1) * marginX) / cols;
  const cardH = (height - headerHeight - (rows + 1) * marginY) / rows;
  const imgH = cardH * 0.5;

  const rarityColors = {
    common: '#9e9e9e',
    uncommon: '#4caf50',
    rare: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800',
  };

  for (let i = 0; i < cols * rows; i++) {
    const item = items[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = marginX + col * (cardW + marginX);
    const y = headerHeight + marginY + row * (cardH + marginY);

    ctx.fillStyle = '#2e2e2e';
    roundRect(ctx, x, y, cardW, cardH, 20);
    ctx.fill();

    if (item) {
      const color = rarityColors[item.rarity] || '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      roundRect(ctx, x, y, cardW, cardH, 20);
      ctx.stroke();

      if (item.image) {
        try {
          const img = await loadImage(item.image);
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

      if (item.saleText) {
        ctx.fillStyle = '#e53935';
        ctx.font = 'bold 20px Sans';
        const sw = ctx.measureText(item.saleText).width;
        ctx.fillText(item.saleText, x + cardW - sw - 20, y + 30);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Sans';
      ctx.fillText(item.name || '???', x + 20, y + imgH + 40);

      ctx.font = '20px Sans';
      ctx.fillText(`Price: ${item.price ?? '???'}`, x + 20, y + imgH + 70);

      ctx.font = '16px Sans';
      wrapText(ctx, item.note || '', x + 20, y + imgH + 100, cardW - 40, 18);

      if (item.stock != null) {
        ctx.font = '16px Sans';
        const stockText = `Stock: ${item.stock}`;
        const tw = ctx.measureText(stockText).width;
        ctx.fillText(stockText, x + cardW - tw - 20, y + cardH - 20);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Sans';
      ctx.fillText('Coming soon', x + 20, y + cardH / 2);
    }
  }

  return canvas.toBuffer();
}

module.exports = { renderShopImage };
