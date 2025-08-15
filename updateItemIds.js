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

// Build lookup maps for current items
const itemsById = Object.fromEntries(Object.values(ITEMS).map(i => [i.id, i]));
const itemsByName = Object.fromEntries(
  Object.values(ITEMS).map(i => [i.name.toLowerCase(), i])
);

let updated = 0;

for (const stats of Object.values(userStats)) {
  if (!Array.isArray(stats.inventory)) continue;
  stats.inventory = stats.inventory.map(item => {
    const base = itemsById[item.id];
    if (base) {
      // Merge to ensure item properties are up to date
      return { ...base, amount: item.amount };
    }
    const byName = item.name ? itemsByName[item.name.toLowerCase()] : null;
    if (byName) {
      updated++;
      return { ...byName, amount: item.amount };
    }
    return item;
  });
}

if (updated > 0) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`Updated ${updated} inventory item entries.`);
} else {
  console.log('No item IDs needed updating.');
}
