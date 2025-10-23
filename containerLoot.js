const CHRISTMAS_GIFT_LURES = [
  'VerdantLures',
  'SunprideLures',
  'MarshlightLures',
  'SnowglassLures',
];

const CONTAINER_LOOT_TABLES = {
  ChristmasBattlePassGift: {
    rolls: 5,
    entries: [
      { weight: 15, type: 'coins', min: 100000, max: 250000, label: 'Coin' },
      { weight: 15, type: 'snowflakes', min: 100, max: 10000, label: 'Snowflake' },
      { weight: 15, type: 'diamonds', min: 1, max: 100, label: 'Diamond' },
      { weight: 5, type: 'item', id: 'CupOfMilk', min: 1, max: 5 },
      { weight: 5, type: 'item', id: 'Cookie', min: 5, max: 15 },
      { weight: 3, type: 'item', id: 'GingerbreadMan', min: 1, max: 5 },
      { weight: 7.5, type: 'item', id: 'SnowBall', min: 10, max: 25 },
      { weight: 5, type: 'item', id: 'CandyCane', min: 3, max: 10 },
      { weight: 1, type: 'deluxeCoins', min: 1, max: 50, label: 'Deluxe Coin' },
      { weight: 1, type: 'item', id: 'StarFruitSeed', min: 1, max: 2 },
      { weight: 1, type: 'item', id: 'MelonSeed', min: 1, max: 2 },
      { weight: 3, type: 'item', id: 'PumpkinSeed', min: 1, max: 3 },
      { weight: 3, type: 'item', id: 'WhiteCabbageSeed', min: 1, max: 3 },
      { weight: 5, type: 'item', id: 'WheatSeed', min: 1, max: 5 },
      { weight: 5, type: 'item', id: 'PotatoSeed', min: 1, max: 5 },
      { weight: 5, type: 'lure', min: 5, max: 5, pool: CHRISTMAS_GIFT_LURES, label: 'Hunting lure' },
      { weight: 2, type: 'item', id: 'AnimalDetector', min: 1, max: 2 },
      { weight: 3, type: 'item', id: 'XPSoda', min: 1, max: 3 },
      { weight: 0.5, type: 'item', id: 'GoodList', min: 1, max: 1 },
    ],
  },
  DiamondBag: {
    rolls: 1,
    entries: [{ weight: 1, chance: 1, type: 'diamonds', min: 10000, max: 10000, label: 'Diamond' }],
  },
  DiamondCrate: {
    rolls: 1,
    entries: [{ weight: 1, chance: 1, type: 'diamonds', min: 135000, max: 135000, label: 'Diamond' }],
  },
  DiamondChest: {
    rolls: 1,
    entries: [{ weight: 1, chance: 1, type: 'diamonds', min: 980000, max: 980000, label: 'Diamond' }],
  },
  BulletBox: {
    rolls: 1,
    entries: [{ weight: 1, chance: 1, type: 'item', id: 'Bullet', min: 6, max: 6 }],
  },
};

function getContainerLootTable(itemId) {
  if (!itemId) return null;
  return CONTAINER_LOOT_TABLES[itemId] || null;
}

function pickWeightedEntry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const weighted = entries.filter(entry => Number(entry?.weight) > 0);
  const pool = weighted.length > 0 ? weighted : entries;
  const totalWeight = pool.reduce((sum, entry) => sum + (Number(entry?.weight) || 0), 0);
  if (totalWeight <= 0) {
    return pool[pool.length - 1] || null;
  }
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    const weight = Number(entry?.weight) || 0;
    roll -= weight;
    if (roll <= 0) return entry;
  }
  return pool[pool.length - 1] || null;
}

module.exports = {
  CHRISTMAS_GIFT_LURES,
  CONTAINER_LOOT_TABLES,
  getContainerLootTable,
  pickWeightedEntry,
};
