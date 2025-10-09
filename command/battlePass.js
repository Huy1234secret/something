const {
  SlashCommandBuilder,
  MessageFlags,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require('@discordjs/builders');
const { createCanvas } = require('canvas');
const { formatNumber } = require('../utils');
const { isChristmasEventActive } = require('../events');

const TOTAL_LEVELS = 100;
const POINTS_PER_LEVEL = 100;
const TOTAL_POINTS_REQUIRED = TOTAL_LEVELS * POINTS_PER_LEVEL;

const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
const DIAMOND_EMOJI = '<:CRDiamond:1405595593069432912>';
const DELUXE_COIN_EMOJI = '<:CRDeluxeCoin:1405595587780280382>';
const COOKIE_EMOJI = '<:ITCookie:1425137805616484403>';
const MILK_EMOJI = '<:ITCupofMilk:1425137379525525735>';
const CANDY_CANE_EMOJI = '<:ITCandyCane:1425138309893587088>';
const SNOWBALL_EMOJI = '<:ITSnowBall:1425138786123124858>';
const GINGERBREAD_EMOJI = '<:ITGingerbreadMan:1425135669025570826>';
const GOOD_LIST_EMOJI = '<:ITGoodList:1425139683947581492>';
const NAUGHTY_LIST_EMOJI = '<:ITNaughtyList:1425140373839155310>';
const HOLLY_JOLLY_RIFLE_EMOJI = '<:SKHollyJollyRifleTier1:1425339099119747183>';
const HOLLY_JOLLY_SHOVEL_EMOJI = '<:SKHollyJollyShovel:1425339068413116447>';
const HOLLY_JOLLY_WATERING_CAN_EMOJI = '<:SKHollyJollyWateringCan:1425340137084030986>';
const FROSTLIGHT_GARDEN_EMOJI = '<:SKFrostlightGarden:1425344951994159124>';
const SNOWFLAKE_EMOJI = '<:CRSnowflake:1425751780683153448>';
const ELF_HAT_EMOJI = '<:ITElfHat:1425752757112934440>';
const CHRISTMAS_BATTLE_PASS_GIFT_EMOJI = '<:ITChristmasBattlePassGift:1425752835261337690>';

const BATTLE_PASS_IMAGE_WIDTH = 1400;
const BATTLE_PASS_IMAGE_HEIGHT = 420;
const BATTLE_PASS_SUMMARY_IMAGE_NAME = 'battle-pass.png';

const TRACK_MARGIN = 24;
const TRACK_CARD_COUNT = 5;
const TRACK_CARD_GAP = 18;
const TRACK_CARD_WIDTH = Math.floor(
  (BATTLE_PASS_IMAGE_WIDTH - TRACK_MARGIN * 2 - TRACK_CARD_GAP * (TRACK_CARD_COUNT - 1)) /
    TRACK_CARD_COUNT,
);
const TRACK_CARD_HEIGHT = 260;

const QUEST_TYPES = {
  hourly: 'Hourly Quests',
  daily: 'Daily Quests',
  weekly: 'Weekly Quests',
};

const QUEST_REROLL_COST = {
  hourly: 10,
  daily: 240,
  weekly: 1680,
};

const REROLL_COST_EMOJI = DELUXE_COIN_EMOJI;

const REWARD_PAGE_SIZE = 5;

const SERVER_OWNER_USER_ID = '902736357766594611';
const BATTLE_PASS_ANNOUNCEMENT_CHANNEL_ID = '1372572234949853367';

const REWARD100_STAGES = [
  { key: '30', label: '$30 Gift Card', type: 'special', announcement: true },
  { key: '20', label: '$20 Gift Card', type: 'special', announcement: true },
  { key: '10', label: '$10 Gift Card', type: 'special', announcement: true },
  { key: 'deluxe', label: '1000 Deluxe Coins', type: 'deluxeCoins', amount: 1000, announcement: false },
];

const REWARD100_STAGE_TITLES = {
  '30': 'First Tier 100 Adventurer!',
  '20': 'Second Tier 100 Adventurer!',
  '10': 'Third Tier 100 Adventurer!',
};

const BASE_REWARDS = [
  { level: 1, type: 'coins', amount: 10000 },
  { level: 2, type: 'item', name: 'Cookie', amount: 3, emoji: COOKIE_EMOJI },
  { level: 3, type: 'diamonds', amount: 50 },
  { level: 4, type: 'item', name: 'Christmas Battle Pass Gift', amount: 1, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 5, type: 'item', name: 'Snow Ball', amount: 1, emoji: SNOWBALL_EMOJI },
  { level: 6, type: 'coins', amount: 15000 },
  { level: 7, type: 'item', name: 'Cup of Milk', amount: 1, emoji: MILK_EMOJI },
  { level: 8, type: 'item', name: 'Candy Cane', amount: 1, emoji: CANDY_CANE_EMOJI },
  { level: 9, type: 'diamonds', amount: 100 },
  { level: 10, type: 'item', name: 'Holly Jolly Rifle Tier 1', amount: 1, emoji: HOLLY_JOLLY_RIFLE_EMOJI },
  { level: 11, type: 'deluxeCoins', amount: 10 },
  { level: 12, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 13, type: 'coins', amount: 25000 },
  { level: 14, type: 'item', name: 'Cookie', amount: 4, emoji: COOKIE_EMOJI },
  { level: 15, type: 'item', name: 'Cup of Milk', amount: 2, emoji: MILK_EMOJI },
  { level: 16, type: 'snowflakes', amount: 1000 },
  { level: 17, type: 'diamonds', amount: 200 },
  { level: 18, type: 'item', name: 'Gingerbread Man', amount: 1, emoji: GINGERBREAD_EMOJI },
  { level: 19, type: 'item', name: 'Cookie', amount: 5, emoji: COOKIE_EMOJI },
  { level: 20, type: 'item', name: 'Gingerbread Man', amount: 2, emoji: GINGERBREAD_EMOJI },
  { level: 21, type: 'deluxeCoins', amount: 20 },
  { level: 22, type: 'item', name: 'Candy Cane', amount: 2, emoji: CANDY_CANE_EMOJI },
  { level: 23, type: 'item', name: 'Christmas Battle Pass Gift', amount: 2, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 24, type: 'coins', amount: 40000 },
  { level: 25, type: 'item', name: 'Cookie', amount: 6, emoji: COOKIE_EMOJI },
  { level: 26, type: 'diamonds', amount: 250 },
  { level: 27, type: 'snowflakes', amount: 2500 },
  { level: 28, type: 'item', name: 'Cup of Milk', amount: 2, emoji: MILK_EMOJI },
  { level: 29, type: 'item', name: 'Snow Ball', amount: 2, emoji: SNOWBALL_EMOJI },
  { level: 30, type: 'item', name: 'Holly Jolly Shovel', amount: 1, emoji: HOLLY_JOLLY_SHOVEL_EMOJI },
  { level: 31, type: 'deluxeCoins', amount: 40 },
  { level: 32, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 33, type: 'coins', amount: 70000 },
  { level: 34, type: 'diamonds', amount: 300 },
  { level: 35, type: 'item', name: 'Christmas Battle Pass Gift', amount: 2, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 36, type: 'item', name: 'Cup of Milk', amount: 3, emoji: MILK_EMOJI },
  { level: 37, type: 'coins', amount: 100000 },
  { level: 38, type: 'item', name: 'Cookie', amount: 9, emoji: COOKIE_EMOJI },
  { level: 39, type: 'item', name: 'Snow Ball', amount: 3, emoji: SNOWBALL_EMOJI },
  { level: 40, type: 'item', name: 'Gingerbread Man', amount: 1, emoji: GINGERBREAD_EMOJI },
  { level: 41, type: 'snowflakes', amount: 5000 },
  { level: 42, type: 'diamonds', amount: 350 },
  { level: 43, type: 'item', name: 'Candy Cane', amount: 3, emoji: CANDY_CANE_EMOJI },
  { level: 44, type: 'coins', amount: 175000 },
  { level: 45, type: 'deluxeCoins', amount: 50 },
  { level: 46, type: 'item', name: 'Christmas Battle Pass Gift', amount: 3, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 47, type: 'item', name: 'Cup of Milk', amount: 3, emoji: MILK_EMOJI },
  { level: 48, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 49, type: 'diamonds', amount: 400 },
  { level: 50, type: 'item', name: 'Holly Jolly Watering Can', amount: 1, emoji: HOLLY_JOLLY_WATERING_CAN_EMOJI },
  { level: 51, type: 'item', name: 'Cookie', amount: 15, emoji: COOKIE_EMOJI },
  { level: 52, type: 'item', name: 'Snow Ball', amount: 3, emoji: SNOWBALL_EMOJI },
  { level: 53, type: 'diamonds', amount: 450 },
  { level: 54, type: 'item', name: 'Candy Cane', amount: 4, emoji: CANDY_CANE_EMOJI },
  { level: 55, type: 'deluxeCoins', amount: 50 },
  { level: 56, type: 'snowflakes', amount: 10000 },
  { level: 57, type: 'item', name: 'Cup of Milk', amount: 4, emoji: MILK_EMOJI },
  { level: 58, type: 'item', name: 'Gingerbread Man', amount: 1, emoji: GINGERBREAD_EMOJI },
  { level: 59, type: 'diamonds', amount: 500 },
  { level: 60, type: 'item', name: 'Christmas Battle Pass Gift', amount: 3, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 61, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 62, type: 'coins', amount: 500000 },
  { level: 63, type: 'item', name: 'Cookie', amount: 10, emoji: COOKIE_EMOJI },
  { level: 64, type: 'item', name: 'Snow Ball', amount: 4, emoji: SNOWBALL_EMOJI },
  { level: 65, type: 'diamonds', amount: 550 },
  { level: 66, type: 'item', name: 'Cup of Milk', amount: 4, emoji: MILK_EMOJI },
  { level: 67, type: 'item', name: 'Candy Cane', amount: 4, emoji: CANDY_CANE_EMOJI },
  { level: 68, type: 'coins', amount: 700000 },
  { level: 69, type: 'deluxeCoins', amount: 50 },
  { level: 70, type: 'item', name: 'Christmas Battle Pass Gift', amount: 4, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 71, type: 'item', name: 'Cookie', amount: 20, emoji: COOKIE_EMOJI },
  { level: 72, type: 'diamonds', amount: 600 },
  { level: 73, type: 'item', name: 'Cup of Milk', amount: 5, emoji: MILK_EMOJI },
  { level: 74, type: 'snowflakes', amount: 15000 },
  { level: 75, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 76, type: 'item', name: 'Snow Ball', amount: 5, emoji: SNOWBALL_EMOJI },
  { level: 77, type: 'diamonds', amount: 650 },
  { level: 78, type: 'item', name: 'Candy Cane', amount: 5, emoji: CANDY_CANE_EMOJI },
  { level: 79, type: 'deluxeCoins', amount: 50 },
  { level: 80, type: 'item', name: 'Frostlight Garden', amount: 1, emoji: FROSTLIGHT_GARDEN_EMOJI },
  { level: 81, type: 'item', name: 'Gingerbread Man', amount: 2, emoji: GINGERBREAD_EMOJI },
  { level: 82, type: 'diamonds', amount: 700 },
  { level: 83, type: 'item', name: 'Cup of Milk', amount: 5, emoji: MILK_EMOJI },
  { level: 84, type: 'item', name: 'Christmas Battle Pass Gift', amount: 4, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 85, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 86, type: 'item', name: 'Candy Cane', amount: 6, emoji: CANDY_CANE_EMOJI },
  { level: 87, type: 'item', name: 'Snow Ball', amount: 6, emoji: SNOWBALL_EMOJI },
  { level: 88, type: 'snowflakes', amount: 25000 },
  { level: 89, type: 'diamonds', amount: 75 },
  { level: 90, type: 'item', name: 'Candy Cane', amount: 7, emoji: CANDY_CANE_EMOJI },
  { level: 91, type: 'deluxeCoins', amount: 50 },
  { level: 92, type: 'item', name: 'Cup of Milk', amount: 6, emoji: MILK_EMOJI },
  { level: 93, type: 'diamonds', amount: 800 },
  { level: 94, type: 'coins', amount: 1500000 },
  { level: 95, type: 'item', name: 'Christmas Battle Pass Gift', amount: 5, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 96, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 97, type: 'item', name: 'Elf Hat', amount: 1, emoji: ELF_HAT_EMOJI },
  { level: 98, type: 'item', name: 'Gingerbread Man', amount: 2, emoji: GINGERBREAD_EMOJI },
  { level: 99, type: 'diamonds', amount: 1000 },
];

let resourcesRef = null;
let battlePassRewards = [];
const states = new Map();

function getBattlePassData() {
  if (!resourcesRef || !resourcesRef.battlePassData) {
    return { reward100: { stage: 0, claims: [] } };
  }
  const data = resourcesRef.battlePassData;
  if (!data.reward100) data.reward100 = { stage: 0, claims: [] };
  if (!Array.isArray(data.reward100.claims)) data.reward100.claims = [];
  return data;
}

function getReward100Stage() {
  const data = getBattlePassData();
  const stage = Number(data.reward100?.stage);
  if (!Number.isInteger(stage)) return 0;
  return Math.min(Math.max(stage, 0), REWARD100_STAGES.length - 1);
}

function buildRewards() {
  const stageIndex = getReward100Stage();
  const rewards = BASE_REWARDS.slice();
  const stage = REWARD100_STAGES[Math.min(stageIndex, REWARD100_STAGES.length - 1)];
  if (stage.type === 'deluxeCoins') {
    rewards.push({ level: 100, type: 'deluxeCoins', amount: stage.amount });
  } else {
    rewards.push({ level: 100, type: 'item', name: stage.label, amount: 1 });
  }
  return rewards;
}

function refreshRewards() {
  battlePassRewards = buildRewards();
}

function getBattlePassRewards() {
  if (battlePassRewards.length === 0) refreshRewards();
  return battlePassRewards;
}

function createEmptyQuestSet() {
  return { hourly: [], daily: [], weekly: [] };
}

function hasClaimedLevel100Reward(userId) {
  const data = getBattlePassData();
  return data.reward100.claims.some(entry => entry && entry.userId === userId);
}

function getUserReward100Claim(userId) {
  const data = getBattlePassData();
  const entry = data.reward100.claims.find(record => record && record.userId === userId);
  if (!entry) return null;
  const stage = REWARD100_STAGES.find(stageInfo => stageInfo.key === entry.stage) || null;
  return { ...entry, stage };
}
function pointsForLevel(level) {
  if (level <= 0) return 0;
  return Math.min(TOTAL_POINTS_REQUIRED, level * POINTS_PER_LEVEL);
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
    const x = Math.random() * BATTLE_PASS_IMAGE_WIDTH;
    const y = Math.random() * BATTLE_PASS_IMAGE_HEIGHT;
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
  for (let x = 0; x < BATTLE_PASS_IMAGE_WIDTH; x += 28) {
    ctx.fillStyle = '#d01e2e';
    ctx.fillRect(x, 0, 20, stripeH);
    ctx.fillRect(x + 10, BATTLE_PASS_IMAGE_HEIGHT - stripeH, 20, stripeH);
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
  [-14, -3, 8].forEach((yy) => {
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
  [-2, 6].forEach((yy) => {
    ctx.beginPath();
    ctx.arc(0, yy, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, current, total, tickXs = []) {
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
  tickXs.forEach((tx) => {
    ctx.beginPath();
    ctx.moveTo(tx, y - 6);
    ctx.lineTo(tx, y + h + 6);
    ctx.stroke();
  });

  ctx.font = 'bold 22px Sans';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(
    `Progress: ${formatNumber(Math.round(current))} / ${formatNumber(Math.round(total))} XP`,
    x + w / 2,
    y - 12,
  );
  ctx.textAlign = 'left';
}

function drawCard(ctx, x, y, card, themeAccent = '#d01e2e') {
  dropShadow(ctx, () => {
    roundRect(ctx, x, y, TRACK_CARD_WIDTH, TRACK_CARD_HEIGHT, 20);
    const g = ctx.createLinearGradient(0, y, 0, y + TRACK_CARD_HEIGHT);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(240,246,248,0.95)');
    ctx.fillStyle = g;
    ctx.fill();
  });

  const badgeR = 20;
  const bx = x + 18;
  const by = y + 18;
  ctx.beginPath();
  ctx.arc(bx + badgeR, by + badgeR, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = themeAccent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(String(card.num ?? '—'), bx + badgeR, by + badgeR + 7);

  ctx.fillStyle = '#9aa4aa';
  ctx.font = 'bold 16px Sans';
  ctx.textAlign = 'left';
  const xpLabel = card.xpLabel ?? (card.xpReq != null ? `${formatNumber(card.xpReq)} XP` : '');
  if (xpLabel) {
    ctx.fillText(xpLabel, x + 18, y + 70);
  }

  const boxW = TRACK_CARD_WIDTH - 36;
  const boxH = 110;
  const boxX = x + 18;
  const boxY = y + 86;
  roundRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#c6d1d8';
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#9fb3bf';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 22);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (card.name) {
    ctx.fillStyle = '#1f2a33';
    ctx.font = 'bold 18px Sans';
    ctx.textAlign = 'center';
    ctx.fillText(card.name, x + TRACK_CARD_WIDTH / 2, y + 220);
  }
  if (card.amount) {
    ctx.fillStyle = '#5b6b76';
    ctx.font = '16px Sans';
    ctx.fillText(card.amount, x + TRACK_CARD_WIDTH / 2, y + 244);
  }
}

function drawTitle(ctx, title, subtitle) {
  const rx = TRACK_MARGIN;
  const ry = 18;
  const rw = BATTLE_PASS_IMAGE_WIDTH - TRACK_MARGIN * 2;
  const rh = 56;
  dropShadow(
    ctx,
    () => {
      roundRect(ctx, rx, ry, rw, rh, 14);
      const g = ctx.createLinearGradient(rx, ry, rx + rw, ry);
      g.addColorStop(0, '#0f6a3f');
      g.addColorStop(1, '#0c5132');
      ctx.fillStyle = g;
      ctx.fill();
    },
    { blur: 10, color: 'rgba(0,0,0,0.35)', offsetY: 4 },
  );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Sans';
  ctx.textAlign = 'left';
  ctx.fillText(title, rx + 18, ry + 36);

  if (subtitle) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '16px Sans';
    ctx.textAlign = 'right';
    ctx.fillText(subtitle, rx + rw - 18, ry + 36);
  }
}

function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, BATTLE_PASS_IMAGE_HEIGHT);
  bg.addColorStop(0, '#0b2e20');
  bg.addColorStop(0.5, '#0f3d2a');
  bg.addColorStop(1, '#12402a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BATTLE_PASS_IMAGE_WIDTH, BATTLE_PASS_IMAGE_HEIGHT);

  drawCandyCaneBorder(ctx);

  const vignette = ctx.createRadialGradient(
    BATTLE_PASS_IMAGE_WIDTH / 2,
    BATTLE_PASS_IMAGE_HEIGHT / 2,
    Math.min(BATTLE_PASS_IMAGE_WIDTH, BATTLE_PASS_IMAGE_HEIGHT) / 6,
    BATTLE_PASS_IMAGE_WIDTH / 2,
    BATTLE_PASS_IMAGE_HEIGHT / 2,
    BATTLE_PASS_IMAGE_WIDTH / 1.1,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, BATTLE_PASS_IMAGE_WIDTH, BATTLE_PASS_IMAGE_HEIGHT);

  ctx.fillStyle = '#eaf5ff';
  roundRect(ctx, -10, BATTLE_PASS_IMAGE_HEIGHT - 80, BATTLE_PASS_IMAGE_WIDTH + 20, 120, 40);
  ctx.fill();

  drawSnowman(ctx, BATTLE_PASS_IMAGE_WIDTH - 90, BATTLE_PASS_IMAGE_HEIGHT - 90, 1.2);
  drawGingerbread(ctx, 80, BATTLE_PASS_IMAGE_HEIGHT - 90, 1.2);

  drawSnowOverlay(ctx, 180);
}

function layoutTickPositions(thresholds, x, w, totalXP) {
  const safeTotal = totalXP > 0 ? totalXP : 1;
  const ticks = (thresholds || [])
    .map((value) => clamp(value / safeTotal, 0, 1))
    .map((pct) => x + Math.round(w * pct));
  return { ticks, totalXP: safeTotal };
}

function formatCardName(reward) {
  if (reward.type === 'coins') return 'Coins';
  if (reward.type === 'diamonds') return 'Diamonds';
  if (reward.type === 'deluxeCoins') return 'Deluxe Coins';
  if (reward.type === 'snowflakes') return 'Snowflakes';
  if (reward.name) return reward.name;
  return 'Reward';
}

function formatCardQuantity(reward) {
  if (reward.type === 'coins' || reward.type === 'diamonds' || reward.type === 'deluxeCoins' || reward.type === 'snowflakes') {
    return formatNumber(reward.amount || 0);
  }
  if (Number.isFinite(reward.amount) && reward.amount > 1) {
    return `x${formatNumber(reward.amount)}`;
  }
  if (Number.isFinite(reward.amount) && reward.amount === 1 && reward.name) {
    return 'x1';
  }
  return '';
}

function createCardFromReward(reward) {
  const xpTarget = pointsForLevel(reward.level);
  const quantity = formatCardQuantity(reward);
  const amount = quantity ? `Tier ${reward.level} • ${quantity}` : `Tier ${reward.level}`;
  return {
    num: reward.level,
    xpReq: xpTarget,
    name: formatCardName(reward),
    amount,
    placeholder: false,
  };
}

function createPlaceholderCard(label = 'All Rewards Claimed') {
  return {
    num: '—',
    xpReq: TOTAL_POINTS_REQUIRED,
    name: label,
    amount: '',
    placeholder: true,
  };
}

function ensureCardCount(cards) {
  const list = cards.slice(0, TRACK_CARD_COUNT);
  while (list.length < TRACK_CARD_COUNT) {
    list.push(createPlaceholderCard());
  }
  return list;
}

function renderCardTrackImage({ title, subtitle, cards, currentXP, totalXP, tickValues }) {
  const canvas = createCanvas(BATTLE_PASS_IMAGE_WIDTH, BATTLE_PASS_IMAGE_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);
  drawTitle(ctx, title, subtitle);

  const rowY = 100;
  let x = TRACK_MARGIN;
  const normalizedCards = ensureCardCount(cards);
  normalizedCards.forEach((card) => {
    drawCard(ctx, x, rowY, card);
    x += TRACK_CARD_WIDTH + TRACK_CARD_GAP;
  });

  const pbX = TRACK_MARGIN;
  const pbW = BATTLE_PASS_IMAGE_WIDTH - TRACK_MARGIN * 2;
  const pbY = rowY + TRACK_CARD_HEIGHT + 40;
  const pbH = 22;

  const { ticks, totalXP: safeTotal } = layoutTickPositions(tickValues, pbX, pbW, totalXP);
  drawProgressBar(ctx, pbX, pbY, pbW, pbH, currentXP, safeTotal, ticks);

  return canvas.toBuffer('image/png');
}

function formatLevelRange(start, end) {
  return start === end ? `Tier ${start}` : `Tiers ${start}-${end}`;
}

function renderBattlePassSummaryImage(state) {
  const rewards = getBattlePassRewards();
  const currentLevel = Math.min(state.currentLevel || 1, TOTAL_LEVELS);
  const currentPoints = clamp(state.currentPoints || 0, 0, TOTAL_POINTS_REQUIRED);

  const upcomingStart = Math.max(0, currentLevel - 1);
  const upcoming = rewards.slice(upcomingStart, upcomingStart + TRACK_CARD_COUNT);
  const cards = upcoming.map(createCardFromReward);

  if (cards.length === 0) {
    cards.push(createPlaceholderCard());
  }

  const subtitleParts = [`Tier ${currentLevel}`];
  subtitleParts.push(`${formatNumber(currentPoints)} / ${formatNumber(TOTAL_POINTS_REQUIRED)} XP`);
  if (currentLevel >= TOTAL_LEVELS && currentPoints >= TOTAL_POINTS_REQUIRED) {
    subtitleParts.push('Season Complete');
  }

  const tickValues = cards
    .filter((card) => !card.placeholder && Number.isFinite(card.xpReq))
    .map((card) => card.xpReq);

  return renderCardTrackImage({
    title: 'Christmas Battle Pass',
    subtitle: subtitleParts.join(' • '),
    cards,
    currentXP: currentPoints,
    totalXP: TOTAL_POINTS_REQUIRED,
    tickValues,
  });
}

function renderBattlePassRewardImage(pageIndex, currentXP) {
  const rewards = getBattlePassRewards();
  if (rewards.length === 0) return null;
  const totalPages = Math.ceil(rewards.length / REWARD_PAGE_SIZE);
  const safeIndex = clamp(pageIndex, 0, Math.max(0, totalPages - 1));
  const slice = rewards.slice(
    safeIndex * REWARD_PAGE_SIZE,
    safeIndex * REWARD_PAGE_SIZE + REWARD_PAGE_SIZE,
  );

  const cards = slice.map(createCardFromReward);
  if (cards.length === 0) {
    cards.push(createPlaceholderCard('No Rewards'));
  }

  const startLevel = slice[0]?.level ?? safeIndex * REWARD_PAGE_SIZE + 1;
  const endLevel = slice[slice.length - 1]?.level ?? Math.min(startLevel + REWARD_PAGE_SIZE - 1, TOTAL_LEVELS);

  const tickValues = cards
    .filter((card) => !card.placeholder && Number.isFinite(card.xpReq))
    .map((card) => card.xpReq);

  const buffer = renderCardTrackImage({
    title: 'Reward Preview',
    subtitle: formatLevelRange(startLevel, endLevel),
    cards,
    currentXP: clamp(currentXP || 0, 0, TOTAL_POINTS_REQUIRED),
    totalXP: TOTAL_POINTS_REQUIRED,
    tickValues,
  });

  const name = `battle-pass-rewards-${String(safeIndex + 1).padStart(2, '0')}.png`;
  return { buffer, name, totalPages, pageIndex: safeIndex };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function interpolateReward(value, minValue, maxValue, minReward, maxReward) {
  if (maxValue === minValue) return minReward;
  const ratio = (value - minValue) / (maxValue - minValue);
  return Math.round(minReward + ratio * (maxReward - minReward));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomProgress(required, allowCompletion = true) {
  if (allowCompletion && Math.random() < 0.25) return required;
  if (required <= 1) return allowCompletion ? 0 : 0;
  return clamp(randomInt(0, required - 1), 0, required);
}

function randomDecimalProgress(required, allowCompletion = true, precision = 1) {
  if (allowCompletion && Math.random() < 0.25) return required;
  const value = Math.random() * required;
  const factor = 10 ** precision;
  return Math.min(required, Math.round(value * factor) / factor);
}

function questFormatterNumber(value) {
  return formatNumber(Math.round(value));
}

function questFormatterHours(value) {
  return `${value.toFixed(1)}h`;
}

function questFormatterXP(value) {
  return `${formatNumber(Math.round(value))}`;
}
const QUEST_BUILDERS = {
  hourly: [
    () => {
      const required = randomInt(50, 150);
      const points = interpolateReward(required, 50, 150, 50, 150);
      const progress = randomProgress(required);
      return {
        description: `Send ${formatNumber(required)} messages in the server`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(20, 40);
      const points = interpolateReward(required, 20, 40, 50, 100);
      const progress = randomProgress(required);
      return {
        description: `Hunt / Dig / Beg ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(10, 20);
      const points = interpolateReward(required, 10, 20, 50, 100);
      const progress = randomProgress(required);
      return {
        description: `Successfully hunt / dig / beg ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(10, 20);
      const points = interpolateReward(required, 10, 20, 50, 100);
      const progress = randomProgress(required);
      return {
        description: `Fail hunting / digging / begging ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(1000, 10000);
      const points = interpolateReward(required, 1000, 10000, 10, 100);
      const progress = randomProgress(required);
      return {
        description: `Earn ${formatNumber(required)} coins for your wallet`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(3, 5);
      const points = interpolateReward(required, 3, 5, 30, 50);
      const progress = randomProgress(required);
      return {
        description: `Rob ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 1;
      const progress = randomProgress(required);
      return {
        description: 'Successfully rob once',
        required,
        progress,
        points: 100,
        formatter: questFormatterNumber,
      };
    },
  ],
  daily: [
    () => {
      const required = randomInt(200, 400);
      const points = interpolateReward(required, 200, 400, 200, 400);
      const progress = randomProgress(required);
      return {
        description: `Send ${formatNumber(required)} messages in the server`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(50, 100);
      const points = interpolateReward(required, 50, 100, 125, 250);
      const progress = randomProgress(required);
      return {
        description: `Hunt / Dig / Beg ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(30, 60);
      const points = interpolateReward(required, 30, 60, 150, 300);
      const progress = randomProgress(required);
      return {
        description: `Successfully hunt / dig / beg ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(30, 60);
      const points = interpolateReward(required, 30, 60, 150, 300);
      const progress = randomProgress(required);
      return {
        description: `Fail hunting / digging / begging ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(10000, 100000);
      const points = interpolateReward(required, 10000, 100000, 100, 1000);
      const progress = randomProgress(required);
      return {
        description: `Earn ${formatNumber(required)} coins for your wallet`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(10, 20);
      const points = interpolateReward(required, 10, 20, 100, 200);
      const progress = randomProgress(required);
      return {
        description: `Rob ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(2, 4);
      const points = interpolateReward(required, 2, 4, 200, 400);
      const progress = randomProgress(required);
      return {
        description: `Successfully rob ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(5, 10);
      const points = interpolateReward(required, 5, 10, 100, 200);
      const progress = randomProgress(required);
      return {
        description: `Fail robbing ${formatNumber(required)} times`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 1;
      const progress = randomProgress(required);
      return {
        description: 'Die from hunting once',
        required,
        progress,
        points: 1500,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 1;
      const progress = randomProgress(required);
      return {
        description: 'Die from robbing once',
        required,
        progress,
        points: 800,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(5000, 50000);
      const points = interpolateReward(required, 5000, 50000, 100, 1000);
      const progress = randomProgress(required);
      return {
        description: `Lose ${formatNumber(required)} coins from your wallet`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = Math.round((Math.random() * 6 + 2) * 10) / 10;
      const points = interpolateReward(required, 2, 8, 200, 800);
      const progress = randomDecimalProgress(required);
      return {
        description: `Stay in voice chat for ${required.toFixed(1)}h total`,
        required,
        progress,
        points,
        formatter: questFormatterHours,
      };
    },
    () => {
      const required = randomInt(10000, 50000);
      const points = interpolateReward(required, 10000, 50000, 100, 500);
      const progress = randomProgress(required);
      return {
        description: `Earn ${formatNumber(required)} chat XP`,
        required,
        progress,
        points,
        formatter: questFormatterXP,
      };
    },
    () => {
      const required = randomInt(20, 40);
      const points = interpolateReward(required, 20, 40, 400, 800);
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} sheafs`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(10, 20);
      const points = interpolateReward(required, 10, 20, 400, 800);
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} potatoes`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(4, 8);
      const points = interpolateReward(required, 4, 8, 400, 800);
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} white cabbages`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = randomInt(2, 4);
      const points = interpolateReward(required, 2, 4, 400, 800);
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} pumpkins`,
        required,
        progress,
        points,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 50;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} common animals`,
        required,
        progress,
        points: 100,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 35;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} rare animals`,
        required,
        progress,
        points: 200,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 25;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} epic animals`,
        required,
        progress,
        points: 400,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 10;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} legendary animals`,
        required,
        progress,
        points: 1000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 5;
      const progress = randomProgress(required);
      return {
        description: 'Dig up 5 items',
        required,
        progress,
        points: 500,
        formatter: questFormatterNumber,
      };
    },
  ],
  weekly: [
    () => {
      const required = 1000;
      const progress = randomProgress(required);
      return {
        description: `Send ${formatNumber(required)} messages in the server`,
        required,
        progress,
        points: 4000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 400;
      const progress = randomProgress(required);
      return {
        description: `Hunt / Dig / Beg ${formatNumber(required)} times`,
        required,
        progress,
        points: 8000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 200;
      const progress = randomProgress(required);
      return {
        description: `Successfully hunt / dig / beg ${formatNumber(required)} times`,
        required,
        progress,
        points: 15000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 200;
      const progress = randomProgress(required);
      return {
        description: `Fail hunting / digging / begging ${formatNumber(required)} times`,
        required,
        progress,
        points: 15000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 500000;
      const progress = randomProgress(required);
      return {
        description: `Earn ${formatNumber(required)} coins for your wallet`,
        required,
        progress,
        points: 10000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 200;
      const progress = randomProgress(required);
      return {
        description: `Rob ${formatNumber(required)} times`,
        required,
        progress,
        points: 5000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 50;
      const progress = randomProgress(required);
      return {
        description: `Successfully rob ${formatNumber(required)} times`,
        required,
        progress,
        points: 9000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 150;
      const progress = randomProgress(required);
      return {
        description: `Fail robbing ${formatNumber(required)} times`,
        required,
        progress,
        points: 5000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 20;
      const progress = randomProgress(required);
      return {
        description: 'Die from hunting 20 times',
        required,
        progress,
        points: 15000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 50;
      const progress = randomProgress(required);
      return {
        description: 'Die from robbing 50 times',
        required,
        progress,
        points: 15000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 100000;
      const progress = randomProgress(required);
      return {
        description: `Lose ${formatNumber(required)} coins from your wallet`,
        required,
        progress,
        points: 5000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 72;
      const progress = randomDecimalProgress(required);
      return {
        description: `Stay in voice chat for ${required.toFixed(1)}h total`,
        required,
        progress,
        points: 9000,
        formatter: questFormatterHours,
      };
    },
    () => {
      const required = 200000;
      const progress = randomProgress(required);
      return {
        description: 'Earn 200k chat XP',
        required,
        progress,
        points: 10000,
        formatter: questFormatterXP,
      };
    },
    () => {
      const required = 200;
      const progress = randomProgress(required);
      return {
        description: 'Harvest 200 sheafs',
        required,
        progress,
        points: 10000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 100;
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} potatoes`,
        required,
        progress,
        points: 12500,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 50;
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} white cabbages`,
        required,
        progress,
        points: 15000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 40;
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} pumpkins`,
        required,
        progress,
        points: 20000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 20;
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} melons`,
        required,
        progress,
        points: 30000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 10;
      const progress = randomProgress(required);
      return {
        description: `Harvest ${formatNumber(required)} star fruits`,
        required,
        progress,
        points: 50000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 300;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} common animals`,
        required,
        progress,
        points: 5000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 200;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} rare animals`,
        required,
        progress,
        points: 6000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 100;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} epic animals`,
        required,
        progress,
        points: 7500,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 50;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} legendary animals`,
        required,
        progress,
        points: 9000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 20;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} mythical animals`,
        required,
        progress,
        points: 14500,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 5;
      const progress = randomProgress(required);
      return {
        description: `Hunt ${formatNumber(required)} godly animals`,
        required,
        progress,
        points: 20000,
        formatter: questFormatterNumber,
      };
    },
    () => {
      const required = 100;
      const progress = randomProgress(required);
      return {
        description: 'Dig up 100 items',
        required,
        progress,
        points: 10000,
        formatter: questFormatterNumber,
      };
    },
  ],
};
function generateQuests(type) {
  const builders = QUEST_BUILDERS[type] || [];
  const available = builders.slice();
  const quests = [];
  while (quests.length < 3 && available.length > 0) {
    const index = randomInt(0, available.length - 1);
    const builder = available.splice(index, 1)[0];
    quests.push(builder());
  }
  return quests;
}

function generateAllQuests() {
  return {
    hourly: generateQuests('hourly'),
    daily: generateQuests('daily'),
    weekly: generateQuests('weekly'),
  };
}

function isBattlePassActive(now = new Date()) {
  return isChristmasEventActive(now);
}

function getQuestResetTime(type, now = new Date()) {
  const current = new Date(now);
  if (type === 'hourly') {
    const next = new Date(current);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next;
  }
  if (type === 'daily') {
    return new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1, 0, 0, 0, 0);
  }
  const startOfDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const day = startOfDay.getDay();
  const daysUntilSunday = (7 - day) % 7;
  const nextSunday = new Date(startOfDay);
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
  nextSunday.setHours(24, 0, 0, 0);
  if (nextSunday <= current) {
    nextSunday.setDate(nextSunday.getDate() + 7);
  }
  return nextSunday;
}

function formatCountdown(target) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const seconds = Math.floor(diff / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (hours === 0) parts.push(`${secs}s`);
  return `in ${parts.join(' ')}`;
}

function buildProgressBar(progress, total, size = 12) {
  if (total <= 0) return '[────────────]';
  const pct = clamp(progress / total, 0, 1);
  const filled = Math.round(pct * size);
  const bar = '█'.repeat(filled) + '░'.repeat(size - filled);
  return `[${bar}]`;
}

function formatQuestLine(quest) {
  const completed = quest.required > 0 && quest.progress >= quest.required;
  const status = completed ? `✅ ${quest.description}` : `${quest.description} ⬜`;
  const reward = `${formatNumber(quest.points)} Pts`;
  const progressBar = buildProgressBar(quest.progress, quest.required);
  const formatter = quest.formatter || questFormatterNumber;
  const progressValue = formatter(quest.progress);
  const requiredValue = formatter(quest.required);
  return `### ${status} - ${reward}\n${progressBar} ${progressValue} / ${requiredValue}`;
}

function formatQuestHeader(type) {
  return `## ${QUEST_TYPES[type] || 'Quests'}\n* Quests reroll ${formatCountdown(getQuestResetTime(type))}`;
}

function buildQuestContainer(state, type) {
  if (state.questsDisabled) {
    const container = new ContainerBuilder().setAccentColor(0xd01e2e);
    const lines = ['### Quests Disabled', 'You have reached Tier 100. Quests are no longer available.'];
    if (state.level100Claim?.stage?.label) {
      lines.push(`-# Reward claimed: ${state.level100Claim.stage.label}.`);
    }
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    const backButton = new ButtonBuilder()
      .setCustomId('bp:back')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(backButton));
    return container;
  }

  const container = new ContainerBuilder().setAccentColor(0xffffff);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(formatQuestHeader(type)));
  container.addSeparatorComponents(new SeparatorBuilder());

  const quests = state.quests[type] || [];
  quests.forEach((quest, index) => {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(formatQuestLine(quest)));
    if (index < quests.length - 1) {
      container.addSeparatorComponents(new SeparatorBuilder());
    }
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId('bp:questType')
    .setPlaceholder('Quest types');
  for (const [key, label] of Object.entries(QUEST_TYPES)) {
    select.addOptions(new StringSelectMenuOptionBuilder().setLabel(label).setValue(key));
  }

  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));

  const rerollButton = new ButtonBuilder()
    .setCustomId(`bp:reroll:${type}`)
    .setLabel('Reroll Quests')
    .setStyle(ButtonStyle.Primary);
  const backButton = new ButtonBuilder()
    .setCustomId('bp:back')
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents(new ActionRowBuilder().addComponents(rerollButton, backButton));
  return container;
}
function buildRewardPageSelect(state) {
  const rewards = getBattlePassRewards();
  const totalPages = Math.ceil(rewards.length / REWARD_PAGE_SIZE);
  const select = new StringSelectMenuBuilder()
    .setCustomId('bp:page')
    .setPlaceholder('Page');
  for (let i = 0; i < totalPages; i++) {
    const startIndex = i * REWARD_PAGE_SIZE;
    const slice = rewards.slice(startIndex, startIndex + REWARD_PAGE_SIZE);
    const startLevel = slice.length > 0 ? slice[0].level : startIndex + 1;
    const endLevel = slice.length > 0 ? slice[slice.length - 1].level : startLevel + REWARD_PAGE_SIZE - 1;
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${startLevel} - ${endLevel}`)
        .setValue(String(i))
        .setDefault(i === state.rewardPage),
    );
  }
  return select;
}

async function buildBattlePassContainer(state) {
  await ensureRewardClaimed(state);
  const rewards = getBattlePassRewards();
  const totalPages = Math.ceil(rewards.length / REWARD_PAGE_SIZE);
  state.rewardPage = clamp(state.rewardPage, 0, Math.max(0, totalPages - 1));
  const container = new ContainerBuilder().setAccentColor(0xd01e2e);
  const attachments = [];
  try {
    const summaryBuffer = renderBattlePassSummaryImage(state);
    const summaryName = BATTLE_PASS_SUMMARY_IMAGE_NAME;
    const summaryAttachment = new AttachmentBuilder(summaryBuffer, { name: summaryName });
    attachments.push(summaryAttachment);

    const rewardImage = renderBattlePassRewardImage(state.rewardPage, state.currentPoints);
    const gallery = new MediaGalleryBuilder();

    gallery.addItems(new MediaGalleryItemBuilder().setURL(`attachment://${summaryName}`));

    if (rewardImage) {
      const attachment = new AttachmentBuilder(rewardImage.buffer, { name: rewardImage.name });
      attachments.push(attachment);
      gallery.addItems(new MediaGalleryItemBuilder().setURL(`attachment://${rewardImage.name}`));
    }

    container.addMediaGalleryComponents(gallery);
    container.addSeparatorComponents(new SeparatorBuilder());
  } catch (error) {
    console.warn('Failed to render battle pass image:', error.message);
  }
  const rewardLines = ['### Level 100 Reward'];
  if (state.level100Claim?.stage) {
    rewardLines.push(`You claimed the ${state.level100Claim.stage.label}.`);
    if (state.rewardClaimNotice) {
      rewardLines.push(state.rewardClaimNotice);
    }
    if (
      state.nextRewardStage &&
      state.nextRewardStage.key !== state.level100Claim.stage.key
    ) {
      rewardLines.push(`-# The reward is now ${state.nextRewardStage.label}.`);
    }
  } else if (state.nextRewardStage) {
    rewardLines.push(`Reach level 100 to claim the ${state.nextRewardStage.label}.`);
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(rewardLines.join('\n')));
  container.addSeparatorComponents(new SeparatorBuilder());

  const rewardRow = new ActionRowBuilder().addComponents(buildRewardPageSelect(state));
  container.addActionRowComponents(rewardRow);

  const questButton = new ButtonBuilder()
    .setCustomId('bp:quests')
    .setLabel('Quests')
    .setStyle(ButtonStyle.Primary);
  container.addActionRowComponents(new ActionRowBuilder().addComponents(questButton));
  return { container, attachments };
}

function resolveBattlePassInfo(stats) {
  if (!stats) return { level: 1, points: 0 };
  const data = stats.battle_pass || {};
  const levelCandidates = [data.level, stats.battle_pass_level].map(Number).filter(Number.isFinite);
  const pointsCandidates = [data.points, data.totalPoints, stats.battle_pass_points]
    .map(Number)
    .filter(Number.isFinite);
  let level = levelCandidates.length ? levelCandidates[levelCandidates.length - 1] : null;
  let points = pointsCandidates.length ? pointsCandidates[pointsCandidates.length - 1] : null;
  if (level == null && points != null) level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  if (points == null && level != null) points = (level - 1) * POINTS_PER_LEVEL;
  level = Number.isFinite(level) ? Math.floor(level) : 1;
  level = Math.max(1, Math.min(TOTAL_LEVELS, level));
  points = Number.isFinite(points) ? Math.floor(points) : (level - 1) * POINTS_PER_LEVEL;
  points = Math.max(0, Math.min(TOTAL_POINTS_REQUIRED, points));
  return { level, points };
}

function createBattlePassState(userId) {
  const stats = resourcesRef?.userStats?.[userId];
  const info = resolveBattlePassInfo(stats);
  const rewards = getBattlePassRewards();
  const totalPages = Math.ceil(rewards.length / REWARD_PAGE_SIZE);
  const rewardPage = Math.min(
    Math.floor((info.level - 1) / REWARD_PAGE_SIZE),
    Math.max(0, totalPages - 1),
  );
  const questsDisabled = info.level >= TOTAL_LEVELS;
  const claimedReward = hasClaimedLevel100Reward(userId);
  return {
    userId,
    view: 'battle-pass',
    rewardPage: Math.max(0, rewardPage),
    activeQuestType: 'hourly',
    quests: questsDisabled ? createEmptyQuestSet() : generateAllQuests(),
    currentPoints: info.points,
    currentLevel: info.level,
    questsDisabled,
    level100Claim: claimedReward ? getUserReward100Claim(userId) : null,
  };
}

function buildRerollPrompt(type) {
  const label = QUEST_TYPES[type] || 'quests';
  const cost = QUEST_REROLL_COST[type] || 0;
  const content = `Are you sure you want to reroll the ${label}?\n-# Cost ${formatNumber(cost)} Deluxe Coins ${REROLL_COST_EMOJI}`;
  const yesButton = new ButtonBuilder()
    .setCustomId(`bp:confirm:${type}`)
    .setLabel('Yes')
    .setStyle(ButtonStyle.Success);
  const noButton = new ButtonBuilder()
    .setCustomId('bp:cancel')
    .setLabel('No')
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(yesButton, noButton);
  return { content, components: [row], flags: MessageFlags.Ephemeral };
}
async function renderState(state) {
  if (state.view === 'quests') {
    await ensureRewardClaimed(state);
    return {
      components: [buildQuestContainer(state, state.activeQuestType)],
      attachments: [],
    };
  }
  const { container, attachments } = await buildBattlePassContainer(state);
  const response = { components: [container] };
  if (attachments.length > 0) {
    response.files = attachments;
  } else {
    response.attachments = [];
  }
  return response;
}

async function updateMainMessage(client, state) {
  if (!state.channelId || !state.messageId) return;
  try {
    const channel = await client.channels.fetch(state.channelId);
    if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) return;
    const message = await channel.messages.fetch(state.messageId);
    const view = await renderState(state);
    await message.edit(view);
  } catch (err) {
    console.warn('Failed to update battle pass message:', err.message);
  }
}

function isPrivilegedUser(userId) {
  return userId === SERVER_OWNER_USER_ID;
}

function isOwner(interaction, state) {
  return (
    interaction.user &&
    (interaction.user.id === state.userId || isPrivilegedUser(interaction.user.id))
  );
}

function getStateFromInteraction(interaction) {
  if (!interaction.message) return null;
  return states.get(interaction.message.id) || null;
}

async function handleSlashCommand(interaction) {
  const privileged = isPrivilegedUser(interaction.user?.id);
  if (!isBattlePassActive() && !privileged) {
    await interaction.reply({
      content: 'The Christmas battle pass unlocks on December 1st at 00:00. Please check back then!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
  const state = createBattlePassState(interaction.user.id);
  const view = await renderState(state);
  const message = await interaction.editReply({ ...view, flags: MessageFlags.IsComponentsV2 });
  state.messageId = message.id;
  state.channelId = message.channelId;
  states.set(message.id, state);
}

async function handleQuestReroll(interaction, state, type) {
  if (state.questsDisabled) {
    await interaction.reply({
      content: 'Battle pass quests are disabled after reaching Tier 100.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (!QUEST_TYPES[type]) {
    await interaction.reply({
      content: 'Unknown quest type to reroll.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const prompt = buildRerollPrompt(type);
  await interaction.reply(prompt);
}

async function handleQuestConfirm(interaction, state, type) {
  if (state.questsDisabled) {
    await interaction.update({
      content: 'Battle pass quests are disabled after reaching Tier 100.',
      components: [],
    });
    return;
  }
  if (!QUEST_TYPES[type]) {
    await interaction.update({ content: 'Unknown quest type.', components: [] });
    return;
  }
  state.quests[type] = generateQuests(type);
  if (state.activeQuestType === type) {
    state.view = 'quests';
  }
  await updateMainMessage(interaction.client, state);
  await interaction.update({
    content: `${QUEST_TYPES[type]} rerolled!`,
    components: [],
  });
}

async function handleQuestCancel(interaction) {
  await interaction.update({ content: 'Reroll cancelled.', components: [] });
}

function claimReward100ForUser(userId) {
  const data = getBattlePassData();
  const stageIndex = getReward100Stage();
  const currentStage = REWARD100_STAGES[Math.min(stageIndex, REWARD100_STAGES.length - 1)];
  const stats = resourcesRef?.userStats?.[userId];
  const info = resolveBattlePassInfo(stats);
  if (!stats) {
    return { claimed: false, reason: 'noStats', nextStage: currentStage, info };
  }

  if (info.level < TOTAL_LEVELS) {
    return { claimed: false, reason: 'notEligible', nextStage: currentStage, info };
  }

  if (hasClaimedLevel100Reward(userId)) {
    const claim = getUserReward100Claim(userId);
    return {
      claimed: false,
      alreadyClaimed: true,
      claim,
      nextStage: currentStage,
      info,
    };
  }

  const stage = currentStage;
  const claimRecord = { userId, stage: stage.key, timestamp: Date.now() };
  data.reward100.claims.push(claimRecord);

  let message;
  if (stage.type === 'deluxeCoins') {
    stats.deluxe_coins = Number.isFinite(stats.deluxe_coins) ? stats.deluxe_coins : 0;
    stats.deluxe_coins += stage.amount;
    message = `You received ${formatNumber(stage.amount)} Deluxe Coins ${DELUXE_COIN_EMOJI}!`;
  } else {
    message = `You claimed the ${stage.label}! A staff member will contact you soon.`;
    data.reward100.stage = Math.min(stageIndex + 1, REWARD100_STAGES.length - 1);
  }

  resourcesRef.userStats[userId] = stats;
  refreshRewards();
  resourcesRef.saveData();

  const nextStage = REWARD100_STAGES[Math.min(getReward100Stage(), REWARD100_STAGES.length - 1)];

  return {
    claimed: true,
    stage,
    nextStage,
    message,
    info: resolveBattlePassInfo(stats),
    claim: { ...claimRecord, stage },
  };
}

async function sendRewardAnnouncement(userId, stage, nextStage) {
  if (!stage?.announcement) return;
  const client = resourcesRef?.client;
  if (!client) return;
  let channel;
  try {
    channel = await client.channels.fetch(BATTLE_PASS_ANNOUNCEMENT_CHANNEL_ID);
  } catch (error) {
    return;
  }
  if (!channel || typeof channel.send !== 'function') return;

  const title = REWARD100_STAGE_TITLES[stage.key] || 'Tier 100 Milestone!';
  const lines = [
    `### ${title}`,
    `<@${userId}> reached Tier 100 and claimed the ${stage.label}.`,
  ];
  if (nextStage && nextStage.key !== stage.key) {
    lines.push(`-# The reward is now ${nextStage.label}.`);
  }

  const container = new ContainerBuilder()
    .setAccentColor(0xd01e2e)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

async function ensureRewardClaimed(state) {
  if (state.rewardClaimEvaluated) return;
  state.rewardClaimEvaluated = true;

  const result = claimReward100ForUser(state.userId);
  if (result.claimed) {
    state.level100Claim = result.claim;
    state.rewardClaimNotice = result.message;
    state.nextRewardStage = result.nextStage;
    state.questsDisabled = true;
    state.quests = createEmptyQuestSet();
    state.currentLevel = result.info.level;
    state.currentPoints = result.info.points;

    const rewards = getBattlePassRewards();
    const totalPages = Math.ceil(rewards.length / REWARD_PAGE_SIZE);
    state.rewardPage = clamp(state.rewardPage, 0, Math.max(0, totalPages - 1));

    await sendRewardAnnouncement(state.userId, result.stage, result.nextStage);
  } else {
    state.level100Claim = getUserReward100Claim(state.userId);
    if (state.level100Claim) {
      state.questsDisabled = true;
      state.quests = createEmptyQuestSet();
      if (!state.rewardClaimNotice && state.level100Claim.stage) {
        if (
          state.level100Claim.stage.type === 'deluxeCoins' &&
          Number.isFinite(state.level100Claim.stage.amount)
        ) {
          state.rewardClaimNotice = `You received ${formatNumber(state.level100Claim.stage.amount)} Deluxe Coins ${DELUXE_COIN_EMOJI}!`;
        } else {
          state.rewardClaimNotice = `You claimed the ${state.level100Claim.stage.label}! A staff member will contact you soon.`;
        }
      }
    }
    state.nextRewardStage = result.nextStage;
  }

  if (!state.nextRewardStage) {
    const stageIndex = getReward100Stage();
    state.nextRewardStage = REWARD100_STAGES[Math.min(stageIndex, REWARD100_STAGES.length - 1)];
  }
}

function parseCustomId(id) {
  return id.split(':');
}

function setup(client, resources) {
  resourcesRef = resources;
  refreshRewards();
  const command = new SlashCommandBuilder()
    .setName('battle-pass')
    .setDescription('View the Christmas battle pass rewards and quests.');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'battle-pass') {
        await handleSlashCommand(interaction);
        return;
      }

      if (interaction.isButton()) {
        const state = getStateFromInteraction(interaction);
        if (!state) return;
        if (!isOwner(interaction, state)) {
          await interaction.reply({
            content: 'Only the original adventurer can use these battle pass controls.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const [root, action, extra] = parseCustomId(interaction.customId);
        if (root !== 'bp') return;

        if (!isBattlePassActive() && !isPrivilegedUser(interaction.user?.id)) {
          await interaction.reply({
            content: 'The Christmas battle pass is currently inactive.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (action === 'quests') {
          state.view = 'quests';
          if (!state.activeQuestType) state.activeQuestType = 'hourly';
          const view = await renderState(state);
          await interaction.update(view);
          return;
        }
        if (action === 'back') {
          state.view = 'battle-pass';
          const view = await renderState(state);
          await interaction.update(view);
          return;
        }
        if (action === 'reroll') {
          await handleQuestReroll(interaction, state, extra);
          return;
        }
        if (action === 'confirm') {
          await handleQuestConfirm(interaction, state, extra);
          return;
        }
        if (action === 'cancel') {
          await handleQuestCancel(interaction);
          return;
        }
      }

      if (interaction.isStringSelectMenu()) {
        const state = getStateFromInteraction(interaction);
        if (!state) return;
        if (!isOwner(interaction, state)) {
          await interaction.reply({
            content: 'Only the original adventurer can use these battle pass controls.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const [root, action] = parseCustomId(interaction.customId);
        if (root !== 'bp') return;
        if (!isBattlePassActive() && !isPrivilegedUser(interaction.user?.id)) {
          await interaction.reply({
            content: 'The Christmas battle pass is currently inactive.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (action === 'page') {
          const value = interaction.values[0];
          const page = Number(value);
          if (!Number.isNaN(page)) {
            const totalPages = Math.ceil(getBattlePassRewards().length / REWARD_PAGE_SIZE);
            state.rewardPage = clamp(page, 0, Math.max(0, totalPages - 1));
          }
          state.view = 'battle-pass';
          const view = await renderState(state);
          await interaction.update(view);
          return;
        }
        if (action === 'questType') {
          const value = interaction.values[0];
          if (QUEST_TYPES[value]) {
            state.activeQuestType = value;
          }
          state.view = 'quests';
          const view = await renderState(state);
          await interaction.update(view);
          return;
        }
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };
