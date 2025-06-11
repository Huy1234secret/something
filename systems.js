// systems.js
const BetterSqlite3 = require('better-sqlite3');
const { EmbedBuilder } = require('discord.js');

const gameConfig = require('./game_config.js');
const { ShopManager, SHOP_ITEM_TYPES, CHARM_TYPES: CHARM_TYPES_FROM_SHOPMANAGER } = require('./shopManager.js');

const BASE_COINS_PER_MESSAGE = gameConfig.globalSettings?.BASE_COINS_PER_MESSAGE || [1, 3];
const BASE_XP_PER_MESSAGE = gameConfig.globalSettings?.BASE_XP_PER_MESSAGE || 1;
const VOICE_XP_PER_INTERVAL = gameConfig.globalSettings?.VOICE_XP_PER_INTERVAL || 5;
const VOICE_COIN_PER_INTERVAL = gameConfig.globalSettings?.VOICE_COIN_PER_INTERVAL || [1,2];
const VOICE_ACTIVITY_INTERVAL_MS = gameConfig.globalSettings?.VOICE_ACTIVITY_INTERVAL_MS || (60000 * 5);
const LEVEL_UP_BASE_XP = gameConfig.globalSettings?.LEVEL_UP_BASE_XP || 100;
const LEVEL_UP_XP_INCREMENT = gameConfig.globalSettings?.LEVEL_UP_XP_INCREMENT || 50;
const MAX_LEVEL = gameConfig.globalSettings?.MAX_LEVEL || 40;

const LEVEL_ROLES = gameConfig.globalSettings?.LEVEL_ROLES || {
    "5": "1372582451741851699", "10": "1372583177729867787", "15": "1372583185887662151",
    "20": "1372583186357555242", "25": "1374410299180060762", "30": "1374410304984977548",
    "35": "1374410304456495296", "40": "1372583187653595297",
};

const INVENTORY_COIN_CAP = gameConfig.globalSettings?.INVENTORY_COIN_CAP || 1000000;
const INVENTORY_GEM_CAP = gameConfig.globalSettings?.INVENTORY_GEM_CAP || 100000;
const INVENTORY_ROBUX_CAP = gameConfig.globalSettings?.INVENTORY_ROBUX_CAP || 400;

const BANK_TIERS = {
    0:  { coinCap:  10_000,   gemCap:   100,  upgradeCostCoins:   8_000,  upgradeCostGems:    0,    interestRate: 0,  nextTier: 1 },
    1:  { coinCap:  50_000,   gemCap:   250,  upgradeCostCoins:   40_000,  upgradeCostGems:  200,   interestRate: 1,  nextTier: 2 },
    2:  { coinCap: 150_000,   gemCap:   500,  upgradeCostCoins:  120_000,  upgradeCostGems:  400,   interestRate: 2,  nextTier: 3 },
    3:  { coinCap: 300_000,   gemCap: 800,  upgradeCostCoins: 240_000,  upgradeCostGems: 640,  interestRate: 3,  nextTier: 4 },
    4:  { coinCap: 500_000,   gemCap: 1_200,  upgradeCostCoins:  400_000,  upgradeCostGems: 960,  interestRate: 4,  nextTier: 5 },
    5:  { coinCap: 750_000,   gemCap: 1_800,  upgradeCostCoins:  600_000,  upgradeCostGems: 1_440,  interestRate: 5,  nextTier: 6 },
    6:  { coinCap: 1_000_000,   gemCap: 2_500,  upgradeCostCoins:  800_000,  upgradeCostGems: 2_000,  interestRate: 6,  nextTier: 7 },
    7:  { coinCap:1_500_000,  gemCap: 3_750,  upgradeCostCoins: 1_200_000,  upgradeCostGems: 3_000,  interestRate: 7,  nextTier: 8 },
    8:  { coinCap:2_250_000,  gemCap: 5_000,  upgradeCostCoins: 1_800_000,  upgradeCostGems: 4_000,  interestRate: 8,  nextTier: 9 },
    9:  { coinCap:3_500_000,  gemCap: 7_500,  upgradeCostCoins: 2_800_000,  upgradeCostGems: 6_000,  interestRate: 9,  nextTier:10 },
    10: { coinCap:5_000_000,  gemCap: 15_000,  upgradeCostCoins:       0,  upgradeCostGems:     0,  interestRate:10,  nextTier:null }
};

const WEEKEND_COIN_MULTIPLIER = gameConfig.globalSettings?.WEEKEND_COIN_MULTIPLIER || 2;
const WEEKEND_GEM_MULTIPLIER = gameConfig.globalSettings?.WEEKEND_GEM_MULTIPLIER || 2;
const WEEKEND_XP_MULTIPLIER = gameConfig.globalSettings?.WEEKEND_XP_MULTIPLIER || 2;
// Luck related multipliers removed
const WEEKEND_SHOP_STOCK_MULTIPLIER = gameConfig.globalSettings?.WEEKEND_SHOP_STOCK_MULTIPLIER || 1;

const DEFAULT_ANNOUNCE_RARITY_THRESHOLD = gameConfig.globalSettings?.DEFAULT_ANNOUNCE_RARITY_THRESHOLD || 1000;
const DEFAULT_SHOP_RESTOCK_DM_ENABLED = gameConfig.globalSettings?.DEFAULT_SHOP_RESTOCK_DM_ENABLED || false;
const SETTINGS_EMOJI_ENABLED = gameConfig.globalSettings?.SETTINGS_EMOJI_ENABLED || '✅';
const SETTINGS_EMOJI_DISABLED = gameConfig.globalSettings?.SETTINGS_EMOJI_DISABLED || '❌';
const DEFAULT_COIN_EMOJI = gameConfig.items.coins?.emoji || '<a:coin:1373568800783466567>';
const DEFAULT_GEM_EMOJI = gameConfig.items.gems?.emoji || '<a:gem:1374405019918401597>';
const DEFAULT_ROBUX_EMOJI = gameConfig.items.robux?.emoji || '<a:robux:1378395622683574353>';
const ROBUX_WITHDRAWAL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

function formatChanceDisplay(chanceDecimal, context = "", simplePercentageOnly = false) {
    if (simplePercentageOnly) {
        if (chanceDecimal <= 0) return "0%";
        let percentage = chanceDecimal * 100;
        let numStr = percentage.toFixed(8);
        if (numStr.includes('.')) {
            numStr = numStr.replace(/0+$/, ''); 
            numStr = numStr.replace(/\.$/, '');  
        }
        if (numStr === "0" && percentage > 0) {
            if (percentage < 0.000001) { 
                 return percentage.toExponential(2) + '%';
            }
        }
        return numStr + '%';
    }

    if (chanceDecimal <= 0) return "Extremely Rare";
    
    let percentageString = (chanceDecimal * 100).toFixed(2);
    if (percentageString.endsWith('.00')) {
        percentageString = percentageString.substring(0, percentageString.length - 3);
    } else if (percentageString.endsWith('0') && percentageString.includes('.')) {
        percentageString = percentageString.substring(0, percentageString.length - 1);
    }
    percentageString += '%';

    if (chanceDecimal < 0.00000000001) { 
        return `${(chanceDecimal * 100).toExponential(2)}% (Extremely Rare${context ? " " + context : ""})`;
    }
    const oneInX = Math.round(1 / chanceDecimal);
    if (oneInX === Infinity || oneInX <= 0 || oneInX > 5000000000) {
        return `${percentageString} (Very Rare${context ? " " + context : ""})`;
    }
    return `${percentageString}${context ? " " + context : ""}`;
}

class SystemsManager {
    constructor(dbPathPassed) {
        this.db = new BetterSqlite3(dbPathPassed);
        this.gameConfig = gameConfig;
        this.initializeSchema();

        this.COSMIC_ROLE_TOKEN_ID = this.gameConfig.items.cosmic_role_token?.id || 'cosmic_role_token';
        this.SPECIAL_ROLE_ID_TO_GRANT = this.gameConfig.items[this.COSMIC_ROLE_TOKEN_ID]?.roleIdToGrant || '1372583188320227348';

        this.activeVoiceUsers = new Map();
        this.coinEmoji = this.gameConfig.items.coins?.emoji || DEFAULT_COIN_EMOJI;
        this.gemEmoji = this.gameConfig.items.gems?.emoji || DEFAULT_GEM_EMOJI;
        this.robuxEmoji = this.gameConfig.items.robux?.emoji || DEFAULT_ROBUX_EMOJI;
        this.xpCooldowns = new Map();
        this.itemTypes = {
            CURRENCY: 'currency',
            CURRENCY_ITEM: 'currency_item',
            CHARM: 'charm_item', LOOT_BOX: 'loot_box_item',
            ITEM: 'item', JUNK: 'junk', COSMIC_TOKEN: 'cosmic_token',
            COLLECTIBLE: 'collectible', SPECIAL_ROLE_ITEM: 'special_role_item',
        };

        // CHARM_TYPES no longer needs LUCK
        this.CHARM_TYPES = {
            COIN: CHARM_TYPES_FROM_SHOPMANAGER.COIN,
            XP: CHARM_TYPES_FROM_SHOPMANAGER.XP,
            GEM: CHARM_TYPES_FROM_SHOPMANAGER.GEM,
            DISCOUNT: CHARM_TYPES_FROM_SHOPMANAGER.DISCOUNT,
            TAX_REDUCTION: CHARM_TYPES_FROM_SHOPMANAGER.TAX_REDUCTION
        };

        this.itemRarities = gameConfig.globalSettings.rarityTiers || {
            SECRET:   { name: "SECRET",    color: 0xFF4500, value: 2000000 }, 
            MYTHIC:   { name: "MYTHIC",    color: 0xFFD700, value: 1000000 }, 
            LEGENDARY:{ name: "Legendary", color: 0xFF8C00, value: 200000  }, 
            EPIC:     { name: "Epic",      color: 0x9400D3, value: 20000   }, 
            RARE:     { name: "Rare",      color: 0x0070DD, value: 1000    }, 
            UNCOMMON: { name: "Uncommon",  color: 0x00A86B, value: 100     }, 
            COMMON:   { name: "Common",    color: 0x95A5A6, value: 10      }, 
            STANDARD: { name: "Standard",  color: 0xBDC3C7, value: 1       }  
        };

        console.log("[SystemsManager] Initializing ShopManager with gameConfig...");
        if (this.db) {
            try {
                this.shopManager = new ShopManager(this.db, this);
                if (!this.shopManager || typeof this.shopManager.getGuildShopSettings !== 'function') {
                     console.error("[SystemsManager] CRITICAL: ShopManager failed to initialize properly.");
                     this.shopManager = null;
                } else {
                    console.log("[SystemsManager] ShopManager initialized successfully.");
                }
            } catch (e) {
                console.error("[SystemsManager] CRITICAL: Error during ShopManager instantiation:", e);
                this.shopManager = null;
            }
        } else {
            console.error("[SystemsManager] CRITICAL: Database (this.db) is not initialized. Cannot create ShopManager.");
            this.shopManager = null;
        }
        this.client = null;
        this.globalWeekendMultipliers = { luck: 1.0, xp: 1.0, currency: 1.0, gem: 1.0, shopDiscount: 0.0 }; // luck: 1.0 as default now
    }

    setClient(clientInstance) {
        this.client = clientInstance;
        if (clientInstance && clientInstance.globalWeekendMultipliers) {
            this.globalWeekendMultipliers = clientInstance.globalWeekendMultipliers;
        }
    }

    _getItemMasterProperty(itemId, propertyName, defaultValue = null) {
        const item = this.gameConfig.items[itemId];
        if (item) {
            if (propertyName === null) return item;
            if (Object.prototype.hasOwnProperty.call(item, propertyName)) return item[propertyName];
        }
        // Fallbacks for core currencies if not found directly by itemId (e.g. 'coins' as itemId)
        if (propertyName === 'name') {
            if (itemId === 'coins') return this.gameConfig.items.coins?.name || 'Coins';
            if (itemId === 'gems') return this.gameConfig.items.gems?.name || 'Gems';
            if (itemId === 'robux') return this.gameConfig.items.robux?.name || 'Robux';
        }
        if (propertyName === 'emoji') {
            if (itemId === 'coins') return this.gameConfig.items.coins?.emoji || DEFAULT_COIN_EMOJI;
            if (itemId === 'gems') return this.gameConfig.items.gems?.emoji || DEFAULT_GEM_EMOJI;
            if (itemId === 'robux') return this.gameConfig.items.robux?.emoji || DEFAULT_ROBUX_EMOJI;
        }
        return defaultValue;
    }

    getRequiredXpForLevel(levelToReach) {
        if (levelToReach > MAX_LEVEL) return 0;
        if (levelToReach <= 0) return LEVEL_UP_BASE_XP;
        const levelWhoseCapIsCalculated = levelToReach - 1;
        return LEVEL_UP_BASE_XP + levelWhoseCapIsCalculated * LEVEL_UP_XP_INCREMENT;
    }

