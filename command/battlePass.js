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
const { loadEmojiImage } = require('../imageCache');

const TOTAL_LEVELS = 100;
const MIN_POINTS_PER_LEVEL = 100;
const MAX_POINTS_PER_LEVEL = 10000;

const LEVEL_POINT_DATA = buildLevelPointData();
const POINTS_REQUIRED_PER_LEVEL = LEVEL_POINT_DATA.perLevel;
const LEVEL_POINT_THRESHOLDS = LEVEL_POINT_DATA.thresholds;
const TOTAL_POINTS_REQUIRED = LEVEL_POINT_DATA.total;

function buildLevelPointData() {
  const perLevel = [0];
  const thresholds = [0];
  let total = 0;
  const step = TOTAL_LEVELS > 1
    ? (MAX_POINTS_PER_LEVEL - MIN_POINTS_PER_LEVEL) / (TOTAL_LEVELS - 1)
    : 0;
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    let requirement = MIN_POINTS_PER_LEVEL + step * (level - 1);
    if (level === TOTAL_LEVELS) {
      requirement = MAX_POINTS_PER_LEVEL;
    }
    const roundedRequirement = Math.round(requirement);
    perLevel[level] = roundedRequirement;
    total += roundedRequirement;
    thresholds[level] = total;
  }
  return { perLevel, thresholds, total };
}

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
const WHEAT_SEED_EMOJI = '<:ITWheatseed:1410241406206873753>';
const POTATO_SEED_EMOJI = '<:ITPotatoseed:1413869045429571614>';
const WHITE_CABBAGE_SEED_EMOJI = '<:ITWhiteCabbageSeedPackage:1424391380980994058>';
const PUMPKIN_SEED_EMOJI = '<:ITPumpkinSeedPackage:1424684470396518430>';
const MELON_SEED_EMOJI = '<:ITMelonSeedPackage:1424684458531098655>';
const VERDANT_LURE_EMOJI = '<:ITVerdantLure:1423868583896944771>';
const SUNPRIDE_LURE_EMOJI = '<:ITSunprideLure:1423868570529431713>';
const MARSHLIGHT_LURE_EMOJI = '<:ITMarshlightLure:1423868599860465786>';
const SNOWGLASS_LURE_EMOJI = '<:ITSnowglassLure:1423868557057458266>';
const XP_SODA_EMOJI = '<:ITXPSoda:1414252478257561701>';
const COIN_POTION_EMOJI = '<:ITCoinPotion:1426940279533076480>';
const LUCKY_POTION_EMOJI = '<:ITLuckyPotion:1426940297694150697>';
const ULTRA_LUCKY_POTION_EMOJI = '<:ITUltraLuckyPotion:1426940321643892927>';
const BULLET_BOX_EMOJI = '<:ITBulletbox:1410481932629971014>';
const ANIMAL_DETECTOR_EMOJI = '<:ITAnimalDetector:1423678926215188700>';
const BOLT_CUTTER_EMOJI = '<:ITBoltCutter:1426940456306212915>';
const WATERING_CAN_EMOJI = '<:ITWateringcan:1410243468634099723>';
const DIAMOND_BAG_EMOJI = '<:ITDiamondbag:1409940957700292669>';
const ROBBER_BAG_EMOJI = '<:ITRobberBag:1426940417206915184>';

const BATTLE_PASS_IMAGE_WIDTH = 1400;
const BATTLE_PASS_IMAGE_HEIGHT = 420;
const SUMMARY_MARGIN = 24;
const SUMMARY_CARD_COUNT = 5;
const SUMMARY_CARD_GAP = 18;
const SUMMARY_CARD_WIDTH = Math.floor(
  (BATTLE_PASS_IMAGE_WIDTH - SUMMARY_MARGIN * 2 - SUMMARY_CARD_GAP * (SUMMARY_CARD_COUNT - 1)) /
    SUMMARY_CARD_COUNT,
);
const SUMMARY_CARD_HEIGHT = 260;
const BATTLE_PASS_SUMMARY_IMAGE_NAME = 'battle-pass.png';

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
const BATTLE_PASS_COMMAND_MENTION = '</battle-pass:1425004266749427775>';

