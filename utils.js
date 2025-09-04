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
  for (const { value, symbol } of ABBREVIATIONS) {
    if (num >= value) {
      const formatted = (num / value).toFixed(2).replace(/\.0+$|0+$/,'');
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
  for (const item of stats.inventory) {
    if (!item || !item.id) continue;
    const base = ITEMS[item.id] || {};
    const merged = { ...base, ...item };
    const id = merged.id;
    const amount = merged.amount || 0;
    if (!map[id]) map[id] = { ...merged, amount };
    else map[id].amount += amount;
  }
  stats.inventory = Object.values(map).filter(i => (i.amount || 0) > 0);
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

module.exports = {
  formatNumber,
  parseAmount,
  normalizeInventory,
  setSafeTimeout,
  getInventoryCount,
  MAX_ITEMS,
};
