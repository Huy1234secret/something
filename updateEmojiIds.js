const fs = require('fs');
const path = require('path');
const { ITEMS } = require('./items');

const DATA_FILE = path.join(__dirname, 'user_data.json');

// Load user data
let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {
  console.error('Failed to read user data file:', err.message);
  process.exit(1);
}

const userStats = data.user_stats || {};

// Build lookup maps for items
const itemsById = Object.fromEntries(Object.values(ITEMS).map(i => [i.id, i]));
const itemsByName = Object.fromEntries(
  Object.values(ITEMS).map(i => [i.name.toLowerCase(), i])
);

let fixed = 0;

for (const stats of Object.values(userStats)) {
  if (!Array.isArray(stats.inventory)) continue;
  stats.inventory = stats.inventory.map(item => {
    let base = itemsById[item.id];
    if (!base && item.name) {
      base = itemsByName[item.name.toLowerCase()];
    }
    if (!base) return item;

    const updated = { ...item };
    let changed = false;
    if (item.id !== base.id) {
      updated.id = base.id;
      changed = true;
    }
    if (item.emoji !== base.emoji) {
      updated.emoji = base.emoji;
      changed = true;
    }
    if (item.image !== base.image) {
      updated.image = base.image;
      changed = true;
    }
    if (item.name !== base.name) {
      updated.name = base.name;
      changed = true;
    }
    if (item.rarity !== base.rarity) {
      updated.rarity = base.rarity;
      changed = true;
    }
    if (item.type !== base.type) {
      updated.type = base.type;
      changed = true;
    }
    if (item.value !== base.value) {
      updated.value = base.value;
      changed = true;
    }
    if (changed) fixed++;
    return updated;
  });
}

if (fixed > 0) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`Fixed ${fixed} item entries.`);
} else {
  console.log('No inventory entries needed fixing.');
}
