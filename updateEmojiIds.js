const fs = require('fs');
const path = require('path');
const { ITEMS } = require('./items');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'user_data.json');

if (!fs.existsSync(DATA_FILE)) {
  console.error(`User data file not found at ${DATA_FILE}.`);
  console.error('Run the bot once to generate it or copy user_data.template.json.');
  process.exit(1);
}

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

// Fields to synchronise with item definitions
const SYNC_FIELDS = ['id', 'emoji', 'image', 'name', 'rarity', 'type', 'value'];

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

    for (const field of SYNC_FIELDS) {
      if (item[field] !== base[field]) {
        updated[field] = base[field];
        changed = true;
      }
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
