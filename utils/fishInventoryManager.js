const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '../data');

async function loadMap(file) {
    try {
        const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
        const obj = JSON.parse(data);
        return new Map(Object.entries(obj));
    } catch {
        return new Map();
    }
}

async function saveMap(file, map) {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const obj = Object.fromEntries(map);
        await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.error('[FishInventoryManager] Failed to save', file, e);
    }
}

async function loadAll() {
    return {
        inventories: await loadMap('fishInventories.json'),
        favorites: await loadMap('favoriteFish.json'),
        serverLog: await loadMap('serverFishLog.json')
    };
}

async function saveAll({ inventories, favorites, serverLog }) {
    await saveMap('fishInventories.json', inventories);
    await saveMap('favoriteFish.json', favorites);
    await saveMap('serverFishLog.json', serverLog);
}

module.exports = { loadAll, saveAll };
