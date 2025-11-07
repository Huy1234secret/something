const CONTAINER_LOOT_TABLES = {
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
  CONTAINER_LOOT_TABLES,
  getContainerLootTable,
  pickWeightedEntry,
};