    initializeSchema() {
        const currentDefaultCoinEmoji = (this.gameConfig?.items?.coins?.emoji || DEFAULT_COIN_EMOJI).replace(/'/g, "''");
        const currentDefaultGemEmoji = (this.gameConfig?.items?.gems?.emoji || DEFAULT_GEM_EMOJI).replace(/'/g, "''");
        const currentDefaultRobuxEmoji = (this.gameConfig?.items?.robux?.emoji || DEFAULT_ROBUX_EMOJI).replace(/'/g, "''");

        const initialTableStatements = [
            `CREATE TABLE IF NOT EXISTS guildSettings (
                guildId TEXT PRIMARY KEY, logChannelId TEXT, welcomeChannelId TEXT, leaveChannelId TEXT,
                levelUpChannelId TEXT, lootDropAlertChannelId TEXT, leaderboardChannelId TEXT,
                leaderboardMessageId TEXT, leaderboardLastUpdated INTEGER, weekendBoostActive INTEGER DEFAULT 0,
                lastWeekendToggleTimestamp INTEGER DEFAULT 0,
                shopRestockDmEnabled INTEGER DEFAULT ${DEFAULT_SHOP_RESTOCK_DM_ENABLED ? 1 : 0},
                coinEmoji TEXT DEFAULT '${currentDefaultCoinEmoji}',
                gemEmoji TEXT DEFAULT '${currentDefaultGemEmoji}',
                robuxEmoji TEXT DEFAULT '${currentDefaultRobuxEmoji}',
                lastWeekendBoostStartAnnounceTimestamp INTEGER DEFAULT 0,
                lastWeekendBoostEndAnnounceTimestamp INTEGER DEFAULT 0
            );`,
            `CREATE TABLE IF NOT EXISTS users (
                userId TEXT NOT NULL, guildId TEXT NOT NULL, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 0,
                coins INTEGER DEFAULT 0, gems INTEGER DEFAULT 0, robux INTEGER DEFAULT 0,
                bankCoins INTEGER DEFAULT 0, bankGems INTEGER DEFAULT 0,
                bankTier INTEGER DEFAULT 0, lastMessageTimestamp INTEGER DEFAULT 0, lastDailyTimestamp INTEGER DEFAULT 0,
                totalMessages INTEGER DEFAULT 0, totalXp INTEGER DEFAULT 0, totalCoinsEarned INTEGER DEFAULT 0,
                totalGemsEarned INTEGER DEFAULT 0, totalRobuxEarned INTEGER DEFAULT 0,
                totalVoiceXp INTEGER DEFAULT 0, totalVoiceCoins INTEGER DEFAULT 0,
                cosmicTokenDiscovered INTEGER DEFAULT 0,
                lastRobuxWithdrawalTimestamp INTEGER DEFAULT 0, -- New for cooldown
                dailyStreak INTEGER DEFAULT 0,
                lostStreak INTEGER DEFAULT 0,
                lostStreakTimestamp INTEGER DEFAULT 0,
                rewardsLastShiftedAt INTEGER DEFAULT 0,
                lastDailyNotifyTimestamp INTEGER DEFAULT 0,
                PRIMARY KEY (userId, guildId)
            );`,
            `CREATE TABLE IF NOT EXISTS userInventory (
                userId TEXT NOT NULL, guildId TEXT NOT NULL, itemId TEXT NOT NULL,
                quantity INTEGER DEFAULT 0, itemType TEXT, PRIMARY KEY (userId, guildId, itemId)
            );`,
             `CREATE TABLE IF NOT EXISTS userDailyRewards (
                userId TEXT NOT NULL, guildId TEXT NOT NULL, dayNumber INTEGER NOT NULL,
                rewardType TEXT NOT NULL,
                rewardData TEXT NOT NULL,
                PRIMARY KEY (userId, guildId, dayNumber)
            );`,
            `CREATE TABLE IF NOT EXISTS userDmSettings (
                userId TEXT NOT NULL, guildId TEXT NOT NULL,
                enableShopRestockDm INTEGER,
                enableDailyReadyDm INTEGER,
                PRIMARY KEY (userId, guildId)
            );`,
            `CREATE TABLE IF NOT EXISTS userLootAlertSettings (
                userId TEXT NOT NULL, guildId TEXT NOT NULL, itemId TEXT NOT NULL,
                enableAlert INTEGER DEFAULT 1, PRIMARY KEY (userId, guildId, itemId)
            );`,
            `CREATE TABLE IF NOT EXISTS userShopAlertSettings (
                userId TEXT NOT NULL, guildId TEXT NOT NULL, itemId TEXT NOT NULL,
                enableAlert INTEGER DEFAULT 1, PRIMARY KEY (userId, guildId, itemId)
            );`,
            `CREATE TABLE IF NOT EXISTS userGlobalLootAlertSettings (
                userId TEXT NOT NULL, guildId TEXT NOT NULL,
                alertRarityThreshold INTEGER DEFAULT ${DEFAULT_ANNOUNCE_RARITY_THRESHOLD},
                PRIMARY KEY (userId, guildId)
            );`,
             `CREATE TABLE IF NOT EXISTS embed_sessions (
                sessionId TEXT PRIMARY KEY, userId TEXT NOT NULL, guildId TEXT NOT NULL,
                targetChannelId TEXT NOT NULL, panelChannelId TEXT NOT NULL, roleToMentionId TEXT,
                embedData TEXT NOT NULL, builderMessageId TEXT, createdAt INTEGER NOT NULL
            );`,
            `CREATE TABLE IF NOT EXISTS userActiveCharms (
                charmInstanceId INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT NOT NULL, guildId TEXT NOT NULL,
                charmId TEXT NOT NULL, charmType TEXT NOT NULL DEFAULT 'unknown_type',
                boostValue REAL, expiryTimestamp INTEGER, source TEXT
            );`,
            // New table for Robux withdrawal requests
            `CREATE TABLE IF NOT EXISTS robux_withdrawals (
                withdrawalId INTEGER PRIMARY KEY AUTOINCREMENT,
                userId TEXT NOT NULL,
                guildId TEXT NOT NULL,
                robloxUsername TEXT NOT NULL,
                amount INTEGER NOT NULL,
                gamepassLink TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING', -- PENDING, ACCEPTED, DENIED
                requestTimestamp INTEGER NOT NULL,
                logMessageId TEXT, -- Message ID of the request in the log channel
                processedByUserId TEXT, -- Staff member who processed
                processedTimestamp INTEGER,
                reasonOrEvidence TEXT -- Reason for denial or evidence for acceptance
            );`
        ];
        this.db.transaction(() => { initialTableStatements.forEach(sql => this.db.exec(sql)); })();

        const usersInfo = this.db.prepare("PRAGMA table_info(users)").all();
        if (!usersInfo.some(col => col.name === 'lastRobuxWithdrawalTimestamp')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN lastRobuxWithdrawalTimestamp INTEGER DEFAULT 0;`);
        }
        if (!usersInfo.some(col => col.name === 'dailyStreak')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN dailyStreak INTEGER DEFAULT 0;`);
        }
        if (!usersInfo.some(col => col.name === 'lostStreak')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN lostStreak INTEGER DEFAULT 0;`);
        }
        if (!usersInfo.some(col => col.name === 'lostStreakTimestamp')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN lostStreakTimestamp INTEGER DEFAULT 0;`);
        }
        if (!usersInfo.some(col => col.name === 'rewardsLastShiftedAt')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN rewardsLastShiftedAt INTEGER DEFAULT 0;`);
        }
        if (!usersInfo.some(col => col.name === 'lastDailyNotifyTimestamp')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN lastDailyNotifyTimestamp INTEGER DEFAULT 0;`);
        }
        if (!usersInfo.some(col => col.name === 'lastInterestTimestamp')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN lastInterestTimestamp INTEGER DEFAULT 0;`);
        }
        const guildSettingsInfo = this.db.prepare("PRAGMA table_info(guildSettings)").all();
        if (!guildSettingsInfo.some(col => col.name === 'lastWeekendBoostStartAnnounceTimestamp')) {
            this.db.exec(`ALTER TABLE guildSettings ADD COLUMN lastWeekendBoostStartAnnounceTimestamp INTEGER DEFAULT 0;`);
        }
        if (!guildSettingsInfo.some(col => col.name === 'lastWeekendBoostEndAnnounceTimestamp')) {
            this.db.exec(`ALTER TABLE guildSettings ADD COLUMN lastWeekendBoostEndAnnounceTimestamp INTEGER DEFAULT 0;`);
        }
        if (!guildSettingsInfo.some(col => col.name === 'robuxEmoji')) {
            this.db.exec(`ALTER TABLE guildSettings ADD COLUMN robuxEmoji TEXT DEFAULT '${currentDefaultRobuxEmoji.replace(/'/g, "''")}';`);
        }

        if (!usersInfo.some(col => col.name === 'robux')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN robux INTEGER DEFAULT 0;`);
        }
        if (!usersInfo.some(col => col.name === 'totalRobuxEarned')) {
            this.db.exec(`ALTER TABLE users ADD COLUMN totalRobuxEarned INTEGER DEFAULT 0;`);
        }
        const dmSettingsInfo = this.db.prepare("PRAGMA table_info(userDmSettings)").all();
        if (!dmSettingsInfo.some(col => col.name === 'enableDailyReadyDm')) {
            this.db.exec(`ALTER TABLE userDmSettings ADD COLUMN enableDailyReadyDm INTEGER;`);
        }
    }

    _performWeightedRandomPick(items, weightKey = 'weight') {
        if (!items || items.length === 0) return null;
        const totalWeight = items.reduce((sum, item) => sum + (item[weightKey] || 0), 0);
        if (totalWeight <= 0) {
            const eligibleItems = items.filter(item => typeof item[weightKey] === 'number' && item[weightKey] > 0);
            if (eligibleItems.length > 0) return eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
            return null;
        }
        const rand = Math.random() * totalWeight;
        let cumulativeWeight = 0;
        for (const item of items) {
            cumulativeWeight += (item[weightKey] || 0);
            if (rand <= cumulativeWeight) return item;
        }
        const lastEligibleItem = items.filter(item => typeof item[weightKey] === 'number' && item[weightKey] > 0).pop();
        return lastEligibleItem || null;
    }

    addGems(userId, guildId, amount, source = "unknown", weekendMultipliersArg) {
        const effectiveWeekendMultipliers = weekendMultipliersArg || this.globalWeekendMultipliers || { currency: 1.0, gem: 1.0 };
        if (amount === 0) return { success: false, added: 0, newBalance: this.getBalance(userId, guildId).gems, reason: "Amount was zero." };

        const user = this.getUser(userId, guildId);
        const guildSettings = this.getGuildSettings(guildId);
        const isWeekend = guildSettings.weekendBoostActive;

        let finalAmount = amount;
        if (finalAmount > 0) { 
            const gemCharms = this.getActiveCharms(userId, guildId, this.CHARM_TYPES.GEM);
            let charmGemBoostPercent = 0;
            gemCharms.forEach(charm => { charmGemBoostPercent += (charm.boostValue || 0); });
            finalAmount += Math.round(finalAmount * (charmGemBoostPercent / 100));
            const weekendMultiplier = effectiveWeekendMultipliers?.gem !== undefined ? effectiveWeekendMultipliers.gem : (this.gameConfig.globalSettings?.WEEKEND_GEM_MULTIPLIER || WEEKEND_GEM_MULTIPLIER);
            if (isWeekend && weekendMultiplier > 1.0 && source !== "admin_command" && source !== "shop_purchase" && !source.startsWith("bank_")) {
                finalAmount = Math.round(finalAmount * weekendMultiplier);
            }
        }
        finalAmount = Math.round(finalAmount);
        let newGems = user.gems + finalAmount;
        let actualAdded = finalAmount;

        if (newGems > INVENTORY_GEM_CAP) {
            actualAdded = INVENTORY_GEM_CAP - user.gems; newGems = INVENTORY_GEM_CAP;
            if (actualAdded < 0) actualAdded = 0;
        } else if (newGems < 0) {
            actualAdded = -user.gems; newGems = 0;
        }
        
        let totalGemsEarnedUpdate = {};
        if (actualAdded > 0 && source !== "admin_command" && !source.startsWith("bank_") && source !== "shop_restock_refund") {
            totalGemsEarnedUpdate = { totalGemsEarned: (user.totalGemsEarned || 0) + actualAdded };
        }
        this.updateUser(userId, guildId, { gems: newGems, ...totalGemsEarnedUpdate });
        return { success: true, added: actualAdded, newBalance: newGems };
    }

    addRobux(userId, guildId, amount, source = "unknown") {
        if (amount === 0) return { success: false, added: 0, newBalance: this.getBalance(userId, guildId).robux, reason: "Amount was zero." };

        const user = this.getUser(userId, guildId);
        let finalAmount = Math.round(amount);
        let newRobux = user.robux + finalAmount;
        let actualAdded = finalAmount;

        if (newRobux > INVENTORY_ROBUX_CAP) {
            actualAdded = INVENTORY_ROBUX_CAP - user.robux;
            newRobux = INVENTORY_ROBUX_CAP;
            if (actualAdded < 0) actualAdded = 0;
        } else if (newRobux < 0) {
            actualAdded = -user.robux;
            newRobux = 0;
        }

        let totalRobuxEarnedUpdate = {};
        if (actualAdded > 0 && source !== "admin_command" && source !== "admin_add_user_panel" && !source.startsWith("bank_") && source !== "shop_restock_refund") {
            totalRobuxEarnedUpdate = { totalRobuxEarned: (user.totalRobuxEarned || 0) + actualAdded };
        }
        this.updateUser(userId, guildId, { robux: newRobux, ...totalRobuxEarnedUpdate });
        return { success: true, added: actualAdded, newBalance: newRobux };
    }


    handleDirectDrop(userId, guildId, member, weekendMultipliers) {
        const guildSettings = this.getGuildSettings(guildId);
        const isWeekend = guildSettings.weekendBoostActive; // isWeekend still relevant for other boosts if any
        const baseDropChance = this.gameConfig.globalSettings.CHAT_DROP_BASE_CHANCE;
        const chanceToGetAnyDrop = baseDropChance; // Without luck, it's just the base drop chance

        if (Math.random() > chanceToGetAnyDrop) {
            return { droppedItem: null, config: null, shouldAnnounce: false, grantedSpecialRole: false, baseProbability: 0 };
        }
        const chosenDropSpec = this._performWeightedRandomPick(this.gameConfig.directChatDropTable, 'directDropWeight'); 

        if (chosenDropSpec && chosenDropSpec.itemId) {
            const chosenItemId = chosenDropSpec.itemId;
            const chosenItemMasterConfig = this._getItemMasterProperty(chosenItemId, null);

            if (!chosenItemMasterConfig) {
                console.warn(`[DirectDrop] Master config not found for dropped itemId: ${chosenItemId}.`);
                return { droppedItem: null, config: null, shouldAnnounce: false, grantedSpecialRole: false, baseProbability: 0 };
            }
            const { grantedSpecialRole } = this.processLootDrop(userId, guildId, chosenItemMasterConfig, member, weekendMultipliers);
            const userGlobalAlertSettings = this.getUserGlobalLootAlertSettings(userId, guildId);
            const itemSpecificAlertSetting = this.getUserItemLootAlertSetting(userId, guildId, chosenItemId);
            let shouldAnnouncePublicly = false;
            const itemRarityValue = chosenItemMasterConfig.rarityValue || 0;

            if (itemSpecificAlertSetting.enableAlert &&
                ((userGlobalAlertSettings.alertRarityThreshold > 0 && itemRarityValue >= userGlobalAlertSettings.alertRarityThreshold) ||
                 chosenItemId === this.COSMIC_ROLE_TOKEN_ID)) { 
                shouldAnnouncePublicly = true;
            }
            
            const totalWeightForDirectDrops = this.gameConfig.directChatDropTable.reduce((sum, item) => sum + (item.directDropWeight || 0), 0);
            const originalBaseProbOfThisItemInPool = totalWeightForDirectDrops > 0 ? (chosenDropSpec.directDropWeight / totalWeightForDirectDrops) : 0;
            const finalProbOfThisItem = chanceToGetAnyDrop * originalBaseProbOfThisItemInPool;


            return {
                droppedItem: chosenItemMasterConfig, config: chosenItemMasterConfig, shouldAnnounce: shouldAnnouncePublicly,
                rarityValue: itemRarityValue, threshold: userGlobalAlertSettings.alertRarityThreshold,
                grantedSpecialRole, baseProbability: finalProbOfThisItem 
            };
        }
        return { droppedItem: null, config: null, shouldAnnounce: false, grantedSpecialRole: false, baseProbability: 0 };
    }

    async openLootBox(userId, guildId, boxId, weekendMultipliers, member, checkAndAwardSpecialRoleFn) {
        const boxConfig = this._getItemMasterProperty(boxId, null);
        if (!boxConfig || boxConfig.type !== this.itemTypes.LOOT_BOX || !boxConfig.itemPool) {
            return { success: false, message: "Invalid loot box ID or definition not found.", rewards: [], grantedSpecialRole: false };
        }
        const numRolls = boxConfig.numRolls || 1;
        // const guildSettings = this.getGuildSettings(guildId); // Not needed if luck is removed
        // const isWeekend = guildSettings.weekendBoostActive; // Not needed if luck is removed
        let allRolledItems = []; let grantedSpecialRoleInThisOpen = false;
        const baseItemPool = boxConfig.itemPool;

        const totalBaseProbability = baseItemPool.reduce((sum, item) => sum + (item.probability || 0), 0);
        if (totalBaseProbability <= 0) {
            console.warn(`[LootBoxOpen] All item probabilities for box ${boxId} sum to zero or less. Cannot pick item.`);
            return { success: false, message: "No items available to roll.", rewards: [], grantedSpecialRole: false };
        }
        
        let dynamicItemPool = baseItemPool.map(itemSpecInPool => {
            const baseProb = itemSpecInPool.probability || 0;
            return {
                ...itemSpecInPool,
                finalPickChance: baseProb / totalBaseProbability,
            };
        });

        for (let roll = 0; roll < numRolls; roll++) {
            const chosenItemFromPool = this._performWeightedRandomPick(dynamicItemPool, 'finalPickChance');
            if (chosenItemFromPool) {
                const itemDetails = { ...chosenItemFromPool }; let quantity = 1;
                if (itemDetails.type === this.itemTypes.CURRENCY) {
                    const minQty = parseInt(itemDetails.min, 10); const maxQty = parseInt(itemDetails.max, 10);
                    if (!isNaN(minQty) && !isNaN(maxQty) && maxQty >= minQty) quantity = Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;
                } else if (itemDetails.quantity) {
                    if (Array.isArray(itemDetails.quantity) && itemDetails.quantity.length === 2) {
                        const minQ = parseInt(itemDetails.quantity[0], 10); const maxQ = parseInt(itemDetails.quantity[1], 10);
                        if (!isNaN(minQ) && !isNaN(maxQ) && maxQ >= minQ) quantity = Math.floor(Math.random() * (maxQ - minQ + 1)) + minQ;
                    } else if (typeof itemDetails.quantity === 'number') quantity = itemDetails.quantity;
                }
                if (itemDetails.id === this.COSMIC_ROLE_TOKEN_ID) {
                    this.giveItem(userId, guildId, itemDetails.id, quantity, this.itemTypes.COSMIC_TOKEN, `loot_box_open_${boxId}`);
                    if (member && checkAndAwardSpecialRoleFn) {
                         try { await checkAndAwardSpecialRoleFn(member, `rolling a ${itemDetails.name} from ${boxConfig.name}`, itemDetails.name); grantedSpecialRoleInThisOpen = true; }
                         catch (e) { console.error("Error in checkAndAwardSpecialRoleFn from openLootBox:", e); }
                    }
                } else if (itemDetails.type === this.itemTypes.CURRENCY) {
                    if (itemDetails.subType === 'coins') this.addCoins(userId, guildId, quantity, `loot_box_${boxId}`, weekendMultipliers);
                    else if (itemDetails.subType === 'gems') this.addGems(userId, guildId, quantity, `loot_box_${boxId}`, weekendMultipliers);
                    // Robux is not typically found in loot boxes, so no 'robux' subType check here by default.
                } else {
                    this.giveItem(userId, guildId, itemDetails.id, quantity, itemDetails.type || this.itemTypes.ITEM, `loot_box_open_${boxId}`);
                }
                allRolledItems.push({
                    id: itemDetails.id, name: itemDetails.name, emoji: itemDetails.emoji, quantity: quantity, type: itemDetails.type,
                    rarityValue: itemDetails.rarityValue || this._getItemMasterProperty(itemDetails.id, 'rarityValue') || 0,
                    baseProbability: itemDetails.probability, rolledChance: itemDetails.finalPickChance 
                });
            }
        }
        return { success: true, rewards: allRolledItems, openedBoxId: boxId, grantedSpecialRole: grantedSpecialRoleInThisOpen };
    }


    getBalance(userId, guildId) {
        const user = this.getUser(userId, guildId);
        return { coins: user.coins, gems: user.gems, robux: user.robux };
    }

    async addLevelManually(userId, guildId, levelsToAdd, member) {
        const user = this.getUser(userId, guildId); let newLevel = Math.max(0, user.level + levelsToAdd);
        if (newLevel > MAX_LEVEL) newLevel = MAX_LEVEL; const newXp = 0;
        this.updateUser(userId, guildId, { level: newLevel, xp: newXp });
        if (member) await this.checkAndAwardRoles(member, newLevel);
        return { newLevel: newLevel, newXp: newXp, oldLevel: user.level };
    }

    getLeaderboard(guildId, limit = 10) {
        return this.db.prepare( 'SELECT userId, level, xp FROM users WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT ?' ).all(guildId, limit);
    }

    getUser(userId, guildId) {
        let user = this.db.prepare('SELECT * FROM users WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!user) {
            const now = Date.now();
this.db.prepare(`
  INSERT INTO users (
    userId, guildId,
    coins, gems, robux,
    bankCoins, bankGems, bankTier,
    xp, level,
    totalRobuxEarned, lastRobuxWithdrawalTimestamp,
    dailyStreak, lastDailyTimestamp, lostStreak,
    lostStreakTimestamp,
    rewardsLastShiftedAt,
    lastDailyNotifyTimestamp,
    lastInterestTimestamp
  )
  VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, ?);
