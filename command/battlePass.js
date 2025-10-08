const {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require('@discordjs/builders');
const { createCanvas } = require('canvas');
const { randomInt } = require('crypto');

const BP_WIDTH = 1400;
const BP_HEIGHT = 420;
const MARGIN = 24;
const CARD_COUNT = 5;
const CARD_GAP = 18;
const CARD_W = Math.floor((BP_WIDTH - MARGIN * 2 - CARD_GAP * (CARD_COUNT - 1)) / CARD_COUNT);
const CARD_H = 260;

const numberFormatter = new Intl.NumberFormat('en-US');

const ITEM_POOL = [
  {
    name: 'Coin Pouch',
    icon: 'coin',
    amount: () => `${formatNumber(randomRange(10000, 60000))} Coins`,
  },
  {
    name: 'Diamond Cache',
    icon: 'diamond',
    amount: () => `x${formatNumber(randomRange(2, 8))} Diamonds`,
  },
  {
    name: 'Deluxe Coin Vault',
    icon: 'deluxeCoin',
    amount: () => `x${formatNumber(randomRange(1, 3))} Deluxe Coins`,
  },
  {
    name: 'Candy Cane Bundle',
    icon: 'candyCane',
    amount: () => `x${formatNumber(randomRange(5, 14))}`,
  },
  {
    name: 'Gingerbread Crate',
    icon: 'gingerbread',
    amount: () => `x${formatNumber(randomRange(4, 9))}`,
  },
  {
    name: 'Snowball Stockpile',
    icon: 'snowball',
    amount: () => `x${formatNumber(randomRange(8, 22))}`,
  },
  {
    name: 'Festive Gift Box',
    icon: 'gift',
    amount: () => `x${formatNumber(randomRange(1, 4))}`,
  },
  {
    name: 'Holiday Potion',
    icon: 'potion',
    amount: () => `x${formatNumber(randomRange(1, 3))}`,
  },
  {
    name: 'Winter Ticket',
    icon: 'ticket',
    amount: () => `x${formatNumber(randomRange(1, 2))}`,
  },
  {
    name: 'North Star Charm',
    icon: 'star',
    amount: () => `x${formatNumber(randomRange(2, 6))}`,
  },
];

function formatNumber(value) {
  return numberFormatter.format(value);
}

function randomRange(min, max) {
  if (max <= min) return min;
  return randomInt(max - min + 1) + min;
}

function roundRect(ctx, x, y, w, h, r = 18) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dropShadow(
  ctx,
  fn,
  { blur = 20, color = 'rgba(0,0,0,0.25)', offsetX = 0, offsetY = 6 } = {},
) {
  const prev = {
    shadowBlur: ctx.shadowBlur,
    shadowColor: ctx.shadowColor,
    shadowOffsetX: ctx.shadowOffsetX,
    shadowOffsetY: ctx.shadowOffsetY,
  };
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;
  ctx.shadowOffsetX = offsetX;
  ctx.shadowOffsetY = offsetY;
  fn();
  ctx.shadowBlur = prev.shadowBlur;
  ctx.shadowColor = prev.shadowColor;
  ctx.shadowOffsetX = prev.shadowOffsetX;
  ctx.shadowOffsetY = prev.shadowOffsetY;
}

function drawSnowOverlay(ctx, count = 160) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * BP_WIDTH;
    const y = Math.random() * BP_HEIGHT;
    const r = Math.random() * 2.2 + 0.6;
    ctx.globalAlpha = Math.random() * 0.7 + 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCandyCaneBorder(ctx) {
  const stripeH = 14;
  for (let x = 0; x < BP_WIDTH; x += 28) {
    ctx.fillStyle = '#d01e2e';
    ctx.fillRect(x, 0, 20, stripeH);
    ctx.fillRect(x + 10, BP_HEIGHT - stripeH, 20, stripeH);
  }
}

function drawSnowman(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -34, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-6, -40, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, -40, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff7f27';
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(20, -30);
  ctx.lineTo(0, -28);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#222';
  ctx.fillRect(-16, -62, 32, 6);
  ctx.fillRect(-12, -80, 24, 18);

  ctx.fillStyle = '#222';
  [-14, -3, 8].forEach(yy => {
    ctx.beginPath();
    ctx.arc(0, yy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#d01e2e';
  ctx.fillRect(-16, -28, 32, 6);
  ctx.fillRect(10, -28, 6, 18);

  ctx.restore();
}

function drawGingerbread(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#b06a3b';
  ctx.beginPath();
  ctx.arc(0, -24, 14, 0, Math.PI * 2);
  ctx.fill();
  roundRect(ctx, -12, -16, 24, 32, 8);
  ctx.fill();
  roundRect(ctx, -26, -10, 14, 8, 4);
  ctx.fill();
  roundRect(ctx, 12, -10, 14, 8, 4);
  ctx.fill();
  roundRect(ctx, -12, 14, 10, 16, 4);
  ctx.fill();
  roundRect(ctx, 2, 14, 10, 16, 4);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, -22, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-5, -26, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, -26, 1.7, 0, Math.PI * 2);
  ctx.fill();
  [-2, 6].forEach(yy => {
    ctx.beginPath();
    ctx.arc(0, yy, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawCoinIcon(ctx, cx, cy, radius, deluxe = false) {
  const grad = ctx.createRadialGradient(
    cx - radius * 0.4,
    cy - radius * 0.6,
    radius * 0.1,
    cx,
    cy,
    radius,
  );
  grad.addColorStop(0, '#ffe89c');
  grad.addColorStop(1, '#f0c04d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = radius * 0.18;
  ctx.strokeStyle = deluxe ? '#f6f4d2' : '#d79b33';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.lineWidth = radius * 0.12;
  ctx.strokeStyle = deluxe ? '#f8f2b7' : '#e2b554';
  ctx.stroke();
  if (deluxe) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#fff7c0';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const inner = radius * 0.25;
      const outer = radius * 0.55;
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      const next = angle + Math.PI / 5;
      ctx.lineTo(Math.cos(next) * inner, Math.sin(next) * inner);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawDiamondIcon(ctx, cx, cy, size) {
  const half = size / 2;
  const grad = ctx.createLinearGradient(cx, cy - half, cx, cy + half);
  grad.addColorStop(0, '#b8f1ff');
  grad.addColorStop(1, '#3ab0ff');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy - half);
  ctx.lineTo(cx - half * 0.8, cy);
  ctx.lineTo(cx, cy + half);
  ctx.lineTo(cx + half * 0.8, cy);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = size * 0.08;
  ctx.strokeStyle = '#2c89d6';
  ctx.stroke();
}

function drawGiftIcon(ctx, cx, cy, size) {
  const half = size / 2;
  const corner = size * 0.18;
  ctx.save();
  ctx.fillStyle = '#d01e2e';
  roundRect(ctx, cx - half, cy - half, size, size, corner);
  ctx.fill();
  ctx.fillStyle = '#f6f2f0';
  ctx.fillRect(cx - size * 0.1, cy - half, size * 0.2, size);
  ctx.fillRect(cx - half, cy - size * 0.1, size, size * 0.2);
  ctx.restore();
}

function drawPotionIcon(ctx, cx, cy, size) {
  ctx.save();
  const neck = size * 0.35;
  const body = size * 0.65;
  ctx.beginPath();
  ctx.moveTo(cx - neck / 2, cy - body / 2);
  ctx.lineTo(cx - neck / 2, cy - body * 0.2);
  ctx.bezierCurveTo(
    cx - neck / 2,
    cy + body * 0.35,
    cx - size / 2,
    cy + body * 0.4,
    cx,
    cy + body * 0.6,
  );
  ctx.bezierCurveTo(
    cx + size / 2,
    cy + body * 0.4,
    cx + neck / 2,
    cy + body * 0.35,
    cx + neck / 2,
    cy - body * 0.2,
  );
  ctx.lineTo(cx + neck / 2, cy - body / 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(125, 215, 255, 0.9)';
  ctx.fill();
  ctx.lineWidth = size * 0.06;
  ctx.strokeStyle = '#6bb8f8';
  ctx.stroke();
  ctx.fillStyle = '#f5f0f9';
  ctx.fillRect(cx - neck / 2, cy - body * 0.7, neck, body * 0.18);
  ctx.restore();
}

function drawTicketIcon(ctx, cx, cy, size) {
  const w = size * 1.1;
  const h = size * 0.55;
  const radius = h * 0.45;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + radius, cy - h / 2);
  ctx.lineTo(cx + w / 2 - radius, cy - h / 2);
  ctx.quadraticCurveTo(cx + w / 2, cy - h / 2, cx + w / 2, cy - h / 2 + radius);
  ctx.lineTo(cx + w / 2, cy + h / 2 - radius);
  ctx.quadraticCurveTo(cx + w / 2, cy + h / 2, cx + w / 2 - radius, cy + h / 2);
  ctx.lineTo(cx - w / 2 + radius, cy + h / 2);
  ctx.quadraticCurveTo(cx - w / 2, cy + h / 2, cx - w / 2, cy + h / 2 - radius);
  ctx.lineTo(cx - w / 2, cy - h / 2 + radius);
  ctx.quadraticCurveTo(cx - w / 2, cy - h / 2, cx - w / 2 + radius, cy - h / 2);
  ctx.closePath();
  ctx.fillStyle = '#f7d56d';
  ctx.fill();
  ctx.lineWidth = size * 0.06;
  ctx.strokeStyle = '#d6a23d';
  ctx.stroke();
  ctx.setLineDash([size * 0.12, size * 0.12]);
  ctx.lineDashOffset = size * 0.04;
  ctx.lineWidth = size * 0.04;
  ctx.strokeStyle = 'rgba(210, 150, 40, 0.8)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2 + radius * 0.6);
  ctx.lineTo(cx, cy + h / 2 - radius * 0.6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawStarIcon(ctx, cx, cy, size) {
  const spikes = 5;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.45;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    const outerAngle = (i * 2 * Math.PI) / spikes - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / spikes;
    ctx.lineTo(cx + Math.cos(outerAngle) * outerRadius, cy + Math.sin(outerAngle) * outerRadius);
    ctx.lineTo(cx + Math.cos(innerAngle) * innerRadius, cy + Math.sin(innerAngle) * innerRadius);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd27f';
  ctx.fill();
  ctx.lineWidth = size * 0.08;
  ctx.strokeStyle = '#e6ae4f';
  ctx.stroke();
  ctx.restore();
}

function drawSnowballIcon(ctx, cx, cy, radius) {
  const grad = ctx.createRadialGradient(
    cx - radius * 0.4,
    cy - radius * 0.4,
    radius * 0.2,
    cx,
    cy,
    radius,
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#d5e6ff');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b7c9e4';
  ctx.lineWidth = radius * 0.08;
  ctx.stroke();
}

function drawCandyCaneIcon(ctx, cx, cy, size) {
  const radius = size * 0.5;
  ctx.save();
  ctx.lineWidth = size * 0.22;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f8f8f8';
  ctx.beginPath();
  ctx.arc(cx, cy - radius * 0.1, radius, Math.PI, Math.PI * 1.5);
  ctx.lineTo(cx + radius, cy + radius * 0.8);
  ctx.stroke();

  ctx.strokeStyle = '#d01e2e';
  ctx.lineWidth = size * 0.12;
  for (let t = 0; t < 6; t++) {
    const angleStart = Math.PI + (t * Math.PI) / 8;
    const angleEnd = angleStart + Math.PI / 8;
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.1, radius - size * 0.05, angleStart, angleEnd);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx + radius * 0.1, cy + radius * 0.1);
  ctx.lineTo(cx + radius * 0.75, cy + radius * 0.9);
  ctx.stroke();
  ctx.restore();
}

function drawItemIcon(ctx, card, boxX, boxY, boxW, boxH) {
  const cx = boxX + boxW / 2;
  const cy = boxY + boxH / 2;
  const size = Math.min(boxW, boxH) * 0.65;
  switch (card.icon) {
    case 'coin':
      drawCoinIcon(ctx, cx, cy, size * 0.35, false);
      break;
    case 'deluxeCoin':
      drawCoinIcon(ctx, cx, cy, size * 0.35, true);
      break;
    case 'diamond':
      drawDiamondIcon(ctx, cx, cy, size * 0.9);
      break;
    case 'gift':
      drawGiftIcon(ctx, cx, cy, size * 0.85);
      break;
    case 'potion':
      drawPotionIcon(ctx, cx, cy, size * 0.9);
      break;
    case 'ticket':
      drawTicketIcon(ctx, cx, cy, size * 0.9);
      break;
    case 'star':
      drawStarIcon(ctx, cx, cy, size * 0.9);
      break;
    case 'snowball':
      drawSnowballIcon(ctx, cx, cy, size * 0.4);
      break;
    case 'candyCane':
      drawCandyCaneIcon(ctx, cx, cy, size * 0.7);
      break;
    case 'gingerbread':
      drawGingerbread(ctx, cx, cy + size * 0.1, size * 0.02);
      break;
    default:
      break;
  }
}

function fitText(ctx, text, maxWidth, baseSize, fontWeight = 'bold') {
  let size = baseSize;
  while (size > 12) {
    ctx.font = `${fontWeight} ${size}px Sans`;
    if (ctx.measureText(text).width <= maxWidth) return `${fontWeight} ${size}px Sans`;
    size -= 1;
  }
  return `${fontWeight} 12px Sans`;
}

function drawProgressBar(ctx, x, y, w, h, current, total, tickXs = [], nextThreshold = null) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  const pct = Math.max(0, Math.min(1, total === 0 ? 0 : current / total));
  const fillW = Math.max(h, Math.round(w * pct));
  roundRect(ctx, x, y, fillW, h, h / 2);
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#2ad67b');
  grad.addColorStop(1, '#20b35b');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  tickXs.forEach(tx => {
    ctx.beginPath();
    ctx.moveTo(tx, y - 6);
    ctx.lineTo(tx, y + h + 6);
    ctx.stroke();
  });

  ctx.font = 'bold 22px Sans';
  ctx.fillStyle = '#2ad67b';
  ctx.textAlign = 'center';
  const target = nextThreshold != null ? nextThreshold : total;
  const label =
    target > 0
      ? `Progress: ${formatNumber(Math.min(current, target))} / ${formatNumber(target)} XP`
      : 'All rewards unlocked';
  ctx.fillText(label, x + w / 2, y - 12);
  ctx.textAlign = 'left';
}

function drawCard(ctx, x, y, card, themeAccent = '#d01e2e') {
  const accent = card.unlocked ? '#2ad67b' : themeAccent;
  dropShadow(ctx, () => {
    roundRect(ctx, x, y, CARD_W, CARD_H, 20);
    const g = ctx.createLinearGradient(0, y, 0, y + CARD_H);
    g.addColorStop(0, 'rgba(255,255,255,0.96)');
    g.addColorStop(1, 'rgba(239,246,247,0.95)');
    ctx.fillStyle = g;
    ctx.fill();
  });

  if (card.unlocked) {
    ctx.save();
    roundRect(ctx, x, y, CARD_W, CARD_H, 20);
    ctx.clip();
    const overlay = ctx.createLinearGradient(0, y, 0, y + CARD_H);
    overlay.addColorStop(0, 'rgba(42,214,123,0.28)');
    overlay.addColorStop(1, 'rgba(32,179,91,0.16)');
    ctx.fillStyle = overlay;
    ctx.fillRect(x, y, CARD_W, CARD_H);
    ctx.restore();
  }

  const badgeR = 20;
  const bx = x + 18;
  const by = y + 18;
  ctx.beginPath();
  ctx.arc(bx + badgeR, by + badgeR, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(String(card.num), bx + badgeR, by + badgeR + 7);

  const xpText = `Unlock @ ${formatNumber(card.threshold)} XP`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9aa4aa';
  ctx.font = 'bold 16px Sans';
  ctx.fillText(xpText, x + 18, y + 76);

  if (card.unlocked) {
    const pillW = 100;
    const pillH = 28;
    const px = x + CARD_W - pillW - 18;
    const py = y + 32;
    roundRect(ctx, px, py, pillW, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(42,214,123,0.15)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = 'bold 14px Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Unlocked', px + pillW / 2, py + 19);
    ctx.textAlign = 'left';
  }

  const boxW = CARD_W - 36;
  const boxH = 110;
  const boxX = x + 18;
  const boxY = y + 90;
  ctx.save();
  roundRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.fillStyle = 'rgba(250,252,255,0.9)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = card.unlocked ? 'rgba(42,214,123,0.6)' : '#c6d1d8';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawItemIcon(ctx, card, boxX, boxY, boxW, boxH);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1f2a33';
  ctx.font = fitText(ctx, card.name, CARD_W - 48, 20);
  ctx.fillText(card.name, x + CARD_W / 2, y + 220);
  ctx.fillStyle = '#5b6b76';
  ctx.font = fitText(ctx, card.amount, CARD_W - 48, 16, 'normal');
  ctx.fillText(card.amount, x + CARD_W / 2, y + 244);
  ctx.textAlign = 'left';
}

function drawTitle(ctx) {}

function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, BP_HEIGHT);
  bg.addColorStop(0, '#0b2e20');
  bg.addColorStop(0.5, '#0f3d2a');
  bg.addColorStop(1, '#12402a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BP_WIDTH, BP_HEIGHT);

  drawCandyCaneBorder(ctx);

  const vignette = ctx.createRadialGradient(
    BP_WIDTH / 2,
    BP_HEIGHT / 2,
    Math.min(BP_WIDTH, BP_HEIGHT) / 6,
    BP_WIDTH / 2,
    BP_HEIGHT / 2,
    BP_WIDTH / 1.1,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, BP_WIDTH, BP_HEIGHT);

  ctx.fillStyle = '#eaf5ff';
  roundRect(ctx, -10, BP_HEIGHT - 80, BP_WIDTH + 20, 120, 40);
  ctx.fill();

  drawSnowman(ctx, BP_WIDTH - 90, BP_HEIGHT - 90, 1.2);
  drawGingerbread(ctx, 80, BP_HEIGHT - 90, 1.2);

  drawSnowOverlay(ctx, 180);
}

function drawFooter(ctx) {}

function layoutTickPositions(items, x, w) {
  if (items.length === 0) return { ticks: [], totalXP: 0 };
  const total = items[items.length - 1].threshold;
  const ticks = items.map(item => {
    const pct = total === 0 ? 0 : item.threshold / total;
    return x + Math.round(w * pct);
  });
  return { ticks, totalXP: total };
}

async function renderBattlePass(items, currentXP, totalXP) {
  const canvas = createCanvas(BP_WIDTH, BP_HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  drawBackground(ctx);
  drawTitle(ctx);

  const rowY = 100;
  let x = MARGIN;
  for (let i = 0; i < items.length; i++) {
    drawCard(ctx, x, rowY, items[i]);
    x += CARD_W + CARD_GAP;
  }

  const pbX = MARGIN;
  const pbW = BP_WIDTH - MARGIN * 2;
  const pbY = rowY + CARD_H + 40;
  const pbH = 22;
  const { ticks } = layoutTickPositions(items, pbX, pbW);
  const nextReward = items.find(item => item.threshold > currentXP) || null;
  const nextThreshold = nextReward ? nextReward.threshold : null;
  drawProgressBar(ctx, pbX, pbY, pbW, pbH, currentXP, totalXP, ticks, nextThreshold);

  drawFooter(ctx);

  return canvas.toBuffer('image/png');
}

function generateBattlePassData() {
  const available = [...ITEM_POOL];
  const items = [];
  let threshold = randomRange(140, 240);
  for (let i = 0; i < CARD_COUNT; i++) {
    if (available.length === 0) break;
    const index = randomInt(available.length);
    const base = available.splice(index, 1)[0];
    const card = {
      num: i + 1,
      name: base.name,
      amount: base.amount(),
      icon: base.icon,
      threshold,
      unlocked: false,
    };
    items.push(card);
    threshold += randomRange(160, 340);
  }
  const totalXP = items.length ? items[items.length - 1].threshold : 0;
  const minXP = totalXP > 0 ? Math.floor(totalXP * 0.2) : 0;
  const currentXP = totalXP > 0 ? randomRange(minXP, totalXP) : 0;
  items.forEach(card => {
    card.unlocked = currentXP >= card.threshold;
  });
  return { items, currentXP, totalXP };
}

function buildContainer() {
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '## Seasonal Battle Pass\n-# Seasonal rewards preview\n-# Rewards & XP refresh on every use',
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://battle-pass.png'),
      ),
    );
}

function setup(client) {
  const command = new SlashCommandBuilder()
    .setName('battle-pass')
    .setDescription('Generate a randomized Christmas battle pass preview.');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'battle-pass') {
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      const { items, currentXP, totalXP } = generateBattlePassData();
      const buffer = await renderBattlePass(items, currentXP, totalXP);
      const attachment = new AttachmentBuilder(buffer, { name: 'battle-pass.png' });
      const container = buildContainer();
      await interaction.editReply({
        files: [attachment],
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };
