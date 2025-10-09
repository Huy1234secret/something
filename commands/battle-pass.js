const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');

// ====== CONFIG YOU'LL LIKELY EDIT ======
const BP_WIDTH = 1400;
const BP_HEIGHT = 420;
const MARGIN = 24;
const CARD_COUNT = 5;
const CARD_GAP = 18;
const CARD_W = Math.floor((BP_WIDTH - MARGIN * 2 - CARD_GAP * (CARD_COUNT - 1)) / CARD_COUNT);
const CARD_H = 260;

const DEMO_ITEMS = [
  // You can edit these
  { num: 1, xpReq: 100, rewards: [{ label: 'Candy Cane', amount: 'x5' }] },
  { num: 2, xpReq: 250, rewards: [{ label: 'Snowflake Dust', amount: 'x3' }] },
  { num: 3, xpReq: 450, rewards: [{ label: 'Ginger Snap', amount: 'x10' }] },
  { num: 4, xpReq: 700, rewards: [{ label: 'Elf Ticket', amount: 'x1' }] },
  { num: 5, xpReq: 1000, rewards: [{ label: 'Holiday Chest', amount: 'x1' }] },
];

// Simulate current progress (edit this or make it dynamic from your DB)
const CURRENT_XP = 520;

// ====== DRAW HELPERS ======
function roundRect(ctx, x, y, w, h, r = 18) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dropShadow(ctx, fn, { blur = 20, color = 'rgba(0,0,0,0.25)', offsetX = 0, offsetY = 6 } = {}) {
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
  // Striped top/bottom border
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

  // Body
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -34, 20, 0, Math.PI * 2); ctx.fill();

  // Eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(-6, -40, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 6, -40, 2.4, 0, Math.PI * 2); ctx.fill();

  // Carrot nose
  ctx.fillStyle = '#ff7f27';
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(20, -30);
  ctx.lineTo(0, -28);
  ctx.closePath();
  ctx.fill();

  // Hat
  ctx.fillStyle = '#222';
  ctx.fillRect(-16, -62, 32, 6);
  ctx.fillRect(-12, -80, 24, 18);

  // Buttons
  ctx.fillStyle = '#222';
  [ -14, -3, 8 ].forEach((yy) => {
    ctx.beginPath(); ctx.arc(0, yy, 2.2, 0, Math.PI * 2); ctx.fill();
  });

  // Scarf
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
  // Head
  ctx.beginPath(); ctx.arc(0, -24, 14, 0, Math.PI * 2); ctx.fill();
  // Body
  roundRect(ctx, -12, -16, 24, 32, 8); ctx.fill();
  // Arms
  roundRect(ctx, -26, -10, 14, 8, 4); ctx.fill();
  roundRect(ctx, 12, -10, 14, 8, 4);  ctx.fill();
  // Legs
  roundRect(ctx, -12, 14, 10, 16, 4); ctx.fill();
  roundRect(ctx, 2, 14, 10, 16, 4);   ctx.fill();

  // Icing
  ctx.fillStyle = '#fff';
  // Smile
  ctx.beginPath(); ctx.arc(0, -22, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  // Eyes
  ctx.beginPath(); ctx.arc(-5, -26, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 5, -26, 1.7, 0, Math.PI * 2); ctx.fill();
  // Buttons
  [ -2, 6 ].forEach((yy) => {
    ctx.beginPath(); ctx.arc(0, yy, 2, 0, Math.PI * 2); ctx.fill();
  });

  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, current, total, tickXs = [], thresholds = []) {
  // Track
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  // Fill
  const pct = Math.max(0, Math.min(1, total === 0 ? 0 : current / total));
  const fillW = Math.max(h, Math.round(w * pct));
  roundRect(ctx, x, y, fillW, h, h / 2);
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#2ad67b');
  grad.addColorStop(1, '#20b35b');
  ctx.fillStyle = grad;
  ctx.fill();

  // Ticks (per-card XP)
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  tickXs.forEach(tx => {
    ctx.beginPath();
    ctx.moveTo(tx, y - 6);
    ctx.lineTo(tx, y + h + 6);
    ctx.stroke();
  });

  // Label
  const nextTierTotal = thresholds.find((threshold) => current < threshold) ?? total;
  ctx.font = 'bold 22px Sans';
  ctx.fillStyle = '#2ad67b';
  ctx.textAlign = 'center';
  ctx.fillText(`${current} / ${nextTierTotal}`, x + w / 2, y - 12);
  ctx.textAlign = 'left';
}