const ANNOUNCEMENT_COLOR = 0x00ffff;
const COUNTDOWN_COLOR = 0xffffff;
const ANNOUNCEMENT_POLL_INTERVAL_MS = 5 * 60 * 1000;
const COUNTDOWN_WINDOW_MS = 1000 * 60 * 60 * 24 * 180;

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
  { level: 1, type: 'snowflakes', amount: 100 },
  { level: 2, type: 'item', name: 'Cookie', amount: 3, emoji: COOKIE_EMOJI },
  { level: 3, type: 'coins', amount: 10000 },
  { level: 4, type: 'item', name: 'Wheat seed package', amount: 3, emoji: WHEAT_SEED_EMOJI },
  { level: 5, type: 'item', name: 'Cup of Milk', amount: 1, emoji: MILK_EMOJI },
  { level: 6, type: 'diamonds', amount: 25 },
  { level: 7, type: 'item', name: 'Candy Cane', amount: 1, emoji: CANDY_CANE_EMOJI },
  { level: 8, type: 'item', name: 'Gingerbread Man', amount: 1, emoji: GINGERBREAD_EMOJI },
  { level: 9, type: 'coins', amount: 20000 },
  { level: 10, type: 'snowflakes', amount: 550 },
  { level: 11, type: 'item', name: 'Bullet box', amount: 2, emoji: BULLET_BOX_EMOJI },
  { level: 12, type: 'item', name: 'Cookie', amount: 5, emoji: COOKIE_EMOJI },
  { level: 13, type: 'item', name: 'Cup of Milk', amount: 2, emoji: MILK_EMOJI },
  { level: 14, type: 'coins', amount: 35000 },
  { level: 15, type: 'deluxeCoins', amount: 10 },
  { level: 16, type: 'item', name: 'Candy Cane', amount: 3, emoji: CANDY_CANE_EMOJI },
  { level: 17, type: 'diamonds', amount: 50 },
  { level: 18, type: 'item', name: 'Potato seed package', amount: 3, emoji: POTATO_SEED_EMOJI },
  { level: 19, type: 'item', name: 'Gingerbread Man', amount: 3, emoji: GINGERBREAD_EMOJI },
  { level: 20, type: 'snowflakes', amount: 1000 },
  { level: 21, type: 'item', name: 'Coin Potion', amount: 1, emoji: COIN_POTION_EMOJI },
  { level: 22, type: 'item', name: 'Cookie', amount: 10, emoji: COOKIE_EMOJI },
  { level: 23, type: 'coins', amount: 77000 },
  { level: 24, type: 'diamonds', amount: 100 },
  { level: 25, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 26, type: 'item', name: 'Cookie', amount: 10, emoji: COOKIE_EMOJI },
  { level: 27, type: 'item', name: 'Cup of Milk', amount: 5, emoji: MILK_EMOJI },
  { level: 28, type: 'item', name: 'Candy Cane', amount: 5, emoji: CANDY_CANE_EMOJI },
  { level: 29, type: 'item', name: 'Gingerbread Man', amount: 4, emoji: GINGERBREAD_EMOJI },
  { level: 30, type: 'snowflakes', amount: 1500 },
  { level: 31, type: 'item', name: 'Christmas Battle Pass Gift', amount: 1, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 32, type: 'item', name: 'White Cabbage seed package', amount: 2, emoji: WHITE_CABBAGE_SEED_EMOJI },
  { level: 33, type: 'item', name: 'Verdant Lures', amount: 10, emoji: VERDANT_LURE_EMOJI },
  { level: 34, type: 'item', name: 'Gingerbread Man', amount: 5, emoji: GINGERBREAD_EMOJI },
  { level: 35, type: 'item', name: 'Cookie', amount: 12, emoji: COOKIE_EMOJI },
  { level: 36, type: 'item', name: 'Snow Ball', amount: 9, emoji: SNOWBALL_EMOJI },
  { level: 37, type: 'item', name: 'XP Soda', amount: 1, emoji: XP_SODA_EMOJI },
  { level: 38, type: 'item', name: 'Coin Potion', amount: 1, emoji: COIN_POTION_EMOJI },
  { level: 39, type: 'item', name: 'Cookie', amount: 15, emoji: COOKIE_EMOJI },
  { level: 40, type: 'snowflakes', amount: 2000 },
  { level: 41, type: 'item', name: 'Cup of Milk', amount: 10, emoji: MILK_EMOJI },
  { level: 42, type: 'item', name: 'Candy Cane', amount: 8, emoji: CANDY_CANE_EMOJI },
  { level: 43, type: 'coins', amount: 150000 },
  { level: 44, type: 'diamonds', amount: 250 },
  { level: 45, type: 'item', name: 'Cookie', amount: 15, emoji: COOKIE_EMOJI },
  { level: 46, type: 'item', name: 'Gingerbread Man', amount: 7, emoji: GINGERBREAD_EMOJI },
  { level: 47, type: 'item', name: 'Lucky Potion', amount: 1, emoji: LUCKY_POTION_EMOJI },
  { level: 48, type: 'item', name: 'Snowglass Lures', amount: 10, emoji: SNOWGLASS_LURE_EMOJI },
  { level: 49, type: 'item', name: 'Christmas Battle Pass Gift', amount: 2, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 50, type: 'item', name: 'Good List', amount: 1, emoji: GOOD_LIST_EMOJI },
  { level: 51, type: 'item', name: 'Pumpkin seed package', amount: 2, emoji: PUMPKIN_SEED_EMOJI },
  { level: 52, type: 'item', name: 'Candy Cane', amount: 10, emoji: CANDY_CANE_EMOJI },
  { level: 53, type: 'item', name: 'Cup of Milk', amount: 12, emoji: MILK_EMOJI },
  { level: 54, type: 'diamonds', amount: 500 },
  { level: 55, type: 'deluxeCoins', amount: 50 },
  { level: 56, type: 'item', name: 'Coin Potion', amount: 2, emoji: COIN_POTION_EMOJI },
  { level: 57, type: 'item', name: 'Gingerbread Man', amount: 10, emoji: GINGERBREAD_EMOJI },
  { level: 58, type: 'item', name: 'Sunpride Lures', amount: 10, emoji: SUNPRIDE_LURE_EMOJI },
  { level: 59, type: 'item', name: 'Animal Detector', amount: 1, emoji: ANIMAL_DETECTOR_EMOJI },
  { level: 60, type: 'snowflakes', amount: 2000 },
  { level: 61, type: 'item', name: 'XP Soda', amount: 2, emoji: XP_SODA_EMOJI },
  { level: 62, type: 'item', name: 'Holly Jolly Rifle Tier 1', amount: 1, emoji: HOLLY_JOLLY_RIFLE_EMOJI },
  { level: 63, type: 'item', name: 'Bolt Cutter', amount: 2, emoji: BOLT_CUTTER_EMOJI },
  { level: 64, type: 'coins', amount: 300000 },
  { level: 65, type: 'item', name: 'Snow Ball', amount: 15, emoji: SNOWBALL_EMOJI },
  { level: 66, type: 'item', name: 'Cookie', amount: 15, emoji: COOKIE_EMOJI },
  { level: 67, type: 'item', name: 'Candy Cane', amount: 10, emoji: CANDY_CANE_EMOJI },
  { level: 68, type: 'item', name: 'Gingerbread Man', amount: 10, emoji: GINGERBREAD_EMOJI },
  { level: 69, type: 'item', name: 'Cup of Milk', amount: 10, emoji: MILK_EMOJI },
  { level: 70, type: 'snowflakes', amount: 2500 },
  { level: 71, type: 'diamonds', amount: 500 },
  { level: 72, type: 'deluxeCoins', amount: 50 },
  { level: 73, type: 'item', name: 'Holly Jolly Watering Can', amount: 1, emoji: HOLLY_JOLLY_WATERING_CAN_EMOJI },
  { level: 74, type: 'item', name: 'Lucky Potion', amount: 1, emoji: LUCKY_POTION_EMOJI },
  { level: 75, type: 'item', name: 'Good List', amount: 2, emoji: GOOD_LIST_EMOJI },
  { level: 76, type: 'item', name: 'Melon seed package', amount: 1, emoji: MELON_SEED_EMOJI },
  { level: 77, type: 'item', name: 'Watering Can', amount: 25, emoji: WATERING_CAN_EMOJI },
  { level: 78, type: 'item', name: 'Christmas Battle Pass Gift', amount: 3, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 79, type: 'item', name: 'Cookie', amount: 15, emoji: COOKIE_EMOJI },
  { level: 80, type: 'item', name: 'Holly Jolly Shovel', amount: 1, emoji: HOLLY_JOLLY_SHOVEL_EMOJI },
  { level: 81, type: 'item', name: 'Diamond Bag', amount: 1, emoji: DIAMOND_BAG_EMOJI },
  { level: 82, type: 'item', name: 'Bolt Cutter', amount: 5, emoji: BOLT_CUTTER_EMOJI },
  { level: 83, type: 'item', name: 'Marshlight Lures', amount: 10, emoji: MARSHLIGHT_LURE_EMOJI },
  { level: 84, type: 'coins', amount: 500000 },
  { level: 85, type: 'item', name: 'Elf Hat', amount: 1, emoji: ELF_HAT_EMOJI },
  { level: 86, type: 'item', name: 'Coin Potion', amount: 2, emoji: COIN_POTION_EMOJI },
  { level: 87, type: 'item', name: 'Lucky Potion', amount: 2, emoji: LUCKY_POTION_EMOJI },
  { level: 88, type: 'item', name: 'Gingerbread Man', amount: 10, emoji: GINGERBREAD_EMOJI },
  { level: 89, type: 'item', name: 'Snow Ball', amount: 20, emoji: SNOWBALL_EMOJI },
  { level: 90, type: 'item', name: 'Ultra Lucky Potion', amount: 1, emoji: ULTRA_LUCKY_POTION_EMOJI },
  { level: 91, type: 'item', name: 'Animal Detector', amount: 2, emoji: ANIMAL_DETECTOR_EMOJI },
  { level: 92, type: 'item', name: 'Cookie', amount: 30, emoji: COOKIE_EMOJI },
  { level: 93, type: 'item', name: 'Candy Cane', amount: 20, emoji: CANDY_CANE_EMOJI },
  { level: 94, type: 'item', name: 'Cup of Milk', amount: 15, emoji: MILK_EMOJI },
  { level: 95, type: 'item', name: 'Diamond Bag', amount: 1, emoji: DIAMOND_BAG_EMOJI },
  { level: 96, type: 'item', name: 'Robber Bag', amount: 3, emoji: ROBBER_BAG_EMOJI },
  { level: 97, type: 'item', name: 'Frostlight Garden', amount: 1, emoji: FROSTLIGHT_GARDEN_EMOJI },
  { level: 98, type: 'item', name: 'Christmas Battle Pass Gift', amount: 5, emoji: CHRISTMAS_BATTLE_PASS_GIFT_EMOJI },
  { level: 99, type: 'item', name: 'XP Soda', amount: 5, emoji: XP_SODA_EMOJI },
];