`).run(userId, guildId, now);
            user = this.db.prepare('SELECT * FROM users WHERE userId = ? AND guildId = ?').get(userId, guildId);
        }
        user.xp = user.xp || 0; user.level = user.level || 0; user.coins = user.coins || 0;
        user.gems = user.gems || 0; user.robux = user.robux || 0;
        user.bankCoins = user.bankCoins || 0; user.bankGems = user.bankGems || 0;
        user.bankTier = user.bankTier || 0; user.lastMessageTimestamp = user.lastMessageTimestamp || 0;
        user.lastDailyTimestamp = user.lastDailyTimestamp || 0; user.totalMessages = user.totalMessages || 0;
        user.totalXp = user.totalXp || 0; user.totalCoinsEarned = user.totalCoinsEarned || 0;
        user.totalGemsEarned = user.totalGemsEarned || 0; user.totalRobuxEarned = user.totalRobuxEarned || 0;
        user.totalVoiceXp = user.totalVoiceXp || 0; user.totalVoiceCoins = user.totalVoiceCoins || 0;
        user.cosmicTokenDiscovered = user.cosmicTokenDiscovered || 0;
        user.lastRobuxWithdrawalTimestamp = user.lastRobuxWithdrawalTimestamp || 0;
        user.dailyStreak = user.dailyStreak || 0;
        user.lostStreak = user.lostStreak || 0;
        user.lostStreakTimestamp = user.lostStreakTimestamp || 0;
        user.rewardsLastShiftedAt = user.rewardsLastShiftedAt || 0;
        user.lastDailyNotifyTimestamp = user.lastDailyNotifyTimestamp || 0;
        return user;
    }


    updateUser(userId, guildId, data) {
        const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
        const values = { ...data, userId, guildId };
        if (fields.length === 0) return;
        this.db.prepare(`UPDATE users SET ${fields} WHERE userId = @userId AND guildId = @guildId`).run(values);
    }

     getGuildSettings(guildId) {
         if (typeof guildId !== 'string' || guildId.trim() === '') {
            // Fallback for invalid guildId, ensure all default emojis are sourced safely
            return {
                guildId: null,
                coinEmoji: (this.gameConfig?.items?.coins?.emoji || DEFAULT_COIN_EMOJI).replace(/'/g, "''"),
                gemEmoji: (this.gameConfig?.items?.gems?.emoji || DEFAULT_GEM_EMOJI).replace(/'/g, "''"),
                robuxEmoji: (this.gameConfig?.items?.robux?.emoji || DEFAULT_ROBUX_EMOJI).replace(/'/g, "''"),
                weekendBoostActive: false, shopRestockDmEnabled: DEFAULT_SHOP_RESTOCK_DM_ENABLED,
                logChannelId: null, welcomeChannelId: null, leaveChannelId: null, levelUpChannelId: null,
                lootDropAlertChannelId: null, leaderboardChannelId: null, leaderboardMessageId: null,
                leaderboardLastUpdated: null, lastWeekendToggleTimestamp: null,
                lastWeekendBoostStartAnnounceTimestamp: 0, lastWeekendBoostEndAnnounceTimestamp: 0
            };
        }
        let settings = this.db.prepare('SELECT * FROM guildSettings WHERE guildId = ?').get(guildId);
        
        // Safely access emojis from gameConfig with fallbacks
        const defaultCoin = (this.gameConfig?.items?.coins?.emoji || DEFAULT_COIN_EMOJI).replace(/'/g, "''");
        const defaultGem = (this.gameConfig?.items?.gems?.emoji || DEFAULT_GEM_EMOJI).replace(/'/g, "''");
        const defaultRobux = (this.gameConfig?.items?.robux?.emoji || DEFAULT_ROBUX_EMOJI).replace(/'/g, "''");

        if (!settings) {
            this.db.prepare(
                `INSERT INTO guildSettings (guildId, coinEmoji, gemEmoji, robuxEmoji, weekendBoostActive, shopRestockDmEnabled, lastWeekendBoostStartAnnounceTimestamp, lastWeekendBoostEndAnnounceTimestamp)
                 VALUES (?, ?, ?, ?, 0, ?, 0, 0)`
            ).run(guildId, defaultCoin, defaultGem, defaultRobux, DEFAULT_SHOP_RESTOCK_DM_ENABLED ? 1: 0);
            settings = this.db.prepare('SELECT * FROM guildSettings WHERE guildId = ?').get(guildId);
        }
        settings.weekendBoostActive = !!settings.weekendBoostActive;
        settings.shopRestockDmEnabled = settings.shopRestockDmEnabled === null ? DEFAULT_SHOP_RESTOCK_DM_ENABLED : !!settings.shopRestockDmEnabled;
        
        // Ensure emojis are set if they were somehow null in DB, using safe defaults
        if (!settings.coinEmoji) settings.coinEmoji = defaultCoin;
        if (!settings.gemEmoji) settings.gemEmoji = defaultGem;
        if (!settings.robuxEmoji) settings.robuxEmoji = defaultRobux;
        
        settings.lastWeekendBoostStartAnnounceTimestamp = settings.lastWeekendBoostStartAnnounceTimestamp || 0;
        settings.lastWeekendBoostEndAnnounceTimestamp = settings.lastWeekendBoostEndAnnounceTimestamp || 0;
        return settings;
    }

    setGuildSettings(guildId, settingsToUpdate) {
        this.getGuildSettings(guildId); 
        const validColumns = this.db.prepare("PRAGMA table_info(guildSettings)").all().map(col => col.name);
        const updateClauses = []; const updateValues = {};
        for (const key in settingsToUpdate) {
            if (validColumns.includes(key) && key !== 'guildId') {
                updateClauses.push(`${key} = @${key}`);
                if (key === 'weekendBoostActive' || key === 'shopRestockDmEnabled') {
                    updateValues[key] = settingsToUpdate[key] ? 1 : 0;
                } else { updateValues[key] = settingsToUpdate[key]; }
            }
        }
        updateValues.guildId = guildId;
        if (updateClauses.length > 0) {
            const stmt = this.db.prepare(`UPDATE guildSettings SET ${updateClauses.join(', ')} WHERE guildId = @guildId`);
            stmt.run(updateValues);
        }
    }
    getUserDmSettings(userId, guildId) {
        let settings = this.db.prepare('SELECT enableShopRestockDm, enableDailyReadyDm FROM userDmSettings WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!settings) {
            this.db.prepare('INSERT INTO userDmSettings (userId, guildId, enableShopRestockDm, enableDailyReadyDm) VALUES (?, ?, NULL, NULL)').run(userId, guildId);
            return { enableShopRestockDm: null, enableDailyReadyDm: null };
        }
        return {
            enableShopRestockDm: settings.enableShopRestockDm === null ? null : !!settings.enableShopRestockDm,
            enableDailyReadyDm: settings.enableDailyReadyDm === null ? null : !!settings.enableDailyReadyDm
        };
    }
    updateUserDmSettings(userId, guildId, newSettings) {
        this.getUserDmSettings(userId, guildId);
        if (newSettings.hasOwnProperty('enableShopRestockDm')) {
            const val = newSettings.enableShopRestockDm === null ? null : (newSettings.enableShopRestockDm ? 1 : 0);
            this.db.prepare('UPDATE userDmSettings SET enableShopRestockDm = ? WHERE userId = ? AND guildId = ?').run(val, userId, guildId);
        }
        if (newSettings.hasOwnProperty('enableDailyReadyDm')) {
            const val2 = newSettings.enableDailyReadyDm === null ? null : (newSettings.enableDailyReadyDm ? 1 : 0);
            this.db.prepare('UPDATE userDmSettings SET enableDailyReadyDm = ? WHERE userId = ? AND guildId = ?').run(val2, userId, guildId);
        }
    }
    getAllUserItemLootAlertSettings(userId, guildId) {
        const settings = {};
        const rows = this.db.prepare("SELECT itemId, enableAlert FROM userLootAlertSettings WHERE userId = ? AND guildId = ?").all(userId, guildId);
        rows.forEach(row => { settings[row.itemId] = !!row.enableAlert; });
        return settings;
    }
    getUserItemLootAlertSetting(userId, guildId, itemId) {
        let setting = this.db.prepare('SELECT enableAlert FROM userLootAlertSettings WHERE userId = ? AND guildId = ? AND itemId = ?').get(userId, guildId, itemId);
        return { itemId, enableAlert: setting ? !!setting.enableAlert : true }; 
    }
    setUserItemLootAlertSetting(userId, guildId, itemId, enableAlert) {
        this.db.prepare('INSERT OR REPLACE INTO userLootAlertSettings (userId, guildId, itemId, enableAlert) VALUES (?, ?, ?, ?)').run(userId, guildId, itemId, enableAlert ? 1 : 0);
    }
    getAllUserShopAlertSettings(userId, guildId) {
        const settings = {};
        const rows = this.db.prepare("SELECT itemId, enableAlert FROM userShopAlertSettings WHERE userId = ? AND guildId = ?").all(userId, guildId);
        rows.forEach(row => { settings[row.itemId] = !!row.enableAlert; });
        return settings;
    }
    getUserShopAlertSetting(userId, guildId, itemId) {
        const row = this.db.prepare('SELECT enableAlert FROM userShopAlertSettings WHERE userId = ? AND guildId = ? AND itemId = ?').get(userId, guildId, itemId);
        return { itemId, enableAlert: row ? !!row.enableAlert : true };
    }
    setUserShopAlertSetting(userId, guildId, itemId, enableAlert) {
        this.db.prepare('INSERT OR REPLACE INTO userShopAlertSettings (userId, guildId, itemId, enableAlert) VALUES (?, ?, ?, ?)').run(userId, guildId, itemId, enableAlert ? 1 : 0);
    }
    getUserGlobalLootAlertSettings(userId, guildId) {
        let settings = this.db.prepare('SELECT alertRarityThreshold FROM userGlobalLootAlertSettings WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!settings) {
            this.db.prepare('INSERT INTO userGlobalLootAlertSettings (userId, guildId, alertRarityThreshold) VALUES (?, ?, ?)').run(userId, guildId, DEFAULT_ANNOUNCE_RARITY_THRESHOLD);
            return { alertRarityThreshold: DEFAULT_ANNOUNCE_RARITY_THRESHOLD };
        }
        return settings;
    }
    setUserGlobalLootAlertSettings(userId, guildId, threshold) {
        this.db.prepare('INSERT OR REPLACE INTO userGlobalLootAlertSettings (userId, guildId, alertRarityThreshold) VALUES (?, ?, ?)').run(userId, guildId, threshold);
    }
    addXP(userId, guildId, amount, member, isManualOrVoice = false, weekendXpMultiplierFromArg) {
        const effectiveWeekendXpMultiplier = weekendXpMultiplierFromArg || this.globalWeekendMultipliers?.xp || (this.gameConfig.globalSettings?.WEEKEND_XP_MULTIPLIER || WEEKEND_XP_MULTIPLIER);
        if (amount <= 0 && !isManualOrVoice) return { leveledUp: false, newLevel: 0, newXp: 0, oldLevel: 0, assignedRole: null, xpEarned: 0, xpToNextLevel: 0, levelUpMessage: null };
        const user = this.getUser(userId, guildId);
        if (user.level >= MAX_LEVEL && !isManualOrVoice && amount > 0) {
             return { leveledUp: false, newLevel: user.level, newXp: 0, oldLevel: user.level, assignedRole: null, xpEarned: 0, xpToNextLevel: 0, levelUpMessage: null };
        }
        const guildSettings = this.getGuildSettings(guildId);
        const isWeekend = guildSettings.weekendBoostActive;
        let finalAmount = amount;
        const xpCharms = this.getActiveCharms(userId, guildId, this.CHARM_TYPES.XP);
        let charmXpBoost = 0;
        xpCharms.forEach(charm => { charmXpBoost += (charm.boostValue || 0); });
        finalAmount += charmXpBoost;
        if (isWeekend && !isManualOrVoice && finalAmount > 0) { finalAmount *= effectiveWeekendXpMultiplier; }
        finalAmount = Math.round(finalAmount);
        if (finalAmount <= 0 && !isManualOrVoice && amount > 0) finalAmount = 1;
        else if (finalAmount < 0 && isManualOrVoice) { /* Allow negative XP for admin */ }
        else if (finalAmount <= 0 && !isManualOrVoice) finalAmount = 0;
        let newXp = user.xp + finalAmount; let newLevel = user.level; let leveledUp = false;
        let assignedRole = null; const oldLevel = user.level; let levelUpMessage = null;
        let xpForNextLevel = (LEVEL_UP_BASE_XP + newLevel * LEVEL_UP_XP_INCREMENT);
        if (finalAmount > 0) {
            while (newXp >= xpForNextLevel && newLevel < MAX_LEVEL) {
                newXp -= xpForNextLevel; newLevel++; leveledUp = true;
                xpForNextLevel = (LEVEL_UP_BASE_XP + newLevel * LEVEL_UP_XP_INCREMENT);
                if (LEVEL_ROLES[newLevel.toString()]) { assignedRole = LEVEL_ROLES[newLevel.toString()]; }
                levelUpMessage = `🎉 Congratulations ${member ? member.displayName : 'User'}! You've reached Level **${newLevel}**!`;
            }
            if (newLevel >= MAX_LEVEL) {
                newLevel = MAX_LEVEL; newXp = 0;
                if(user.level < MAX_LEVEL) { leveledUp = true; levelUpMessage = `🎉 Congratulations ${member ? member.displayName : 'User'}! You've reached the MAX Level **${newLevel}**!`; }
            }
        } else if (finalAmount < 0) {
             while (newXp < 0 && newLevel > 0) {
                newLevel--; xpForNextLevel = (LEVEL_UP_BASE_XP + newLevel * LEVEL_UP_XP_INCREMENT);
                newXp += xpForNextLevel; leveledUp = true;
                 if (LEVEL_ROLES[(newLevel + 1).toString()]) { assignedRole = LEVEL_ROLES[(newLevel + 1).toString()]; }
                levelUpMessage = `📉 Oh no, ${member ? member.displayName : 'User'}! You've de-leveled to Level **${newLevel}**!`;
            }
            if (newLevel === 0 && newXp < 0) newXp = 0;
        }
        this.updateUser(userId, guildId, { xp: newXp, level: newLevel, totalXp: (user.totalXp || 0) + finalAmount });
        if (leveledUp && member) { this.checkAndAwardRoles(member, newLevel); }
        return { leveledUp, oldLevel, newLevel, newXp, assignedRole, xpEarned: finalAmount, xpToNextLevel: newLevel >= MAX_LEVEL ? 0 : xpForNextLevel - newXp, levelUpMessage };
    }
    async checkAndAwardRoles(member, currentLevel) {
        if (!member || !member.guild || !member.manageable) return;
        const rolesToAdd = []; const rolesToRemove = []; const memberRoles = member.roles.cache;
        for (const levelThreshold in LEVEL_ROLES) {
            const levelThresholdNum = parseInt(levelThreshold); const roleId = LEVEL_ROLES[levelThreshold];
            const role = member.guild.roles.cache.get(roleId);
            if (!role || role.position >= member.guild.members.me.roles.highest.position) continue;
            if (currentLevel >= levelThresholdNum) { if (!memberRoles.has(roleId)) rolesToAdd.push(roleId); }
            else { if (memberRoles.has(roleId)) rolesToRemove.push(roleId); }
        }
        try {
            if (rolesToAdd.length > 0) await member.roles.add(rolesToAdd, 'Level up role assignment');
            if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove, 'Level down role adjustment');
        } catch (error) { console.warn(`[RoleCheck] Error updating roles for ${member.user.tag}: ${error.message}`); }
    }
    async setLevel(userId, guildId, level, member) {
        const user = this.getUser(userId, guildId); let newLevel = Math.max(0, level);
        if (newLevel > MAX_LEVEL) newLevel = MAX_LEVEL; const newXp = 0;
        this.updateUser(userId, guildId, { level: newLevel, xp: newXp });
        if (member) await this.checkAndAwardRoles(member, newLevel);
        return { newLevel: newLevel, newXp: newXp, oldLevel: user.level };
    }
    async buildItemInfoEmbed(itemId, category, userId, guildId, clientInstance) {
        const itemConfig = this._getItemMasterProperty(itemId, null);
        if (!itemConfig) {
            return new EmbedBuilder().setColor(0xFF0000).setTitle('Item Not Found').setDescription(`Could not find detailed information for item ID: \`${itemId}\`.`);
        }
        if (itemConfig.id === this.COSMIC_ROLE_TOKEN_ID) {
            let hasAccessToInfo = await this._hasUserDiscoveredCosmicToken(userId, guildId, clientInstance);
            if (!hasAccessToInfo) {
                const tokenInInventory = this.getItemFromInventory(userId, guildId, this.COSMIC_ROLE_TOKEN_ID);
                if (tokenInInventory && tokenInInventory.quantity > 0) hasAccessToInfo = true;
            }
            if (!hasAccessToInfo) {
                return new EmbedBuilder().setColor(0x7F8C8D).setTitle('❓ Unknown Item ❓').setDescription("You have not discovered this item yet, or do not possess it. Its details are hidden.").setFooter({ text: `Item ID: ${itemId}` }).setTimestamp();
            }
        }
        const itemName = itemConfig.name || itemId; const itemEmoji = itemConfig.emoji || '❓';
        const embed = new EmbedBuilder().setTitle(`${itemEmoji} ${itemName} Details ${itemEmoji}`).setDescription(itemConfig.description || 'No description available.').setThumbnail(itemConfig.imageUrl || null).setFooter({ text: `Item ID: ${itemConfig.id}` }).setTimestamp();
        const rarityString = this._getItemRarityString(itemConfig.id, itemConfig, category);
        const rarityColor = this._getRarityColor(rarityString); embed.setColor(rarityColor);
        embed.addFields({ name: '💎 Rarity', value: `**${rarityString}**`, inline: true }, { name: '🏷️ Type', value: `\`${itemConfig.type || 'Unknown'}\``, inline: true });

        if (itemConfig.basePrice !== undefined && itemConfig.basePrice !== null) {
            const priceCurrencyEmoji = itemConfig.priceCurrency === 'gems' ? this.gemEmoji : (itemConfig.priceCurrency === 'robux' ? this.robuxEmoji : this.coinEmoji);
            embed.addFields({ name: `💰 Base Shop Price`, value: `\`${itemConfig.basePrice.toLocaleString()}\` ${priceCurrencyEmoji}`, inline: true });
        }

        if (itemConfig.stockRangeShop) {
            embed.addFields({ name: '📦 Shop Stock Range', value: `\`${itemConfig.stockRangeShop[0]}-${itemConfig.stockRangeShop[1]}\``, inline: true });
        }
        if (itemConfig.type === this.itemTypes.LOOT_BOX) {
            embed.addFields({ name: '🎲 Rolls per Box', value: `\`${itemConfig.numRolls || '1'}\``, inline: true });
            const contents = await this._getLootBoxContentsFormatted(itemId, userId, guildId);
            if (contents.length > 0) embed.addFields({ name: '🎁 Contents', value: contents.join('\n'), inline: false });
        } else if (itemConfig.type === this.itemTypes.CHARM) {
            embed.addFields({ name: '✨ Buff Effect', value: this._getCharmBuffFormatted(itemConfig), inline: false });
        } else if (itemConfig.id === this.COSMIC_ROLE_TOKEN_ID) {
            embed.addFields({ name: '👑 Special Role', value: `<@&${this.SPECIAL_ROLE_ID_TO_GRANT}>`, inline: true }, { name: 'Status', value: 'You have access to this token\'s information!', inline: true });
        } else if (itemConfig.type === this.itemTypes.CURRENCY_ITEM || itemConfig.id === 'coins' || itemConfig.id === 'gems' || itemConfig.id === 'robux') {
            const balance = this.getBalance(userId, guildId);
            const bankBalance = this.getBankBalance(userId, guildId);
            let currencyEmoji = '💰';
            let currencyCap = 0;
            let currentWallet = 0;
            let currentBank = 0;
            let bankCap = 0;

            if (itemId === 'coins' || itemConfig.id === 'coins') {
                currencyEmoji = this.coinEmoji;
                currencyCap = INVENTORY_COIN_CAP;
                currentWallet = balance.coins;
                currentBank = bankBalance.bankCoins;
                bankCap = BANK_TIERS[bankBalance.bankTier]?.coinCap || 0;
            } else if (itemId === 'gems' || itemConfig.id === 'gems') {
                currencyEmoji = this.gemEmoji;
                currencyCap = INVENTORY_GEM_CAP;
                currentWallet = balance.gems;
                currentBank = bankBalance.bankGems;
                bankCap = BANK_TIERS[bankBalance.bankTier]?.gemCap || 0;
            } else if (itemId === 'robux' || itemConfig.id === 'robux') {
                currencyEmoji = this.robuxEmoji;
                currencyCap = INVENTORY_ROBUX_CAP;
                currentWallet = balance.robux;
            }
            embed.addFields({ name: 'Balance', value: `Wallet: \`${currentWallet.toLocaleString()} / ${currencyCap.toLocaleString()}\` ${currencyEmoji}${ (itemId === 'coins' || itemId === 'gems') ? `\nBank: \`${currentBank.toLocaleString()} / ${bankCap.toLocaleString()}\` ${currencyEmoji}` : ''}`, inline: false });
        }
        const waysToObtain = await this._getWaysToObtainFormatted(itemId, itemConfig, userId, guildId);
        if (waysToObtain.length > 0) embed.addFields({ name: '🗺️ Ways to Obtain', value: waysToObtain.join('\n'), inline: false });
        return embed;
    }

    _addToUserInventorySQL(userId, guildId, itemId, quantity, itemType) {
        const currentItem = this.db.prepare('SELECT quantity FROM userInventory WHERE userId = ? AND guildId = ? AND itemId = ?').get(userId, guildId, itemId);
        if (currentItem) {
            this.db.prepare('UPDATE userInventory SET quantity = quantity + ? WHERE userId = ? AND guildId = ? AND itemId = ?').run(quantity, userId, guildId, itemId);
        } else {
            const typeToInsert = Object.values(this.itemTypes).includes(itemType) ? itemType : this.itemTypes.ITEM;
            this.db.prepare('INSERT INTO userInventory (userId, guildId, itemId, quantity, itemType) VALUES (?, ?, ?, ?, ?)').run(userId, guildId, itemId, quantity, typeToInsert);
        }
    }
    giveItem(userId, guildId, itemId, quantity, itemType, source = 'unknown_acquisition') {
        if (!quantity || quantity <= 0) return { success: false, activated: false, message: "Quantity must be positive." };
        this.getUser(userId, guildId); // Ensure user exists
        const itemMasterConfig = this._getItemMasterProperty(itemId, null);
        
        // If itemMasterConfig is null (item not found by _getItemMasterProperty when propertyName is null)
        if (!itemMasterConfig) {
            return { success: false, activated: false, message: `Item ID "${itemId}" not found in configuration.`};
        }

        const effectiveItemType = itemType || itemMasterConfig.type;
        const itemName = itemMasterConfig.name || itemId; // Fallback to ID if name is missing
        const itemEmoji = itemMasterConfig.emoji; // Will be undefined if not set, handled by fallback in message

        // Handle currency types first
        if (itemId === 'robux' && (effectiveItemType === this.itemTypes.CURRENCY || effectiveItemType === this.itemTypes.CURRENCY_ITEM)) {
            const robuxResult = this.addRobux(userId, guildId, quantity, source);
            if (robuxResult.success) {
                return { success: true, activated: false, message: `${itemEmoji || this.robuxEmoji || '💸'} **${itemName}** (x${quantity}) added to your balance.` };
            } else {
                return { success: false, activated: false, message: `Failed to add ${itemEmoji || this.robuxEmoji || '💸'} **${itemName}** (x${quantity}) to your balance.` };
            }
        } else if (itemId === 'coins' && (effectiveItemType === this.itemTypes.CURRENCY || effectiveItemType === this.itemTypes.CURRENCY_ITEM)) {
            const coinResult = this.addCoins(userId, guildId, quantity, source, this.globalWeekendMultipliers);
            if (coinResult.success) {
                return { success: true, activated: false, message: `${itemEmoji || this.coinEmoji || '💰'} **${itemName}** (x${quantity}) added to your balance.` };
            } else {
                return { success: false, activated: false, message: `Failed to add ${itemEmoji || this.coinEmoji || '💰'} **${itemName}** (x${quantity}) to your balance.` };
            }
        } else if (itemId === 'gems' && (effectiveItemType === this.itemTypes.CURRENCY || effectiveItemType === this.itemTypes.CURRENCY_ITEM)) {
            const gemResult = this.addGems(userId, guildId, quantity, source, this.globalWeekendMultipliers);
            if (gemResult.success) {
                return { success: true, activated: false, message: `${itemEmoji || this.gemEmoji || '💎'} **${itemName}** (x${quantity}) added to your balance.` };
            } else {
                return { success: false, activated: false, message: `Failed to add ${itemEmoji || this.gemEmoji || '💎'} **${itemName}** (x${quantity}) to your balance.` };
            }
        }

        const isAdminSource = source.startsWith('admin_') || source.startsWith('test_') || source === 'admin_add_user_panel_give';

        if (effectiveItemType === this.itemTypes.CHARM && !isAdminSource) { // Auto-activate only if NOT admin source
            for (let i = 0; i < quantity; i++) { this.activateCharm(userId, guildId, { charmId: itemId, source: source }); }
            return { success: true, activated: true, message: `${itemEmoji || '✨'} **${itemName}** (x${quantity}) activated immediately!` };
        } else { // This 'else' now handles normal items AND charms from admin sources (which get added to inventory)
            this._addToUserInventorySQL(userId, guildId, itemId, quantity, effectiveItemType);
            // For charms added to inventory by admin, ensure the message doesn't say "activated"
            if (effectiveItemType === this.itemTypes.CHARM && isAdminSource) {
                 return { success: true, activated: false, message: `${itemEmoji || '✨'} **${itemName}** (x${quantity}) added to inventory.` };
            }
            // For other items added to inventory
            return { success: true, activated: false, message: `${itemEmoji || '❓'} **${itemName}** (x${quantity}) added to inventory.` };
        }
    }

// Also, a slight improvement to _getItemMasterProperty for clarity when an item ID is not found
// and the whole object was requested.
    _getItemMasterProperty(itemId, propertyName, defaultValueIfPropertyMissing = null) {
        if (!this.gameConfig || !this.gameConfig.items) {
            console.error("[_getItemMasterProperty] gameConfig or gameConfig.items is not available!");
            if (propertyName === null) {
                // If gameConfig.items itself is missing, and we want the whole object, return the default.
                return defaultValueIfPropertyMissing;
            }
            return defaultValueIfPropertyMissing;
        }
        const item = this.gameConfig.items[itemId];

        if (!item) { // Item itself not found by itemId
            if (propertyName === null) {
                // Caller wants the whole config. If not found, return the default.
                return defaultValueIfPropertyMissing; // MODIFIED LINE
            }
            // Fallbacks for core currencies if itemId is 'coins', 'gems', 'robux'
            if (propertyName === 'name') {
                if (itemId === 'coins') return this.gameConfig.items.coins?.name || 'Coins';
                if (itemId === 'gems') return this.gameConfig.items.gems?.name || 'Gems';
                if (itemId === 'robux') return this.gameConfig.items.robux?.name || 'Robux';
            }
            if (propertyName === 'emoji') {
                if (itemId === 'coins') return this.gameConfig.items.coins?.emoji || DEFAULT_COIN_EMOJI;
                if (itemId === 'gems') return this.gameConfig.items.gems?.emoji || DEFAULT_GEM_EMOJI;
                if (itemId === 'robux') return this.gameConfig.items.robux?.emoji || DEFAULT_ROBUX_EMOJI;
            }
            return defaultValueIfPropertyMissing; // Property not found in fallbacks or item itself missing
        }

        // Item found
        if (propertyName === null) return item; // Return the whole item object

        if (Object.prototype.hasOwnProperty.call(item, propertyName)) {
            return item[propertyName];
        }
        return defaultValueIfPropertyMissing; // Property not found on the item
    }
    addItemToInventory(userId, guildId, itemId, itemType, quantity, source = 'admin_give') {
        return this.giveItem(userId, guildId, itemId, quantity, itemType, source);
    }
    takeItem(userId, guildId, itemId, quantity) {
        if (quantity <= 0) return true;
        this.getUser(userId, guildId);
        const currentItem = this.db.prepare('SELECT quantity FROM userInventory WHERE userId = ? AND guildId = ? AND itemId = ?').get(userId, guildId, itemId);
        if (!currentItem || currentItem.quantity < quantity) return false;
        if (currentItem.quantity === quantity) {
            this.db.prepare('DELETE FROM userInventory WHERE userId = ? AND guildId = ? AND itemId = ?').run(userId, guildId, itemId);
        } else {
            this.db.prepare('UPDATE userInventory SET quantity = quantity - ? WHERE userId = ? AND guildId = ? AND itemId = ?').run(quantity, userId, guildId, itemId);
        }
        return true;
    }
    getUserInventory(userId, guildId) {
    this.getUser(userId, guildId);
    const inventoryItems = this.db.prepare(`SELECT ui.itemId, ui.quantity, ui.itemType FROM userInventory ui WHERE ui.userId = ? AND ui.guildId = ? AND ui.quantity > 0`).all(userId, guildId);
    const categorizedInventory = { generalItems: [], lootBoxes: [], charms: [], cosmicTokens: [] };

    inventoryItems.forEach(dbItem => {
        // *** ADD FILTER FOR CURRENCIES ***
        const masterItemCheck = this._getItemMasterProperty(dbItem.itemId, null);
        if (masterItemCheck && (masterItemCheck.type === this.itemTypes.CURRENCY || masterItemCheck.type === this.itemTypes.CURRENCY_ITEM || dbItem.itemId === 'robux' || dbItem.itemId === 'coins' || dbItem.itemId === 'gems')) {
            // console.warn(`[UserInventory] Currency item '${dbItem.itemId}' found in userInventory table for ${userId}. This should be a direct balance. Ignoring for inventory display.`);
            return; // Skip currency items from appearing as inventory items
        }
        // *** END FILTER ***

        const masterItem = this._getItemMasterProperty(dbItem.itemId, null);
        if (!masterItem) { console.warn(`[UserInventory] Item ID "${dbItem.itemId}" found in user DB inventory but not in master config. Skipping display for this item.`); return; }
        const enrichedItem = {
            itemId: dbItem.itemId, quantity: dbItem.quantity, itemType: dbItem.itemType || masterItem.type, name: masterItem.name,
            emoji: masterItem.emoji, description: masterItem.description || null, numRolls: masterItem.numRolls || null, rarityValue: masterItem.rarityValue || 0
        };
        const effectiveType = enrichedItem.itemType;
        if (effectiveType === this.itemTypes.LOOT_BOX) categorizedInventory.lootBoxes.push(enrichedItem);
        else if (effectiveType === this.itemTypes.CHARM) categorizedInventory.charms.push(enrichedItem);
        else if (effectiveType === this.itemTypes.COSMIC_TOKEN || enrichedItem.itemId === this.COSMIC_ROLE_TOKEN_ID) categorizedInventory.cosmicTokens.push(enrichedItem);
        else categorizedInventory.generalItems.push(enrichedItem);
    });
    return categorizedInventory;
}
    getAllLootBoxDefinitionsForInfo() {
        return Object.values(this.gameConfig.items).filter(item => item.type === this.itemTypes.LOOT_BOX).map(lb => ({ id: lb.id, name: lb.name, emoji: lb.emoji || '📦' }));
    }
    getAllCharmDefinitionsForInfo() {
        // Exclude luck_charm if it was previously a type
        return Object.values(this.gameConfig.items).filter(item => item.type === this.itemTypes.CHARM && item.id !== 'luck_charm').map(charm => ({ id: charm.id, name: charm.name, emoji: charm.emoji || '✨' }));
    }
    getAllOtherItemsForInfo() {
        return Object.values(this.gameConfig.items).filter(item => ![this.itemTypes.LOOT_BOX, this.itemTypes.CHARM, this.itemTypes.CURRENCY, this.itemTypes.JUNK].includes(item.type)).map(item => ({ id: item.id, name: item.name, emoji: item.emoji || '❓'}));
    }
    processLootDrop(userId, guildId, lootItemConfig, member, weekendMultipliers) {
        const effectiveWeekendMultipliers = weekendMultipliers || this.globalWeekendMultipliers || { currency: 1.0, xp: 1.0, luck: 1.0 };
        if (!lootItemConfig || !lootItemConfig.id) return { grantedSpecialRole: false };
        let grantedSpecialRole = false; const source = `drop_${lootItemConfig.id}`;
        const effectiveType = lootItemConfig.type;
        if (lootItemConfig.id === this.COSMIC_ROLE_TOKEN_ID) {
            this.giveItem(userId, guildId, lootItemConfig.id, 1, this.itemTypes.COSMIC_TOKEN, source);
            if (member && member.guild) {
                const roleToGrantId = this._getItemMasterProperty(this.COSMIC_ROLE_TOKEN_ID, 'roleIdToGrant');
                const role = member.guild.roles.cache.get(roleToGrantId);
                if (role && !member.roles.cache.has(roleToGrantId)) {
                    if (member.manageable && role.position < member.guild.members.me.roles.highest.position) {
                        member.roles.add(role).then(() => console.log(`[SpecialRole] Granted ${role.name} to ${member.user.tag} from ${lootItemConfig.name} drop.`)).catch(err => console.error(`[SpecialRole] Failed to grant role ${roleToGrantId} to ${member.user.tag}:`, err));
                        grantedSpecialRole = true; this.updateUser(userId, guildId, { cosmicTokenDiscovered: 1 });
                    } else { console.warn(`[SpecialRole] Cannot grant role ${role.name} to ${member.user.tag}: Bot permissions or role hierarchy issue.`); }
                } else if (role && member.roles.cache.has(roleToGrantId)) { grantedSpecialRole = true; }
            }
        } else if (effectiveType === this.itemTypes.CURRENCY) {
            const min = lootItemConfig.min || 1; const max = lootItemConfig.max || lootItemConfig.min || 1;
            const value = min + Math.floor(Math.random() * (max - min + 1));
            if (lootItemConfig.subType === 'coins') this.addCoins(userId, guildId, value, source, effectiveWeekendMultipliers);
            else if (lootItemConfig.subType === 'gems') this.addGems(userId, guildId, value, source, effectiveWeekendMultipliers);
            // Robux is not set to drop directly from loot tables by default
        } else {
            this.giveItem(userId, guildId, lootItemConfig.id, 1, effectiveType, source);
        }
        return { grantedSpecialRole };
    }
    async useItem(userId, guildId, itemId, amount, weekendMultipliers, member, checkAndAwardSpecialRoleFn) {
        const effectiveWeekendMultipliers = weekendMultipliers || this.globalWeekendMultipliers || { currency: 1.0, xp: 1.0, luck: 1.0 };
        const itemMasterConfig = this._getItemMasterProperty(itemId, null);
        if (!itemMasterConfig || !itemMasterConfig.id) return { success: false, message: "Item configuration not found." };
        const itemInInventory = this.getItemFromInventory(userId, guildId, itemId);
        if (!itemInInventory || itemInInventory.quantity < amount) return { success: false, message: "Not enough items in inventory." };
        const effectiveItemType = itemInInventory.itemType || itemMasterConfig.type;
        const itemName = itemMasterConfig.name; const itemEmoji = itemMasterConfig.emoji;

        if (effectiveItemType === this.itemTypes.LOOT_BOX || effectiveItemType === SHOP_ITEM_TYPES.LOOTBOX) {
            let allRewardsFromOpening = []; let itemsToNotifyUserAbout = []; let anySpecialRoleGrantedThisOpening = false;
            let charmsObtainedDetailsAccumulated = [];
            for (let i = 0; i < amount; i++) {
                const takeResult = this.takeItem(userId, guildId, itemId, 1);
                if (!takeResult) {
                    console.warn(`[UseItem] Failed to take ${itemName} (attempt ${i + 1}) for user ${userId}. Remaining openings aborted.`);
                    const consolidatedRewardsSoFar = allRewardsFromOpening.reduce((acc, reward) => { /* ... consolidation logic ... */ return acc; }, []);
                    return { success: allRewardsFromOpening.length > 0, message: `Opened ${i}x ${itemEmoji} **${itemName}**. Failed to open further.`, itemsRolled: consolidatedRewardsSoFar, charmsObtainedDetails: charmsObtainedDetailsAccumulated, itemsToNotify: itemsToNotifyUserAbout, grantedSpecialRole: anySpecialRoleGrantedThisOpening };
                }
                const singleBoxOpeningResult = await this.openLootBox(userId, guildId, itemId, effectiveWeekendMultipliers, member, checkAndAwardSpecialRoleFn);
                if (singleBoxOpeningResult.success && singleBoxOpeningResult.rewards) {
                    allRewardsFromOpening.push(...singleBoxOpeningResult.rewards);
                    if (singleBoxOpeningResult.grantedSpecialRole) anySpecialRoleGrantedThisOpening = true;
                    if (singleBoxOpeningResult.charmsObtainedDetails) charmsObtainedDetailsAccumulated.push(...singleBoxOpeningResult.charmsObtainedDetails);
                    const userGlobalAlertSettings = this.getUserGlobalLootAlertSettings(userId, guildId);
                    singleBoxOpeningResult.rewards.forEach(reward => {
                        const itemSpecificAlertSetting = this.getUserItemLootAlertSetting(userId, guildId, reward.id);
                        const isCosmic = reward.id === this.COSMIC_ROLE_TOKEN_ID;
                        let decisionRarityValue;
                        if (reward.rolledChance && reward.rolledChance > 0) decisionRarityValue = Math.round(1 / reward.rolledChance);
                        else { const rewardMasterConfigFallback = this._getItemMasterProperty(reward.id, null); decisionRarityValue = rewardMasterConfigFallback?.rarityValue || 0; }
                        if (itemSpecificAlertSetting.enableAlert && (isCosmic || (userGlobalAlertSettings.alertRarityThreshold > 0 && decisionRarityValue >= userGlobalAlertSettings.alertRarityThreshold))) {
                            itemsToNotifyUserAbout.push({ ...reward, fromBox: itemName, chance: reward.rolledChance, threshold: userGlobalAlertSettings.alertRarityThreshold });
                        }
                    });
                } else { console.warn(`[UseItem] Failed to process rewards for one ${itemName} (attempt ${i + 1}) for user ${userId}. Message: ${singleBoxOpeningResult.message}`); }
            }
            const consolidatedRewards = allRewardsFromOpening.reduce((acc, reward) => {
                const existing = acc.find(r => r.id === reward.id && r.name === reward.name);
                if (existing) existing.quantity += reward.quantity;
                else { const masterConfig = this._getItemMasterProperty(reward.id, null); acc.push({ id: reward.id, name: reward.name || masterConfig?.name || "Unknown Item", emoji: reward.emoji || masterConfig?.emoji || "❓", quantity: reward.quantity, type: reward.type || masterConfig?.type, rarityValue: reward.rarityValue || masterConfig?.rarityValue || 0, baseProbability: reward.baseProbability, rolledChance: reward.rolledChance }); }
                return acc;
            }, []);
            return { success: true, message: `Opened ${amount}x ${itemEmoji} **${itemName}**.`, itemsRolled: consolidatedRewards, charmsObtainedDetails: charmsObtainedDetailsAccumulated, itemsToNotify: itemsToNotifyUserAbout, grantedSpecialRole: anySpecialRoleGrantedThisOpening };
        } else if (effectiveItemType === this.itemTypes.COSMIC_TOKEN && itemId === this.COSMIC_ROLE_TOKEN_ID) {
            const takeResult = this.takeItem(userId, guildId, itemId, amount);
            if (!takeResult) return { success: false, message: `Not enough ${itemName} to use.` };
            if (member && checkAndAwardSpecialRoleFn) { try { await checkAndAwardSpecialRoleFn(member, `using ${itemName}`, itemName); } catch (e) { console.error("[UseItem Error] in checkAndAwardSpecialRoleFn (cosmic token):", e); } }
            return { success: true, message: `You have used ${amount}x ${itemEmoji} **${itemName}**! The universe has acknowledged you.`};
        } else if (effectiveItemType === this.itemTypes.CHARM) {
            const charmMasterDetails = this._getItemMasterProperty(itemId, null);
            if (!charmMasterDetails || !charmMasterDetails.charmType) return { success: false, message: `Charm details for ${itemName} not found or invalid.` };
            const takeResult = this.takeItem(userId, guildId, itemId, amount);
            if (!takeResult) return { success: false, message: `Not enough ${itemName} to use.`};
            for (let i = 0; i < amount; i++) { this.activateCharm(userId, guildId, { charmId: itemId, source: `inventory_use_${itemId}` }); }
            return { success: true, message: `Activated ${amount}x ${itemEmoji} **${itemName}** from inventory.` };
        } else if ([this.itemTypes.ITEM, this.itemTypes.JUNK, this.itemTypes.COLLECTIBLE, this.itemTypes.SPECIAL_ROLE_ITEM].includes(effectiveItemType)) {
            const takeResult = this.takeItem(userId, guildId, itemId, amount);
            if (!takeResult) return { success: false, message: `Not enough ${itemEmoji} **${itemName}** (x${amount}) to use.` };
            return { success: true, message: `You have used ${amount}x ${itemEmoji} **${itemName}**.` };
        }
        console.warn(`[UseItem] Item "${itemName}" (${effectiveItemType}) cannot be used this way or its usage action is not defined.`);
        return { success: false, message: `Item "${itemName}" (${effectiveItemType}) cannot be used this way or its usage action is not defined.` };
    }
    activateCharm(userId, guildId, charmDetails) {
        const charmConfig = this._getItemMasterProperty(charmDetails.charmId, null);
        if (!charmConfig || !charmConfig.charmType || typeof charmConfig.boost !== 'number') { console.warn(`[ActivateCharm] Config, charmType, or boost not valid for charm ID: ${charmDetails.charmId}`); return; }
        this.db.prepare(`INSERT INTO userActiveCharms (userId, guildId, charmId, charmType, boostValue, source) VALUES (?, ?, ?, ?, ?, ?)`).run(userId, guildId, charmDetails.charmId, charmConfig.charmType, charmConfig.boost, charmDetails.source);
    }
    getActiveCharms(userId, guildId, charmTypeFilter = null) {
        let query = 'SELECT charmInstanceId, userId, guildId, charmId, charmType, boostValue, expiryTimestamp, source FROM userActiveCharms WHERE userId = ? AND guildId = ?'; const params = [userId, guildId];
        if (charmTypeFilter) { query += ' AND charmType = ?'; params.push(charmTypeFilter); }
        return this.db.prepare(query).all(...params);
    }
    
    // Luck related calculation methods removed
    
    getLevelInfo(userId, guildId) {
        const user = this.getUser(userId, guildId);
        const rankData = this.db.prepare(`SELECT COUNT(*) + 1 as rank FROM users WHERE guildId = ? AND (level > ? OR (level = ? AND xp > ?))`).get(guildId, user.level, user.level, user.xp);
        const xpNeededForNext = user.level >= MAX_LEVEL ? 0 : (LEVEL_UP_BASE_XP + user.level * LEVEL_UP_XP_INCREMENT);
        return { level: user.level, xp: user.xp, xpNeeded: xpNeededForNext, rank: rankData?.rank || (this.db.prepare('SELECT COUNT(*) as c FROM users WHERE guildId = ?').get(guildId).c > 0 ? this.db.prepare('SELECT COUNT(*) as c FROM users WHERE guildId = ?').get(guildId).c : 1) };
    }

    getHighestCurrentLevelRoleNameAndId(member, currentLevel) {
        if (!member || !member.guild) return { name: 'No Role', id: null };
        let highestRoleMet = null; let highestLevelMet = -1; const memberRoles = member.roles.cache;
        for (const levelThreshold in LEVEL_ROLES) {
            const levelThresholdNum = parseInt(levelThreshold); const roleId = LEVEL_ROLES[levelThreshold];
            const role = member.guild.roles.cache.get(roleId);
            if (!role || role.position >= member.guild.members.me.roles.highest.position) continue;
            if (currentLevel >= levelThresholdNum && levelThresholdNum > highestLevelMet) {
                if (memberRoles.has(roleId)) { highestLevelMet = levelThresholdNum; highestRoleMet = { name: role.name, id: role.id }; }
            }
        }
        return highestRoleMet || { name: 'No Level Role', id: null };
    }

    getBankBalance(userId, guildId) { const user = this.getUser(userId, guildId); return { bankCoins: user.bankCoins || 0, bankGems: user.bankGems || 0, bankTier: user.bankTier || 0 }; }
    getBankCapacity(userId, guildId) { const user = this.getUser(userId, guildId); const tier = user.bankTier || 0; const tierInfo = BANK_TIERS[tier] || BANK_TIERS[0]; return { coinCap: tierInfo.coinCap, gemCap: tierInfo.gemCap }; }

    depositToBank(userId, guildId, currencyType, amount) {
        const user = this.getUser(userId, guildId); const bankCapacity = this.getBankCapacity(userId, guildId);
        const guildEmojis = this.getGuildSettings(guildId); let success = false; let message = "";
        if (currencyType === 'coins') {
            if (user.coins < amount) message = `❌ Not enough coins. You have ${user.coins.toLocaleString()} ${guildEmojis.coinEmoji}.`;
            else if (amount <=0 ) message = "❌ Deposit amount must be positive.";
            else {
                const spaceAvailable = bankCapacity.coinCap - user.bankCoins; const amountToDeposit = Math.min(amount, spaceAvailable);
                if (amountToDeposit <= 0 && amount > 0) message = `❌ Bank coin storage is full.`;
                else { this.updateUser(userId, guildId, { coins: user.coins - amountToDeposit, bankCoins: user.bankCoins + amountToDeposit }); message = `✅ Deposited ${amountToDeposit.toLocaleString()} ${guildEmojis.coinEmoji}.`; if (amountToDeposit < amount) message += ` (Bank was full)`; success = true; }
            }
        } else if (currencyType === 'gems') {
            if (user.gems < amount) message = `❌ Not enough gems. You have ${user.gems.toLocaleString()} ${guildEmojis.gemEmoji}.`;
            else if (amount <=0 ) message = "❌ Deposit amount must be positive.";
            else {
                const spaceAvailable = bankCapacity.gemCap - user.bankGems; const amountToDeposit = Math.min(amount, spaceAvailable);
                 if (amountToDeposit <= 0 && amount > 0) message = `❌ Bank gem storage is full.`;
                else { this.updateUser(userId, guildId, { gems: user.gems - amountToDeposit, bankGems: user.bankGems + amountToDeposit }); message = `✅ Deposited ${amountToDeposit.toLocaleString()} ${guildEmojis.gemEmoji}.`; if (amountToDeposit < amount) message += ` (Bank was full)`; success = true; }
            }
        } else message = "❌ Invalid currency type.";
        return { success, message };
    }

    withdrawFromBank(userId, guildId, currencyType, amount) {
        const user = this.getUser(userId, guildId); const guildEmojis = this.getGuildSettings(guildId);
        let success = false; let message = "";
        if (currencyType === 'coins') {
            if (user.bankCoins < amount) message = `❌ Not enough coins in bank. You have ${user.bankCoins.toLocaleString()} ${guildEmojis.coinEmoji}.`;
            else if (amount <=0 ) message = "❌ Withdraw amount must be positive.";
            else {
                const spaceAvailable = INVENTORY_COIN_CAP - user.coins; const amountToWithdraw = Math.min(amount, spaceAvailable);
                if (amountToWithdraw <= 0 && amount > 0) message = `❌ Inventory coin storage is full.`;
                else { this.updateUser(userId, guildId, { bankCoins: user.bankCoins - amountToWithdraw, coins: user.coins + amountToWithdraw }); message = `✅ Withdrew ${amountToWithdraw.toLocaleString()} ${guildEmojis.coinEmoji}.`; if (amountToWithdraw < amount) message += ` (Inventory was full)`; success = true; }
            }
        } else if (currencyType === 'gems') {
            if (user.bankGems < amount) message = `❌ Not enough gems in bank. You have ${user.bankGems.toLocaleString()} ${guildEmojis.gemEmoji}.`;
            else if (amount <=0 ) message = "❌ Withdraw amount must be positive.";
            else {
                const spaceAvailable = INVENTORY_GEM_CAP - user.gems; const amountToWithdraw = Math.min(amount, spaceAvailable);
                if (amountToWithdraw <= 0 && amount > 0) message = `❌ Inventory gem storage is full.`;
                else { this.updateUser(userId, guildId, { bankGems: user.bankGems - amountToWithdraw, gems: user.gems + amountToWithdraw }); message = `✅ Withdrew ${amountToWithdraw.toLocaleString()} ${guildEmojis.gemEmoji}.`; if (amountToWithdraw < amount) message += ` (Inventory was full)`; success = true; }
            }
        } else message = "❌ Invalid currency type.";
        return { success, message };
    }

    upgradeBankTier(userId, guildId) {
        const user = this.getUser(userId, guildId); const currentTierNum = user.bankTier || 0;
        const currentTierInfo = BANK_TIERS[currentTierNum]; const guildEmojis = this.getGuildSettings(guildId);
        if (!currentTierInfo || currentTierInfo.nextTier === null) return { success: false, message: "✨ Max bank tier!" };
        const costCoins = currentTierInfo.upgradeCostCoins; const costGems = currentTierInfo.upgradeCostGems;
        if (user.bankCoins < costCoins || user.bankGems < costGems) return { success: false, message: `❌ Insufficient funds. Need ${costCoins.toLocaleString()} ${guildEmojis.coinEmoji} and ${costGems.toLocaleString()} ${guildEmojis.gemEmoji}.` };
        this.updateUser(userId, guildId, { bankCoins: user.bankCoins - costCoins, bankGems: user.bankGems - costGems, bankTier: currentTierInfo.nextTier });
        return { success: true, message: `🎉 Bank upgraded to Tier ${currentTierInfo.nextTier}!`, newTier: currentTierInfo.nextTier };
    }

    resetUserData(userId, guildId) {
        const user = this.getUser(userId, guildId);
        this.updateUser(userId, guildId, {
            xp: 0, level: 0, coins: 0, gems: 0, robux: 0,
            bankCoins: 0, bankGems: 0, bankTier: 0,
            lastMessageTimestamp: 0, lastDailyTimestamp: 0,
            totalMessages: 0, totalXp: 0, totalCoinsEarned: 0, totalGemsEarned: 0, totalRobuxEarned: 0, dailyStreak: 0,
            totalVoiceXp: 0, totalVoiceCoins: 0, cosmicTokenDiscovered: 0,
            lastRobuxWithdrawalTimestamp: 0, lostStreak: 0, rewardsLastShiftedAt: 0
        });
        this.db.prepare('DELETE FROM userInventory WHERE userId = ? AND guildId = ?').run(userId, guildId);
        this.db.prepare('DELETE FROM userDailyRewards WHERE userId = ? AND guildId = ?').run(userId, guildId);
        this.db.prepare('DELETE FROM userActiveCharms WHERE userId = ? AND guildId = ?').run(userId, guildId);
        return { success: true, message: `Data reset for user ${userId} in guild ${guildId}.` };
    }

    resetGuildData(guildId, options = {}) {
        let details = [];
        if (options.doLevelsAndXp) {
            this.db.prepare('UPDATE users SET xp = 0, level = 0, totalXp = 0, totalVoiceXp = 0 WHERE guildId = ?').run(guildId);
            details.push("Levels and XP reset for all users.");
        }
        if (options.doBalances) {
            this.db.prepare('UPDATE users SET coins = 0, gems = 0, robux = 0, bankCoins = 0, bankGems = 0, totalCoinsEarned = 0, totalGemsEarned = 0, totalRobuxEarned = 0, totalVoiceCoins = 0, lastRobuxWithdrawalTimestamp = 0 WHERE guildId = ?').run(guildId);
            details.push("Coin, Gem, and Robux balances (inventory & bank) reset for all users.");
            this.db.prepare(`DELETE FROM robux_withdrawals WHERE guildId = ?`).run(guildId); // Clear withdrawal requests
            details.push("Pending Robux withdrawal requests cleared.");
        }
        if (options.doInventory) {
            this.db.prepare('DELETE FROM userInventory WHERE guildId = ?').run(guildId);
            details.push("User inventories cleared.");
        }
        if (options.doActiveCharms) {
            this.db.prepare('DELETE FROM userActiveCharms WHERE guildId = ?').run(guildId);
            details.push("Active charms cleared.");
        }
        if (options.doGuildSettings) {
            this.db.prepare('DELETE FROM guildSettings WHERE guildId = ?').run(guildId);
            details.push("Guild settings reset to defaults.");
        }
        if (options.doDmSettings) {
            this.db.prepare('DELETE FROM userDmSettings WHERE guildId = ?').run(guildId);
            details.push("User DM settings reset.");
        }
        if (options.doLootAlertSettings) {
            this.db.prepare('DELETE FROM userLootAlertSettings WHERE guildId = ?').run(guildId);
            this.db.prepare('DELETE FROM userShopAlertSettings WHERE guildId = ?').run(guildId);
            this.db.prepare('DELETE FROM userGlobalLootAlertSettings WHERE guildId = ?').run(guildId);
            details.push("User loot alert settings reset.");
        }
        if (options.doEmbedSessions) {
            this.db.prepare('DELETE FROM embed_sessions WHERE guildId = ?').run(guildId);
            details.push("Embed sessions cleared.");
        }
        return { success: true, message: "Guild data selectively reset.", details };
    }
    getAllTableData(tableName) {
        if (!this.db) return { success: false, message: "Database not initialized." };
        try {
            const data = this.db.prepare(`SELECT * FROM ${tableName}`).all();
            return { success: true, data: data };
        } catch (error) {
            console.error(`Error fetching data from table ${tableName}:`, error);
            return { success: false, message: `Error fetching data from table ${tableName}.` };
        }
    }
    exportAllGuildUserData(guildId) {
        const users = this.db.prepare('SELECT * FROM users WHERE guildId = ?').all(guildId);
        const inventories = this.db.prepare('SELECT * FROM userInventory WHERE guildId = ?').all(guildId);
        const activeCharms = this.db.prepare('SELECT * FROM userActiveCharms WHERE guildId = ?').all(guildId);
        const dmSettings = this.db.prepare('SELECT * FROM userDmSettings WHERE guildId = ?').all(guildId);
        const lootAlertSettings = this.db.prepare('SELECT * FROM userLootAlertSettings WHERE guildId = ?').all(guildId);
        const shopAlertSettings = this.db.prepare('SELECT * FROM userShopAlertSettings WHERE guildId = ?').all(guildId);
        const globalLootAlertSettings = this.db.prepare('SELECT * FROM userGlobalLootAlertSettings WHERE guildId = ?').all(guildId);
        const robuxWithdrawals = this.db.prepare('SELECT * FROM robux_withdrawals WHERE guildId = ?').all(guildId);

        return {
            success: true,
            data: {
                users: users,
                userInventory: inventories,
                userActiveCharms: activeCharms,
                userDmSettings: dmSettings,
                userLootAlertSettings: lootAlertSettings,
                userShopAlertSettings: shopAlertSettings,
                userGlobalLootAlertSettings: globalLootAlertSettings,
                robuxWithdrawals: robuxWithdrawals // Include withdrawal requests in export
            }
        };
    }
    saveEmbedSession(sessionId, sessionData) {
        const { userId, guildId, targetChannelId, panelChannelId, roleToMentionId, embedData, builderMessageId, createdAt } = sessionData;
        this.db.prepare(`INSERT OR REPLACE INTO embed_sessions (sessionId, userId, guildId, targetChannelId, panelChannelId, roleToMentionId, embedData, builderMessageId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(sessionId, userId, guildId, targetChannelId, panelChannelId, roleToMentionId, embedData, builderMessageId, createdAt);
    }
    fetchEmbedSession(sessionId) {
        const session = this.db.prepare('SELECT * FROM embed_sessions WHERE sessionId = ?').get(sessionId);
        if (session) {
            return {
                sessionId: session.sessionId,
                userId: session.userId,
                guildId: session.guildId,
                targetChannelId: session.targetChannelId,
                panelChannelId: session.panelChannelId,
                roleToMentionId: session.roleToMentionId,
                embedData: session.embedData,
                builderMessageId: session.builderMessageId,
                createdAt: session.createdAt
            };
        }
        return null;
    }
    loadAllEmbedSessions() {
        const sessions = new Map();
        const rows = this.db.prepare('SELECT * FROM embed_sessions').all();
        rows.forEach(row => {
            sessions.set(row.sessionId, {
                sessionId: row.sessionId,
                userId: row.userId,
                guildId: row.guildId,
                targetChannelId: row.targetChannelId,
                panelChannelId: row.panelChannelId,
                roleToMentionId: row.roleToMentionId,
                embedData: row.embedData,
                builderMessageId: row.builderMessageId,
                createdAt: row.createdAt
            });
        });
        return sessions;
    }
    deleteEmbedSession(sessionId) {
        this.db.prepare('DELETE FROM embed_sessions WHERE sessionId = ?').run(sessionId);
    }
    async handleVoiceStateUpdate(oldState, newState, checkAndAwardSpecialRoleFn, weekendMultipliers) {
        const effectiveWeekendMultipliers = weekendMultipliers || this.globalWeekendMultipliers || { currency: 1.0, xp: 1.0 }; // Removed luck from default
        const userId = newState.id || oldState.id; const guildId = newState.guild?.id || oldState.guild?.id;
        const member = newState.member || oldState.member;
        if (!userId || !guildId || member?.user?.bot) return null;
        const now = Date.now(); const voiceStateKey = `${userId}-${guildId}`;
        if (newState.channel && (!newState.serverMute && !newState.serverDeaf && !newState.selfMute && !newState.selfDeaf)) {
            if (!this.activeVoiceUsers.has(voiceStateKey)) this.activeVoiceUsers.set(voiceStateKey, { userId, guildId, member: member, joinedTimestamp: now, lastRewardTimestamp: now });
        } else { if (this.activeVoiceUsers.has(voiceStateKey)) this.activeVoiceUsers.delete(voiceStateKey); }
        if (this.activeVoiceUsers.has(voiceStateKey)) {
            const userData = this.activeVoiceUsers.get(voiceStateKey);
            if (now - userData.lastRewardTimestamp >= VOICE_ACTIVITY_INTERVAL_MS) {
                const effectiveWeekendXpMultiplierForVoice = effectiveWeekendMultipliers.xp || (this.gameConfig.globalSettings?.WEEKEND_XP_MULTIPLIER || WEEKEND_XP_MULTIPLIER);
                this.addXP(userId, guildId, VOICE_XP_PER_INTERVAL, userData.member, true, effectiveWeekendXpMultiplierForVoice);
                if (VOICE_COIN_PER_INTERVAL && VOICE_COIN_PER_INTERVAL.length === 2) {
                    const coinsEarned = Math.floor(Math.random() * (VOICE_COIN_PER_INTERVAL[1] - VOICE_COIN_PER_INTERVAL[0] + 1)) + VOICE_COIN_PER_INTERVAL[0];
                    if (coinsEarned > 0) this.addCoins(userId, guildId, coinsEarned, "voice_activity", effectiveWeekendMultipliers);
                }
                // Removed luck-based voice drop chance calculation
                const baseVoiceDropChance = this.gameConfig.globalSettings.VOICE_DROP_BASE_CHANCE;
                if (Math.random() < baseVoiceDropChance) { // Simplified: just use base chance
                    const chosenDropSpec = this._performWeightedRandomPick(this.gameConfig.directChatDropTable, 'directDropWeight'); 
                    if (chosenDropSpec && chosenDropSpec.itemId) {
                        const finalVoiceDropItem = this._getItemMasterProperty(chosenDropSpec.itemId, null);
                        if (finalVoiceDropItem) {
                            const { grantedSpecialRole } = this.processLootDrop(userId, guildId, finalVoiceDropItem, userData.member, effectiveWeekendMultipliers);
                            const userGlobalAlertSettings = this.getUserGlobalLootAlertSettings(userId, guildId);
                            const itemSpecificAlertSetting = this.getUserItemLootAlertSetting(userId, guildId, finalVoiceDropItem.id);
                            const itemRarityValue = finalVoiceDropItem.rarityValue || 0;
                            const shouldAnnounce = itemSpecificAlertSetting.enableAlert && ((userGlobalAlertSettings.alertRarityThreshold > 0 && itemRarityValue >= userGlobalAlertSettings.alertRarityThreshold) || finalVoiceDropItem.id === this.COSMIC_ROLE_TOKEN_ID);
                            if (grantedSpecialRole && checkAndAwardSpecialRoleFn) { try { await checkAndAwardSpecialRoleFn(userData.member, `receiving a ${finalVoiceDropItem.name} from voice activity`, finalVoiceDropItem.name); } catch (e) { console.error("Error in checkAndAwardSpecialRoleFn from voice drop:", e); } }
                            userData.lastRewardTimestamp = now; this.activeVoiceUsers.set(voiceStateKey, userData);
                            return { droppedItem: finalVoiceDropItem, config: finalVoiceDropItem, shouldAnnounce, grantedSpecialRole, source: 'voice' };
                        }
                    }
                }
                userData.lastRewardTimestamp = now; this.activeVoiceUsers.set(voiceStateKey, userData);
            }
        }
        return null;
    }
    getUsersForShopAlert(guildId) {
        if (!this.db) return [];
        try {
            const guildDefaultEnabled = this.getGuildSettings(guildId).shopRestockDmEnabled;
            const rows = this.db.prepare(`SELECT uds.userId FROM userDmSettings uds WHERE uds.guildId = ? AND (uds.enableShopRestockDm = 1 OR (uds.enableShopRestockDm IS NULL AND ? = 1))`).all(guildId, guildDefaultEnabled ? 1 : 0);
            return rows.map(row => row.userId);
        } catch (error) { console.error(`[ShopAlertUsers] Error fetching users for guild ${guildId}:`, error); return []; }
    }
    getUsersForShopAlertByItems(guildId, itemIds = []) {
        const baseUsers = this.getUsersForShopAlert(guildId);
        if (itemIds.length === 0) return baseUsers;
        const filtered = [];
        for (const userId of baseUsers) {
            for (const itemId of itemIds) {
                const setting = this.getUserShopAlertSetting(userId, guildId, itemId);
                if (setting.enableAlert) { filtered.push(userId); break; }
            }
        }
        return filtered;
    }

    getUsersForDailyReadyNotification() {
        if (!this.db) return [];
        try {
            const rows = this.db.prepare(`SELECT u.userId, u.guildId, u.lastDailyTimestamp, u.lastDailyNotifyTimestamp FROM users u JOIN userDmSettings uds ON u.userId = uds.userId AND u.guildId = uds.guildId WHERE uds.enableDailyReadyDm = 1`).all();
            return rows;
        } catch (error) { console.error('[DailyReadyUsers] Error fetching users:', error); return []; }
    }
    getTotalItemCountInGuild(itemId, guildId) {
        if (!this.db) return 0;
        try {
            const result = this.db.prepare(`SELECT SUM(quantity) as total FROM userInventory WHERE itemId = ? AND guildId = ?`).get(itemId, guildId);
            return result && result.total ? result.total : 0;
        } catch (error) {
            console.error(`Error getting total count for item ${itemId} in guild ${guildId}:`, error);
            return 0;
        }
    }
    getTotalCurrencyInGuild(currencyType, guildId) {
        if (!this.db) return 0;
        try {
            let columnName = '';
            if (currencyType === 'coins') columnName = 'coins';
            else if (currencyType === 'gems') columnName = 'gems';
            else if (currencyType === 'robux') columnName = 'robux';
            else return 0;

            const result = this.db.prepare(`SELECT SUM(${columnName}) as total FROM users WHERE guildId = ?`).get(guildId);
            return result && result.total ? result.total : 0;
        } catch (error) {
            console.error(`Error getting total ${currencyType} for guild ${guildId}:`, error);
            return 0;
        }
    }

    _getItemRarityString(itemId, itemConfigParam, category) {
        const itemConfig = itemConfigParam || this._getItemMasterProperty(itemId, null);
        if (itemId === this.COSMIC_ROLE_TOKEN_ID) return this.itemRarities.SECRET.name;
        if (category === this.itemTypes.CURRENCY || itemConfig?.type === this.itemTypes.CURRENCY) return this.itemRarities.STANDARD.name;
        if (itemConfig && typeof itemConfig.rarityValue === 'number') {
            const itemRarityValue = itemConfig.rarityValue;
            const sortedRarities = Object.entries(this.itemRarities).sort(([, a], [, b]) => b.value - a.value);
            for (const [key, rarityTier] of sortedRarities) { if (itemRarityValue >= rarityTier.value) return rarityTier.name; }
        }
        if (itemId && typeof itemId === 'string') {
            if (itemId.includes('legendary')) return this.itemRarities.LEGENDARY.name; if (itemId.includes('epic')) return this.itemRarities.EPIC.name;
            if (itemId.includes('rare')) return this.itemRarities.RARE.name; if (itemId.includes('common')) return this.itemRarities.COMMON.name;
        }
        return this.itemRarities.COMMON.name;
    }

    _getRarityColor(rarityString) { const rarityEntry = Object.values(this.itemRarities).find(r => r.name.toUpperCase() === rarityString.toUpperCase()); return rarityEntry ? rarityEntry.color : this.itemRarities.COMMON.color; }
    
    _getCharmBuffFormatted(itemConfig) {
        if (!itemConfig || itemConfig.type !== this.itemTypes.CHARM || !itemConfig.charmType) return "Not a charm or buff info unavailable.";
        let buffDescription = "Unknown buff."; const type = itemConfig.charmType; const boost = itemConfig.boost;
        if (type === this.CHARM_TYPES.COIN) buffDescription = `Increases Coins earned by ${boost}%.`;
        else if (type === this.CHARM_TYPES.XP) buffDescription = `Increases XP earned per message by ${boost}.`;
        else if (type === this.CHARM_TYPES.GEM) buffDescription = `Increases Gems earned from boxes by ${boost}%.`;
        // else if (type === this.CHARM_TYPES.LUCK) { // Luck charm type removed
        //     buffDescription = `Adds +${boost} to your Luck Power. More power increases drop chances.`;
        // }
        else if (type === this.CHARM_TYPES.DISCOUNT) buffDescription = `Reduces shop prices by ${boost}%.`;
        else if (type === this.CHARM_TYPES.TAX_REDUCTION) buffDescription = `Reduces market tax by ${boost}%.`;
        let durationText = "⏳ Duration: Permanent (Active while equipped)";
        return `${buffDescription}\n${durationText}`;
    }

    getItemFromInventory(userId, guildId, itemId) {
        this.getUser(userId, guildId);
        const item = this.db.prepare('SELECT ui.itemId, ui.quantity, ui.itemType FROM userInventory ui WHERE ui.userId = ? AND guildId = ? AND ui.itemId = ?').get(userId, guildId, itemId);
        if (!item) return null;
        const masterItem = this._getItemMasterProperty(item.itemId, null);
        if (!masterItem) return { ...item, name: "Unknown (No Master Config)", emoji: "❓"};
        return { ...item, name: masterItem.name, emoji: masterItem.emoji };
    }

    async _hasUserDiscoveredCosmicToken(userId, guildId, clientInstance) {
        const currentClient = clientInstance || this.client;
        if (!currentClient || !currentClient.guilds || !currentClient.guilds.cache) {
            const user = this.getUser(userId, guildId); return !!user.cosmicTokenDiscovered;
        }
        const guild = currentClient.guilds.cache.get(guildId); if (!guild) return false;
        try {
            const member = await guild.members.fetch(userId).catch(() => null);
            const roleToGrantId = this._getItemMasterProperty(this.COSMIC_ROLE_TOKEN_ID, 'roleIdToGrant');
            if (member && roleToGrantId && member.roles.cache.has(roleToGrantId)) {
                 const user = this.getUser(userId, guildId); if (!user.cosmicTokenDiscovered) this.updateUser(userId, guildId, { cosmicTokenDiscovered: 1 });
                return true;
            }
             const user = this.getUser(userId, guildId); return !!user.cosmicTokenDiscovered;
        } catch (error) { const user = this.getUser(userId, guildId); return !!user.cosmicTokenDiscovered; }
    }

    async _getWaysToObtainFormatted(itemId, itemConfigFromCaller, userId, guildId) {
        const ways = [];
        const guildSettings = this.getGuildSettings(guildId); const isWeekend = guildSettings.weekendBoostActive;
        const itemMasterConfig = this._getItemMasterProperty(itemId, null) || itemConfigFromCaller;

        if (itemId === 'robux') {
            ways.push("✨ **Admin Command:** Can be granted by server staff.");
            ways.push("✨ **Daily Rewards:** A rare chance after a 7-day streak.");
        }

        const directDropSpec = this.gameConfig.directChatDropTable.find(drop => drop.itemId === itemId);
        if (directDropSpec?.directDropWeight > 0) { 
            let totalDirectDropWeight = this.gameConfig.directChatDropTable.reduce((sum, item) => sum + (item.directDropWeight || 0), 0);
            if (totalDirectDropWeight > 0) {
                const baseProbInPool = directDropSpec.directDropWeight / totalDirectDropWeight;
                ways.push(`**Direct Drops:**`);
                if (this.gameConfig.globalSettings.CHAT_DROP_BASE_CHANCE > 0) { ways.push(`  💬 Chat: Base ${formatChanceDisplay(this.gameConfig.globalSettings.CHAT_DROP_BASE_CHANCE * baseProbInPool, "", true)}`); }
                if (this.gameConfig.globalSettings.VOICE_DROP_BASE_CHANCE > 0) { ways.push(`  🎤 Voice: Base ${formatChanceDisplay(this.gameConfig.globalSettings.VOICE_DROP_BASE_CHANCE * baseProbInPool, "", true)}`); }
                ways.push("---");
            }
        }
        if (itemMasterConfig.appearanceChanceInShop > 0) { 
            let priceCurrencyText = "Coins";
            if (itemMasterConfig.priceCurrency === 'gems') priceCurrencyText = "Gems";
            else if (itemMasterConfig.priceCurrency === 'robux') priceCurrencyText = "Robux";
            ways.push(`🛍️ **Shop:** Appears with ~${formatChanceDisplay(itemMasterConfig.appearanceChanceInShop, "", true)} chance. Costs ${itemMasterConfig.basePrice} ${priceCurrencyText}.`); ways.push("---"); 
        }
        let foundInLootboxesHeaderAdded = false;
        for (const boxId in this.gameConfig.items) {
            const boxItemConfig = this.gameConfig.items[boxId];
            if (boxItemConfig.type === this.itemTypes.LOOT_BOX && boxItemConfig.itemPool) {
                const itemInPoolSpec = boxItemConfig.itemPool.find(item => item.id === itemId);
                if (itemInPoolSpec?.probability > 0) {
                    if (!foundInLootboxesHeaderAdded) { ways.push("🎁 **Found In Loot Boxes:**"); foundInLootboxesHeaderAdded = true; }
                    const baseProbInBox = itemInPoolSpec.probability;
                    ways.push(`  > ${boxItemConfig.emoji || '📦'} **${boxItemConfig.name}**: Base ${formatChanceDisplay(baseProbInBox, "", true)}`);
                }
            }
        }
        if (foundInLootboxesHeaderAdded) ways.push("---");
        if (itemId === this.COSMIC_ROLE_TOKEN_ID) ways.push("🌌 Also a very rare random award for various bot activities.");
        return ways.length > 0 ? ways : ['This item is obtained through special means not listed here or is currently unobtainable.'];
    }

    async _getLootBoxContentsFormatted(boxId, userId, guildId) {
        const boxConfig = this._getItemMasterProperty(boxId, null);
        if (!boxConfig || boxConfig.type !== this.itemTypes.LOOT_BOX || !boxConfig.itemPool) return ["Could not find item information for this box."];
        const contents = [];
        const userHasDiscoveredCosmic = await this._hasUserDiscoveredCosmicToken(userId, guildId, this.client);
        const baseItemPool = boxConfig.itemPool;
        
        const totalBaseProbability = baseItemPool.reduce((sum, item) => sum + (item.probability || 0), 0);
        if (totalBaseProbability <= 0) {
            return ["This box appears empty, or its contents are a well-kept secret!"];
        }
        let dynamicItemPoolForDisplay = baseItemPool.map(itemSpecInPool => {
            const baseProb = itemSpecInPool.probability || 0;
            return {
                ...itemSpecInPool,
                finalDisplayProb: baseProb / totalBaseProbability,
            };
        });
        
        dynamicItemPoolForDisplay.sort((a, b) => b.finalDisplayProb - a.finalDisplayProb);
        for (const itemSpec of dynamicItemPoolForDisplay) {
            const finalDisplayProb = itemSpec.finalDisplayProb;
            if (finalDisplayProb < 0.000001 && itemSpec.id !== this.COSMIC_ROLE_TOKEN_ID) continue;
            if (itemSpec.id === this.COSMIC_ROLE_TOKEN_ID && !userHasDiscoveredCosmic && finalDisplayProb < 0.000001) continue;
            let itemNameDisplay = itemSpec.name; let itemEmojiDisplay = itemSpec.emoji; let quantityText = "";
            if (itemSpec.type === this.itemTypes.CURRENCY) quantityText = ` (${itemSpec.min}-${itemSpec.max})`;
            else if (itemSpec.quantity) { if (Array.isArray(itemSpec.quantity) && itemSpec.quantity.length === 2) quantityText = ` (x${itemSpec.quantity[0]}-${itemSpec.quantity[1]})`; else quantityText = ` (x${itemSpec.quantity})`; }
            contents.push( `${itemEmojiDisplay} **${itemNameDisplay}**${quantityText}\n` + `  └ Chance: ${formatChanceDisplay(finalDisplayProb, "", true)}` );
        }
        if (contents.length === 0) return ["This box appears empty, or its contents are a well-kept secret!"];
        return contents;
    }
    getItemNameById(itemId, guildId) {
        const item = this._getItemMasterProperty(itemId, null);
        if (item && item.name) return item.name;
        if (typeof itemId === 'string') return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return "Unknown Item";
    }
    getItemEmojiById(itemId, guildId) {
        const item = this._getItemMasterProperty(itemId, null);
        if (item && item.emoji) return item.emoji;
        const guildSettings = this.getGuildSettings(guildId);
        if (itemId === 'coins') return guildSettings?.coinEmoji || this.gameConfig.items.coins.emoji;
        if (itemId === 'gems') return guildSettings?.gemEmoji || this.gameConfig.items.gems.emoji;
        if (itemId === 'robux') return guildSettings?.robuxEmoji || this.gameConfig.items.robux.emoji;
        return '❓';
    }
    addCoins(userId, guildId, amount, source = "unknown", weekendMultipliersArg) {
        const effectiveWeekendMultipliers = weekendMultipliersArg || this.globalWeekendMultipliers || { currency: 1.0 };
        if (amount === 0) return { success: false, added: 0, newBalance: this.getBalance(userId, guildId).coins, reason: "Amount was zero." };
        const user = this.getUser(userId, guildId); const guildSettings = this.getGuildSettings(guildId);
        const isWeekend = guildSettings.weekendBoostActive; let finalAmount = amount;
        if (finalAmount > 0) {
            const coinCharms = this.getActiveCharms(userId, guildId, this.CHARM_TYPES.COIN);
            let charmCoinBoostPercent = 0; coinCharms.forEach(charm => { charmCoinBoostPercent += (charm.boostValue || 0); });
            finalAmount += Math.round(finalAmount * (charmCoinBoostPercent / 100));
            const weekendMultiplier = effectiveWeekendMultipliers?.currency !== undefined ? effectiveWeekendMultipliers.currency : (this.gameConfig.globalSettings?.WEEKEND_COIN_MULTIPLIER || WEEKEND_COIN_MULTIPLIER);
            if (isWeekend && weekendMultiplier > 1.0 && source !== "admin_command" && source !== "shop_purchase" && !source.startsWith("bank_")) {
                finalAmount = Math.round(finalAmount * weekendMultiplier);
            }
        }
        finalAmount = Math.round(finalAmount); let newCoins = user.coins + finalAmount; let actualAdded = finalAmount;
        if (newCoins > INVENTORY_COIN_CAP) { actualAdded = INVENTORY_COIN_CAP - user.coins; newCoins = INVENTORY_COIN_CAP; if (actualAdded < 0) actualAdded = 0; }
        else if (newCoins < 0) { actualAdded = -user.coins; newCoins = 0; }
        let totalCoinsEarnedUpdate = {};
        if (actualAdded > 0 && source !== "admin_command" && !source.startsWith("bank_") && source !== "shop_restock_refund") {
            totalCoinsEarnedUpdate = { totalCoinsEarned: (user.totalCoinsEarned || 0) + actualAdded };
            if (source === "voice_activity") totalCoinsEarnedUpdate.totalVoiceCoins = (user.totalVoiceCoins || 0) + actualAdded;
        }
        this.updateUser(userId, guildId, { coins: newCoins, ...totalCoinsEarnedUpdate });
        return { success: true, added: actualAdded, newBalance: newCoins };
    }

    // --- Daily System Methods ---

    getAllUsersWithActiveDailyStreaks() {
        return this.db.prepare(`SELECT userId, guildId, dailyStreak, lastDailyTimestamp FROM users WHERE dailyStreak > 0`).all();
    }

    resetDailyStreak(userId, guildId) {
        const user = this.getUser(userId, guildId);
        this.updateUser(userId, guildId, { dailyStreak: 0, lostStreak: user.dailyStreak, lostStreakTimestamp: Date.now() });
    }

    attemptStreakRestore(userId, guildId, oldStreakFromButton) {
        const user = this.getUser(userId, guildId);
        if (user.lostStreak === 0) {
            return { success: false, message: "You don't have a lost streak to restore." };
        }

        const oneDayMs = 24 * 60 * 60 * 1000;
        if (Date.now() - (user.lostStreakTimestamp || 0) > oneDayMs) {
            this.updateUser(userId, guildId, { lostStreak: 0, lostStreakTimestamp: 0 });
            return { success: false, message: 'Your streak restore offer has expired.' };
        }

        const oldStreak = oldStreakFromButton || user.lostStreak;
        const cost = Math.ceil(10 * Math.pow(1.125, oldStreak - 1));

        if (user.gems < cost) {
            return { success: false, message: `You need ${cost} ${this.gemEmoji} to restore your streak, but you only have ${user.gems}.` };
        }

        this.addGems(userId, guildId, -cost, 'streak_restore');
        this.updateUser(userId, guildId, {
            dailyStreak: oldStreak,
            lostStreak: 0,
            lostStreakTimestamp: 0,
            lastDailyTimestamp: Date.now() - (23 * 60 * 60 * 1000) // Set timestamp to 23h ago to allow next claim soon
        });

        return { success: true, message: `✅ Your streak of **${oldStreak} days** has been restored for ${cost} ${this.gemEmoji}!` };
    }

    _generateSingleDailyReward(userId, guildId) {
        const user = this.getUser(userId, guildId);
        const streak = user.dailyStreak || 0;

        // 50% chance for item, 50% for currency
        if (Math.random() < 0.5) {
            // --- Item Reward ---
            const baseItemPool = [
                { id: "common_loot_box", baseProb: 0.49 },
                { id: "rare_loot_box", baseProb: 0.01 },
                { id: "epic_loot_box", baseProb: 0.0005 },
                { id: "legendary_loot_box", baseProb: 0.000001 },
                { id: "coin_charm", baseProb: 0.00005 },
                { id: "gem_charm", baseProb: 0.000005 },
                { id: "xp_charm", baseProb: 0.00001 },
            ];

            const totalBaseProb = baseItemPool.reduce((sum, item) => sum + item.baseProb, 0);
            const itemLuckBoost = Math.min(1.0, streak * 0.001); // Max 100% boost (i.e., double chances for rares)
            
            let totalRareProb = 0;
            const dynamicPool = baseItemPool.map(item => {
                const isRare = item.id !== 'common_loot_box';
                const finalProb = isRare ? (item.baseProb / totalBaseProb) * (1 + itemLuckBoost) : (item.baseProb / totalBaseProb);
                if (isRare) totalRareProb += finalProb;
                return { ...item, finalProb };
            });

            const commonItem = dynamicPool.find(item => item.id === 'common_loot_box');
            if (commonItem) {
                commonItem.finalProb = Math.max(0, 1 - totalRareProb);
            }

            const finalTotalProb = dynamicPool.reduce((sum, item) => sum + item.finalProb, 0);
            if (finalTotalProb > 0) {
                dynamicPool.forEach(item => item.finalProb /= finalTotalProb);
            }
            
            const chosenItem = this._performWeightedRandomPick(dynamicPool, 'finalProb');
            return { type: 'item', data: { id: chosenItem.id, amount: 1 } };
        } else {
            // --- Currency Reward ---
            const coinAmount = Math.floor(Math.random() * 201) + 50;
            const gemAmount = Math.floor(Math.random() * 5) + 1;
            return Math.random() < 0.05 
                ? { type: 'currency', data: { id: 'gems', amount: gemAmount } }
                : { type: 'currency', data: { id: 'coins', amount: coinAmount } };
        }
    }

    getDailyRewards(userId, guildId) {
        const user = this.getUser(userId, guildId);
        const now = Date.now();
        const cooldown = 12 * 60 * 60 * 1000;
        const canShift = now - (user.rewardsLastShiftedAt || 0) >= cooldown;

        // Step 1: Fetch current rewards from DB
        const currentRewardsFromDb = this.db.prepare('SELECT * FROM userDailyRewards WHERE userId = ? AND guildId = ? ORDER BY dayNumber ASC').all(userId, guildId);
        let rewardsMap = new Map(currentRewardsFromDb.map(r => [r.dayNumber, { type: r.rewardType, data: JSON.parse(r.rewardData) }]));

        // Step 2: If shifting is needed, manipulate the map in memory
        if (canShift) {
            const newRewardsMap = new Map();
            if (rewardsMap.has(2)) {
                newRewardsMap.set(1, rewardsMap.get(2));
            }
            if (rewardsMap.has(3)) {
                newRewardsMap.set(2, rewardsMap.get(3));
            }
            rewardsMap = newRewardsMap; // Overwrite with the shifted map
        }

        // Step 3: Ensure 3 rewards exist in the map, generating new ones if needed
        for (let i = 1; i <= 3; i++) {
            if (!rewardsMap.has(i)) {
                rewardsMap.set(i, this._generateSingleDailyReward(userId, guildId));
            }
        }

        // Check for rare Robux reward on day 3
        const day3Reward = rewardsMap.get(3);
        if (day3Reward && user.dailyStreak >= 7 && Math.random() < 0.005) {
            const robuxReward = { type: 'currency', data: { id: 'robux', amount: Math.floor(Math.random() * 5) + 1 }};
            rewardsMap.set(3, robuxReward);
        }

        // Step 4: Atomically update the database
        // This transaction ensures the DB state is always consistent.
        this.db.transaction(() => {
            // Delete all old rewards for this user
            this.db.prepare('DELETE FROM userDailyRewards WHERE userId = ? AND guildId = ?').run(userId, guildId);

            // Insert the new, correct set of rewards
            const insertStmt = this.db.prepare('INSERT INTO userDailyRewards (userId, guildId, dayNumber, rewardType, rewardData) VALUES (?, ?, ?, ?, ?)');
            for (const [dayNumber, reward] of rewardsMap.entries()) {
                insertStmt.run(userId, guildId, dayNumber, reward.type, JSON.stringify(reward.data));
            }

            // Update the shift timestamp only if a shift actually occurred
            if (canShift) {
                this.updateUser(userId, guildId, { rewardsLastShiftedAt: now });
            } else if (!user.rewardsLastShiftedAt) {
                // For a brand new user, set the initial shift time to prevent immediate re-shifting.
                this.updateUser(userId, guildId, { rewardsLastShiftedAt: now });
            }
        })();

        // Step 5: Format the map for the return value
        const formattedRewards = {};
        for (const [dayNumber, reward] of rewardsMap.entries()) {
            formattedRewards[dayNumber] = reward;
        }

        return formattedRewards;
    }

    claimDailyReward(userId, guildId) {
        const user = this.getUser(userId, guildId);
        const now = Date.now();
        // CHANGED: Cooldown for claiming reward is now 12 hours.
        const cooldown = 12 * 60 * 60 * 1000;
        if (now - (user.lastDailyTimestamp || 0) < cooldown) {
            return { success: false, message: "You have already claimed your daily reward. Please wait." };
        }

        // getDailyRewards will handle any necessary shifts before we claim.
        const rewards = this.getDailyRewards(userId, guildId);
        const rewardToClaim = rewards[1];
        if (!rewardToClaim) return { success: false, message: "Could not find your daily reward." };
        
        const isRobux = rewardToClaim.data.id === 'robux';
        const currencyBoost = 1 + (user.dailyStreak * 0.2);
        let claimedRewardMessage = "";

        if (rewardToClaim.type === 'currency') {
            const finalAmount = isRobux ? rewardToClaim.data.amount : Math.ceil(rewardToClaim.data.amount * currencyBoost);
            if (rewardToClaim.data.id === 'coins') this.addCoins(userId, guildId, finalAmount, 'daily_reward');
            else if (rewardToClaim.data.id === 'gems') this.addGems(userId, guildId, finalAmount, 'daily_reward');
            else if (isRobux) this.addRobux(userId, guildId, finalAmount, 'daily_reward');
            claimedRewardMessage = `You claimed ${finalAmount.toLocaleString()} ${this.getItemEmojiById(rewardToClaim.data.id, guildId)}!`;
        } else if (rewardToClaim.type === 'item') {
            const itemConfig = this._getItemMasterProperty(rewardToClaim.data.id, null);
            this.giveItem(userId, guildId, rewardToClaim.data.id, rewardToClaim.data.amount, itemConfig.type, 'daily_reward');
            claimedRewardMessage = `You claimed ${rewardToClaim.data.amount}x ${itemConfig.emoji} **${itemConfig.name}**!`;
        }

        // Calculate new streak based on time since last claim
        // CHANGED: Streak is maintained if the claim is within 24 hours of the last one.
        const streakCooldown = 24 * 60 * 60 * 1000;
        const newStreak = now - (user.lastDailyTimestamp || 0) < streakCooldown ? user.dailyStreak + 1 : 1;

        // ONLY update the user's claim timestamp and streak. DO NOT shift rewards here.
        this.updateUser(userId, guildId, { lastDailyTimestamp: now, dailyStreak: newStreak, lostStreak: 0 });

        return { success: true, message: claimedRewardMessage };
    }

    // --- End Daily System Methods ---

    // New methods for Robux Withdrawal
    createRobuxWithdrawalRequest(userId, guildId, robloxUsername, amount, gamepassLink, logMessageId) {
        const requestTimestamp = Math.floor(Date.now() / 1000);
        try {
            const stmt = this.db.prepare(`
                INSERT INTO robux_withdrawals (userId, guildId, robloxUsername, amount, gamepassLink, requestTimestamp, logMessageId, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
            `);
            const result = stmt.run(userId, guildId, robloxUsername, amount, gamepassLink, requestTimestamp, logMessageId);
            return { success: true, withdrawalId: result.lastInsertRowid };
        } catch (error) {
            console.error("Error creating Robux withdrawal request:", error);
            return { success: false, message: "Database error creating request." };
        }
    }

    getRobuxWithdrawalRequest(withdrawalId) {
        try {
            return this.db.prepare('SELECT * FROM robux_withdrawals WHERE withdrawalId = ?').get(withdrawalId);
        } catch (error) {
            console.error("Error fetching Robux withdrawal request:", error);
            return null;
        }
    }

    updateRobuxWithdrawalRequest(withdrawalId, status, processedByUserId, reasonOrEvidence = null) {
        const processedTimestamp = Math.floor(Date.now() / 1000);
        try {
            this.db.prepare(`
                UPDATE robux_withdrawals
                SET status = ?, processedByUserId = ?, processedTimestamp = ?, reasonOrEvidence = ?
                WHERE withdrawalId = ?
            `).run(status, processedByUserId, processedTimestamp, reasonOrEvidence, withdrawalId);
            return { success: true };
        } catch (error) {
            console.error("Error updating Robux withdrawal request:", error);
            return { success: false, message: "Database error updating request." };
        }
    }

    canUserWithdrawRobux(userId, guildId, amount) {
        const user = this.getUser(userId, guildId);
        if (user.robux < amount) {
            return { canWithdraw: false, reason: `Insufficient Robux balance. You have ${user.robux}, requested ${amount}.` };
        }
        const timeSinceLastWithdrawal = Date.now() - (user.lastRobuxWithdrawalTimestamp * 1000);
        if (timeSinceLastWithdrawal < ROBUX_WITHDRAWAL_COOLDOWN_MS) {
            const timeLeft = ROBUX_WITHDRAWAL_COOLDOWN_MS - timeSinceLastWithdrawal;
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return { canWithdraw: false, reason: `You are on a withdrawal cooldown. Please wait ${days}d ${hours}h ${minutes}m.` };
        }
        return { canWithdraw: true };
    }

    recordRobuxWithdrawal(userId, guildId, amount) {
        const user = this.getUser(userId, guildId);
        if (user.robux < amount) {
            return { success: false, message: "Cannot record withdrawal, insufficient funds (should have been checked)." };
        }
        const result = this.addRobux(userId, guildId, -amount, "robux_withdrawal");
        if (result.success) {
            this.updateUser(userId, guildId, { lastRobuxWithdrawalTimestamp: Math.floor(Date.now() / 1000) });
            return { success: true, newBalance: result.newBalance };
        }
        return { success: false, message: "Failed to deduct Robux for withdrawal." };
    }
}

module.exports = {
    SystemsManager, LEVEL_ROLES, INVENTORY_COIN_CAP, INVENTORY_GEM_CAP, INVENTORY_ROBUX_CAP,
    BANK_TIERS, CHARM_TYPES: CHARM_TYPES_FROM_SHOPMANAGER, SHOP_ITEM_TYPES,
    WEEKEND_COIN_MULTIPLIER, WEEKEND_GEM_MULTIPLIER, WEEKEND_XP_MULTIPLIER, /* WEEKEND_LUCK_MULTIPLIER_FACTOR removed */ WEEKEND_SHOP_STOCK_MULTIPLIER,
    DEFAULT_ANNOUNCE_RARITY_THRESHOLD, DEFAULT_SHOP_RESTOCK_DM_ENABLED,
    SETTINGS_EMOJI_ENABLED, SETTINGS_EMOJI_DISABLED,
    VOICE_ACTIVITY_INTERVAL_MS, MAX_LEVEL, ROBUX_WITHDRAWAL_COOLDOWN_MS,
    DEFAULT_COIN_EMOJI, DEFAULT_GEM_EMOJI, DEFAULT_ROBUX_EMOJI,
};