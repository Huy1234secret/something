const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_FILE = path.join(__dirname, '../data/giveaways.json');
console.log(`[DataManager] DATA_FILE path: ${DATA_FILE}`); // Thêm log này

/**
 * Tải dữ liệu giveaway từ tệp JSON.
 * @returns {Promise<{activeGiveaways: Object, giveawaySetups: Object}>} Dữ liệu giveaway đã tải.
 */
async function loadGiveaways() {
    try {
        console.log('[DataManager] Attempting to load giveaways data...'); // Thêm log này
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        console.log('[DataManager] Giveaways data loaded successfully.'); // Thêm log này
        return {
            activeGiveaways: parsedData.activeGiveaways || {},
            giveawaySetups: parsedData.giveawaySetups || {}
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Giveaways data file not found, starting fresh.');
            return { activeGiveaways: {}, giveawaySetups: {} };
        }
        console.error('Error loading giveaways data:', error);
        return { activeGiveaways: {}, giveawaySetups: {} };
    }
}

/**
 * Lưu dữ liệu giveaway vào tệp JSON.
 * @param {Object} data Dữ liệu giveaway để lưu.
 * @param {Map<string, Object>} data.activeGiveawaysMap Map các giveaway đang hoạt động.
 * @param {Map<string, Object>} data.giveawaySetupsMap Map các cấu hình setup.
 */
async function saveGiveaways(activeGiveawaysMap, giveawaySetupsMap) {
    try {
        // Chuyển đổi Map sang Object để lưu vào JSON
        const dataToSave = {
            activeGiveaways: Object.fromEntries(activeGiveawaysMap),
            giveawaySetups: Object.fromEntries(giveawaySetupsMap)
        };
        const dir = path.dirname(DATA_FILE);
        console.log(`[DataManager] Ensuring directory exists: ${dir}`); // Thêm log này
        await fs.mkdir(dir, { recursive: true }); // Đảm bảo thư mục tồn tại
        console.log(`[DataManager] Attempting to write data to: ${DATA_FILE}`); // Thêm log này
        await fs.writeFile(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
        console.log('[DataManager] Giveaway data saved successfully.'); // Thêm log này
    } catch (error) {
        console.error('Error saving giveaways data:', error);
    }
}

module.exports = {
    loadGiveaways,
    saveGiveaways
};