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
  const match = trimmed.match(/^<(?:(a):)?([a-zA-Z0-9_]+):(\d+)>$/);
  if (match) {
    const [, animatedFlag, name, id] = match;
    return {
      id,
      name,
      animated: Boolean(animatedFlag),
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
  if (stats && stats.chat_mastery_level >= 70) {
    percent += (stats.level || 0) * 0.1;
  }
  let perk = 1;
  if (stats && stats.chat_mastery_level >= 10) perk += 0.5;
  if (stats && stats.chat_mastery_level >= 30) perk += 1.0;
  if (stats && stats.chat_mastery_level >= 50) perk += 1.5;
  if (stats && stats.chat_mastery_level >= 80) perk += 2.0;
  return Math.floor(perk * (amount + amount * percent));
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
};
