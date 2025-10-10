const ABBREVIATIONS = [
  { value: 1e30, symbol: 'No' },
  { value: 1e27, symbol: 'Oc' },
  { value: 1e24, symbol: 'Sp' },
  { value: 1e21, symbol: 'Sx' },
  { value: 1e18, symbol: 'Qi' },
  { value: 1e15, symbol: 'Qa' },
  { value: 1e12, symbol: 'T' },
  { value: 1e9, symbol: 'B' },
  { value: 1e6, symbol: 'M' },
  { value: 1e3, symbol: 'K' },
];

function formatNumber(num) {
  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);
  for (const {
  value,
  symbol } of ABBREVIATIONS) {
    if (num >= value) {
      const formatted = (num / value).toFixed(2).replace(/\.0+$|0+$/,
  '');
      return `${sign}${formatted}${symbol}`;
    }
  }
  return `${sign}${num}`;
}

const PARSE_MAP = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
  Qa: 1e15,
  Qi: 1e18,
  Sx: 1e21,
  Sp: 1e24,
  Oc: 1e27,
  No: 1e30,
  };

const { ITEMS } = require('./items');
const {
  MessageFlags,
  ButtonStyle,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require('@discordjs/builders');

const DEFAULT_LUCK_RARITY_WEIGHTS = {
  Common: 0,
  Uncommon: 0.15,
  Rare: 0.25,
  Epic: 0.45,
  Legendary: 0.7,
  Mythical: 0.95,
  Godly: 1.15,
  Prismatic: 1.35,
  Secret: 1.6,
};

function parseAmount(str) {
  const match = String(str).trim().match(/^(-?\d+(?:\.\d+)?)([a-zA-Z]{1,2})?$/);
  if (!match) return NaN;
  let [, num, suf] = match;
  let value = parseFloat(num);
  if (isNaN(value)) return NaN;
  if (suf) {
    const normalized = suf.charAt(0).toUpperCase() + suf.slice(1).toLowerCase();
    const mult = PARSE_MAP[normalized];
    if (!mult) return NaN;
    value *= mult;
  }
  return Math.floor(value);
}

function normalizeInventory(stats) {
  if (!stats || !Array.isArray(stats.inventory)) {
    stats.inventory = [];
    return;
  }
  const map = {};
  const durable = [];
  for (const item of stats.inventory) {
    if (!item || !item.id) continue;
    const base = ITEMS[item.id] || {};
    const merged = { ...base, ...item };
    const id = merged.id;
    const amount = merged.amount || 0;
    if (typeof merged.durability === 'number') {
      for (let i = 0; i < amount; i++) durable.push({ ...merged, amount: 1 });
    } else if (!map[id]) map[id] = { ...merged, amount };
    else map[id].amount += amount;
  }
  stats.inventory = [
    ...Object.values(map).filter(i => (i.amount || 0) > 0),
    ...durable.filter(i => (i.amount || 0) > 0),
  ];
}

function hasGoodList(stats) {
  return Boolean(stats && stats.good_list_until && stats.good_list_until > Date.now());
}

function hasNaughtyList(stats) {
  return Boolean(stats && stats.naughty_list_until && stats.naughty_list_until > Date.now());
}

function isSnowballed(stats) {
  return Boolean(stats && stats.snowball_fail_until && stats.snowball_fail_until > Date.now());
}

function cleanupCooldownBuffs(stats) {
  if (!stats) return;
  if (!Array.isArray(stats.cooldown_buffs)) {
    stats.cooldown_buffs = [];
    return;
  }
  const now = Date.now();
  stats.cooldown_buffs = stats.cooldown_buffs.filter(entry => entry && entry.expiresAt > now);
}

function addCooldownBuff(stats, amount, durationMs) {
  if (!stats) return;
  if (!Array.isArray(stats.cooldown_buffs)) stats.cooldown_buffs = [];
  stats.cooldown_buffs.push({ amount, expiresAt: Date.now() + durationMs });
  cleanupCooldownBuffs(stats);
}

function getCooldownMultiplier(stats) {
  if (!stats) return 1;
  cleanupCooldownBuffs(stats);
  const total = (stats.cooldown_buffs || []).reduce(
    (sum, entry) => sum + (Number.isFinite(entry.amount) ? entry.amount : 0),
    0,
  );
  return Math.max(0.1, 1 - total);
}

function getLuckBonus(stats) {
  if (!stats) return 0;
  let bonus = 0;
  const now = Date.now();

  const candidates = [
    'luck_bonus',
    'luckBonus',
    'luck_boost',
    'luckBoost',
    'luck_percent',
    'luckPercent',
  ];
  for (const key of candidates) {
    const value = stats[key];
    if (Number.isFinite(value)) bonus += value;
  }

  if (Array.isArray(stats.luck_bonuses)) {
    stats.luck_bonuses = stats.luck_bonuses.filter(
      entry => entry && entry.expiresAt > now && Number.isFinite(entry.amount),
    );
    for (const entry of stats.luck_bonuses) bonus += entry.amount;
  }

  if (hasGoodList(stats)) bonus += 1;

  if (Number.isFinite(stats.luckMultiplier)) {
    bonus += Math.max(0, stats.luckMultiplier - 1);
  }

  return Math.max(0, bonus);
}

function getLuckMultiplier(stats) {
  return 1 + Math.max(0, getLuckBonus(stats));
}

function scaleChanceWithLuck(baseChance, stats, { min = 0, max = 1, power = 1 } = {}) {
  const normalizedBase = Math.max(0, baseChance);
  const safeMax = Math.max(min, max);
  const luckBonus = Math.max(0, getLuckBonus(stats));
  if (luckBonus <= 0) {
    return Math.min(safeMax, Math.max(min, normalizedBase));
  }
  const multiplier = Math.pow(1 + luckBonus, power);
  const adjusted = normalizedBase * multiplier;
  return Math.min(safeMax, Math.max(min, adjusted));
}

function getLuckAdjustedWeight(baseWeight, rarity, stats, weights = DEFAULT_LUCK_RARITY_WEIGHTS) {
  if (!Number.isFinite(baseWeight) || baseWeight <= 0) return 0;
  const weight = weights[rarity] || 0;
  const luckBonus = Math.max(0, getLuckBonus(stats));
  if (luckBonus <= 0 || weight <= 0) return baseWeight;
  return baseWeight * (1 + luckBonus * weight);
}

function computeActionSuccessChance(base, stats, { deathChance = 0, min = 0.001, max = 0.99 } = {}) {
  if (isSnowballed(stats)) {
    return { chance: 0, forcedFail: true };
  }

  if (hasNaughtyList(stats)) {
    const limit = Math.max(0, 1 - deathChance);
    const clamped = Math.min(Math.max(0.01, min), Math.max(min, Math.min(limit, 0.01)));
    return { chance: clamped, forcedFail: false };
  }

  const limit = Math.max(0, 1 - deathChance);
  const cap = Math.min(limit, max);
  let chance = scaleChanceWithLuck(base, stats, { min, max: cap });
  chance = Math.min(limit, Math.max(min, chance));
  return { chance, forcedFail: false };
}

const MAX_TIMEOUT = 2 ** 31 - 1;

function setSafeTimeout(fn, delay) {
  if (delay <= MAX_TIMEOUT) return setTimeout(fn, Math.max(0, delay));
  return setTimeout(() => setSafeTimeout(fn, delay - MAX_TIMEOUT), MAX_TIMEOUT);
}

const MAX_ITEMS = 200;

function getInventoryCount(stats) {
  return (stats.inventory || []).reduce((sum, i) => sum + (i.amount || 0), 0);
}

function resolveComponentEmoji(emoji) {
  if (!emoji) return emoji;
  if (typeof emoji !== 'string') return emoji;
  const trimmed = emoji.trim();
  const match = trimmed.match(/^<(a?):([a-zA-Z0-9_]+):(\d+)>$/);
  if (match) {
    const [, animatedFlag, name, id] = match;
    return {
      id,
      name,
      animated: animatedFlag === 'a',
    };
  }
  return { name: trimmed };
}

function applyComponentEmoji(component, emoji) {
  if (!emoji) return component;
  const resolved = resolveComponentEmoji(emoji);
  component.setEmoji(resolved);
  return component;
}

function alertInventoryFull(interaction, user, stats, pending = 0) {
  if (getInventoryCount(stats) + pending >= MAX_ITEMS) {
    interaction
      .followUp({
        content: `${user}, your inventory is full. Any items you earned will not be added to your inventory!`,
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return true;
  }
  return false;
}

function useDurableItem(interaction, user, stats, itemId) {
  const inv = stats.inventory || [];
  const index = inv.findIndex(
    i => i.id === itemId && typeof i.durability === 'number',
  );
  if (index === -1) {
    return { broken: false, remaining: inv.filter(i => i.id === itemId).length };
  }
  const item = inv[index];
  item.durability -= 1;
  if (item.durability <= 0) {
    inv.splice(index, 1);
    const remaining = inv.filter(i => i.id === itemId).length;
    const base = ITEMS[itemId] || { name: itemId, emoji: '' };
    const btn = new ButtonBuilder()
      .setCustomId('durability-left')
      .setLabel(
        `You have ${remaining} ${base.name} ${base.emoji} left`,
      )
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
    const container = new ContainerBuilder()
      .setAccentColor(0xff0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${user} Your ${base.name} ${base.emoji} is broken!`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
    interaction
      .followUp({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      })
      .catch(() => {});
    return { broken: true, remaining };
  }
  return { broken: false, remaining: inv.filter(i => i.id === itemId).length };
}

function applyCoinBoost(stats, amount) {
  const slots = (stats && stats.cosmeticSlots) || [];
  let percent = 0;
  if (slots.includes('ArcsOfResurgence')) percent += 7.77;
  if (slots.includes('GoldRing')) percent += 0.1;
  if (slots.includes('ElfHat')) percent += 1;
  if (stats && stats.chat_mastery_level >= 70) {
    percent += (stats.level || 0) * 0.1;
  }
  let perk = 1;
  if (stats && stats.chat_mastery_level >= 10) perk += 0.5;
  if (stats && stats.chat_mastery_level >= 30) perk += 1.0;
  if (stats && stats.chat_mastery_level >= 50) perk += 1.5;
  if (stats && stats.chat_mastery_level >= 80) perk += 2.0;
  if (hasNaughtyList(stats)) {
    percent *= 0.1;
  }
  let result = Math.floor(perk * (amount + amount * percent));
  if (hasNaughtyList(stats)) {
    result = Math.floor(result * 0.5);
  }
  return result;
}

module.exports = {
  formatNumber,
  parseAmount,
  normalizeInventory,
  setSafeTimeout,
  getInventoryCount,
  MAX_ITEMS,
  alertInventoryFull,
  useDurableItem,
  applyCoinBoost,
  resolveComponentEmoji,
  applyComponentEmoji,
  addCooldownBuff,
  getCooldownMultiplier,
  computeActionSuccessChance,
  hasGoodList,
  hasNaughtyList,
  isSnowballed,
  getLuckBonus,
  getLuckMultiplier,
  scaleChanceWithLuck,
  getLuckAdjustedWeight,
  DEFAULT_LUCK_RARITY_WEIGHTS,
};