function drawCard(ctx, x, y, card, themeAccent = '#d01e2e') {
  // Shadowed card
  dropShadow(ctx, () => {
    roundRect(ctx, x, y, CARD_W, CARD_H, 20);
    // Subtle vertical gradient
    const g = ctx.createLinearGradient(0, y, 0, y + CARD_H);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(240,246,248,0.95)');
    ctx.fillStyle = g;
    ctx.fill();
  });

  // Number badge
  const badgeR = 20;
  const bx = x + 18, by = y + 18;
  ctx.beginPath(); ctx.arc(bx + badgeR, by + badgeR, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = themeAccent; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(String(card.num), bx + badgeR, by + badgeR + 7);

  // XP requirement (under number)
  ctx.fillStyle = '#9aa4aa';
  ctx.font = 'bold 16px Sans';
  ctx.textAlign = 'left';
  ctx.fillText(`${card.xpReq} XP`, x + 18, y + 70);

  // Item list container
  const boxW = CARD_W - 36;
  const boxH = 110;
  const boxX = x + 18;
  const boxY = y + 86;
  roundRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#c6d1d8';
  ctx.stroke();
  ctx.setLineDash([]);

  // Placeholder icon (snowflake-ish star)
  ctx.save();
  ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#9fb3bf';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 22);
    ctx.stroke();
  }
  ctx.restore();

  // Rewards list
  const rewards = Array.isArray(card.rewards) && card.rewards.length > 0
    ? card.rewards
    : [{ label: card.name, amount: card.amount }];

  const labelX = boxX + 20;
  const amountX = boxX + boxW - 20;
  const lineHeight = 26;
  const startY = boxY + 36;

  rewards.forEach((reward, index) => {
    const lineY = startY + index * lineHeight;
    if (lineY > boxY + boxH - 8) {
      return;
    }

    ctx.font = 'bold 18px Sans';
    ctx.fillStyle = '#1f2a33';
    ctx.textAlign = 'left';
    ctx.fillText(`• ${reward.label}`, labelX, lineY);

    if (reward.amount) {
      ctx.font = '16px Sans';
      ctx.fillStyle = '#5b6b76';
      ctx.textAlign = 'right';
      ctx.fillText(String(reward.amount), amountX, lineY);
    }
  });

  ctx.textAlign = 'left';
}

function drawTitle(ctx) {
  // Ribbon title
  const title = 'Holiday Battle Pass';
  const sub = 'Seasonal Track • 1 Row • 5 Cards';

  // Ribbon
  const rx = MARGIN, ry = 18, rw = BP_WIDTH - MARGIN * 2, rh = 56;
  dropShadow(ctx, () => {
    roundRect(ctx, rx, ry, rw, rh, 14);
    const g = ctx.createLinearGradient(rx, ry, rx + rw, ry);
    g.addColorStop(0, '#0f6a3f');
    g.addColorStop(1, '#0c5132');
    ctx.fillStyle = g;
    ctx.fill();
  }, { blur: 10, color: 'rgba(0,0,0,0.35)', offsetY: 4 });

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Sans';
  ctx.textAlign = 'left';
  ctx.fillText(title, rx + 18, ry + 36);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '16px Sans';
  ctx.textAlign = 'right';
  ctx.fillText(sub, rx + rw - 18, ry + 36);
}

function drawBackground(ctx) {
  // Night sky greenish gradient
  const bg = ctx.createLinearGradient(0, 0, 0, BP_HEIGHT);
  bg.addColorStop(0, '#0b2e20');
  bg.addColorStop(0.5, '#0f3d2a');
  bg.addColorStop(1, '#12402a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BP_WIDTH, BP_HEIGHT);

  drawCandyCaneBorder(ctx);

  // Soft vignette
  const vignette = ctx.createRadialGradient(BP_WIDTH/2, BP_HEIGHT/2, Math.min(BP_WIDTH, BP_HEIGHT)/6, BP_WIDTH/2, BP_HEIGHT/2, BP_WIDTH/1.1);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, BP_WIDTH, BP_HEIGHT);

  // Snow drift ground
  ctx.fillStyle = '#eaf5ff';
  roundRect(ctx, -10, BP_HEIGHT - 80, BP_WIDTH + 20, 120, 40);
  ctx.fill();

  // Ornaments
  drawSnowman(ctx, BP_WIDTH - 90, BP_HEIGHT - 90, 1.2);
  drawGingerbread(ctx, 80, BP_HEIGHT - 90, 1.2);

  // Snowflakes overlay
  drawSnowOverlay(ctx, 180);
}

function layoutTickPositions(items, x, w) {
  // returns x positions along the progress bar for each item threshold
  const total = items.reduce((a, b) => a + b.xpReq, 0);
  let acc = 0;
  const ticks = [];
  const thresholds = [];
  for (let i = 0; i < items.length; i++) {
    acc += items[i].xpReq;
    const pct = total === 0 ? 0 : acc / total;
    ticks.push(x + Math.round(w * pct));
    thresholds.push(acc);
  }
  return { ticks, thresholds, totalXP: total };
}

async function renderBattlePass(items = DEMO_ITEMS, currentXP = CURRENT_XP) {
  const canvas = createCanvas(BP_WIDTH, BP_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);
  drawTitle(ctx);

  // Cards row area
  const rowY = 100;
  let x = MARGIN;
  for (let i = 0; i < items.length; i++) {
    drawCard(ctx, x, rowY, items[i]);
    x += CARD_W + CARD_GAP;
  }

  // Progress bar with ticks
  const pbX = MARGIN;
  const pbW = BP_WIDTH - MARGIN * 2;
  const pbY = rowY + CARD_H + 40;
  const pbH = 22;

  const { ticks, thresholds, totalXP } = layoutTickPositions(items, pbX, pbW);
  drawProgressBar(ctx, pbX, pbY, pbW, pbH, currentXP, totalXP, ticks, thresholds);

  return canvas.toBuffer('image/png');
}

// ====== DISCORD COMMAND ======
module.exports = {
  data: new SlashCommandBuilder()
    .setName('battle-pass')
    .setDescription('Send a Christmas-themed battle pass image (1 row, 5 cards).'),
  async execute(interaction) {
    await interaction.deferReply(); // in case canvas takes a moment

    // You can pull items/progress from DB; for now we use demo content:
    const buffer = await renderBattlePass(DEMO_ITEMS, CURRENT_XP);

    const file = new AttachmentBuilder(buffer, { name: 'battle-pass.png' });
    await interaction.editReply({ files: [file] });
  },
};

module.exports.renderBattlePass = renderBattlePass;
