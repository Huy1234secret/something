const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'user_data.json');

let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {
  console.error('Failed to read user data file:', err.message);
  process.exit(1);
}

const userStats = data.user_stats || {};
let removed = 0;

for (const stats of Object.values(userStats)) {
  if (!Array.isArray(stats.inventory)) continue;
  const kept = [];
  for (const item of stats.inventory) {
    if (item.id === 'padlock') {
      removed += item.amount || 1;
    } else {
      kept.push(item);
    }
  }
  stats.inventory = kept;
}

if (removed > 0) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`Removed ${removed} padlock item(s).`);
} else {
  console.log('No padlock items found.');
}