let resourcesRef = null;
let battlePassRewards = [];
const states = new Map();
let announcementWatcherStarted = false;
let announcementCheckRunning = false;
let announcementChannel = null;
let lastAnnouncementChannelFetchFailure = 0;

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

function getChristmasEventStartDate(year) {
  return new Date(Date.UTC(year, 11, 1, -7, 0, 0, 0));
}

function getChristmasEventEndDate(year) {
  return new Date(Date.UTC(year, 11, 31, 17, 0, 0, 0));
}

function getAnnouncementState() {
  const data = getBattlePassData();
  if (!data.announcements) {
    data.announcements = {
      startAnnouncementTimestamp: 0,
      countdownTargetTimestamp: 0,
      countdownMessageId: null,
    };
  }
  return data.announcements;
}

async function getAnnouncementChannel() {
  if (!resourcesRef?.client) return null;
  if (announcementChannel && typeof announcementChannel.send === 'function') {
    return announcementChannel;
  }

  const now = Date.now();
  if (now - lastAnnouncementChannelFetchFailure < ANNOUNCEMENT_POLL_INTERVAL_MS) {
    return null;
  }

  try {
    const channel = await resourcesRef.client.channels.fetch(BATTLE_PASS_ANNOUNCEMENT_CHANNEL_ID);
    if (channel && typeof channel.send === 'function') {
      announcementChannel = channel;
      lastAnnouncementChannelFetchFailure = 0;
      return announcementChannel;
    }
    if (!lastAnnouncementChannelFetchFailure) {
      console.warn('Battle pass announcement channel is not text-based.');
    }
  } catch (error) {
    if (!lastAnnouncementChannelFetchFailure) {
      console.warn('Failed to fetch battle pass announcement channel:', error.message);
    }
    lastAnnouncementChannelFetchFailure = now;
    return null;
  }

  lastAnnouncementChannelFetchFailure = now;
  return null;
}

async function sendChristmasStartAnnouncement(channel, year) {
  const endDate = getChristmasEventEndDate(year);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  const firstMessageLines = [
    '## 🎄Christmas Battle Pass has started! 🎄',
    "* Contain 100 tiers with 100 rewards. Especially at tier 100 there's a 30$ giftcard waiting for a person to claim.",
    '* In this battle pass we have 3 grand prizes: 30$, 20$ and 10$',
    '* You have in just 31 days to complete',
    `-# Begin the grind in ${BATTLE_PASS_COMMAND_MENTION}`,
  ];
  const secondMessageLines = [`* Battle pass ends <t:${endTimestamp}:R>`];

  const container = new ContainerBuilder()
    .setAccentColor(ANNOUNCEMENT_COLOR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(firstMessageLines.join('\n')))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(secondMessageLines.join('\n')));

  try {
    await channel.send({
      content: '@here',
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    return true;
  } catch (error) {
    console.warn('Failed to send Christmas battle pass start announcement:', error.message);
    announcementChannel = null;
  }

  return false;
}

async function sendChristmasCountdownAnnouncement(channel, year, startDate) {
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const lines = [
    `## 🎁 Christmas Battle Pass ${year} 🎁`,
    `* Start <t:${startTimestamp}:R>`,
    '-# with 3 grand prizes if you grind hard enough',
  ];

  const container = new ContainerBuilder()
    .setAccentColor(COUNTDOWN_COLOR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

  try {
    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    return true;
  } catch (error) {
    console.warn('Failed to send Christmas battle pass countdown announcement:', error.message);
    announcementChannel = null;
  }

  return false;
}

async function processBattlePassAnnouncements() {
  const channel = await getAnnouncementChannel();
  if (!channel) return;

  const now = new Date();
  const announcements = getAnnouncementState();
  const currentYear = now.getFullYear();
  const startThisYear = getChristmasEventStartDate(currentYear);
  let dirty = false;

  if (now >= startThisYear && announcements.startAnnouncementTimestamp < startThisYear.getTime()) {
    const sent = await sendChristmasStartAnnouncement(channel, currentYear);
    if (sent) {
      announcements.startAnnouncementTimestamp = startThisYear.getTime();
      dirty = true;
    }
  }

  if (
    now < startThisYear &&
    startThisYear.getTime() - now.getTime() <= COUNTDOWN_WINDOW_MS &&
    announcements.countdownTargetTimestamp < startThisYear.getTime()
  ) {
    const sent = await sendChristmasCountdownAnnouncement(channel, currentYear, startThisYear);
    if (sent) {
      announcements.countdownTargetTimestamp = startThisYear.getTime();
      dirty = true;
    }
  }

  if (now >= startThisYear) {
    const nextYear = currentYear + 1;
    const nextStart = getChristmasEventStartDate(nextYear);
    if (
      nextStart.getTime() - now.getTime() <= COUNTDOWN_WINDOW_MS &&
      announcements.countdownTargetTimestamp < nextStart.getTime()
    ) {
      const sent = await sendChristmasCountdownAnnouncement(channel, nextYear, nextStart);
      if (sent) {
        announcements.countdownTargetTimestamp = nextStart.getTime();
        dirty = true;
      }
    }
  }

  if (dirty && resourcesRef?.saveData) {
    resourcesRef.saveData();
  }
}

function startAnnouncementWatcher() {
  if (announcementWatcherStarted) return;
  announcementWatcherStarted = true;

  const run = async () => {
    if (announcementCheckRunning) return;
    announcementCheckRunning = true;
    try {
      await processBattlePassAnnouncements();
    } catch (error) {
      console.error('Failed to process battle pass announcements:', error);
    } finally {
      announcementCheckRunning = false;
    }
  };

  run();
  setInterval(run, ANNOUNCEMENT_POLL_INTERVAL_MS);
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

function pointsRequiredForLevel(level) {
  if (level <= 0) return 0;
  const cappedLevel = Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(level)));
  return POINTS_REQUIRED_PER_LEVEL[cappedLevel] ?? 0;
}

function pointsForLevel(level) {
  if (level <= 0) return 0;
  const cappedLevel = Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(level)));
  return LEVEL_POINT_THRESHOLDS[cappedLevel] ?? 0;
}

