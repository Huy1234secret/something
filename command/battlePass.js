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

const BATTLE_PASS_IMAGE_WIDTH = 900;
const BATTLE_PASS_IMAGE_HEIGHT = 520;
const BATTLE_PASS_SUMMARY_IMAGE_NAME = 'battle-pass.png';

const REWARD_IMAGE_WIDTH = 1000;
const REWARD_IMAGE_HEIGHT = 780;
const REWARD_IMAGE_MARGIN = 40;
const REWARD_CARD_HEIGHT = 100;
const REWARD_CARD_GAP = 16;

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

function rewardLabelForImage(reward) {
  if (reward.type === 'coins') {
    return `${formatNumber(reward.amount)} Coins`;
  }
  if (reward.type === 'diamonds') {
    return `${formatNumber(reward.amount)} Diamonds`;
  }
  if (reward.type === 'deluxeCoins') {
    return `${formatNumber(reward.amount)} Deluxe Coins`;
  }
  if (reward.type === 'snowflakes') {
    return `${formatNumber(reward.amount)} Snowflakes`;
  }
  if (reward.name && /Gift Card/.test(reward.name)) {
    return reward.name;
  }
  const qty = reward.amount > 1 ? `x${formatNumber(reward.amount)} ` : '';
  return `${qty}${reward.name}`.trim();
}

function rewardEmojiForImage(reward) {
  if (reward.emoji) return reward.emoji;
  if (reward.type === 'coins') return COIN_EMOJI;
  if (reward.type === 'diamonds') return DIAMOND_EMOJI;
  if (reward.type === 'deluxeCoins') return DELUXE_COIN_EMOJI;
  if (reward.type === 'snowflakes') return SNOWFLAKE_EMOJI;
  if (reward.name && /Gift Card/i.test(reward.name)) return '🎁';
  if (reward.type === 'special' && reward.name) return '🎁';
  return '⭐';
}

