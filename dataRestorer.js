const fsSync = require('node:fs');
const path = require('node:path');
const BetterSqlite3 = require('better-sqlite3');

/**
 * Scans for guild data JSON files and restores them to the database.
 * This function is intended to be run once at bot startup.
 */
async function restoreDataFromFiles() {
    const dbFilePath = path.resolve(__dirname, '..', 'database.db');
    const rootDir = path.resolve(__dirname, '..');

    try {
        const files = fsSync.readdirSync(rootDir);
        const restoreFile = files.find(f => f.startsWith('guild_data_') && f.endsWith('.json'));

        if (restoreFile) {
            console.log(`[DB Restore] Detected restore file: ${restoreFile}`);
            const filePath = path.join(rootDir, restoreFile);
            const fileContent = fsSync.readFileSync(filePath, 'utf8');
            const dataToRestore = JSON.parse(fileContent);

            const guildIdMatch = restoreFile.match(/guild_data_(\d+)_/);
            if (!guildIdMatch || !guildIdMatch[1]) {
                throw new Error('Could not extract guildId from filename.');
            }
            const guildIdToRestore = guildIdMatch[1];
            console.log(`[DB Restore] Extracted Guild ID for restoration: ${guildIdToRestore}`);

            const db = new BetterSqlite3(dbFilePath);
            console.log('[DB Restore] Connected to database for restoration.');

            const restoreTransaction = db.transaction(() => {
                console.log(`[DB Restore] Starting transaction. Clearing old data for guild ${guildIdToRestore}...`);
                
                const tablesToRestore = [
                    { name: 'users', key: 'users' },
                    { name: 'userInventory', key: 'userInventory' },
                    { name: 'userActiveCharms', key: 'userActiveCharms' },
                    { name: 'userDmSettings', key: 'userDmSettings' },
                    { name: 'userLootAlertSettings', key: 'userLootAlertSettings' },
                    { name: 'userGlobalLootAlertSettings', key: 'userGlobalLootAlertSettings' },
                    { name: 'robux_withdrawals', key: 'robuxWithdrawals' }
                ];

                for (const table of tablesToRestore) {
                    if (dataToRestore[table.key] && Array.isArray(dataToRestore[table.key])) {
                        db.prepare(`DELETE FROM ${table.name} WHERE guildId = ?`).run(guildIdToRestore);
                        console.log(`[DB Restore] Cleared table: ${table.name}`);
                        
                        const dataArray = dataToRestore[table.key];
                        if (dataArray.length > 0) {
                            const columns = Object.keys(dataArray[0]);
                            const placeholders = columns.map(c => `@${c}`).join(', ');
                            const insertStmt = db.prepare(`INSERT OR REPLACE INTO ${table.name} (${columns.join(', ')}) VALUES (${placeholders})`);
                            
                            for (const row of dataArray) {
                                const rowData = {};
                                for (const col of columns) {
                                    rowData[col] = row.hasOwnProperty(col) ? row[col] : null;
                                }
                                insertStmt.run(rowData);
                            }
                            console.log(`[DB Restore] Inserted ${dataArray.length} rows into ${table.name}.`);
                        }
                    }
                }
            });

            restoreTransaction();
            db.close();
            console.log('[DB Restore] Transaction complete. Database connection closed.');

            fsSync.renameSync(filePath, `${filePath}.restored`);
            console.log(`[DB Restore] Successfully restored data for guild ${guildIdToRestore} and renamed restore file to ${restoreFile}.restored`);
        }
    } catch (error) {
        console.error(`[DB Restore] CRITICAL ERROR during startup data restoration: ${error.message}`);
        // This function runs before the bot fully starts, so throwing an error might be appropriate
        // depending on desired behavior. For now, we log the error and allow startup to continue.
    }
}

module.exports = { restoreDataFromFiles };