function levelForPoints(points) {
  if (!Number.isFinite(points) || points <= 0) return 1;
  const clampedPoints = Math.min(Math.floor(points), TOTAL_POINTS_REQUIRED);
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    if (clampedPoints < LEVEL_POINT_THRESHOLDS[level]) {
      return level;
    }
  }
  return TOTAL_LEVELS;
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

function drawAutoSizedText(
  ctx,
  text,
  {
    x,
    y,
    maxWidth,
    baseSize,
    minSize = 12,
    fontWeight = 'bold',
    fontFamily = 'Sans',
    fillStyle = '#1f2a33',
    textAlign = 'center',
  },
) {
  if (!text) return;
  let size = baseSize;
  while (size > minSize) {
    const font = `${fontWeight ? `${fontWeight} ` : ''}${size}px ${fontFamily}`;
    ctx.font = font;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  const font = `${fontWeight ? `${fontWeight} ` : ''}${Math.max(size, minSize)}px ${fontFamily}`;
  ctx.font = font;
  ctx.fillStyle = fillStyle;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
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
  const previous = {
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
  ctx.shadowBlur = previous.shadowBlur;
  ctx.shadowColor = previous.shadowColor;
  ctx.shadowOffsetX = previous.shadowOffsetX;
  ctx.shadowOffsetY = previous.shadowOffsetY;
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
  drawRoundedRect(ctx, -12, -16, 24, 32, 8);
  ctx.fill();
  drawRoundedRect(ctx, -26, -10, 14, 8, 4);
  ctx.fill();
  drawRoundedRect(ctx, 12, -10, 14, 8, 4);
  ctx.fill();
  drawRoundedRect(ctx, -12, 14, 10, 16, 4);
  ctx.fill();
  drawRoundedRect(ctx, 2, 14, 10, 16, 4);
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -22, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#fff';
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

function drawProgressBar(ctx, x, y, w, h, current, total, tickXs = [], label) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  const safeTotal = total > 0 ? total : 0;
  const pct = safeTotal > 0 ? clamp(current / safeTotal, 0, 1) : 0;
  if (safeTotal > 0 && pct > 0) {
    const fillW = Math.max(h, Math.round(w * pct));
    roundRect(ctx, x, y, fillW, h, h / 2);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#2ad67b');
    grad.addColorStop(1, '#20b35b');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  tickXs.forEach(tx => {
    ctx.beginPath();
    ctx.moveTo(tx, y - 6);
    ctx.lineTo(tx, y + h + 6);
    ctx.stroke();
  });

  const hasCustomLabel = label != null;
  const display =
    label ??
    `Progress: ${formatNumber(Math.round(Math.max(0, current)))} / ${formatNumber(Math.round(Math.max(0, total)))}`;
  ctx.font = 'bold 22px Sans';
  ctx.fillStyle = '#1fb668';
  ctx.textAlign = 'center';
  const suffix = hasCustomLabel ? '' : ' XP';
  ctx.fillText(`${display}${suffix}`, x + w / 2, y - 12);
  ctx.textAlign = 'left';
}

function drawCard(ctx, x, y, card, themeAccent = '#d01e2e') {
  dropShadow(ctx, () => {
    roundRect(ctx, x, y, SUMMARY_CARD_WIDTH, SUMMARY_CARD_HEIGHT, 20);
    const gradient = ctx.createLinearGradient(0, y, 0, y + SUMMARY_CARD_HEIGHT);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(1, 'rgba(240,246,248,0.95)');
    ctx.fillStyle = gradient;
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
  ctx.fillText(String(card.num), bx + badgeR, by + badgeR + 7);

  const xpText = card.xpText ?? `${formatNumber(card.xpReq ?? 0)} XP`;
  ctx.fillStyle = '#9aa4aa';
  ctx.font = 'bold 16px Sans';
  ctx.textAlign = 'left';
  ctx.fillText(xpText, x + 18, y + 70);

  const boxW = SUMMARY_CARD_WIDTH - 36;
  const boxH = 110;
  const boxX = x + 18;
  const boxY = y + 86;

  ctx.save();
  roundRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  if (!card.placeholder) {
    if (card.emojiImage) {
      const { width, height } = card.emojiImage;
      const maxW = boxW - 24;
      const maxH = boxH - 24;
      const scale = Math.min(maxW / width, maxH / height, 1);
      const drawW = width * scale;
      const drawH = height * scale;
      const drawX = boxX + (boxW - drawW) / 2;
      const drawY = boxY + (boxH - drawH) / 2;
      ctx.drawImage(card.emojiImage, drawX, drawY, drawW, drawH);
    } else if (card.emoji) {
      ctx.fillStyle = '#1f2a33';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let size = 68;
      const maxW = boxW - 24;
      const maxH = boxH - 24;
      while (size > 28) {
        const font = `600 ${size}px "Noto Sans", "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.font = font;
        const metrics = ctx.measureText(card.emoji);
        const textHeight =
          (metrics.actualBoundingBoxAscent || 0) + (metrics.actualBoundingBoxDescent || 0) || size;
        if (metrics.width <= maxW && textHeight <= maxH) {
          break;
        }
        size -= 4;
      }
      const font = `600 ${Math.max(size, 28)}px "Noto Sans", "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.font = font;
      ctx.fillText(card.emoji, boxX + boxW / 2, boxY + boxH / 2 + 4);
    } else {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = '#9fb3bf';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
        ctx.rotate((Math.PI / 3) * i);
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(0, 22);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#9fb3bf';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
      ctx.rotate((Math.PI / 3) * i);
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 22);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#c6d1d8';
  roundRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.stroke();
  ctx.setLineDash([]);

  const textX = x + SUMMARY_CARD_WIDTH / 2;
  const maxTextWidth = SUMMARY_CARD_WIDTH - 48;
  drawAutoSizedText(ctx, card.name, {
    x: textX,
    y: y + 220,
    maxWidth: maxTextWidth,
    baseSize: 20,
    fillStyle: '#1f2a33',
  });
  drawAutoSizedText(ctx, card.amount ?? '', {
    x: textX,
    y: y + 244,
    maxWidth: maxTextWidth,
    baseSize: 16,
    fontWeight: '600',
    fillStyle: '#5b6b76',
  });
}

function drawTitle(ctx, currentLevel, currentPoints, cards) {
  const rx = SUMMARY_MARGIN;
  const ry = 18;
  const rw = BATTLE_PASS_IMAGE_WIDTH - SUMMARY_MARGIN * 2;
  const rh = 56;
  dropShadow(
    ctx,
    () => {
      roundRect(ctx, rx, ry, rw, rh, 14);
      const grad = ctx.createLinearGradient(rx, ry, rx + rw, ry);
      grad.addColorStop(0, '#0f6a3f');
      grad.addColorStop(1, '#0c5132');
      ctx.fillStyle = grad;
      ctx.fill();
    },
    { blur: 10, color: 'rgba(0,0,0,0.35)', offsetY: 4 },
  );

  const first = cards[0]?.num ?? currentLevel;
  const last = cards[cards.length - 1]?.num ?? first;
  const rangeLabel = first === last ? `Rewards at Level ${first}` : `Rewards ${first}-${last}`;
  const subParts = [rangeLabel, `Level ${currentLevel}`, `${formatNumber(currentPoints)} XP Earned`];

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Sans';
  ctx.textAlign = 'left';
  ctx.fillText('Holiday Battle Pass', rx + 18, ry + 36);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '16px Sans';
  ctx.textAlign = 'right';
  ctx.fillText(subParts.join(' • '), rx + rw - 18, ry + 36);
}

function drawBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, BATTLE_PASS_IMAGE_HEIGHT);
  gradient.addColorStop(0, '#0b2e20');
  gradient.addColorStop(0.5, '#0f3d2a');
  gradient.addColorStop(1, '#12402a');
  ctx.fillStyle = gradient;
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

function layoutTickPositions(items, x, w) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.xpReq || 0), 0);
  if (total <= 0) return { ticks: [], totalXP: 0 };
  const ticks = [];
  let acc = 0;
  items.forEach(item => {
    acc += Math.max(0, item.xpReq || 0);
    ticks.push(x + Math.round((acc / total) * w));
  });
  return { ticks, totalXP: total };
}

function formatCardReward(reward) {
  if (!reward) {
    return { name: 'Stay Frosty!', amount: 'More soon…', placeholder: true };
  }
  const emoji = rewardEmojiForImage(reward);
  if (reward.type === 'coins') {
    return { name: 'Coins', amount: formatNumber(reward.amount || 0), emoji };
  }
  if (reward.type === 'diamonds') {
    return { name: 'Diamonds', amount: formatNumber(reward.amount || 0), emoji };
  }
  if (reward.type === 'deluxeCoins') {
    return { name: 'Deluxe Coins', amount: formatNumber(reward.amount || 0), emoji };
  }
  if (reward.type === 'snowflakes') {
    return { name: 'Snowflakes', amount: formatNumber(reward.amount || 0), emoji };
  }
  const baseName = reward.name || 'Reward';
  if (reward.amount != null) {
    return { name: baseName, amount: `x${formatNumber(reward.amount)}`, emoji };
  }
  return { name: baseName, amount: 'x1', emoji };
}

async function renderBattlePassSummaryImage(state) {
  const canvas = createCanvas(BATTLE_PASS_IMAGE_WIDTH, BATTLE_PASS_IMAGE_HEIGHT);
  const ctx = canvas.getContext('2d');

  const currentLevel = clamp(state.currentLevel || 1, 1, TOTAL_LEVELS);
  const currentPoints = clamp(state.currentPoints || 0, 0, TOTAL_POINTS_REQUIRED);
  const rewards = getBattlePassRewards();

  const totalPages = Math.ceil(rewards.length / SUMMARY_CARD_COUNT);
  const defaultPage = Math.min(
    Math.floor((currentLevel - 1) / SUMMARY_CARD_COUNT),
    Math.max(0, totalPages - 1),
  );
  const activePage = clamp(state.rewardPage ?? defaultPage, 0, Math.max(0, totalPages - 1));
  state.rewardPage = activePage;

  let startIndex = activePage * SUMMARY_CARD_COUNT;
  let upcomingRewards = rewards.slice(startIndex, startIndex + SUMMARY_CARD_COUNT);
  if (upcomingRewards.length === 0 && rewards.length > 0) {
    startIndex = Math.max(0, rewards.length - SUMMARY_CARD_COUNT);
    upcomingRewards = rewards.slice(startIndex, startIndex + SUMMARY_CARD_COUNT);
  }

  let cards = upcomingRewards.slice(0, SUMMARY_CARD_COUNT).map(reward => {
    const level = reward.level ?? 1;
    const prevThreshold = pointsForLevel(level - 1);
    const nextThreshold = pointsForLevel(level);
    const xpReq = Math.max(0, nextThreshold - prevThreshold);
    const details = formatCardReward(reward);
    return {
      num: level,
      xpReq,
      xpText: `Lv. ${level} • ${formatNumber(nextThreshold)} XP`,
      name: details.name,
      amount: details.amount,
      placeholder: details.placeholder,
      emoji: details.emoji,
    };
  });

  if (cards.length === 0) {
    cards = [
      {
        num: currentLevel,
        xpReq: pointsRequiredForLevel(currentLevel),
        xpText: `Lv. ${currentLevel}`,
        name: 'Stay Frosty!',
        amount: 'Rewards incoming',
        placeholder: true,
        emoji: null,
      },
    ];
  }

  await Promise.all(
    cards.map(async card => {
      if (!card.placeholder && card.emoji) {
        try {
          const image = await loadEmojiImage(card.emoji);
          if (image) {
            card.emojiImage = image;
          }
        } catch (error) {
          console.warn('Failed to load battle pass emoji:', error.message);
        }
      }
    }),
  );

  const firstLevel = cards[0].num;
  const lastLevel = cards[cards.length - 1].num;
  const prevThreshold = pointsForLevel(currentLevel - 1);
  const nextThreshold = pointsForLevel(currentLevel);
  const tierRequirement = Math.max(0, nextThreshold - prevThreshold);
  const tierProgress = tierRequirement > 0
    ? clamp(currentPoints - prevThreshold, 0, tierRequirement)
    : 0;

  drawBackground(ctx);
  drawTitle(ctx, currentLevel, currentPoints, cards);

  const rowY = 100;
  let cardX = SUMMARY_MARGIN;
  cards.forEach(card => {
    drawCard(ctx, cardX, rowY, card);
    cardX += SUMMARY_CARD_WIDTH + SUMMARY_CARD_GAP;
  });

  const pbX = SUMMARY_MARGIN;
  const pbW = BATTLE_PASS_IMAGE_WIDTH - SUMMARY_MARGIN * 2;
  const pbY = rowY + SUMMARY_CARD_HEIGHT + 40;
  const pbH = 22;

  const { ticks } = layoutTickPositions(cards, pbX, pbW);
  const hasTierRequirement = tierRequirement > 0;
  const label = hasTierRequirement
    ? `${formatNumber(tierProgress)} / ${formatNumber(tierRequirement)}`
    : 'Max Tier';
  const barTotal = hasTierRequirement ? tierRequirement : 1;
  const barProgress = hasTierRequirement ? tierProgress : barTotal;
  drawProgressBar(ctx, pbX, pbY, pbW, pbH, barProgress, barTotal, ticks, label);

  ctx.font = 'bold 18px Sans';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  ctx.fillText(
    firstLevel === lastLevel ? `Reward Preview • Level ${firstLevel}` : `Reward Preview • Levels ${firstLevel}-${lastLevel}`,
    pbX + pbW / 2,
    pbY + pbH + 36,
  );

  return canvas.toBuffer('image/png');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomProgress() {
  return 0;
}

function randomDecimalProgress() {
  return 0;
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

function makeQuestBuilder({
  getRequired,
  getPoints,
  buildDescription,
  formatter = questFormatterNumber,
  progressType = 'number',
}) {
  return () => {
    const required =
      typeof getRequired === 'function' ? getRequired() : getRequired;
    const points = typeof getPoints === 'function' ? getPoints(required) : getPoints;
    const progress =
      progressType === 'decimal'
        ? randomDecimalProgress(required)
        : randomProgress(required);
    return {
      description:
        typeof buildDescription === 'function'
          ? buildDescription(required)
          : buildDescription,
      required,
      progress,
      points,
      formatter,
    };
  };
}

function formatHoursValue(value) {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(2).replace(/\.0+$/, '').replace(/(\d)0+$/, '$1');
}

const QUEST_BUILDERS = {
  hourly: [
    makeQuestBuilder({
      getRequired: () => randomInt(20, 100),
      getPoints: () => randomInt(50, 250),
      buildDescription: required =>
        `Send ${formatNumber(required)} messages in the server`,
    }),
    makeQuestBuilder({
      getRequired: () => 0.25,
      getPoints: () => 250,
      buildDescription: required =>
        `Stay in voice for ${formatHoursValue(required)} hours straight`,
      formatter: questFormatterHours,
      progressType: 'decimal',
    }),
    makeQuestBuilder({
      getRequired: () => 0.5,
      getPoints: () => 250,
      buildDescription: required =>
        `Stay in voice for ${formatHoursValue(required)} total hours`,
      formatter: questFormatterHours,
      progressType: 'decimal',
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(4000, 10000),
      getPoints: () => randomInt(200, 500),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(2000, 4000),
      getPoints: () => randomInt(200, 400),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /beg`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(2000, 4000),
      getPoints: () => randomInt(200, 400),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /dig`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(2000, 4000),
      getPoints: () => randomInt(200, 400),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /hunt`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(300, 500),
      getPoints: () => randomInt(150, 250),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP in voice channel`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(200, 400),
      getPoints: () => randomInt(200, 400),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through chatting`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(100_000, 200_000),
      getPoints: () => randomInt(200, 400),
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins`,
    }),
    makeQuestBuilder({
      getRequired: () => 2000,
      getPoints: () => 200,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from /rob`,
    }),
    makeQuestBuilder({
      getRequired: () => 100_000,
      getPoints: () => 250,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from /beg`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(100_000, 200_000),
      getPoints: () => randomInt(200, 400),
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from selling animals`,
    }),
    makeQuestBuilder({
      getRequired: () => 12_000,
      getPoints: () => 240,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from selling artifacts (/dig)`,
    }),
    makeQuestBuilder({
      getRequired: () => 5000,
      getPoints: () => 250,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from chatting`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(30, 50),
      getPoints: () => randomInt(150, 250),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common Items`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(10, 20),
      getPoints: () => randomInt(200, 400),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare Items`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(1, 3),
      getPoints: () => randomInt(200, 600),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Epic Items`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(5, 10),
      getPoints: () => randomInt(250, 500),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(3, 5),
      getPoints: () => randomInt(300, 500),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(30, 50),
      getPoints: () => randomInt(300, 500),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(10, 20),
      getPoints: () => randomInt(300, 600),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(1, 3),
      getPoints: () => randomInt(200, 600),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Epic animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => 1,
      getPoints: () => 200,
      buildDescription: required =>
        `Rob ${formatNumber(required)} time`,
    }),
  ],
  daily: [
    makeQuestBuilder({
      getRequired: () => randomInt(200, 400),
      getPoints: () => randomInt(500, 1000),
      buildDescription: required =>
        `Send ${formatNumber(required)} messages in the server`,
    }),
    makeQuestBuilder({
      getRequired: () => 4,
      getPoints: () => 800,
      buildDescription: required =>
        `Stay in voice for ${formatHoursValue(required)} hours straight`,
      formatter: questFormatterHours,
      progressType: 'decimal',
    }),
    makeQuestBuilder({
      getRequired: () => 8,
      getPoints: () => 800,
      buildDescription: required =>
        `Stay in voice for ${formatHoursValue(required)} total hours`,
      formatter: questFormatterHours,
      progressType: 'decimal',
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(25_000, 50_000),
      getPoints: () => randomInt(1250, 2500),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => 5000,
      getPoints: () => 800,
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through voice chat`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(10_000, 20_000),
      getPoints: () => randomInt(1000, 2000),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /beg`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(10_000, 20_000),
      getPoints: () => randomInt(1000, 2000),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /dig`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(10_000, 20_000),
      getPoints: () => randomInt(1000, 2000),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /hunt`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(500, 1000),
      getPoints: () => randomInt(500, 1000),
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through chatting`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(1_000_000, 2_000_000),
      getPoints: () => randomInt(1000, 2000),
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins`,
    }),
    makeQuestBuilder({
      getRequired: () => 150_000,
      getPoints: () => 1500,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from /rob`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(300_000, 500_000),
      getPoints: () => randomInt(750, 1250),
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from /beg`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(500_000, 900_000),
      getPoints: () => randomInt(1000, 1800),
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from selling animals`,
    }),
    makeQuestBuilder({
      getRequired: () => 100_000,
      getPoints: () => 1000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from selling crops`,
    }),
    makeQuestBuilder({
      getRequired: () => 100_000,
      getPoints: () => 2000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from selling artifacts (/dig)`,
    }),
    makeQuestBuilder({
      getRequired: () => 20_000,
      getPoints: () => 2000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from chatting`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(200, 400),
      getPoints: () => randomInt(1000, 2000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common Items`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(50, 100),
      getPoints: () => randomInt(1000, 2000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare Items`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(10, 30),
      getPoints: () => randomInt(1000, 3000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Epic Items`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(3, 5),
      getPoints: () => randomInt(3000, 5000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Legendary Items`,
    }),
    makeQuestBuilder({
      getRequired: () => 1,
      getPoints: () => 5000,
      buildDescription: () => 'Collect 1 Mythical Item',
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(50, 100),
      getPoints: () => randomInt(2000, 4000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(10, 30),
      getPoints: () => randomInt(3000, 5000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(1, 5),
      getPoints: () => randomInt(4000, 6000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Epic Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => 1,
      getPoints: () => 8000,
      buildDescription: () => 'Collect 1 Legendary Item in /dig',
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(50, 100),
      getPoints: () => randomInt(1000, 2000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(25, 50),
      getPoints: () => randomInt(2500, 5000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(10, 25),
      getPoints: () => randomInt(3000, 7500),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Epic animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => randomInt(3, 9),
      getPoints: () => randomInt(3000, 9000),
      buildDescription: required =>
        `Collect ${formatNumber(required)} Legendary animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => 1,
      getPoints: () => 12_500,
      buildDescription: () => 'Collect 1 Mythical animal in /hunt',
    }),
    makeQuestBuilder({
      getRequired: () => 18,
      getPoints: () => 8400,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} crops in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 27,
      getPoints: () => 7000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} sheafs in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 12,
      getPoints: () => 10_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} potatoes in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 9,
      getPoints: () => 12_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} white cabbages in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 9,
      getPoints: () => 15_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} pumpkins in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 80,
      getPoints: () => 8000,
      buildDescription: required =>
        `Water ${formatNumber(required)} plots in farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 30,
      getPoints: () => 4000,
      buildDescription: required =>
        `Rob ${formatNumber(required)} times`,
    }),
    makeQuestBuilder({
      getRequired: () => 15,
      getPoints: () => 8000,
      buildDescription: required =>
        `Successfully rob ${formatNumber(required)} times`,
    }),
    makeQuestBuilder({
      getRequired: () => 25,
      getPoints: () => 6000,
      buildDescription: required =>
        `Fail robbing ${formatNumber(required)} times`,
    }),
    makeQuestBuilder({
      getRequired: () => 30,
      getPoints: () => 9000,
      buildDescription: required =>
        `Complete ${formatNumber(required)} Hourly quests`,
    }),
  ],
  weekly: [
    makeQuestBuilder({
      getRequired: () => 2000,
      getPoints: () => 20_000,
      buildDescription: required =>
        `Send ${formatNumber(required)} messages in the server`,
    }),
    makeQuestBuilder({
      getRequired: () => 24,
      getPoints: () => 24_000,
      buildDescription: required =>
        `Stay in voice for ${formatHoursValue(required)} hours straight`,
      formatter: questFormatterHours,
      progressType: 'decimal',
    }),
    makeQuestBuilder({
      getRequired: () => 72,
      getPoints: () => 36_000,
      buildDescription: required =>
        `Stay in voice for ${formatHoursValue(required)} total hours`,
      formatter: questFormatterHours,
      progressType: 'decimal',
    }),
    makeQuestBuilder({
      getRequired: () => 300_000,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => 35_000,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through voice chat`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => 60_000,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /beg`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => 60_000,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /dig`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => 60_000,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through /hunt`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => 10_000,
      getPoints: () => 20_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} Chat XP through chatting`,
      formatter: questFormatterXP,
    }),
    makeQuestBuilder({
      getRequired: () => 10_000_000,
      getPoints: () => 20_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins`,
    }),
    makeQuestBuilder({
      getRequired: () => 1_000_000,
      getPoints: () => 15_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from /rob`,
    }),
    makeQuestBuilder({
      getRequired: () => 2_500_000,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from /beg`,
    }),
    makeQuestBuilder({
      getRequired: () => 5_000_000,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from selling animals`,
    }),
    makeQuestBuilder({
      getRequired: () => 1_000_000,
      getPoints: () => 35_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from selling crops`,
    }),
    makeQuestBuilder({
      getRequired: () => 1_000_000,
      getPoints: () => 25_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from selling artifacts (/dig)`,
    }),
    makeQuestBuilder({
      getRequired: () => 200_000,
      getPoints: () => 40_000,
      buildDescription: required =>
        `Earn ${formatNumber(required)} coins from chatting`,
    }),
    makeQuestBuilder({
      getRequired: () => 1000,
      getPoints: () => 20_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common Items`,
    }),
    makeQuestBuilder({
      getRequired: () => 500,
      getPoints: () => 25_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare Items`,
    }),
    makeQuestBuilder({
      getRequired: () => 200,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Epic Items`,
    }),
    makeQuestBuilder({
      getRequired: () => 100,
      getPoints: () => 40_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Legendary Items`,
    }),
    makeQuestBuilder({
      getRequired: () => 40,
      getPoints: () => 60_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Mythical Items`,
    }),
    makeQuestBuilder({
      getRequired: () => 300,
      getPoints: () => 20_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => 150,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => 75,
      getPoints: () => 40_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Epic Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => 25,
      getPoints: () => 50_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Legendary Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => 10,
      getPoints: () => 60_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Mythical Items in /dig`,
    }),
    makeQuestBuilder({
      getRequired: () => 700,
      getPoints: () => 20_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Common animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => 400,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Rare animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => 200,
      getPoints: () => 40_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Epic animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => 100,
      getPoints: () => 50_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Legendary animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => 25,
      getPoints: () => 60_000,
      buildDescription: required =>
        `Collect ${formatNumber(required)} Mythical animals in /hunt`,
    }),
    makeQuestBuilder({
      getRequired: () => 200,
      getPoints: () => 40_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} crops in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 120,
      getPoints: () => 36_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} sheafs in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 50,
      getPoints: () => 50_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} potatoes in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 36,
      getPoints: () => 60_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} white cabbages in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 24,
      getPoints: () => 70_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} pumpkins in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 12,
      getPoints: () => 80_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} melons in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 9,
      getPoints: () => 100_000,
      buildDescription: required =>
        `Harvest ${formatNumber(required)} star fruits in Farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 250,
      getPoints: () => 25_000,
      buildDescription: required =>
        `Water ${formatNumber(required)} plots in farm`,
    }),
    makeQuestBuilder({
      getRequired: () => 200,
      getPoints: () => 20_000,
      buildDescription: required =>
        `Rob ${formatNumber(required)} times`,
    }),
    makeQuestBuilder({
      getRequired: () => 50,
      getPoints: () => 40_000,
      buildDescription: required =>
        `Successfully rob ${formatNumber(required)} times`,
    }),
    makeQuestBuilder({
      getRequired: () => 100,
      getPoints: () => 30_000,
      buildDescription: required =>
        `Fail robbing ${formatNumber(required)} times`,
    }),
    makeQuestBuilder({
      getRequired: () => 48,
      getPoints: () => 48_000,
      buildDescription: required =>
        `Complete ${formatNumber(required)} Hourly quests`,
    }),
    makeQuestBuilder({
      getRequired: () => 6,
      getPoints: () => 60_000,
      buildDescription: required =>
        `Complete ${formatNumber(required)} Daily quests`,
    }),
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
  const resetTime = getQuestResetTime(type);
  const timestamp = Math.floor(resetTime.getTime() / 1000);
  const countdown = Number.isFinite(timestamp) ? `<t:${timestamp}:R>` : 'soon';
  return `## ${QUEST_TYPES[type] || 'Quests'}\n* Quests reroll ${countdown}`;
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
  const activePage = clamp(state.rewardPage ?? 0, 0, Math.max(0, totalPages - 1));
  const select = new StringSelectMenuBuilder()
    .setCustomId('bp:page')
    .setPlaceholder('Level Range');
  for (let i = 0; i < totalPages; i++) {
    const startLevel = i * REWARD_PAGE_SIZE + 1;
    const endLevel = Math.min((i + 1) * REWARD_PAGE_SIZE, TOTAL_LEVELS);
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(`${startLevel} - ${endLevel}`)
      .setValue(String(i))
      .setDefault(i === activePage);
    select.addOptions(option);
  }
  state.rewardPage = activePage;
  return select;
}

async function buildBattlePassContainer(state) {
  await ensureRewardClaimed(state);
  const container = new ContainerBuilder().setAccentColor(0xd01e2e);
  const attachments = [];
  const gallery = new MediaGalleryBuilder();
  let hasMedia = false;
  try {
    const summaryBuffer = await renderBattlePassSummaryImage(state);
    const summaryName = BATTLE_PASS_SUMMARY_IMAGE_NAME;
    const summaryAttachment = new AttachmentBuilder(summaryBuffer, { name: summaryName });
    attachments.push(summaryAttachment);
    gallery.addItems(new MediaGalleryItemBuilder().setURL(`attachment://${summaryName}`));
    hasMedia = true;
  } catch (error) {
    console.warn('Failed to render battle pass image:', error.message);
  }

  if (hasMedia) {
    container.addMediaGalleryComponents(gallery);
    container.addSeparatorComponents(new SeparatorBuilder());
  }

  const rewardCount = getBattlePassRewards().length;
  if (rewardCount > 0) {
    const select = buildRewardPageSelect(state);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
    container.addSeparatorComponents(new SeparatorBuilder());
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
  const hasLevelFromStats = levelCandidates.length > 0;
  if (level == null && points != null) level = levelForPoints(points);
  if (points == null && level != null) points = pointsForLevel(level - 1);
  level = Number.isFinite(level) ? Math.floor(level) : 1;
  level = Math.max(1, Math.min(TOTAL_LEVELS, level));
  points = Number.isFinite(points) ? Math.floor(points) : pointsForLevel(level - 1);
  points = Math.max(0, Math.min(TOTAL_POINTS_REQUIRED, points));
  if (!hasLevelFromStats) {
    level = levelForPoints(points);
  }
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
  if (interaction.message) {
    const state = states.get(interaction.message.id);
    if (state) return state;
  }
  if (interaction.user) {
    for (const state of states.values()) {
      if (state.userId === interaction.user.id) return state;
    }
  }
  return null;
}

async function handleSlashCommand(interaction) {
  const privileged = isPrivilegedUser(interaction.user?.id);
  if (!isBattlePassActive() && !privileged) {
    await interaction.reply({
      content: 'The Christmas battle pass unlocks on December 1st at 00:00 (UTC+7). Please check back then!',
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
  const cost = QUEST_REROLL_COST[type] || 0;
  const statsMap = resourcesRef?.userStats;
  const userId = state.userId;
  const stats = statsMap?.[userId];
  const deluxeBalanceRaw = Number(stats?.deluxe_coins);
  const deluxeBalance = Number.isFinite(deluxeBalanceRaw) ? deluxeBalanceRaw : 0;
  if (deluxeBalance < cost) {
    const missing = cost - deluxeBalance;
    await interaction.update({
      content: `You need ${formatNumber(missing)} more Deluxe Coins ${REROLL_COST_EMOJI} to reroll the ${
        QUEST_TYPES[type]
      }.`,
      components: [],
    });
    return;
  }
  let mutableStats = stats;
  if (!mutableStats) {
    mutableStats = {};
    if (statsMap) {
      statsMap[userId] = mutableStats;
    }
  }
  mutableStats.deluxe_coins = deluxeBalance - cost;
  if (resourcesRef?.saveData) {
    resourcesRef.saveData();
  }
  state.quests[type] = generateQuests(type);
  if (state.activeQuestType === type) {
    state.view = 'quests';
  }
  await updateMainMessage(interaction.client, state);
  await interaction.update({
    content: `${QUEST_TYPES[type]} rerolled for ${formatNumber(cost)} Deluxe Coins ${REROLL_COST_EMOJI}!`,
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
  startAnnouncementWatcher();
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