function drawRoundedRect(ctx, x, y, w, h, radius = 18) {
  const r = Math.min(radius, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanel(ctx, x, y, w, h, { fill = 'rgba(17, 31, 43, 0.8)', stroke = 'rgba(255,255,255,0.08)' } = {}) {
  drawRoundedRect(ctx, x, y, w, h, 26);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawProgressBarImage(ctx, x, y, w, h, progress, total) {
  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();
  const pct = total <= 0 ? 1 : clamp(progress / total, 0, 1);
  const fillWidth = Math.max(h, Math.round(w * pct));
  drawRoundedRect(ctx, x, y, fillWidth, h, h / 2);
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#2ad67b');
  grad.addColorStop(1, '#20b35b');
  ctx.fillStyle = grad;
  ctx.fill();
}

function formatLevelRange(start, end) {
  return start === end ? `Level ${start}` : `Levels ${start}-${end}`;
}

function renderBattlePassSummaryImage(state) {
  const canvas = createCanvas(BATTLE_PASS_IMAGE_WIDTH, BATTLE_PASS_IMAGE_HEIGHT);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, BATTLE_PASS_IMAGE_HEIGHT);
  gradient.addColorStop(0, '#06141f');
  gradient.addColorStop(1, '#0e2a3b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BATTLE_PASS_IMAGE_WIDTH, BATTLE_PASS_IMAGE_HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < BATTLE_PASS_IMAGE_WIDTH; i += 40) {
    ctx.fillRect(i, 0, 2, BATTLE_PASS_IMAGE_HEIGHT);
  }

  ctx.font = '700 36px "Noto Sans", "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('Christmas Battle Pass', 40, 60);

  const rewards = getBattlePassRewards();
  const currentLevel = Math.min(state.currentLevel || 1, TOTAL_LEVELS);
  const totalPoints = clamp(state.currentPoints || 0, 0, TOTAL_POINTS_REQUIRED);
  const totalLine = `${formatNumber(totalPoints)} / ${formatNumber(TOTAL_POINTS_REQUIRED)} pts`;

  const summaryBox = { x: 40, y: 80, w: BATTLE_PASS_IMAGE_WIDTH - 80, h: 150 };
  drawPanel(ctx, summaryBox.x, summaryBox.y, summaryBox.w, summaryBox.h, {
    fill: 'rgba(10, 24, 34, 0.82)',
  });

  ctx.fillStyle = '#b7c9d6';
  ctx.font = '600 20px "Noto Sans", "Segoe UI", sans-serif';
  ctx.fillText(`Level ${currentLevel}`, summaryBox.x + 24, summaryBox.y + 46);
  ctx.fillText(`Total Progress: ${totalLine}`, summaryBox.x + 24, summaryBox.y + 80);

  if (currentLevel >= TOTAL_LEVELS) {
    ctx.fillStyle = '#2ad67b';
    ctx.font = '600 22px "Noto Sans", "Segoe UI", sans-serif';
    ctx.fillText('All rewards unlocked!', summaryBox.x + 24, summaryBox.y + 120);
  } else {
    const prevThreshold = pointsForLevel(currentLevel - 1);
    const nextThreshold = pointsForLevel(currentLevel);
    const progress = totalPoints - prevThreshold;
    const needed = nextThreshold - prevThreshold;
    const barX = summaryBox.x + 24;
    const barY = summaryBox.y + summaryBox.h - 50;
    const barW = summaryBox.w - 48;
    const barH = 26;
    drawProgressBarImage(ctx, barX, barY, barW, barH, progress, needed);
    ctx.fillStyle = '#dff8e8';
    ctx.font = '600 18px "Noto Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${formatNumber(progress)} / ${formatNumber(needed)} pts to next level`, barX + barW / 2, barY - 12);
    ctx.textAlign = 'left';
  }

  const upcomingStart = Math.max(0, currentLevel - 1);
  const upcoming = rewards.slice(upcomingStart, upcomingStart + 5);
  const pageStart = state.rewardPage * REWARD_PAGE_SIZE;
  const pageRewards = rewards.slice(pageStart, pageStart + REWARD_PAGE_SIZE);
  const pageStartLevel = pageRewards[0]?.level ?? pageStart + 1;
  const pageEndLevel = pageRewards[pageRewards.length - 1]?.level ?? Math.min(pageStartLevel + REWARD_PAGE_SIZE - 1, TOTAL_LEVELS);

  const upcomingBox = { x: 40, y: summaryBox.y + summaryBox.h + 24, w: (BATTLE_PASS_IMAGE_WIDTH - 120) / 2, h: 220 };
  const pageBox = { x: upcomingBox.x + upcomingBox.w + 40, y: upcomingBox.y, w: upcomingBox.w, h: upcomingBox.h };

  drawPanel(ctx, upcomingBox.x, upcomingBox.y, upcomingBox.w, upcomingBox.h);
  drawPanel(ctx, pageBox.x, pageBox.y, pageBox.w, pageBox.h);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 24px "Noto Sans", "Segoe UI", sans-serif';
  ctx.fillText('Upcoming Rewards', upcomingBox.x + 24, upcomingBox.y + 40);
  ctx.fillText(formatLevelRange(pageStartLevel, pageEndLevel), pageBox.x + 24, pageBox.y + 40);

  ctx.font = '500 18px "Noto Sans", "Segoe UI", sans-serif';
  ctx.fillStyle = '#d9e4ec';
  const upcomingLineHeight = 32;
  upcoming.forEach((reward, index) => {
    const textY = upcomingBox.y + 80 + index * upcomingLineHeight;
    ctx.fillText(`Lv. ${reward.level}`, upcomingBox.x + 24, textY);
    ctx.fillStyle = '#8fb9d4';
    ctx.font = '400 16px "Noto Sans", "Segoe UI", sans-serif';
    ctx.fillText(rewardLabelForImage(reward), upcomingBox.x + 120, textY);
    ctx.font = '500 18px "Noto Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#d9e4ec';
  });
  if (upcoming.length === 0) {
    ctx.font = '500 18px "Noto Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#8fb9d4';
    ctx.fillText('All rewards claimed', upcomingBox.x + 24, upcomingBox.y + 96);
  }

  const pageLineHeight = 32;
  pageRewards.forEach((reward, index) => {
    const textY = pageBox.y + 80 + index * pageLineHeight;
    ctx.fillText(`Lv. ${reward.level}`, pageBox.x + 24, textY);
    ctx.fillStyle = '#8fb9d4';
    ctx.font = '400 16px "Noto Sans", "Segoe UI", sans-serif';
    ctx.fillText(rewardLabelForImage(reward), pageBox.x + 120, textY);
    ctx.font = '500 18px "Noto Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#d9e4ec';
  });
  if (pageRewards.length === 0) {
    ctx.font = '500 18px "Noto Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#8fb9d4';
    ctx.fillText('No rewards on this page', pageBox.x + 24, pageBox.y + 96);
  }

  return canvas.toBuffer('image/png');
}

function drawRewardListCard(ctx, x, y, w, h, reward) {
  drawPanel(ctx, x, y, w, h, { fill: 'rgba(10, 24, 34, 0.82)' });

  const centerY = y + h / 2;
  const badgeRadius = 34;
  const badgeX = x + 60;

  ctx.beginPath();
  ctx.arc(badgeX, centerY, badgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#d01e2e';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px "Noto Sans", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(reward.level), badgeX, centerY + 9);

  const iconBoxSize = 72;
  const iconX = x + 120;
  const iconY = centerY - iconBoxSize / 2;
  drawPanel(ctx, iconX, iconY, iconBoxSize, iconBoxSize, { fill: 'rgba(255,255,255,0.06)' });

  const iconEmoji = rewardEmojiForImage(reward);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 48px "Noto Sans", "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(iconEmoji, iconX + iconBoxSize / 2, centerY + 2);

  const textX = iconX + iconBoxSize + 32;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 26px "Noto Sans", "Segoe UI", sans-serif';
  ctx.fillText(`Level ${reward.level}`, textX, centerY - 6);

  ctx.fillStyle = '#8fb9d4';
  ctx.font = '500 22px "Noto Sans", "Segoe UI", sans-serif';
  ctx.fillText(rewardLabelForImage(reward), textX, centerY + 30);
}

function renderBattlePassRewardPage(rewards, pageIndex, totalPages) {
  const canvas = createCanvas(REWARD_IMAGE_WIDTH, REWARD_IMAGE_HEIGHT);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, REWARD_IMAGE_HEIGHT);
  gradient.addColorStop(0, '#06141f');
  gradient.addColorStop(1, '#0e2a3b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, REWARD_IMAGE_WIDTH, REWARD_IMAGE_HEIGHT);

  const startLevel = rewards[0]?.level ?? pageIndex * REWARD_PAGE_SIZE + 1;
  const endLevel = rewards[rewards.length - 1]?.level ?? startLevel + rewards.length - 1;

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 38px "Noto Sans", "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Christmas Battle Pass Rewards', REWARD_IMAGE_MARGIN, 70);

  ctx.font = '600 24px "Noto Sans", "Segoe UI", sans-serif';
  ctx.fillStyle = '#b7c9d6';
  ctx.fillText(formatLevelRange(startLevel, endLevel), REWARD_IMAGE_MARGIN, 112);

  ctx.textAlign = 'right';
  ctx.fillText(`Page ${pageIndex + 1} / ${totalPages}`, REWARD_IMAGE_WIDTH - REWARD_IMAGE_MARGIN, 112);
  ctx.textAlign = 'left';

  const listStartY = 150;
  const cardWidth = REWARD_IMAGE_WIDTH - REWARD_IMAGE_MARGIN * 2;

  rewards.forEach((reward, index) => {
    const y = listStartY + index * (REWARD_CARD_HEIGHT + REWARD_CARD_GAP);
    drawRewardListCard(ctx, REWARD_IMAGE_MARGIN, y, cardWidth, REWARD_CARD_HEIGHT, reward);
  });

  return canvas.toBuffer('image/png');
}

function renderBattlePassRewardImage(pageIndex) {
  const rewards = getBattlePassRewards();
  if (rewards.length === 0) return null;
  const totalPages = Math.ceil(rewards.length / REWARD_PAGE_SIZE);
  const safeIndex = clamp(pageIndex, 0, Math.max(0, totalPages - 1));
  const slice = rewards.slice(
    safeIndex * REWARD_PAGE_SIZE,
    safeIndex * REWARD_PAGE_SIZE + REWARD_PAGE_SIZE,
  );
  const buffer = renderBattlePassRewardPage(slice, safeIndex, totalPages);
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

    const rewardImage = renderBattlePassRewardImage(state.rewardPage);
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
