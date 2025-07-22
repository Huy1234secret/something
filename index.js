// index.js (Combined & Updated - FIXED - First Half)
const {
    Client, GatewayIntentBits, Collection, EmbedBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, AttachmentBuilder, MessageFlags, PermissionsBitField, ActivityType, InteractionType, StringSelectMenuBuilder,
    User, Partials
} = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const { initBuildBattleEvent, handleJoinInteraction } = require('./buildBattleEvent');
const { initFishSeason } = require('./utils/fishSeasonManager');
const { initFishMarket } = require('./utils/fishMarketNotifier');
const { initFishStore } = require('./utils/fishStoreNotifier');
const { initWeather, buildWeatherEmbed, getCatchMultiplier, isBlossomActive } = require('./utils/weatherManager');
const afkMessages = require('./utils/afkMessages');

// Corrected code
const originalUserSend = User.prototype.send;
User.prototype.send = function (...args) {
    if (this.client && this.client.NON_DAILY_NOTIFICATIONS_ENABLED === false) {
        const content = typeof args[0] === 'string' ? args[0] : (args[0]?.content || '');
        if (!content.toLowerCase().includes('daily reward')) {
            return Promise.resolve();
        }
    }
    return originalUserSend.apply(this, args);
};

// --- Merged Imports from systems.js and shopManager.js ---
const {
    SystemsManager,
    BANK_TIERS, // Used in bank button handler
    LEVEL_ROLES, // Used by SystemsManager, not directly here beyond config
    WEEKEND_COIN_MULTIPLIER, // Used for setting WEEKEND_MULTIPLIERS
    WEEKEND_GEM_MULTIPLIER,  // Used for setting WEEKEND_MULTIPLIERS
    WEEKEND_XP_MULTIPLIER,   // Used for setting WEEKEND_MULTIPLIERS
    // WEEKEND_LUCK_MULTIPLIER_FACTOR, // Luck system removed
    WEEKEND_SHOP_STOCK_MULTIPLIER, // Used in weekend announcement, shop logic uses gameConfig
    DEFAULT_ANNOUNCE_RARITY_THRESHOLD, // Used by SystemsManager, not directly here
    DEFAULT_SHOP_RESTOCK_DM_ENABLED,   // Used by SystemsManager, not directly here
    SETTINGS_EMOJI_ENABLED,  // Used in usersettings command
    SETTINGS_EMOJI_DISABLED, // Used in usersettings command
    VOICE_ACTIVITY_INTERVAL_MS, // Used by SystemsManager
    MAX_LEVEL, // Used in level command and XP logic
    ROBUX_WITHDRAWAL_COOLDOWN_MS // New constant from systems.js
} = require('./systems.js');

const { postOrUpdateLeaderboard, updateLeaderboardRewards, formatLeaderboardEmbed, formatCoinLeaderboardEmbed, formatGemLeaderboardEmbed, formatValueLeaderboardEmbed } = require('./leaderboardManager.js');
const DEFAULT_COIN_EMOJI_FALLBACK = '<a:coin:1373568800783466567>';
const DEFAULT_GEM_EMOJI_FALLBACK = '<a:gem:1374405019918401597>';
const DEFAULT_ROBUX_EMOJI_FALLBACK = '<a:robux:1378395622683574353>'; // New
const DEFAULT_FISH_DOLLAR_EMOJI_FALLBACK = '<:fishdollar:1393480559573078027>';
const COIN_BOOST_EMOJI = '<:scoinmulti:1384503519330959380>';
const XP_BOOST_EMOJI = '<:sxpmulti:1384502410059317410>';
const GEM_BOOST_EMOJI = '<:sgemmulti:1384507113048506428>';
const DISCOUNT_BOOST_EMOJI = '<:sdiscount:1384506117895225355>';
const GEM_CHAT_BOOST_EMOJI = '<:sultragemmulti:1384512368708423781>';

const { SHOP_ITEM_TYPES } = require('./shopManager.js');
const SHOP_DISCOUNT_IDS = ['dis10', 'dis25', 'dis50', 'dis100'];
const DISCOUNT_THRESHOLD_MAP = { dis10: 0.10, dis25: 0.25, dis50: 0.50, dis100: 1.00 };

const SKIP_COST_BASE = Math.pow(1000, 1 / 31);
const gameConfig = require('./game_config.js');
const ITEM_IDS = {
    COINS: gameConfig.items.coins?.id || 'coins',
    GEMS: gameConfig.items.gems?.id || 'gems',
    ROBUX: gameConfig.items.robux?.id || 'robux',
    COMMON_LOOT_BOX: gameConfig.items.common_loot_box?.id || 'common_loot_box',
    RARE_LOOT_BOX: gameConfig.items.rare_loot_box?.id || 'rare_loot_box',
    EPIC_LOOT_BOX: gameConfig.items.epic_loot_box?.id || 'epic_loot_box',
    LEGENDARY_LOOT_BOX: gameConfig.items.legendary_loot_box?.id || 'legendary_loot_box',
    MYTHICAL_CHEST: gameConfig.items.mythical_chest?.id || 'mythical_chest',
    MAGIC_CHEST: gameConfig.items.magic_chest?.id || 'magic_chest',
    GEM_CHEST: gameConfig.items.gem_chest?.id || 'gem_chest',
    VOID_CHEST: gameConfig.items.void_chest?.id || 'void_chest',
    INF_CHEST: gameConfig.items.inf_chest?.id || 'inf_chest',
    DAILY_SKIP_TICKET: gameConfig.items.daily_skip_ticket?.id || 'daily_skip_ticket',
    DISCOUNT_10: gameConfig.items.discount_ticket_10?.id || 'discount_ticket_10',
    DISCOUNT_25: gameConfig.items.discount_ticket_25?.id || 'discount_ticket_25',
    DISCOUNT_50: gameConfig.items.discount_ticket_50?.id || 'discount_ticket_50',
    DISCOUNT_100: gameConfig.items.discount_ticket_100?.id || 'discount_ticket_100',
    WATER_BOTTLE: gameConfig.items.waterbottle?.id || 'waterbottle',
    NEWSPAPER: gameConfig.items.newspaper?.id || 'newspaper',
    EMPTY_CAN: gameConfig.items.emptycan?.id || 'emptycan',
    SEAWEED: gameConfig.items.seaweed?.id || 'seaweed',
};

const fs = require('node:fs').promises;
const fsSync = require('node:fs');
const path = require('node:path');
const { restoreDataFromFiles } = require('./utils/dataRestorer.js'); // Import the new restore function
const { formatNumber, parseAbbreviatedNumber } = require('./utils/numberFormatter.js');

const commandsPath = path.join(__dirname, normalizePath('commands'));
const packageJson = require('./package.json');

const { loadGiveaways, saveGiveaways } = require('./utils/dataManager.js');
const { handleGiveawaySetupInteraction, handleEnterGiveaway, handleClaimPrize, activeGiveaways, endGiveaway, sendSetupChannelMessage, startInstantGiveaway } = require('./utils/giveawayManager.js');
const { startGitHubWebhookServer } = require("./githubWebhook.js");
function getDeployCommands() {
    delete require.cache[require.resolve('./deployCommands.js')];
    return require('./deployCommands.js');
}


function normalizePath(filePath) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        return '';
    }
    return filePath
        .replace(/\\/g, '/')
        .replace(/\/{2,}/g, '/')
        .replace(/^\/|\/$/g, '');
}

function formatPercent(decimal, decimals = 4) {
    return ((decimal || 0) * 100)
        .toFixed(decimals)
        .replace(/\.0+$/, '')
        .replace(/(\.\d*[1-9])0+$/, '$1') + '%';
}

const STAFF_ROLE_IDS = process.env.STAFF_ROLE_IDS ? process.env.STAFF_ROLE_IDS.split(',').map(id => id.trim()) : [];
const LEVEL_UP_CHANNEL_ID = process.env.LEVEL_UP_CHANNEL_ID;
const XP_PER_MESSAGE_BASE = parseInt(process.env.XP_PER_MESSAGE_BASE) || 1;
const XP_COOLDOWN_SECONDS = parseInt(process.env.XP_COOLDOWN_SECONDS) || 1;

const MIN_COINS_PER_MESSAGE = parseInt(process.env.MIN_COINS_PER_MESSAGE) || 1;
const MAX_COINS_PER_MESSAGE = parseInt(process.env.MAX_COINS_PER_MESSAGE) || 10;

const DEFAULT_REPLY_DELETE_TIMEOUT = 60000;

const DEFAULT_LEADERBOARD_GUILD_ID = process.env.DEFAULT_LEADERBOARD_GUILD_ID;
const DEFAULT_LEADERBOARD_CHANNEL_ID = process.env.DEFAULT_LEADERBOARD_CHANNEL_ID;
const LEADERBOARD_LIMIT = parseInt(process.env.LEADERBOARD_LIMIT) || 10;
const LEADERBOARD_BLACKLIST_ROLE_IDS = ['1381232791198367754', '1372979474857197688'];

const LOOTBOX_DROP_CHANNEL_ID = process.env.LOOTBOX_DROP_CHANNEL_ID;
const CHARM_ALERT_CHANNEL_ID = process.env.CHARM_ALERT_CHANNEL_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const NEW_MEMBER_ROLE_ID = '1372573060057530398';
const WEEKEND_ANNOUNCEMENT_CHANNEL_ID = process.env.WEEKEND_ANNOUNCEMENT_CHANNEL_ID || LOOTBOX_DROP_CHANNEL_ID;
const WEEKEND_TZ_OFFSET_HOURS = parseInt(process.env.WEEKEND_TZ_OFFSET_HOURS) || 7;
const RARE_ITEM_ANNOUNCE_CHANNEL_ID = '1373564899199811625';
const LOGO_SYNC_GUILD_ID = process.env.LOGO_SYNC_GUILD_ID;
// Skip weekend boost failsafe logic when this env var is set to "1"
const DISABLE_WEEKEND_FAILSAFE = process.env.DISABLE_WEEKEND_FAILSAFE === '1';

const INVENTORY_MESSAGE_TIMEOUT_MS = 60000;
const USE_ITEM_REPLY_TIMEOUT_MS = 60000;
const BANK_INTERACTION_TIMEOUT_MS = 60000;
const SHOP_MODAL_TIMEOUT_MS = 3 * 60 * 1000;
const EMBED_BUILDER_TIMEOUT_MS = 15 * 60 * 1000;
const USER_MANAGEMENT_PANEL_TIMEOUT_MS = 15 * 60 * 1000; // New timeout for /add-user panel
const SHOP_CHECK_INTERVAL_MS = 1 * 60 * 1000;
const UNBOXING_ANIMATION_DURATION_MS = 3550;
const STREAK_LOSS_CHECK_INTERVAL_MS = 1 * 60 * 60 * 1000; // Check for lost streaks every hour
const DAILY_READY_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check for ready daily every 5 minutes
const AFK_REPLY_INTERVAL_MS = 30 * 1000;

const FISH_WAIT_MIN_MS = 30 * 1000;
const FISH_WAIT_MAX_MS = 60 * 1000;
const FISH_SHAKE_COOLDOWN_MS = 3000;
const FISH_GAME_BAR_POINTS = 100;
const FISH_GAME_BAR_SEGMENT = 5; // each segment worth 5 points
const FISH_BUTTON_COUNTS = { common:4, uncommon:6, rare:10, epic:14, legendary:18, mythical:20, secret:25, prismatic:30 };
const MAX_BAIT = 50;
const FISH_INVENTORY_CAP = 10;
const FISH_OTHER_EMOJIS = ['🌀','🔵','💙','💎','🐋','🧿','🌊','🔹','💤','❄️','🐬','💧','🪼','💦','🧊','🪬','🌎','➡️','⚓','🫧','🦋','💠'];
const FISH_RARITY_COLORS = {
    Common: '#FFFFFF',
    Uncommon: '#75FF75',
    Rare: '#94CAFF',
    Epic: '#FF94FF',
    Legendary: '#FFFF00',
    Mythical: '#FF4D00',
    Secret: '#B700FF',
    Prismatic: '#00FFFF'
};
const RARITY_SYMBOL_TO_NAME = { C: 'Common', U: 'Uncommon', R: 'Rare', E: 'Epic', L: 'Legendary', M: 'Mythical', S: 'Secret', P: 'Prismatic' };
const RARITY_NAME_TO_SYMBOL = { Common: 'C', Uncommon: 'U', Rare: 'R', Epic: 'E', Legendary: 'L', Mythical: 'M', Secret: 'S', Prismatic: 'P' };
const ORDERED_RARITIES = ['Common','Uncommon','Rare','Epic','Legendary','Mythical','Secret','Prismatic'];
const MUTATION_BLOSSOM_EMOJI = '<:mutationblossom:1394379938748043374>';
const BASE_FISH_CHANCE = 0.6;

const BANK_MAXED_ROLE_ID = '1380872298143416340';

const SPECIAL_ROLE_CHANCE = parseInt(process.env.SPECIAL_ROLE_CHANCE) || 1000000;
const VERY_RARE_ITEM_ALERT_CHANNEL_ID = process.env.VERY_RARE_ITEM_ALERT_CHANNEL_ID || LOOTBOX_DROP_CHANNEL_ID;

// New Constant for Robux Withdrawal Log Channel
const ROBUX_WITHDRAWAL_LOG_CHANNEL_ID = '1379495267031846952'; // YOUR_CHANNEL_ID_HERE
// Channel to log general bot errors and issues
const BOT_LOG_CHANNEL_ID = process.env.BOT_LOG_CHANNEL_ID || '1383481711651721307';

const MAX_UNBOX_AMOUNTS = gameConfig.globalSettings?.MAX_UNBOX_AMOUNTS || {
    [ITEM_IDS.COMMON_LOOT_BOX]: 300,
    [ITEM_IDS.RARE_LOOT_BOX]: 200,
    [ITEM_IDS.EPIC_LOOT_BOX]: 100,
    [ITEM_IDS.LEGENDARY_LOOT_BOX]: 50,
};

const LEVEL_SPECIFIC_IMAGE_URLS = {
    0: 'https://i.ibb.co/xKnL4zZ1/bronze1.png', 1: 'https://i.ibb.co/xKnL4zZ1/bronze1.png', 2: 'https://i.ibb.co/rKrLPhZ2/bronze2.png',
    3: 'https://i.ibb.co/xKD6XV0h/bronze3.png', 4: 'https://i.ibb.co/dssGSPSw/bronze4.png', 5: 'https://i.ibb.co/844THPcc/bronze5.png',
    6: 'https://i.ibb.co/4nGc369S/bronze6.png', 7: 'https://i.ibb.co/SD00mHLM/bronze7.png', 8: 'https://i.ibb.co/Q7jHs7SV/bronze8.png',
    9: 'https://i.ibb.co/7NZgRVsD/bronze9.png', 10: 'https://i.ibb.co/TqNBTfPb/bronze10.png', 11: 'https://i.ibb.co/S73NnpJJ/silver1.png',
    12: 'https://i.ibb.co/23b07KK9/silver2.png', 13: 'https://i.ibb.co/1WYSps9/silver3.png', 14: 'https://i.ibb.co/ycMwY0Lf/silver4.png',
    15: 'https://i.ibb.co/v6vgxFwT/silver5.png', 16: 'https://i.ibb.co/RGBVMT1Q/silver6.png', 17: 'https://i.ibb.co/84B7fzdR/silver7.png',
    18: 'https://i.ibb.co/35LT5gTZ/silver8.png', 19: 'https://i.ibb.co/FbmbR9B7/silver9.png', 20: 'https://i.ibb.co/bjnhPLp6/silver10.png',
    21: 'https://i.ibb.co/m5YmC5GW/gold1.png', 22: 'https://i.ibb.co/xKjpYLL5/gold2.png', 23: 'https://i.ibb.co/prKyGsnN/gold3.png',
    24: 'https://i.ibb.co/nqSrz251/gold4.png', 25: 'https://i.ibb.co/gFM0hNB1/gold5.png', 26: 'https://i.ibb.co/MkJyFzfB/gold6.png',
    27: 'https://i.ibb.co/5gQb4V2V/gold7.png', 28: 'https://i.ibb.co/6J1q8cBY/gold8.png', 29: 'https://i.ibb.co/HLQzSmqR/gold9.png',
    30: 'https://i.ibb.co/1JhrQXRB/gold10.png', 31: 'https://i.ibb.co/Xr15PmgD/darkmatter1.png', 32: 'https://i.ibb.co/5hCh1Q48/darkmatter2.png',
    33: 'https://i.ibb.co/TBxxJrpb/darkmatter3.png', 34: 'https://i.ibb.co/gL1s1CP0/darkmatter4.png', 35: 'https://i.ibb.co/7xxF913t/darkmatter5.png',
    36: 'https://i.ibb.co/Psc5MZ1N/darkmatter6.png', 37: 'https://i.ibb.co/W4g7Kh6V/darkmatter7.png', 38: 'https://i.ibb.co/PXNvrhz/darkmatter8.png',
    39: 'https://i.ibb.co/nW6ZDn0/darkmatter9.png', 40: 'https://i.ibb.co/4RbGJvhT/darkmatter10.png', default: 'https://i.ibb.co/placeholder.png'
};

function getImageUrlForLevel(level) { return LEVEL_SPECIFIC_IMAGE_URLS[level] || LEVEL_SPECIFIC_IMAGE_URLS.default; }

const LEVEL_ROLE_COLORS = {
    "1372582451741851699": 0xff8800, "1372583177729867787": 0xffff00, "1372583185887662151": 0xaaff00,
    "1372583186357555242": 0x00ff00, "1374410299180060762": 0x00ffff, "1374410304984977548": 0x00aaff,
    "1374410304456495296": 0x0055ff, "1372583187653595297": 0x0000ff, default: 0xff0000
};

let WEEKEND_BOOST_ACTIVE = false;
let WEEKEND_MULTIPLIERS = { luck: 1.0, xp: 1.0, currency: 1.0, gem: 1.0, shopDiscount: 0.0 };
const WEEKEND_CHECK_INTERVAL_MS = 15 * 60 * 1000;


function toWeekendTZ(date) {
    return new Date(date.getTime() + WEEKEND_TZ_OFFSET_HOURS * 60 * 60 * 1000);
}

function fromWeekendTZ(date) {
    return new Date(date.getTime() - WEEKEND_TZ_OFFSET_HOURS * 60 * 60 * 1000);
}

function isDateInWeekendRange(date = new Date()) {
    const range = client?.levelSystem?.gameConfig?.globalSettings?.WEEKEND_DATE_RANGE;
    const localDate = toWeekendTZ(date);
    if (range) {
        let { startDay = 6, startHour = 0, endDay = 1, endHour = 0 } = range;
        startDay = (startDay + Math.floor(startHour / 24)) % 7;
        startHour = startHour % 24;
        endDay = (endDay + Math.floor(endHour / 24)) % 7;
        endHour = endHour % 24;

        const minutesOfWeek = (d) => d.getUTCDay() * 24 * 60 + d.getUTCHours() * 60 + d.getUTCMinutes();
        let currentMin = minutesOfWeek(localDate);
        let startMin = startDay * 24 * 60 + startHour * 60;
        let endMin = endDay * 24 * 60 + endHour * 60;

        if (endMin <= startMin) endMin += 7 * 24 * 60;
        if (currentMin < startMin) currentMin += 7 * 24 * 60;

        return currentMin >= startMin && currentMin < endMin;
    }
    const day = localDate.getUTCDay();
    return day === 6 || day === 0; // Saturday or Sunday in UTC+7
}

function getCurrentWeekendEndDate(refDate = new Date()) {
    const range = client?.levelSystem?.gameConfig?.globalSettings?.WEEKEND_DATE_RANGE;
    let startDay = 6, startHour = 0, endDay = 1, endHour = 0;
    if (range) {
        ({ startDay = 6, startHour = 0, endDay = 1, endHour = 0 } = range);
    }
    startDay = (startDay + Math.floor(startHour / 24)) % 7;
    startHour = startHour % 24;
    endDay = (endDay + Math.floor(endHour / 24)) % 7;
    endHour = endHour % 24;

    const localRef = toWeekendTZ(refDate);
    const start = new Date(localRef);
    const dayDiff = (localRef.getUTCDay() - startDay + 7) % 7;
    start.setUTCDate(localRef.getUTCDate() - dayDiff);
    start.setUTCHours(startHour, 0, 0, 0);
    if (start > localRef) start.setUTCDate(start.getUTCDate() - 7);

    const end = new Date(start);
    const addDays = (endDay - startDay + 7) % 7 || 7;
    end.setUTCDate(start.getUTCDate() + addDays);
    end.setUTCHours(endHour, 0, 0, 0);
    if (end <= localRef) end.setUTCDate(end.getUTCDate() + 7);
    return fromWeekendTZ(end);
}

function getNextWeekendStartDate(refDate = new Date()) {
    const range = client?.levelSystem?.gameConfig?.globalSettings?.WEEKEND_DATE_RANGE;
    let startDay = 6, startHour = 0, endDay = 1, endHour = 0;
    if (range) {
        ({ startDay = 6, startHour = 0, endDay = 1, endHour = 0 } = range);
    }
    startDay = (startDay + Math.floor(startHour / 24)) % 7;
    startHour = startHour % 24;
    const localRef = toWeekendTZ(refDate);
    const start = new Date(localRef);
    const dayDiff = (startDay - localRef.getUTCDay() + 7) % 7;
    start.setUTCDate(localRef.getUTCDate() + dayDiff);
    start.setUTCHours(startHour, 0, 0, 0);
    if (start <= localRef) start.setUTCDate(start.getUTCDate() + 7);
    return fromWeekendTZ(start);
}

const dbFilePath = path.resolve(__dirname, 'database.db');
const restoreCandidateDbPath = path.resolve(__dirname, 'database_to_restore.db');

// --- START: Startup Data Restoration Logic ---
(async () => {
    // Run the JSON guild data restore logic first
    await restoreDataFromFiles();
})();
// --- END: Startup Data Restoration Logic ---


if (fsSync.existsSync(restoreCandidateDbPath)) {
    console.log(`[DB Restore] Detected restore file at ${restoreCandidateDbPath}. Attempting restore...`);
    try {
        if (fsSync.existsSync(dbFilePath)) {
            const currentDbBackupPath = path.resolve(__dirname, `database_before_restore_${Date.now()}.db`);
            fsSync.copyFileSync(dbFilePath, currentDbBackupPath);
            console.log(`[DB Restore] Backed up current database to ${currentDbBackupPath}.`);
        }
        fsSync.copyFileSync(restoreCandidateDbPath, dbFilePath);
        console.log(`[DB Restore] Successfully restored database from ${restoreCandidateDbPath} to ${dbFilePath}.`);
    } catch (err) {
        console.error(`[DB Restore] COULD NOT restore database from backup: ${err.message}. Will proceed with current database (if any).`);
    }
} else {
    console.log(`[DB Restore] No restore file found at ${restoreCandidateDbPath}. Skipping restore step.`);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});
client.NON_DAILY_NOTIFICATIONS_ENABLED = process.env.DISABLE_NON_DAILY_NOTIFICATIONS !== 'true';

console.log(`[DATABASE] Bot is attempting to use database file at: ${dbFilePath}`);
try {
    client.levelSystem = new SystemsManager(dbFilePath);
    client.levelSystem.globalWeekendMultipliers = WEEKEND_MULTIPLIERS;
    if (!client.levelSystem || !client.levelSystem.db) {
        console.error("CRITICAL: SystemsManager or its DB failed to initialize. Exiting.");
        process.exit(1);
    }
    if (!client.levelSystem.shopManager) {
        console.error("CRITICAL: ShopManager within SystemsManager failed to initialize. Shop-related features will be broken. Exiting.");
        process.exit(1);
    }
    console.log("[SystemsManager & ShopManager] Initialized successfully.");
} catch (e) {
    console.error("CRITICAL: Error initializing SystemsManager. Exiting.", e);
    process.exit(1);
}

client.commands = new Collection();
client.giveawaySetups = new Collection();
client.activeGiveaways = activeGiveaways;
client.voteSetups = new Collection();
client.activeVotes = new Collection();
client.afkUsers = new Map();

const { loadFishData } = require('./utils/fishDataLoader.js');
const { loadAll: loadFishInventories, saveAll: saveFishInventories } = require('./utils/fishInventoryManager.js');
let fishData = [];
try {
    fishData = loadFishData('./fish data.xlsx');
    console.log(`[FishData] Loaded ${fishData.length} fish entries`);
} catch (e) {
    console.error('[FishData] Failed to load fish data:', e.message);
}
client.fishData = fishData;
client.userFishInventories = new Map();
client.userFavoriteFishInventories = new Map();
client.serverFishLog = new Map();

let embedBuildingSessions = new Map();
let inventoryInteractionTimeouts = new Map();
client.activeBankMessages = new Map();
let userManagementSessions = new Map(); // New: For /add-user panel
client.fishInventorySessions = new Map();
client.fishIndexSessions = new Map();
let robuxWithdrawalRequests = new Map(); // New: To store active Robux withdrawal log messages { withdrawalId: messageId }
const SUBMIT_TICKET_VERIFICATION_TEXT = 'I confirm this is my original work and follows all Build-Battle rules';

let slotsSessions = new Map();
let slotsCooldowns = new Map();
let slotsLuckBoosts = new Map();
const SLOT_LUCK_BOOST_DURATION_MS = 5 * 60 * 1000;

let fishingSessions = new Map();
let splitStealGames = new Map();
const RARE_SLOT_IDS = ['lucky7','diamond_gem','triple_bar','double_bar','single_bar','lucky_clover'];
const SLOTS_COOLDOWN_MS = 10 * 60 * 1000;


const SLOT_SYMBOLS = [
    { id: 'lucky7', emoji: '<:slucky7:1390578652118388796>', chance: 0.01, payout: 1000 },
    { id: 'diamond_gem', emoji: '<:sdiamond:1390578741335560235>', chance: 0.02, payout: 500 },
    { id: 'triple_bar', emoji: '<:s3BAR:1390578638461734954>', chance: 0.03, payout: 250 },
    { id: 'double_bar', emoji: '<:s2BAR:1390578627305017375>', chance: 0.04, payout: 125 },
    { id: 'single_bar', emoji: '<:s1BAR:1390578615225286776>', chance: 0.05, payout: 60 },
    { id: 'lucky_clover', emoji: '<:sluckyclover:1390578880401899581>', chance: 0.05, payout: 75 },
    { id: 'bell', emoji: '<:sbell:1390578681705140262>', chance: 0.06, payout: 50 },
    { id: 'heart', emoji: '<:sheart:1390578817680150539>', chance: 0.06, payout: 40 },
    { id: 'spade', emoji: '<:sspade:1390578921631907891>', chance: 0.06, payout: 40 },
    { id: 'diamond_card', emoji: '<:ssgem:1390578803956252742>', chance: 0.06, payout: 40 },
    { id: 'club', emoji: '<:sclub:1390578715469156473>', chance: 0.06, payout: 40 },
    { id: 'horseshoe', emoji: '<:shorseshoe:1390578857438089326>', chance: 0.06, payout: 35 },
    { id: 'watermelon', emoji: '<:swatermelon:1390578936370696294>', chance: 0.07, payout: 25 },
    { id: 'grapes', emoji: '<:sgrape:1390635596422320160>', chance: 0.07, payout: 20 },
    { id: 'plum', emoji: '<:splum:1390578903214587988>', chance: 0.07, payout: 15 },
    { id: 'orange', emoji: '<:sorange:1390578893110382602>', chance: 0.07, payout: 15 },
    { id: 'lemon', emoji: '<:slemon:1390578869647442030>', chance: 0.07, payout: 10 },
    { id: 'cherries', emoji: '<:scherries:1390578728551190638>', chance: 0.06, payout: 10 },
    { id: 'shoe', emoji: '<:sshoe:1390580210151198740>', chance: 0.03, payout: -2 }
];

const BAR_SYMBOLS = ['single_bar', 'double_bar', 'triple_bar'];

function pickRandomSymbol() {
    const total = SLOT_SYMBOLS.reduce((acc, s) => acc + s.chance, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (const sym of SLOT_SYMBOLS) {
        acc += sym.chance;
        if (r <= acc) return sym;
    }
    return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

function pickRandomSymbolForUser(key) {
    const boost = slotsLuckBoosts.get(key);
    const boostActive = boost && boost.expiry > Date.now();
    if (!boostActive && boost) slotsLuckBoosts.delete(key);
    const total = SLOT_SYMBOLS.reduce((acc, s) => {
        const mod = boostActive && RARE_SLOT_IDS.includes(s.id) ? s.chance * 2 : s.chance;
        return acc + mod;
    }, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (const sym of SLOT_SYMBOLS) {
        const mod = boostActive && RARE_SLOT_IDS.includes(sym.id) ? sym.chance * 2 : sym.chance;
        acc += mod;
        if (r <= acc) return sym;
    }
    return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

function randomColor() {
    return Math.floor(Math.random() * 0xffffff);
}

function buildSlotsEmbed(user, bet, results = null, multiplier = null, prize = null, errorMessage = null) {
    const mention = `<@${user.id}>`;
    let line = '■■■┇❓┇❓┇❓┇■■■';
    if (results) {
        line = `■■■┇${results[0].emoji}┇${results[1].emoji}┇${results[2].emoji}┇■■■`;
    }
    let desc;
    if (!bet) {
        desc = [
            `Hey ${mention},`,
            '────────────────────',
            line,
            '────────────────────'
        ].join('\n');
    } else {
        desc = [
            `Hey ${mention}, you have rolled:`,
            '────────────────────',
            line,
            '────────────────────'
        ].join('\n');
    }

    const wonField = `* Multi: ${multiplier !== null ? multiplier : '❓'}\n➜ ${prize !== null ? `${formatNumber(prize)} ${bet ? bet.currencyEmoji : ''}` : '❓'}`;
    const betField = bet ? `${formatNumber(bet.amount)} ${bet.currencyEmoji}` : '❓';

    const fields = [
        { name: 'Won 🎁', value: wonField, inline: true },
        { name: 'Bet 💸', value: betField, inline: true },
        { name: '\u200b', value: '\u200b', inline: true }
    ];
    if (errorMessage) {
        fields.push({ name: 'HEY', value: errorMessage });
    }

    return new EmbedBuilder()
        .setColor(randomColor())
        .setTitle('SLOTS MACHINE <:slots:1390588524725796954>')
        .setDescription(desc)
        .addFields(fields);
}

function calculateMultiplier(symbols) {
    if (symbols[0].id === symbols[1].id && symbols[1].id === symbols[2].id) {
        return symbols[0].payout;
    }
    if (BAR_SYMBOLS.includes(symbols[0].id) && BAR_SYMBOLS.includes(symbols[1].id) && BAR_SYMBOLS.includes(symbols[2].id)) {
        return 20;
    }
    const cherriesCount = symbols.filter(s => s.id === 'cherries').length;
    if (cherriesCount === 2) return 2;
    return 0;
}

function buildSlotsPrizeEmbed() {
    const lines = SLOT_SYMBOLS.map(sym => {
        if (sym.id === 'shoe') {
            return `${sym.emoji}${sym.emoji}${sym.emoji} ➜ Luck Boost (100% for 5 min)`;
        }
        return `${sym.emoji}${sym.emoji}${sym.emoji} ➜ x${sym.payout}`;
    });
    const cherries = SLOT_SYMBOLS.find(s => s.id === 'cherries');
    if (cherries) lines.push(`${cherries.emoji}${cherries.emoji}❓ ➜ x2`);
    const barEmojis = BAR_SYMBOLS.map(id => SLOT_SYMBOLS.find(s => s.id === id)?.emoji).filter(Boolean);
    if (barEmojis.length === 3) lines.push(`${barEmojis.join(' ')} (any mix) ➜ x20`);
    return new EmbedBuilder()
        .setColor(randomColor())
        .setTitle('SLOTS PRIZES')
        .setDescription(lines.join('\n'));
}

function buildFishingStartEmbed(rod, baitCount, alertMessage) {
    let valueLines;
    if (rod && rod.tier) {
        valueLines = [
            `* ${rod.emoji} **Tier ${rod.tier} fishing rod.**`,
            `-# ** 🛡️ Durability:** ${rod.durability} <:pixelheart:1391070636876759121>`,
            `-# **💪 Power:** ${rod.power} `,
            '',
            `* 🪱 **Bait:** ${baitCount}`
        ].join('\n');
    } else {
        valueLines = [
            `* No fishing rod equipped.`,
            `* 🪱 **Bait:** ${baitCount}`
        ].join('\n');
    }
    const embed = new EmbedBuilder()
        .setAuthor({ name: 'FISHING' })
        .setTitle('READY TO FISH?')
        .addFields({ name: 'Tool', value: valueLines, inline: false })
        .setColor('#ffffff')
        .setThumbnail('https://i.ibb.co/SwDkjVjG/the-spinning-fish.gif');
    if (alertMessage) {
        embed.addFields({ name: 'HEY', value: alertMessage, inline: false });
    }
    return embed;
}

function buildFishingWaitEmbed() {
    return new EmbedBuilder()
        .setAuthor({ name: 'FISHING' })
        .setTitle('You have cast the rod')
        .addFields({ name: '\u200b', value: '\u200b', inline: false })
        .setColor('#ffffff')
        .setThumbnail('https://i.ibb.co/SwDkjVjG/the-spinning-fish.gif')
        .setDescription('### waiting for fish <a:koifish:1391078374360748052>');
}

function buildFishingBiteEmbed(fish, rod, lostDur, bar = '▒'.repeat(20), endTimeMs) {
    const valueLines = [
        `* ${rod.emoji} **Tier ${rod.tier} fishing rod.**`,
        `-# ** 🛡️ Durability:** ${rod.durability - lostDur} <:pixelheart:1391070636876759121> ` + (lostDur ? `\`-${lostDur}\`` : '')
    ].join('\n');
    const color = FISH_RARITY_COLORS[fish.rarity] || '#ffffff';
    return new EmbedBuilder()
        .setAuthor({ name: 'FISHING' })
        .setTitle('A fish bite your rod!')
        .addFields({ name: 'Tool', value: valueLines, inline: false })
        .setColor(color)
        .setThumbnail('https://i.ibb.co/SwDkjVjG/the-spinning-fish.gif')
        .setDescription([`### Reel it in!`, bar, `-# fail <t:${Math.floor(endTimeMs/1000)}:R>`].join('\n'))
        .setFooter({ text: 'Click the fish emoji!' });
}

function buildFishingFailEmbed(rod, dLoss, bLoss, rodBroken = false) {
    const toolLines = [
        `* ${rod.emoji} **Tier ${rod.tier} fishing rod.**`,
        `-# your fishing rod have lost ${dLoss} durability`
    ].join('\n');
    const embed = new EmbedBuilder()
        .setAuthor({ name: 'FISHING' })
        .setTitle('You have failed...')
        .addFields(
            { name: 'Tool', value: toolLines, inline: false },
            { name: 'Lost', value: `* You lost ${bLoss} bait`, inline: false }
        )
        .setColor('#ff0000')
        .setThumbnail('https://i.ibb.co/SwDkjVjG/the-spinning-fish.gif')
        .setDescription('### The fish ran away...');
    if (rodBroken) embed.addFields({ name: 'Oh no!', value: 'Your fishing rod broke!', inline: false });
    return embed;
}

function buildFishingSuccessEmbed(fish, rod, dLoss, bLoss, rodBroken = false) {
    const toolLines = [
        `* ${rod.emoji} **Tier ${rod.tier} fishing rod.**`,
        `-# your fishing rod have lost ${dLoss} durability`
    ].join('\n');
    const desc = [
        `* ⚖️ Weigh: ${fish.weight} kg`,
        `* ☢️ Mutation: ${fish.mutation ? `${MUTATION_BLOSSOM_EMOJI}` : ''}`,
        `* ✨ Rarity: ${fish.rarity}`,
        `* 🆔 Fish ID: \`${fish.id}\``
    ];
    const color = FISH_RARITY_COLORS[fish.rarity] || '#00ff00';
    const embed = new EmbedBuilder()
        .setAuthor({ name: 'FISHING' })
        .setTitle(`You have caught ${fish.name} ${fish.emoji}!`)
        .addFields(
            { name: 'Tool', value: toolLines, inline: false },
            { name: 'Lost', value: `* You lost ${bLoss} bait`, inline: false }
        )
        .setColor(color)
        .setThumbnail('https://i.ibb.co/SwDkjVjG/the-spinning-fish.gif')
        .setDescription(desc.join('\n'));
    if (rodBroken) embed.addFields({ name: 'Oh no!', value: 'Your fishing rod broke!', inline: false });
    return embed;
}

function buildFishingTrashEmbed(trash, rod, dLoss, bLoss, rodBroken = false) {
    const toolLines = [
        `* ${rod.emoji} **Tier ${rod.tier} fishing rod.**`,
        `-# your fishing rod have lost ${dLoss} durability`
    ].join('\n');
    const embed = new EmbedBuilder()
        .setAuthor({ name: 'FISHING' })
        .setTitle(`You caught trash ${trash.name} ${trash.emoji}`)
        .addFields(
            { name: 'Tool', value: toolLines, inline: false },
            { name: 'Lost', value: `* You lost ${bLoss} bait`, inline: false }
        )
        .setColor('#808080')
        .setThumbnail('https://i.ibb.co/SwDkjVjG/the-spinning-fish.gif');
    if (rodBroken) embed.addFields({ name: 'Oh no!', value: 'Your fishing rod broke!', inline: false });
    return embed;
}

function pickRandomFish() {
    if (!client.fishData || !client.fishData.length) return null;
    const seasonIdx = typeof client.getCurrentSeasonIndex === 'function' ? client.getCurrentSeasonIndex() : 0;
    const seasonKeys = ['springChance','summerChance','autumnChance','winterChance'];
    const keyName = seasonKeys[seasonIdx] || seasonKeys[0];
    const weights = client.fishData.map(f => Number(f[keyName]) || 0);
    const total = weights.reduce((a,b) => a + b, 0);
    let fish = null;
    if (total > 0) {
        let r = Math.random() * total;
        for (let i=0;i<client.fishData.length;i++) {
            r -= weights[i];
            if (r <= 0) { fish = client.fishData[i]; break; }
        }
    }
    if (!fish) fish = client.fishData[Math.floor(Math.random()*client.fishData.length)];
    const weight = +(fish.minWeight + Math.random()*(fish.maxWeight - fish.minWeight)).toFixed(2);
    const prefix = fish.idPrefix || fish.rarity;
    const id = `${prefix}${String(Math.floor(Math.random()*100000)).padStart(5,'0')}`;
    const rarityName = RARITY_SYMBOL_TO_NAME[fish.rarity] || fish.rarity;
    const obj = { name: fish.name, emoji: fish.emoji, rarity: rarityName, weight, id, durabilityLoss: fish.durabilityLoss, powerReq: fish.powerReq };
    if (isBlossomActive() && Math.random() < 0.20) obj.mutation = 'Blossom';
    return obj;
}

function pickRandomTrash() {
    const trash = [
        gameConfig.items.waterbottle,
        gameConfig.items.newspaper,
        gameConfig.items.emptycan,
        gameConfig.items.seaweed,
    ];
    return trash[Math.floor(Math.random() * trash.length)];
}

function buildFishInventoryEmbed(userId, guildId, page = 1, favoritesOnly = false) {
    const inv = favoritesOnly ? (client.userFavoriteFishInventories.get(`${userId}_${guildId}`) || []) : (client.userFishInventories.get(`${userId}_${guildId}`) || []);
    const userInvFull = client.levelSystem.getUserInventory(userId, guildId);
    const rod = userInvFull.generalItems.find(i => i.itemId.startsWith('fishing_rod')) || {};
    const baitItemInv = userInvFull.generalItems.find(i => i.itemId === 'worm');
    let baitAmt = baitItemInv ? baitItemInv.quantity : 0;
    if (baitAmt > MAX_BAIT) baitAmt = MAX_BAIT;
    const rodCfg = client.levelSystem.gameConfig.items[rod.itemId] || client.levelSystem.gameConfig.items['fishing_rod_tier1'];
    const rodInfo = { emoji: rodCfg.emoji || '🎣', tier: (rodCfg.name && rodCfg.name.match(/(\d+)/)) ? RegExp.$1 : 1, durability: rod.quantity || rodCfg.durability };
    const pageSize = FISH_INVENTORY_CAP;
    const totalPages = Math.max(1, Math.ceil(inv.length / pageSize));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    const embed = new EmbedBuilder()
        .setColor(favoritesOnly ? '#FF69B4' : '#ffffff')
        .setThumbnail('https://i.ibb.co/99gtXzTD/26ff0f18-ddac-4283-abc2-b09c00d6cccc.png')
        .setTitle(`${favoritesOnly ? 'Favorite ' : ''}Fish Inventory`)
        .setDescription(`Page ${page}/${totalPages}\n* Inventory capacity: ${inv.length}/${FISH_INVENTORY_CAP}`);
    let gearField = `Fishing Rod: Tier ${rodInfo.tier} ${rodInfo.emoji} (${rodInfo.durability}/${rodCfg.durability})\nBait: ${baitAmt}/${MAX_BAIT}`;
    if (!rod.itemId) gearField = `Fishing Rod: None\nBait: ${baitAmt}/${MAX_BAIT}`;
    embed.addFields({ name: 'Fishing Gear', value: gearField, inline:false });
    for (const fish of inv.slice((page-1)*pageSize, page*pageSize)) {
        let valStr = `* ⚖️ Weigh: ${fish.weight} kg\n* ☢️ Mutation: ${fish.mutation ? `${MUTATION_BLOSSOM_EMOJI}` : ''}\n* ✨ Rarity: ${fish.rarity}\n* 🆔 Fish ID: \`${fish.id}\``;
        if (fish.value !== undefined) {
            const fishEmoji = client.levelSystem.fishDollarEmoji || DEFAULT_FISH_DOLLAR_EMOJI_FALLBACK;
            valStr += `\n* ${fishEmoji} Value: ${fish.value.toFixed(2)}`;
            if (fish.baseValue && fish.baseValue !== fish.value) valStr += ` (${fish.baseValue.toFixed(2)})`;
        }
        embed.addFields({ name: `${fish.name} ${fish.emoji || ''}`, value: valStr, inline: false });
    }
    return { embed, totalPages };
}

async function startFishingGame(sessionKey) {
    const session = fishingSessions.get(sessionKey);
    if (!session) return;
    clearTimeout(session.shakeTimeout);
    session.shakeTimeout = null;
    const channel = await client.channels.fetch(session.channelId).catch(()=>null);
    if (!channel) { fishingSessions.delete(sessionKey); return; }
    const msg = await channel.messages.fetch(session.messageId).catch(()=>null);
    if (!msg) { fishingSessions.delete(sessionKey); return; }
    const invCheck = client.userFishInventories.get(sessionKey) || [];
    if (invCheck.length >= FISH_INVENTORY_CAP) {
        const embed = buildFishingStartEmbed(session.rod, session.bait, 'Inventory full!');
        await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
        fishingSessions.delete(sessionKey);
        return;
    }
    const chance = Math.min(1, BASE_FISH_CHANCE * getCatchMultiplier());
    if (Math.random() > chance) {
        const trash = pickRandomTrash();
        await finishFishingTrash(sessionKey, trash);
        return;
    }
    const fish = pickRandomFish();
    if (!fish) { fishingSessions.delete(sessionKey); return; }
    session.fish = fish;
    session.stage = 'game';
    session.progress = 0;
    session.endTime = Date.now() + 60000; // 60s to catch
    if (session.rod.power >= fish.powerReq) {
        return finishFishing(true, sessionKey);
    }
    session.buttonCount = FISH_BUTTON_COUNTS[fish.rarity.toLowerCase()] || 4;
    session.fishIndex = Math.floor(Math.random()*session.buttonCount);
    const bar = buildProgressBar(0, fish.powerReq);
    const embed = buildFishingBiteEmbed(fish, session.rod, session.durabilityLoss, bar, session.endTime);
    const rows = buildFishingButtons(session.buttonCount, session.fishIndex);
    await msg.edit({ embeds:[embed], components:rows }).catch(()=>{});
    session.gameTimeout = setTimeout(()=>finishFishing(false, sessionKey), 60000);
    session.moveInterval = setInterval(()=>{
        session.fishIndex = Math.floor(Math.random()*session.buttonCount);
        updateFishingMessage(sessionKey); }, 5000);
    fishingSessions.set(sessionKey, session);
}

function buildProgressBar(progress, required) {
    const filled = Math.min(20, Math.round((progress / required) * 20));
    return '█'.repeat(filled) + '▒'.repeat(20 - filled);
}

function buildFishingButtons(count, fishIndex) {
    const buttons = [];
    for (let i = 0; i < count; i++) {
        const emoji = i === fishIndex ? '🐟' : FISH_OTHER_EMOJIS[Math.floor(Math.random()*FISH_OTHER_EMOJIS.length)];
        buttons.push(new ButtonBuilder().setCustomId(`fishing_btn_${i}`).setStyle(ButtonStyle.Secondary).setEmoji(emoji));
    }
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i+5)));
    }
    return rows;
}

async function updateFishingMessage(sessionKey) {
    const session = fishingSessions.get(sessionKey);
    if (!session) return;
    const channel = await client.channels.fetch(session.channelId).catch(()=>null);
    const msg = channel ? await channel.messages.fetch(session.messageId).catch(()=>null) : null;
    if (!msg) return;
    const bar = buildProgressBar(session.progress, session.fish.powerReq);
    const embed = buildFishingBiteEmbed(session.fish, session.rod, session.durabilityLoss, bar, session.endTime);
    const rows = buildFishingButtons(session.buttonCount, session.fishIndex);
    await msg.edit({ embeds:[embed], components:rows }).catch(()=>{});
}

async function finishFishing(success, sessionKey, rodBroken = false) {
    const session = fishingSessions.get(sessionKey);
    if (!session) return;
    const channel = await client.channels.fetch(session.channelId).catch(()=>null);
    if (!channel) { fishingSessions.delete(sessionKey); return; }
    const msg = await channel.messages.fetch(session.messageId).catch(()=>null);
    if (!msg) { fishingSessions.delete(sessionKey); return; }
    clearTimeout(session.gameTimeout); clearTimeout(session.waitTimeout); clearInterval(session.moveInterval); clearTimeout(session.shakeTimeout);
    const againRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fishing_again').setLabel('FISH AGAIN?').setStyle(ButtonStyle.Primary));
    const [userId, guildId] = sessionKey.split('_');
    const durabilityLoss = success ? session.durabilityLoss : session.durabilityLoss + 1;
    let broke = rodBroken;
    if (session.rodItemId) {
        const rodItem = client.levelSystem.getItemFromInventory(userId, guildId, session.rodItemId);
        if (rodItem) {
            const remaining = rodItem.quantity - durabilityLoss;
            if (remaining <= 0) {
                client.levelSystem.takeItem(userId, guildId, session.rodItemId, rodItem.quantity);
                broke = true;
            } else {
                client.levelSystem.takeItem(userId, guildId, session.rodItemId, durabilityLoss);
            }
        } else {
            broke = true;
        }
    }
    client.levelSystem.takeItem(userId, guildId, 'worm', 1);
    if (success) {
        const inv = client.userFishInventories.get(sessionKey) || [];
        if (inv.length < FISH_INVENTORY_CAP) { inv.push(session.fish); client.userFishInventories.set(sessionKey, inv); }
        const serverList = client.serverFishLog.get(guildId) || [];
        serverList.push(session.fish);
        client.serverFishLog.set(guildId, serverList);
        persistFishData();
        const embed = buildFishingSuccessEmbed(session.fish, session.rod, durabilityLoss - (success ? 0 : 1), 1, broke);
        await msg.edit({ embeds:[embed], components:[againRow] }).catch(()=>{});
    } else {
        const embed = buildFishingFailEmbed(session.rod, durabilityLoss, 1, broke);
        await msg.edit({ embeds:[embed], components:[againRow] }).catch(()=>{});
    }
    fishingSessions.delete(sessionKey);
}

async function finishFishingTrash(sessionKey, trash, rodBroken = false) {
    const session = fishingSessions.get(sessionKey);
    if (!session) return;
    const channel = await client.channels.fetch(session.channelId).catch(()=>null);
    if (!channel) { fishingSessions.delete(sessionKey); return; }
    const msg = await channel.messages.fetch(session.messageId).catch(()=>null);
    if (!msg) { fishingSessions.delete(sessionKey); return; }
    clearTimeout(session.gameTimeout); clearTimeout(session.waitTimeout); clearInterval(session.moveInterval); clearTimeout(session.shakeTimeout);
    const againRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fishing_again').setLabel('FISH AGAIN?').setStyle(ButtonStyle.Primary));
    const [userId, guildId] = sessionKey.split('_');
    const durabilityLoss = session.durabilityLoss;
    let broke = rodBroken;
    if (session.rodItemId) {
        const rodItem = client.levelSystem.getItemFromInventory(userId, guildId, session.rodItemId);
        if (rodItem) {
            const remaining = rodItem.quantity - durabilityLoss;
            if (remaining <= 0) { client.levelSystem.takeItem(userId, guildId, session.rodItemId, rodItem.quantity); broke = true; }
            else if (durabilityLoss > 0) { client.levelSystem.takeItem(userId, guildId, session.rodItemId, durabilityLoss); }
        } else broke = true;
    }
    client.levelSystem.takeItem(userId, guildId, 'worm', 1);
    client.levelSystem.giveItem(userId, guildId, trash.id, 1, client.levelSystem.itemTypes.JUNK, 'fish_trash');
    const embed = buildFishingTrashEmbed(trash, session.rod, durabilityLoss, 1, broke);
    await msg.edit({ embeds:[embed], components:[againRow] }).catch(()=>{});
    fishingSessions.delete(sessionKey);
}



// --- Helper Functions for /add-user ---
function buildUserManagementPanelEmbed(targetUser, operations = []) {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`📝 Managing User: ${targetUser.tag} (${targetUser.id})`)
        .setDescription('Use the buttons below to add operations. Click "Complete & Process" when done.')
        .setTimestamp();

    if (operations.length === 0) {
        embed.addFields({ name: 'Pending Operations', value: 'No operations added yet.' });
    } else {
        const opsString = operations.map((op, index) => {
            let opDesc = `**${index + 1}.** Action: \`${op.action.toUpperCase()}\` ` +
                         `Type: \`${op.type.toUpperCase()}\` ` +
                         `ID/Name: \`${op.targetId}\``;
            if (op.amount !== undefined && op.amount !== null) {
                opDesc += ` Amount: \`${op.amount}\``;
            }
            return opDesc;
        }).join('\n');
        embed.addFields({ name: '📋 Pending Operations', value: opsString.substring(0, 1020) || 'No operations added yet.' }); // Limit field value length
    }

    // NEW FIELD FOR INSTRUCTIONS
    embed.addFields({
        name: '📝 How to Add Operations (in the modal)',
        value: 'Format each operation on a new line:\n' +
               '`[+/-] - type - id/name - amount (if any)`\n\n' +
               '**Types:** `role`, `coin`, `gem`, `robux`, `item`\n\n' +
               '**Examples:**\n' +
               '`+ - role - 123456789012345678`\n' +
               '`- - item - common_loot_box - 2`\n' +
               '`+ - coin - 100`\n' +
               '`+ - robux - 50`',
        inline: false
    });

    embed.setFooter({ text: `Panel will time out in ${USER_MANAGEMENT_PANEL_TIMEOUT_MS / 60000} minutes.` });
    return embed;
}

function getUserManagementPanelComponents(sessionId, operationsCount = 0) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ums_add_operation_${sessionId}`)
                .setLabel('Add/Remove Operation')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId(`ums_process_operations_${sessionId}`)
                .setLabel('Complete & Process')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
                .setDisabled(operationsCount === 0), // Disable if no operations
            new ButtonBuilder()
                .setCustomId(`ums_cancel_session_${sessionId}`)
                .setLabel('Cancel Panel')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('✖️')
        )
    ];
}
// --- End Helper Functions for /add-user ---

// --- Helper Functions for /daily ---
async function buildDailyEmbed(interaction, client) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const systemsManager = client.levelSystem;

    const user = systemsManager.getUser(userId, guildId);
    const rewards = systemsManager.getDailyRewards(userId, guildId);

    const currencyBoost = (1 + (user.dailyStreak * 0.2)).toFixed(2);
    const itemLuckBoost = Math.min(1000, (user.dailyStreak * 1)).toFixed(2); // Capped at 1000%

    const now = Date.now();
    const lastClaim = user.lastDailyTimestamp || 0;
    const cooldown = 12 * 60 * 60 * 1000; // 12 hours
    const nextClaimTimestamp = lastClaim + cooldown;
    const canClaim = now >= nextClaimTimestamp;
    
    let nextClaimText = '';
    if (canClaim) {
        nextClaimText = "✅ You can claim your reward now!";
    } else {
        nextClaimText = `You can claim again <t:${Math.floor(nextClaimTimestamp / 1000)}:R>`;
    }

    const embed = new EmbedBuilder()
        .setColor(0x58A6FF)
        .setTitle(`📅 ${interaction.user.username}'s Daily Rewards`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            {
                name: '🔥 Daily Streak',
                value: `**Streak:** \`${user.dailyStreak}\`\n**Currency Boost:** \`x${currencyBoost}\`\n**Item Luck:** \`+${itemLuckBoost}%\``,
                inline: false
            }
        );

    const rewardFields = [
        { day: 1, title: '🎁 Today' },
        { day: 2, title: '🗓️ Next Reward' },
        { day: 3, title: '🗓️ Reward After Next' }
    ];

    for (const field of rewardFields) {
        const reward = rewards[field.day];
        let rewardText = "❓ *Calculating...*";
        if (reward) {
            const itemConfig = systemsManager._getItemMasterProperty(reward.data.id, null);
            const emoji = itemConfig?.emoji || '❔';
            const name = itemConfig?.name || reward.data.id;
            const amount = reward.data.amount.toLocaleString();
            rewardText = `${emoji} **${amount}x ${name}**`;
        }
        embed.addFields({ name: field.title, value: rewardText, inline: true });
    }

    embed.addFields({ name: '⏳ Next Claim', value: nextClaimText, inline: false });
    embed.setFooter({ text: "Rewards shift forward each time you claim. Don't lose your streak!" });

    const skipCount = user.dailySkipCount || 0;
    const skipCost = Math.min(1000, Math.round(Math.pow(SKIP_COST_BASE, skipCount)));

    const components = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('claim_daily_reward')
            .setLabel('Claim Today\'s Reward')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎉')
            .setDisabled(!canClaim),
        new ButtonBuilder()
            .setCustomId('skip_daily_gems')
            .setLabel(`Skip Reward (${skipCost} Gems)`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⏭️')
            .setDisabled(canClaim),
        new ButtonBuilder()
            .setCustomId('skip_daily_ticket')
            .setLabel('Skip Reward (1 Ticket)')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:skipdailyticket:1389239150703673448>')
            .setDisabled(canClaim)
    );

    return { embed, components: [components] };
}
// --- End Helper Functions for /daily ---

function buildSettingsEmbed(userId, guildId, systemsManager) {
    const userDm = systemsManager.getUserDmSettings(userId, guildId);
    const globalAlert = systemsManager.getUserGlobalLootAlertSettings(userId, guildId);
    const dailyEnabled = userDm.enableDailyReadyDm ? SETTINGS_EMOJI_ENABLED : SETTINGS_EMOJI_DISABLED;

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⚙️ User Settings')
        .setDescription('Configure your alert preferences.')
        .addFields(
            { name: 'Daily Ready Alert', value: `${dailyEnabled} Once your daily is ready, it will notify you.` },
            { name: 'Item Rarity Alert', value: `\`${globalAlert.alertRarityThreshold}\` Any item rarer than your set rarity will be notified.` },
            { name: 'Shop Notify', value: 'Use the buttons below to configure shop alerts.' }
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('setting_toggle_daily')
            .setLabel(userDm.enableDailyReadyDm ? 'Disable Daily Alert' : 'Enable Daily Alert')
            .setStyle(userDm.enableDailyReadyDm ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('setting_set_rarity')
            .setLabel('Change Rarity Threshold')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('setting_shop')
            .setLabel('Shop Settings')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embed, components: [row] };
}

function buildShopSettingsEmbed(userId, guildId, systemsManager) {
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🛍️ Shop Alert Settings')
        .setDescription('Configure alerts for shop items. Discount notifications are disabled while weekend boost is active.');

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_setting_lootbox').setLabel('Chests').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_setting_charm').setLabel('Charms').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_setting_exclusive').setLabel('Exclusive').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_setting_discount').setLabel('Discount').setStyle(ButtonStyle.Primary)
    );
    const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_setting_back_main').setLabel('Back').setStyle(ButtonStyle.Secondary)
    );
    return { embed, components: [row1, backRow] };
}

function buildShopCategoryEmbed(userId, guildId, systemsManager, category) {
    const userSettings = systemsManager.getAllUserShopAlertSettings(userId, guildId);
    let items = Object.values(systemsManager.gameConfig.items).filter(it => it.type === category);
    if (category === 'discount') {
        items = SHOP_DISCOUNT_IDS.map(id => ({ id, name: id.toUpperCase(), emoji: '💸' }));
    } else if (category === 'special_role_item') {
        const cosmicToken = systemsManager.gameConfig.items[systemsManager.COSMIC_ROLE_TOKEN_ID];
        if (cosmicToken) items.push(cosmicToken);
        const robuxItem = systemsManager.gameConfig.items[ITEM_IDS.ROBUX];
        if (robuxItem) items.push(robuxItem);
    }
    const embed = new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle(`🛍️ ${category.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} Alerts`);
    items.forEach(it => {
        const enabled = userSettings[it.id] !== false;
        embed.addFields({ name: `${it.emoji || ''} ${it.name} (\`${it.id}\`)`, value: enabled ? SETTINGS_EMOJI_ENABLED : SETTINGS_EMOJI_DISABLED, inline: true });
    });
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_category_back').setLabel('Back').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`shop_change_modal_${category}`).setLabel('Change').setStyle(ButtonStyle.Primary)
    );
    return { embed, components: [row] };
}

// --- Helper Functions for /withdraw-robux ---
function buildRobuxWithdrawalRequestEmbed(withdrawalRequest, targetUser) {
    const robuxEmoji = client.levelSystem.robuxEmoji || DEFAULT_ROBUX_EMOJI_FALLBACK;
    let statusColor = 0xAAAAAA; // Grey for PENDING
    if (withdrawalRequest.status === 'ACCEPTED') statusColor = 0x00FF00; // Green
    else if (withdrawalRequest.status === 'DENIED') statusColor = 0xFF0000; // Red
    else if (withdrawalRequest.status === 'ERROR_PROCESSING') statusColor = 0xFF8C00; // Orange for errors

    const embed = new EmbedBuilder()
        .setColor(statusColor)
        .setTitle(`Robux Withdrawal Request - ID: ${withdrawalRequest.withdrawalId}`)
        .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
        .addFields(
            { name: '👤 Discord User', value: `<@${withdrawalRequest.userId}> (\`${withdrawalRequest.userId}\`)`, inline: true },
            { name: '🎮 Roblox Username', value: `\`${withdrawalRequest.robloxUsername}\``, inline: true },
            { name: `${robuxEmoji} Amount Requested`, value: `\`${withdrawalRequest.amount.toLocaleString()}\``, inline: true },
            { name: '🔗 Gamepass Link', value: `[Click Here](${withdrawalRequest.gamepassLink})`, inline: false },
            { name: '🕒 Request Timestamp', value: `<t:${withdrawalRequest.requestTimestamp}:F>`, inline: false },
            { name: '📊 Status', value: `**${withdrawalRequest.status}**`, inline: true }
        )
        .setTimestamp();

    if (withdrawalRequest.processedByUserId) {
        embed.addFields({ name: '🛡️ Processed By', value: `<@${withdrawalRequest.processedByUserId}>`, inline: true });
        embed.addFields({ name: '⏱️ Processed At', value: `<t:${withdrawalRequest.processedTimestamp}:F>`, inline: false });
    }
    if (withdrawalRequest.reasonOrEvidence) {
        const fieldName = withdrawalRequest.status === 'DENIED' ? 'Reason for Denial' : 'Evidence/Note';
        embed.addFields({ name: `📝 ${fieldName}`, value: withdrawalRequest.reasonOrEvidence, inline: false });
    }
    return embed;
}

function getRobuxWithdrawalActionComponents(withdrawalId, currentStatus = 'PENDING') {
    const disabled = currentStatus !== 'PENDING';
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rwr_accept_${withdrawalId}`)
                .setLabel('Accept')
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`rwr_deny_${withdrawalId}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled)
        )
    ];
}
// --- End Helper Functions for /withdraw-robux ---

function buildWeekendAnnouncementEmbed(client, enabled) {
    const g = client.levelSystem?.gameConfig?.globalSettings || {};
    const coinMult = g.WEEKEND_COIN_MULTIPLIER || WEEKEND_COIN_MULTIPLIER;
    const gemMult  = g.WEEKEND_GEM_MULTIPLIER  || WEEKEND_GEM_MULTIPLIER;
    const xpMult   = g.WEEKEND_XP_MULTIPLIER   || WEEKEND_XP_MULTIPLIER;

    const embed = new EmbedBuilder()
        .setColor(enabled ? 0x2ECC71 : 0xE74C3C)
        .setTitle(enabled ? '🎉 Weekend Boost Activated!' : 'Weekend Boost Ended')
        .setTimestamp();

    if (enabled) {
        embed.setDescription(
            `Coins ×${coinMult}\nGems ×${gemMult}\nXP ×${xpMult}\nEnjoy until Monday 00:00 UTC+7!`
        );
        const endDate = getCurrentWeekendEndDate();
        if (endDate) {
            embed.addFields({ name: 'Time Remaining', value: `<t:${Math.floor(endDate.getTime()/1000)}:R>` });
        }
    } else {
        embed.setDescription('Weekend boost has concluded.');
    }

    return embed;
}



async function refreshShopDisplayForGuild(guildIdToRefresh, clientInstance) {
    if (!clientInstance.levelSystem || !clientInstance.levelSystem.shopManager) {
        console.warn(`[refreshShopDisplayForGuild] ShopManager not available for guild ${guildIdToRefresh}. Skipping refresh.`);
        return;
    }
    const shopManagerInstance = clientInstance.levelSystem.shopManager;
    const guildShopSettings = shopManagerInstance.getGuildShopSettings(guildIdToRefresh);

    if (guildShopSettings.shopChannelId) {
        const shopChannel = await clientInstance.channels.fetch(guildShopSettings.shopChannelId).catch(() => null);
        if (shopChannel && shopChannel.isTextBased()) {
            const { embed: newShopEmbed, shopItems: newItems } = await buildShopEmbed(guildIdToRefresh, clientInstance.levelSystem, shopManagerInstance);
            const components = getShopComponents(newItems, clientInstance.levelSystem);

            if (guildShopSettings.shopMessageId) {
                const oldShopMessage = await shopChannel.messages.fetch(guildShopSettings.shopMessageId).catch(() => null);
                if (oldShopMessage && oldShopMessage.editable) {
                    await oldShopMessage.edit({ embeds: [newShopEmbed], components: components }).catch(e => {
                        console.warn(`[ShopRefresh Helper] Failed to edit shop message ${guildShopSettings.shopMessageId} in guild ${guildIdToRefresh}: ${e.message}`);
                    });
                } else if (oldShopMessage) {
                    if (oldShopMessage.deletable) {
                        await oldShopMessage.delete().catch(e => {
                             if (e.code !== 10008) console.warn(`[ShopRefresh Helper] Failed to delete uneditable old shop message ${oldShopMessage.id}: ${e.message}`);
                        });
                    }
                    const newMessage = await shopChannel.send({ embeds: [newShopEmbed], components: components }).catch(e => {
                         console.error(`[ShopRefresh Helper] Failed to send new shop message after old was uneditable/not found for guild ${guildIdToRefresh}: ${e.message}`);
                         return null;
                    });
                    if (newMessage) shopManagerInstance.updateGuildShopSettings(guildIdToRefresh, { shopMessageId: newMessage.id });

                } else {
                    const newMessage = await shopChannel.send({ embeds: [newShopEmbed], components: components }).catch(e => {
                        console.error(`[ShopRefresh Helper] Failed to send new shop message (no old message ID) for guild ${guildIdToRefresh}: ${e.message}`);
                        return null;
                    });
                    if (newMessage) shopManagerInstance.updateGuildShopSettings(guildIdToRefresh, { shopMessageId: newMessage.id });
                }
            } else {
                const newMessage = await shopChannel.send({ embeds: [newShopEmbed], components: components }).catch(e => {
                     console.error(`[ShopRefresh Helper] Failed to send new shop message (no message ID configured) for guild ${guildIdToRefresh}: ${e.message}`);
                     return null;
                });
                if (newMessage) shopManagerInstance.updateGuildShopSettings(guildIdToRefresh, { shopMessageId: newMessage.id });
            }
        } else {
             console.warn(`[refreshShopDisplayForGuild] Shop channel ${guildShopSettings.shopChannelId} for guild ${guildIdToRefresh} not found or not text-based.`);
        }
    }
}

async function sendRestockAlerts(client, guild, restockResult, isInstant = false) {
    const guildId = guild.id;
    const alertWorthyDiscount = client.levelSystem.gameConfig.globalSettings.ALERT_WORTHY_DISCOUNT_PERCENT || 0.25;
    const highlyRelevantItems = (restockResult.alertableItemsFound || []).filter(
        item => (item.discountPercent >= alertWorthyDiscount) || item.isWeekendSpecial === 1 || item.id === ITEM_IDS.ROBUX
    );
    if (highlyRelevantItems.length > 0) {
        const itemIds = highlyRelevantItems.map(i => i.id);
        const usersToAlert = client.levelSystem.getUsersForShopAlertByItems(guildId, itemIds);
        if (usersToAlert.length > 0) {
            const lines = highlyRelevantItems.slice(0,5).map(item => {
                let priceCurrencyEmoji = client.levelSystem.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
                if (item.priceCurrency === ITEM_IDS.GEMS) priceCurrencyEmoji = client.levelSystem.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
                else if (item.priceCurrency === ITEM_IDS.ROBUX) priceCurrencyEmoji = client.levelSystem.robuxEmoji || DEFAULT_ROBUX_EMOJI_FALLBACK;
                let txt = `${item.emoji} ${item.name} - ${item.price.toLocaleString()} ${priceCurrencyEmoji}`;
                if (item.discountPercent > 0 && item.originalPrice > item.price) {
                    const displayLabel = `${DISCOUNT_BOOST_EMOJI} ` + (item.discountLabel && item.discountLabel.trim() !== '' ? item.discountLabel : `${(item.discountPercent * 100).toFixed(0)}% OFF`);
                    txt += ` (~~${item.originalPrice.toLocaleString()}~~ - ${displayLabel})`;
                }
                return txt;
            });
            if (highlyRelevantItems.length > 5) lines.push('...and more! Check the shop!');
            const alertEmbed = new EmbedBuilder()
                .setTitle(`🛍️ Rare Finds & Deals in ${guild.name}'s Shop!${isInstant ? ' (Instant Restock)' : ''}`)
                .setColor(0xFFB6C1)
                .setDescription(lines.join('\n'))
                .setTimestamp();
            for (const alertUserId of usersToAlert) {
                try { await (await client.users.fetch(alertUserId)).send({ embeds: [alertEmbed] }); }
                catch(dmError){ if(dmError.code !== 50007) console.warn(`[Shop Restock DM] Failed to DM ${alertUserId}: ${dmError.message}`); }
            }
        }
    }
    const allItemIds = restockResult.items.map(it => it.itemId);
    const watchUsersSet = new Set(client.levelSystem.getUsersForShopAlertByItems(guildId, allItemIds));
    const discountWatchUsers = client.levelSystem.getUsersForShopAlertByItems(guildId, SHOP_DISCOUNT_IDS);
    for (const u of discountWatchUsers) watchUsersSet.add(u);
    const watchUsers = Array.from(watchUsersSet);
    for (const watchUserId of watchUsers) {
        const relevant = restockResult.items.filter(it => {
            if (client.levelSystem.getUserShopAlertSetting(watchUserId, guildId, it.itemId).enableAlert) return true;
            if (it.discountPercent > 0) {
                for (const [disId, threshold] of Object.entries(DISCOUNT_THRESHOLD_MAP)) {
                    if (it.discountPercent >= threshold && client.levelSystem.getUserShopAlertSetting(watchUserId, guildId, disId).enableAlert) {
                        return true;
                    }
                }
            }
            return false;
        });
        if (relevant.length === 0) continue;
        const lines = relevant.map(item => {
            let priceEmoji = client.levelSystem.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
            if (item.priceCurrency === ITEM_IDS.GEMS) priceEmoji = client.levelSystem.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
            else if (item.priceCurrency === ITEM_IDS.ROBUX) priceEmoji = client.levelSystem.robuxEmoji || DEFAULT_ROBUX_EMOJI_FALLBACK;
            const priceValue = item.currentPrice ?? item.price ?? 0;
            let txt = `${item.emoji} ${item.name} - ${priceValue.toLocaleString()} ${priceEmoji} (Stock: ${item.stock})`;
            if (item.discountPercent > 0 && item.originalPrice > priceValue) {
                const displayLabel = `${DISCOUNT_BOOST_EMOJI} ` + (item.discountLabel && item.discountLabel.trim() !== '' ? item.discountLabel : `${(item.discountPercent * 100).toFixed(0)}% OFF`);
                txt += ` (~~${item.originalPrice.toLocaleString()}~~ ${displayLabel})`;
            }
            return txt;
        });
        const userEmbed = new EmbedBuilder()
            .setTitle(`🛍️ Shop Restocked in ${guild.name}`)
            .setColor(0x9B59B6)
            .setDescription(lines.join('\n'))
            .setTimestamp();
        try { await (await client.users.fetch(watchUserId)).send({ embeds: [userEmbed] }); }
        catch (watchErr) { if (watchErr.code !== 50007) console.warn(`[Shop Restock Watch DM] Failed to DM ${watchUserId}: ${watchErr.message}`); }
    }
}

async function scheduleDailyLeaderboardUpdate(client) {
    console.log("[Leaderboard Scheduler] Initializing daily leaderboard updates...");
    const updateLeaderboard = async () => {
        const guilds = client.guilds.cache;
        for (const [guildId, guild] of guilds) {
            try {
                const settings = client.levelSystem.getGuildSettings(guildId);
                if (settings.leaderboardChannelId) {
                    console.log(`[Leaderboard Scheduler] Attempting to update leaderboard for guild ${guild.name} (${guildId}).`);
                    const result = await postOrUpdateLeaderboard(client, guildId, client.levelSystem, LEADERBOARD_LIMIT);
                    if (result.success) {
                        console.log(`[Leaderboard Scheduler] Leaderboard for ${guild.name} ${result.updated ? 'updated' : 'posted'}.`);
                    } else {
                        console.warn(`[Leaderboard Scheduler] Failed to update leaderboard for ${guild.name}: ${result.message}`);
                    }
                }
                await updateLeaderboardRewards(client, guildId, client.levelSystem);
            } catch (error) {
                console.error(`[Leaderboard Scheduler] Error updating leaderboard for guild ${guild.name} (${guildId}):`, error);
            }
        }
    };
    const scheduleNextRun = () => {
        const offsetMs = 7 * 60 * 60 * 1000; // UTC+7
        const now = new Date();
        const nowUtc7 = new Date(now.getTime() + offsetMs);
        const nextMidnightUtc7 = new Date(nowUtc7);
        nextMidnightUtc7.setUTCHours(24, 0, 0, 0);
        const delay = nextMidnightUtc7 - nowUtc7;
        setTimeout(async () => {
            await updateLeaderboard();
            scheduleNextRun();
        }, delay);
    };
    scheduleNextRun();
}

async function scheduleShopRestock(client) {
    console.log("[Shop Scheduler] Initializing shop restock process...");
    const restockShop = async () => {
        const guilds = client.guilds.cache;
        for (const [guildId, guild] of guilds) {
            try {
                if (!client.levelSystem || !client.levelSystem.shopManager) {
                    console.warn(`[Shop Restock] ShopManager not available for guild ${guildId}. Skipping restock.`);
                    continue;
                }
                const shopManagerInstance = client.levelSystem.shopManager;
                const guildShopSettings = shopManagerInstance.getGuildShopSettings(guildId);
                const currentShopIntervalMinutes = client.levelSystem.gameConfig.globalSettings.SHOP_RESTOCK_INTERVAL_MINUTES || 5;
                const currentShopIntervalMs = currentShopIntervalMinutes * 60 * 1000;

                const lastRestockTime = guildShopSettings.lastRestockTimestamp || 0;
                const nextRestockScheduledTime = lastRestockTime + currentShopIntervalMs;

                if (Date.now() >= nextRestockScheduledTime) {
                    console.log(`[Shop Restock] Restocking shop for guild ${guild.name} (${guildId}).`);
                    const restockResult = await shopManagerInstance.restockShop(guildId);

                    if (restockResult.success) {
                            await refreshShopDisplayForGuild(guildId, client);

                            await sendRestockAlerts(client, guild, restockResult);
                        } else {
                            console.error(`[Shop Restock] Failed to restock for guild ${guild.name}: ${restockResult.message}`);
                        }
                }
            } catch (error) {
                console.error(`[Shop Restock] Error processing shop restock for guild ${guild.name} (${guildId}):`, error);
            }
        }
    };
    setInterval(restockShop, SHOP_CHECK_INTERVAL_MS);
}

function calculateFishValue(fish) {
    const mults = { common: 5, uncommon: 8, rare: 15, epic: 30, legendary: 50, mythical: 250, secret: 1000, prismatic: 2000 };
    const m = mults[fish.rarity?.toLowerCase()] || 0;
    const base = +(fish.weight * m).toFixed(2);
    let value = base;
    if (fish.mutation === 'Blossom') value = +(base * 1.25).toFixed(2);
    fish.baseValue = base;
    return value;
}

function persistFishData() {
    saveFishInventories({
        inventories: client.userFishInventories,
        favorites: client.userFavoriteFishInventories,
        serverLog: client.serverFishLog
    }).catch(e => console.error('[FishInventoryManager] Save failed', e));
}

async function scheduleStreakLossCheck(client) {
    console.log("[Streak Loss Scheduler] Initializing daily streak loss checks...");
    const checkStreaks = async () => {
        try {
            const usersWithStreaks = client.levelSystem.getAllUsersWithActiveDailyStreaks();
            const now = Date.now();
            const streakLossThreshold = 24 * 60 * 60 * 1000;

            for (const user of usersWithStreaks) {
                const timeSinceLastClaim = now - (user.lastDailyTimestamp || 0);

                if (timeSinceLastClaim > streakLossThreshold) {
                    const oldStreak = user.dailyStreak;
                    client.levelSystem.resetDailyStreak(user.userId, user.guildId);
                    const expireTs = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);

                    try {
                        const discordUser = await client.users.fetch(user.userId);
                        const costToRestore = Math.ceil(10 * Math.pow(1.125, oldStreak - 1));

                        const dmEmbed = new EmbedBuilder()
                            .setColor(0xFF4747)
                            .setTitle('🔥 Daily Streak Lost!')
                            .setDescription(`Oh no! You missed your daily check-in and your streak of **${oldStreak} days** has been reset.`)
                            .addFields(
                                { name: '💔 What Happened?', value: 'Daily streaks must be maintained by claiming your reward at least once every 36 hours.' },
                                { name: '💎 Restore Your Streak?', value: `You can restore your streak for **${costToRestore}** ${client.levelSystem.gemEmoji}. This offer expires <t:${expireTs}:R>.` }
                            )
                            .setFooter({ text: 'Use the button below or the /daily restore-streak command.' });

                        const restoreButton = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`restore_streak_confirm_${user.guildId}_${oldStreak}`)
                                .setLabel(`Restore Streak (${costToRestore} Gems)`)
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('💎')
                        );
                        
                        await discordUser.send({ embeds: [dmEmbed], components: [restoreButton] });
                    } catch (dmError) {
                        if (dmError.code !== 50007) { // 50007: Cannot send messages to this user
                            console.warn(`[Streak Loss] Could not DM user ${user.userId} about their lost streak.`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[Streak Loss Scheduler] Error checking for lost streaks:', error);
        }
    };

    setInterval(checkStreaks, STREAK_LOSS_CHECK_INTERVAL_MS);
}

async function fullWeekendBoostReset(client) {
    if (!client.levelSystem) return;
    const shopMgr = client.levelSystem.shopManager;
    const now = Date.now();

    for (const [guildId, guild] of client.guilds.cache) {
        try {
            const settings = client.levelSystem.getGuildSettings(guildId);
            const hasWeekendSpecial = shopMgr
                ? shopMgr.getShopItems(guildId).some(i => i.isWeekendSpecial === 1)
                : false;

            if (settings.weekendBoostActive || hasWeekendSpecial) {
                if (shopMgr) {
                    const changed = await shopMgr.updateWeekendStatus(guildId, false);
                    if (changed) await refreshShopDisplayForGuild(guildId, client);
                }
                client.levelSystem.setGuildSettings(guildId, {
                    weekendBoostActive: 0,
                    lastWeekendToggleTimestamp: now,
                });
                console.log(`[Weekend Reset] Guild ${guild.name} fully reset.`);
            }
        } catch (err) {
            console.warn(`[Weekend Reset] Failed for guild ${guildId}: ${err.message}`);
        }
    }

    WEEKEND_BOOST_ACTIVE = false;
    WEEKEND_MULTIPLIERS = { luck: 1.0, xp: 1.0, currency: 1.0, gem: 1.0, shopDiscount: 0.0 };
    client.levelSystem.globalWeekendMultipliers = WEEKEND_MULTIPLIERS;
}

async function scheduleWeekendBoosts(client) {
    console.log("[Weekend Boost Scheduler] Initialising weekend boost checks.");
    const ANNOUNCE_COOLDOWN_MS = 12 * 60 * 60 * 1000;   // 12 h
    let boundaryTimer = null;
    const checkWeekendStatus = async () => {

        const now        = Date.now();
        const current    = new Date();
        const local      = toWeekendTZ(current);
        const dayOfWeek  = local.getUTCDay();   // 0 = Sun … 6 = Sat (UTC+7)
        const hourLocal  = local.getUTCHours();
        const minuteLocal = local.getUTCMinutes();

        /*  WEEKEND DEFINITION (UTC+7)
            ────────────────────────
            Boost is ON from 00:00 Saturday to 00:00 Monday UTC+7.
            Any other moment ⇒ boost OFF.
        */
        const isCurrentlyWeekend = isDateInWeekendRange(current);

        if (!isCurrentlyWeekend) {
            await fullWeekendBoostReset(client);
        }

        WEEKEND_BOOST_ACTIVE = isCurrentlyWeekend;

        // 1️⃣  Update global multipliers
        if (client.levelSystem && client.levelSystem.gameConfig) {
            const g     = client.levelSystem.gameConfig.globalSettings;
            WEEKEND_MULTIPLIERS = isCurrentlyWeekend
                ? { luck : 1.0,
                    xp   : g.WEEKEND_XP_MULTIPLIER   || 1.0,
                    currency : g.WEEKEND_COIN_MULTIPLIER || 1.0,
                    gem  : g.WEEKEND_GEM_MULTIPLIER  || 1.0,
                    shopDiscount : 0.0 }
                : { luck : 1.0, xp : 1.0, currency : 1.0, gem : 1.0, shopDiscount : 0.0 };

            client.levelSystem.globalWeekendMultipliers = WEEKEND_MULTIPLIERS;
        }

        // 2️⃣  Iterate guilds and toggle settings / shop / announcements
        for (const [guildId, guild] of client.guilds.cache) {
            const settings            = client.levelSystem.getGuildSettings(guildId);
            const wasBoostActive      = settings.weekendBoostActive === 1;
            const shouldToggle        = (isCurrentlyWeekend && !wasBoostActive)
                                     || (!isCurrentlyWeekend &&  wasBoostActive);

            
            if (!shouldToggle) {
                if (!DISABLE_WEEKEND_FAILSAFE) {
                    // 🩹 Weekend boost failsafe — keep shop & DB in sync even after bot restarts
                    try {
                        if (client.levelSystem?.shopManager) {
                            const shopMgr = client.levelSystem.shopManager;
                            const hasWeekendSpecial = shopMgr
                                .getShopItems(guildId)
                                .some(i => i.isWeekendSpecial === 1);
                            if (hasWeekendSpecial !== isCurrentlyWeekend) {
                                const changed = await shopMgr.updateWeekendStatus(guildId, isCurrentlyWeekend);
                                if (changed) {
                                    await refreshShopDisplayForGuild(guildId, client);
                                }
                            }
                        }

                        if (wasBoostActive !== isCurrentlyWeekend) {
                            client.levelSystem.setGuildSettings(guildId, {
                                weekendBoostActive: isCurrentlyWeekend ? 1 : 0,
                                lastWeekendToggleTimestamp: now,
                            });
                        }
                    } catch (err) {
                        console.warn(`[Weekend Boost Sync] ${guild.name}: ${err.message}`);
                    }
                }

                continue;
            }

            console.log(`[Weekend Boost] ${isCurrentlyWeekend ? 'ENABLED' : 'DISABLED'} for ${guild.name}`);

            // Refresh shop timers when the weekend starts
            if (isCurrentlyWeekend && client.levelSystem.shopManager) {
                const shopMgr    = client.levelSystem.shopManager;
                const restockMs  = (client.levelSystem.gameConfig.globalSettings.SHOP_RESTOCK_INTERVAL_MINUTES || 5) * 60 * 1000;
                shopMgr.updateGuildShopSettings(guildId, {
                    nextRestockTimestamp : now + restockMs,
                    lastRestockTimestamp : now
                });
            }

            /* announcement ­windows (UTC+7)
               start: Sat 00:00 - 00:14
               end  : Mon 00:00 - 00:14 — first tick *after* boost ends
            */
            let announce = false;
            let announceField = {};

            if (isCurrentlyWeekend) {
                announce = (now - (settings.lastWeekendBoostStartAnnounceTimestamp || 0) > ANNOUNCE_COOLDOWN_MS)
                        && (dayOfWeek === 6 && hourLocal === 0 && minuteLocal < 15);
                if (announce) announceField.lastWeekendBoostStartAnnounceTimestamp = now;
            } else {
                announce = (now - (settings.lastWeekendBoostEndAnnounceTimestamp   || 0) > ANNOUNCE_COOLDOWN_MS)
                        && (dayOfWeek === 1 && hourLocal === 0 && minuteLocal < 15);  // Monday just after midnight
                if (announce) announceField.lastWeekendBoostEndAnnounceTimestamp   = now;
            }

            // Save new state
            client.levelSystem.setGuildSettings(guildId, {
                weekendBoostActive      : isCurrentlyWeekend ? 1 : 0,
                lastWeekendToggleTimestamp : now,
                ...announceField
            });

            // Force shop items to refresh pricing/stock if the boost status changed
            if (client.levelSystem.shopManager) {
                const changed = await client.levelSystem.shopManager.updateWeekendStatus(guildId, isCurrentlyWeekend);
                if (changed) await refreshShopDisplayForGuild(guildId, client);
            }

            // Finally, broadcast announcement (if any)
            if (announce && WEEKEND_ANNOUNCEMENT_CHANNEL_ID) {
                const ch = await client.channels.fetch(WEEKEND_ANNOUNCEMENT_CHANNEL_ID).catch(() => null);
                if (ch?.isTextBased?.()) {
                    const embed = buildWeekendAnnouncementEmbed(client, isCurrentlyWeekend);
                    if (isCurrentlyWeekend) {
                        let existing = null;
                        if (settings.weekendAlertMessageId) {
                            existing = await ch.messages.fetch(settings.weekendAlertMessageId).catch(() => null);
                            if (!existing) client.levelSystem.setGuildSettings(guildId, { weekendAlertMessageId: null });
                        }
                        if (!existing) {
                            const msg = await ch.send({ embeds: [embed] }).catch(console.error);
                            if (msg) client.levelSystem.setGuildSettings(guildId, { weekendAlertMessageId: msg.id });
                        }
                    } else {
                        await ch.send({ embeds: [embed] }).catch(console.error);
                        if (settings.weekendAlertMessageId) {
                            client.levelSystem.setGuildSettings(guildId, { weekendAlertMessageId: null });
                        }
                    }
                }
            }
        }
    };

    const scheduleNextBoundary = () => {
        const nowDate = new Date();
        const next = isDateInWeekendRange(nowDate)
            ? getCurrentWeekendEndDate(nowDate)
            : getNextWeekendStartDate(nowDate);
        const delay = Math.max(next.getTime() - nowDate.getTime(), 1000);
        if (boundaryTimer) clearTimeout(boundaryTimer);
        boundaryTimer = setTimeout(async () => {
            await checkWeekendStatus();
            scheduleNextBoundary();
        }, delay);
    };

    // initial + interval + boundary timer
    await checkWeekendStatus();
    scheduleNextBoundary();
    setInterval(checkWeekendStatus, WEEKEND_CHECK_INTERVAL_MS);
}

async function scheduleDailyReadyNotifications(client) {
    console.log("[Daily Notify Scheduler] Initializing daily ready notifications...");
    const checkReady = async () => {
        try {
            const rows = client.levelSystem.getUsersForDailyReadyNotification();
            const now = Date.now();
            const cooldown = 12 * 60 * 60 * 1000;
            for (const row of rows) {
                const nextClaim = (row.lastDailyTimestamp || 0) + cooldown;
                if (now >= nextClaim && (row.lastDailyNotifyTimestamp || 0) <= (row.lastDailyTimestamp || 0)) {
                    try {
                        const userObj = await client.users.fetch(row.userId);
                        await userObj.send({ content: 'Your daily reward is ready! Use /daily to claim it.' }).catch(e => {
                            if (e.code !== 50007) console.warn(`[DailyNotify] DM failed for ${row.userId}: ${e.message}`);
                        });
                    } catch (e) {
                        if (e.code !== 50007) console.warn(`[DailyNotify] Could not notify ${row.userId}: ${e.message}`);
                    }
                    client.levelSystem.updateUser(row.userId, row.guildId, { lastDailyNotifyTimestamp: now });
                }
            }
        } catch (err) {
            console.error('[Daily Notify Scheduler] Error:', err);
        }
    };
    await checkReady();
    setInterval(checkReady, DAILY_READY_CHECK_INTERVAL_MS);
}



async function scheduleVoiceActivityRewards(client) {
    console.log("[Voice Scheduler] Initializing periodic voice reward processing...");
    const processVoiceRewards = async () => {
        for (const [key, userData] of client.levelSystem.activeVoiceUsers.entries()) {
            const voiceState = userData.member.voice;
            if (!voiceState || !voiceState.channel) continue;
            try {
                const result = await client.levelSystem.handleVoiceStateUpdate(voiceState, voiceState, checkAndAwardSpecialRole, WEEKEND_MULTIPLIERS);

                if (result && result.droppedItem) {
                    const { droppedItem, config, shouldAnnounce, grantedSpecialRole } = result;
                    const guildForVoice = userData.member.guild;
                    const memberForVoice = userData.member;
                    if (grantedSpecialRole && droppedItem.id === client.levelSystem.COSMIC_ROLE_TOKEN_ID) {
                        // Announcement handled by checkAndAwardSpecialRole
                    } else if (shouldAnnounce) {
                        const guildLootDropChannelId = client.levelSystem.getGuildSettings(guildForVoice.id).lootDropAlertChannelId || LOOTBOX_DROP_CHANNEL_ID;
                        if (guildLootDropChannelId) {
                            const alertChannel = await client.channels.fetch(guildLootDropChannelId).catch(() => null);
                            if (alertChannel && alertChannel.isTextBased()) {
                                const botMemberForLoot = guildForVoice.members.me;
                                if (botMemberForLoot && alertChannel.permissionsFor(botMemberForLoot).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
                                    const itemConfig = config;
                                    const itemNameDisplay = droppedItem.name || client.levelSystem.getItemNameById(droppedItem.id, guildForVoice.id);
                                    const itemEmojiDisplay = droppedItem.emoji || client.levelSystem.getItemEmojiById(droppedItem.id, guildForVoice.id);
                                    const rarityString = client.levelSystem._getItemRarityString(droppedItem.id, itemConfig, itemConfig.type);
                                    const rarityDetails = client.levelSystem.itemRarities[rarityString.toUpperCase()] || client.levelSystem.itemRarities.COMMON;
                                    const embedColor = rarityDetails.color;
                                    const alertTitle = `${itemEmojiDisplay} A Wild ${itemNameDisplay} Appeared! 🎉`;
                                    const eventDescription = `${memberForVoice.user} received a **${itemNameDisplay}** from voice activity!`;
                                    const lootEmbed = new EmbedBuilder()
                                        .setColor(embedColor)
                                        .setTitle(alertTitle)
                                        .setDescription(eventDescription)
                                        .setThumbnail(itemConfig.imageUrl || null)
                                        .addFields(
                                            { name: '🎤 Recipient', value: `${memberForVoice.user.tag}`, inline: true },
                                            { name: '💎 Rarity Tier', value: `**${rarityString}**`, inline: true }
                                        )
                                        .setTimestamp()
                                        .setFooter({ text: `Obtained from: Voice Activity in ${guildForVoice.name}`, iconURL: guildForVoice.iconURL({ dynamic: true }) });
                                    await alertChannel.send({ embeds: [lootEmbed] });
                                } else console.warn(`[Voice Loot Drop] Bot missing SendMessages or EmbedLinks permission in configured loot drop channel: ${guildLootDropChannelId}`);
                            } else console.warn(`[Voice Loot Drop] Configured loot drop channel ${guildLootDropChannelId} not found or not text-based.`);
                        }
                    }
                }
            } catch (err) {
                console.error('[Voice Scheduler] Error processing voice rewards:', err);
            }
        }
    };
    setInterval(processVoiceRewards, VOICE_ACTIVITY_INTERVAL_MS);
}

async function safeDeferReply(interaction, options = {}) {
    if (!interaction.isRepliable() || interaction.deferred || interaction.replied) return;
    try {
        await interaction.deferReply(options);
    } catch (e) {
        if (e.code !== 40060 && e.code !== 10062) {
            console.warn(`[safeDeferReply] Failed for ${interaction.id}: ${e.message} (Code: ${e.code})`);
        }
    }
}

async function safeEditReply(interaction, options, deleteAfter = false, timeout = DEFAULT_REPLY_DELETE_TIMEOUT) {
    let message;
    try {
        if (!interaction.deferred && !interaction.replied) {
            await safeDeferReply(interaction, { ephemeral: options.ephemeral || false });
        }

        message = await interaction.editReply(options).catch(async (e) => {
            console.error(`[Helper safeEditReply] editReply Error for ${interaction.id} (${interaction.commandName || interaction.customId}): ${e.message} (Code: ${e.code})`);
            // If editReply fails because the interaction is unknown or already replied to, try followUp as a last resort
            if (e.code === 10062 || e.code === 40060 || e.code === 10008 || e.message.toLowerCase().includes("unknown interaction")) {
                console.warn(`[Helper safeEditReply] Attempting followUp for ${interaction.id} due to error code ${e.code}.`);
                // Check if it's not already replied to avoid double followUp
                if (!interaction.replied) { // This check might be redundant if editReply failed for "already replied"
                    return interaction.followUp(options).catch(followUpErr => {
                        console.error(`[Helper safeEditReply] Fallback FollowUp Error for ${interaction.id}: ${followUpErr.message} (Code: ${followUpErr.code})`);
                        return null;
                    });
                }
            }
            return null;
        });

        if (message && !(options.ephemeral || (options.flags && (options.flags & MessageFlags.Ephemeral))) && message.deletable && timeout > 0 && deleteAfter) {
            setTimeout(async () => {
                try {
                    // Prefer deleting the interaction reply if possible, otherwise delete the message
                    if (interaction.deleteReply && interaction.id === message.interaction?.id) { // Check if the message is the direct reply to this interaction
                        await interaction.deleteReply().catch(() => { // Fallback if deleteReply fails
                            if (message.deletable) message.delete().catch(eDel => {
                                if (eDel.code !== 10008) console.warn(`[Helper safeEditReply] Fallback message.delete failed for ${message.id}: ${eDel.code}`)
                            });
                        });
                    } else if (message.deletable) {
                        await message.delete().catch(eDel => {
                            if (eDel.code !== 10008) console.warn(`[Helper safeEditReply] message.delete failed for ${message.id}: ${eDel.code}`)
                        });
                    }
                } catch (delErr) { console.warn(`[Helper safeEditReply] Error during scheduled delete for ${interaction.id}: ${delErr.message}`); }
            }, timeout);
        }
        return message;
    } catch (error) {
        console.error(`[Helper safeEditReply] General Edit/Delete Error for ${interaction.id}: ${error.message}`);
        return null;
    }
}

async function logToBotLogChannel(content) {
    if (!BOT_LOG_CHANNEL_ID) return;
    try {
        const logChannel = await client.channels.fetch(BOT_LOG_CHANNEL_ID).catch(() => null);
        if (logChannel && logChannel.isTextBased()) {
            await logChannel.send({ content }).catch(e => console.error(`[BotLog] Failed to send message: ${e.message}`));
        }
    } catch (err) {
        console.error(`[BotLog] Error while logging to channel: ${err.message}`);
    }
}

function parseDuration(durationStr) {
    const unitMap = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const match = durationStr.match(/^(\d+)([smhd])$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (isNaN(value) || value <= 0 || !unitMap[unit]) return null;
    return value * unitMap[unit];
}

async function sendInteractionError(interaction, message = 'An error occurred!', ephemeral = true, wasDeferredByThisLogic = false) {
    const options = { content: `❌ ${message}`, embeds: [], components: [], ephemeral: ephemeral };
    try {
        if (wasDeferredByThisLogic || interaction.deferred) {
            await interaction.editReply(options).catch(async (editErr) => {
                console.warn(`[sendInteractionError] editReply failed for ${interaction.id}: ${editErr.message}. Attempting followUp.`);
                await interaction.followUp(options).catch(followUpErr => console.error(`[sendInteractionError] Fallback followUp (after editReply fail) for ${interaction.id} also failed: ${followUpErr.message}`));
            });
        } else if (interaction.replied) { // If it was replied to (e.g. by showModal) but not deferred by this specific logic path
            await interaction.followUp(options).catch(followUpErr => console.error(`[sendInteractionError] FollowUp (when already replied) for ${interaction.id} failed: ${followUpErr.message}`));
        }
         else { // Not replied, not deferred by this logic
            await interaction.reply(options).catch(async (replyErr) => {
                console.error(`[sendInteractionError] Initial reply failed for ${interaction.id}: ${replyErr.message}`);
                if (replyErr.code === 40060) { // Interaction already acknowledged
                    await interaction.followUp(options).catch(e => console.error(`[sendInteractionError] Fallback followUp (after initial reply 40060) for ${interaction.id} failed: ${e.message}`));
                }
            });
        }
    } catch (error) {
        console.error(`[sendInteractionError] General error during error reporting for ${interaction.id}: ${error.message}`);
    }
    // Log this error to the bot log channel
    const context = interaction.commandName ? `Command: ${interaction.commandName}` : interaction.customId ? `Interaction: ${interaction.customId}` : 'Unknown Interaction';
    logToBotLogChannel(`⚠️ ${context} - ${interaction.user.tag}: ${message}`).catch(()=>{});
}

async function setBankMessageTimeout(interaction, messageId, bankMessageKey) {
    const existingBankData = client.activeBankMessages.get(bankMessageKey);
    if (existingBankData && existingBankData.timeoutId) {
        clearTimeout(existingBankData.timeoutId);
    }

    const newTimeoutId = setTimeout(async () => {
        try {
            let messageToDelete = null;
            const channelIdToUse = existingBankData?.channelId || interaction.channelId; // Use stored channelId if available
            const channel = client.channels.cache.get(channelIdToUse);

            if (channel && channel.isTextBased()) {
                 messageToDelete = await channel.messages.fetch(messageId).catch(() => null);
            }
            if (messageToDelete && messageToDelete.deletable) {
                await messageToDelete.delete().catch(e => {
                    if (e.code !== 10008) console.warn(`[Bank Timeout] Failed to delete bank message ${messageId}: ${e.message} (Code: ${e.code})`);
                });
            }
        } catch (e) {
            // Error code 10008: Unknown Message (already deleted or timed out by Discord)
            if (e.code !== 10008) console.warn(`[Bank Timeout] General error deleting bank message ${messageId}: ${e.message} (Code: ${e.code})`);
        }
        client.activeBankMessages.delete(bankMessageKey); // Clean up the entry
    }, BANK_INTERACTION_TIMEOUT_MS);
    // Store messageId, timeoutId, and the channelId of the interaction that created/updated the message
    client.activeBankMessages.set(bankMessageKey, { messageId: messageId, timeoutId: newTimeoutId, channelId: interaction.channelId });
}

async function checkAndAwardSpecialRole(member, reason, purchasedItemName = null) {
    if (!member || member.user.bot || !member.guild) return;

    const cosmicTokenId = client.levelSystem.COSMIC_ROLE_TOKEN_ID;
    const specialRoleId = client.levelSystem.SPECIAL_ROLE_ID_TO_GRANT;
    const cosmicTokenMasterConfig = client.levelSystem._getItemMasterProperty(cosmicTokenId, null, {});


    // If user already has the role AND the reason is NOT specifically for obtaining/using the token, then skip.
    // This prevents re-awarding for general activities if they already have it.
    if (member.roles.cache.has(specialRoleId) &&
        (!purchasedItemName || (cosmicTokenMasterConfig && purchasedItemName !== (cosmicTokenMasterConfig.name || cosmicTokenId))) &&
        (!reason.includes(cosmicTokenId) && (!cosmicTokenMasterConfig || !reason.includes(cosmicTokenMasterConfig.name)))) {
        // console.log(`[SPECIAL ROLE] User ${member.user.tag} already has role ${specialRoleId} and reason "${reason}" is not token-specific. Skipping.`);
        return;
    }

    let shouldAward = false;
    let awardMethodDescription = reason; // Default to the general reason
    let actualSpecialRoleChance = client.levelSystem.gameConfig.globalSettings.SPECIAL_ROLE_CHANCE || SPECIAL_ROLE_CHANCE;


    // Check if the award is due to purchasing or using the Cosmic Role Token
    if (purchasedItemName && cosmicTokenMasterConfig && (purchasedItemName === cosmicTokenMasterConfig.name || purchasedItemName === cosmicTokenId)) {
        shouldAward = true;
        awardMethodDescription = `obtaining the "${cosmicTokenMasterConfig.name}"`;
    }
    else if (reason.includes(cosmicTokenId) || (cosmicTokenMasterConfig && reason.includes(cosmicTokenMasterConfig.name))) {
        // This condition implies the item 'cosmic_role_token' was directly involved in the 'reason' string
        // e.g., reason = "using cosmic_role_token" or "drop_cosmic_role_token"
        shouldAward = true;
        awardMethodDescription = `using a "${cosmicTokenMasterConfig?.name || 'Cosmic Role Token'}"`;
    }
    else { // Not token-specific, so it's a random chance award
        if (member.roles.cache.has(specialRoleId)) return; // If they already have it and it's not token related, don't re-roll random.
        const randomNumber = Math.floor(Math.random() * actualSpecialRoleChance);
        if (randomNumber === 0) {
            shouldAward = true;
            // awardMethodDescription remains the general 'reason' like "sending a message"
        }
    }

    if (shouldAward) {
        try {
            const role = member.guild.roles.cache.get(specialRoleId);
            if (!role) {
                console.warn(`[SPECIAL ROLE] Special role ID ${specialRoleId} not found in guild ${member.guild.name}.`);
                return;
            }
            if (!member.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles) || member.guild.members.me.roles.highest.position <= role.position) {
                console.warn(`[SPECIAL ROLE] Bot missing permissions or role hierarchy for special role ${role.name} (${specialRoleId}) in guild ${member.guild.name}.`);
                return;
            }

            if (!member.roles.cache.has(specialRoleId)) { // Only add if they don't have it
                await member.roles.add(role);
            }
            console.log(`[SPECIAL ROLE] User ${member.user.tag} (${member.user.id}) obtained/confirmed the special role ${role.name} by ${awardMethodDescription}!`);
            client.levelSystem.updateUser(member.id, member.guild.id, { cosmicTokenDiscovered: 1 }); // Mark as discovered

            // Announce only if VERY_RARE_ITEM_ALERT_CHANNEL_ID is set
            if (VERY_RARE_ITEM_ALERT_CHANNEL_ID) {
                const alertChannel = await client.channels.fetch(VERY_RARE_ITEM_ALERT_CHANNEL_ID).catch(() => null);
                if (alertChannel && alertChannel.isTextBased() && alertChannel.permissionsFor(client.user).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
                    const isTokenRelated = awardMethodDescription.includes(cosmicTokenMasterConfig?.name || "Cosmic Role Token"); // More robust check
                    const titleText = isTokenRelated ? '🌌 COSMIC BLESSING SECURED! 🌌' : '✨🌟🌌 COSMIC LUCK! 🌌🌟✨';
                    const descriptionText = isTokenRelated ?
                        `Incredible! ${member.user} has secured a **Cosmic Blessing**!\n\nThey ${awardMethodDescription}, claiming the **${role.name}** role!\n\nThis was an astronomically rare event! Celebrate their fortune! 🎉` :
                        `Behold! A miracle has occurred!\n\n${member.user} has been blessed by the universe and obtained the **${role.name}** role through sheer cosmic chance while **${reason}**!\n\nThis is a moment of pure, unadulterated luck! Celebrate them! 🎉`;

                    let oddsText = `Action: ${reason}`; // Default odds text
                     if (isTokenRelated && cosmicTokenMasterConfig) {
                         oddsText = `Source: ${cosmicTokenMasterConfig.name}`;
                         // Attempt to calculate drop odds if available from direct drops or shop
                         const directDropSpec = client.levelSystem.gameConfig.directChatDropTable.find(d => d.itemId === cosmicTokenId);
                         const chatDropBaseChance = client.levelSystem.gameConfig.globalSettings.CHAT_DROP_BASE_CHANCE; // Assuming this is a decimal like 0.01 for 1%
                         if (directDropSpec?.directDropWeight > 0 && chatDropBaseChance > 0) {
                            const totalWeight = client.levelSystem.gameConfig.directChatDropTable.reduce((sum, item) => sum + (item.directDropWeight || 0), 0);
                            if (totalWeight > 0) {
                               const probFromPool = directDropSpec.directDropWeight / totalWeight;
                               const overallProb = probFromPool * chatDropBaseChance; // This is the actual probability
                               if (overallProb > 0) oddsText += ` (Drop Chance: ~1 in ${Math.round(1/overallProb).toLocaleString()})`;
                            }
                         } else if (cosmicTokenMasterConfig.appearanceChanceInShop) { // Fallback to shop appearance if not in direct drops
                              oddsText += ` (Shop Appearance: ~1 in ${Math.round(1 / cosmicTokenMasterConfig.appearanceChanceInShop).toLocaleString()})`;
                         } else if (cosmicTokenMasterConfig.rarityValue) { // Fallback to rarity value
                              oddsText += ` (Rarity Value: ${cosmicTokenMasterConfig.rarityValue.toLocaleString()})`;
                         }
                     } else if (!isTokenRelated) { // Random chance award
                         oddsText = `Action Trigger Odds: 1 in ${actualSpecialRoleChance.toLocaleString()}`;
                     }

                    const specialRoleEmbed = new EmbedBuilder()
                        .setTitle(titleText).setDescription(descriptionText).setColor(role.color || 0xFFD700)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        .setImage(isTokenRelated ? 'https://i.ibb.co/Q0pT92csVİRwA/giphy.gif' : 'https://i.ibb.co/3o7btXkAPgEAgz4QYE/giphy.gif') // Different GIFs
                        .addFields(
                            { name: '✨ Role Bestowed', value: `<@&${specialRoleId}>`, inline: true },
                            { name: '👤 Lucky User', value: `${member.user.tag}`, inline: true },
                            { name: '🎲 Details', value: oddsText, inline: false }
                        )
                        .setTimestamp().setFooter({ text: 'A truly legendary moment!', iconURL: member.guild.iconURL({ dynamic: true }) });
                    await alertChannel.send({ embeds: [specialRoleEmbed], content: `🌠 A **LEGENDARY** event has unfolded! 🌠` });
                }
            }
        } catch (error) {
            console.error(`[SPECIAL ROLE] Error awarding special role to ${member.user.tag}:`, error);
        }
    }
}

async function buildShopEmbed(guildId, systemsManager, shopManagerInstance) {
    const shopItems = shopManagerInstance.getShopItems(guildId);
    const guildShopSettings = shopManagerInstance.getGuildShopSettings(guildId);
    const currentShopIntervalMinutes = systemsManager.gameConfig.globalSettings?.SHOP_RESTOCK_INTERVAL_MINUTES || 5;
    const currentShopIntervalSeconds = currentShopIntervalMinutes * 60;
    const embed = new EmbedBuilder()
        .setTitle(guildShopSettings.shopTitle || '🛒 Server Shop')
        .setColor(0x5865F2).setTimestamp();

    const guildSystemSettings = systemsManager.getGuildSettings(guildId);
    const isWeekendActiveForShop = guildSystemSettings.weekendBoostActive; // From systemsManager's guild settings

    if (isWeekendActiveForShop && shopItems.some(item => item.isWeekendSpecial === 1 && item.discountPercent > 0)) {
        // Find the highest discount specifically marked as a weekend special
        let highestWeekendDiscountPercent = 0;
        shopItems.forEach(item => {
            if (item.isWeekendSpecial === 1 && item.discountPercent > highestWeekendDiscountPercent) {
                highestWeekendDiscountPercent = item.discountPercent;
            }
        });
        if (highestWeekendDiscountPercent > 0) {
             embed.setTitle(`${guildShopSettings.shopTitle || '🛒 Server Shop'} 🎉 WEEKEND DEALS! Up to ${(highestWeekendDiscountPercent * 100).toFixed(0)}% OFF!`);
        } else {
             embed.setTitle(`${guildShopSettings.shopTitle || '🛒 Server Shop'} 🎉 WEEKEND SPECIALS!`); // General weekend title if no specific discount found but weekend specials exist
        }
    }

    if (!shopItems || shopItems.length === 0) {
        embed.setDescription('The shop is currently empty or being restocked. Please check back soon!');
    } else {
        let descriptionLines = [];
        shopItems.forEach(item => {
            const itemEmoji = item.emoji || '❓';
            const itemName = item.name || item.itemId;
            // Determine the correct emoji for the price currency
            let priceCurrencyEmojiDisplay = systemsManager.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
            if (item.priceCurrency === ITEM_IDS.GEMS) {
                priceCurrencyEmojiDisplay = systemsManager.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
            } else if (item.priceCurrency === ITEM_IDS.ROBUX) { // Though Robux is unlikely to be priced in Robux
                priceCurrencyEmojiDisplay = systemsManager.robuxEmoji || DEFAULT_ROBUX_EMOJI_FALLBACK;
            }

            const crateEmoji = '📦';

            let priceString = `${item.currentPrice.toLocaleString()} ${priceCurrencyEmojiDisplay}`;

            if (item.discountPercent > 0 && item.originalPrice > item.currentPrice) {
                const displayLabel = `${DISCOUNT_BOOST_EMOJI} ` + (item.discountLabel && item.discountLabel.trim() !== "" ?
                                     item.discountLabel :
                                     `${(item.discountPercent * 100).toFixed(0)}% OFF`);
                priceString = `~~${item.originalPrice.toLocaleString()}~~ ${item.currentPrice.toLocaleString()} ${priceCurrencyEmojiDisplay} **(${displayLabel})**`;
            }

            let itemLine = `${itemEmoji} **${itemName}** \`ID: ${item.itemId}\`` +
                           `\n> Price: ${priceString} - Stock: ${item.stock > 0 ? item.stock.toLocaleString() : '**Out of Stock!**'} ${(item.itemType === systemsManager.itemTypes.LOOT_BOX || item.itemType === SHOP_ITEM_TYPES.LOOTBOX) ? crateEmoji : ''}`;
            
            if (item.itemId === ITEM_IDS.ROBUX) { // Highlight for Robux item
                itemLine += `\n> ✨ *Premium Currency! Each unit costs ${item.currentPrice} ${item.priceCurrency === ITEM_IDS.GEMS ? (systemsManager.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK) : (systemsManager.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK)}.*`;
            } else if (item.itemId === systemsManager.COSMIC_ROLE_TOKEN_ID) {
                itemLine += "\n> ✨ *A Cosmic Role Token! Extremely rare.*";
            }
            if (item.description && item.itemId !== ITEM_IDS.ROBUX) { // Don't repeat description if already highlighted for Robux
                itemLine += `\n> *${item.description.substring(0,150)}${item.description.length > 150 ? '...' : ''}*`;
            }
            descriptionLines.push(itemLine);
        });
        embed.setDescription(descriptionLines.join('\n\n'));

        // Display active discounts explicitly
        const discountFieldValues = shopItems.map((item, index) => {
            if (item.discountPercent > 0 && item.originalPrice > item.currentPrice) {
                 const displayLabel = `${DISCOUNT_BOOST_EMOJI} ` + (item.discountLabel && item.discountLabel.trim() !== "" ?
                                     item.discountLabel :
                                     `${(item.discountPercent * 100).toFixed(0)}% OFF`);
                return `Slot ${index + 1} (${item.name || item.itemId}): **${displayLabel}**`;
            }
            return null;
        }).filter(value => value !== null);

        if (discountFieldValues.length > 0) {
            embed.addFields({ name: '🏷️ Active Discounts', value: discountFieldValues.join('\n') || "No special discounts currently." });
        } else {
            embed.addFields({ name: '🏷️ Active Discounts', value: "No special discounts currently." });
        }
    }

    // Display next restock time
    let nextRestockTimestampForDisplayMs = guildShopSettings.nextRestockTimestamp || 0;
    const nowMs = Date.now();

    // If stored next restock time is in the past, calculate it based on last restock + interval
    if (nextRestockTimestampForDisplayMs <= nowMs) {
        const lastActualRestockMs = guildShopSettings.lastRestockTimestamp || (nowMs - (currentShopIntervalSeconds * 1000)); // Fallback if no last restock
        nextRestockTimestampForDisplayMs = lastActualRestockMs + (currentShopIntervalSeconds * 1000);
    }

    const nextRestockTimestampInSeconds = Math.floor(nextRestockTimestampForDisplayMs / 1000);

    if (nextRestockTimestampInSeconds > Math.floor(nowMs / 1000)) {
        embed.addFields({ name: '⏳ Next Restock', value: `<t:${nextRestockTimestampInSeconds}:R> (<t:${nextRestockTimestampInSeconds}:T>)` });
    } else {
        embed.addFields({ name: '⏳ Next Restock', value: 'Restocking soon or calculating...' });
    }

    const instantRestockCost = systemsManager.gameConfig.globalSettings.INSTANT_RESTOCK_GEM_COST || 5;
    embed.setFooter({ text: `Items restock approx. every ${currentShopIntervalMinutes} minutes. Gem cost for instant restock: ${instantRestockCost}` });
    return { embed, shopItems };
}


function buildBadgeEmbed(userId, guildId, client, view = 'obtained', page = 1) {
    const systems = client.levelSystem;
    const allBadges = systems.getAllBadges();
    const obtainedIds = systems.getUserBadgeIds(userId, guildId);
    const obtainedList = Object.values(allBadges).filter(b => obtainedIds.includes(b.id));
    const unobtainedList = Object.values(allBadges).filter(b => !obtainedIds.includes(b.id));
    const list = view === 'obtained' ? obtainedList : unobtainedList;
    const pageCount = Math.max(1, Math.ceil(list.length / 25));
    page = Math.min(Math.max(page, 1), pageCount);
    const embed = new EmbedBuilder()
        .setColor(view === 'obtained' ? 0x2ecc71 : 0xe74c3c)
        .setTitle(view === 'obtained' ? 'Obtained Badges' : 'Unobtained Badges')
        .setDescription(`### Page ${page}/${pageCount}`);
    const start = (page - 1) * 25;
    for (const b of list.slice(start, start + 25)) {
        const typeLine = b.type.includes('limited') ? `<:limited:1392780276232355931> LIMITED ${b.type.includes('unobtainable') ? '- <:nos:1389227923965476905> Unobtainable' : '- <:yess:1389227929392644218> Obtainable'}` : (b.type.includes('unobtainable') ? '<:nos:1389227923965476905> Unobtainable' : '<:yess:1389227929392644218> Obtainable');
        embed.addFields({ name: `${b.name} ${b.emoji || ''}`, value: `* Obtainment: ${b.obtainment}\n* Perk: ${b.perk}\n- ${typeLine}` });
    }
    embed.setFooter({ text: `You have obtained ${obtainedList.length} out of ${Object.keys(allBadges).length} badges` });
    return { embed, pageCount, page };
}

function getBadgeComponents(view, page, pageCount) {
    const prev = new ButtonBuilder()
        .setCustomId(`badge_goto_${view}_${page-1}`)
        .setLabel(`⬅️ - ${page-1}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 1);
    const next = new ButtonBuilder()
        .setCustomId(`badge_goto_${view}_${page+1}`)
        .setLabel(`${page} - ➡️`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= pageCount);
    const obtainedBtn = new ButtonBuilder()
        .setCustomId(`badge_view_obtained_${page}`)
        .setLabel('obtained')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(view === 'obtained');
    const unobtainedBtn = new ButtonBuilder()
        .setCustomId(`badge_view_unobtained_${page}`)
        .setLabel('unobtained')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(view === 'unobtained');
    return [new ActionRowBuilder().addComponents(prev, obtainedBtn, unobtainedBtn, next)];
}

function formatBpReward(r, systemsManager) {
    if (r.currency === 'coins') {
        const emoji = systemsManager.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
        return `${emoji} ${r.amount.toLocaleString()} Coins`;
    }
    if (r.currency === 'gems') {
        const emoji = systemsManager.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
        return `${emoji} ${r.amount.toLocaleString()} Gems`;
    }
    if (r.item) {
        const cfg = systemsManager._getItemMasterProperty(r.item, null);
        const emoji = cfg?.emoji || '❔';
        return `${emoji} x${r.amount} ${cfg?.name || r.item}`;
    }
    if (r.text) {
        return r.text;
    }
    if (r.role) {
        return `Role <@&${r.role}>`;
    }
    return 'Unknown';
}

function getShopComponents(shopItems, systemsManager) {
    const rows = [];
    const mainControls = new ActionRowBuilder();
    const gemEmoji = systemsManager.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
    const instantRestockCost = systemsManager.gameConfig.globalSettings.INSTANT_RESTOCK_GEM_COST || 5;


    mainControls.addComponents(
        new ButtonBuilder().setCustomId('shop_buy_item').setLabel('Buy Item').setStyle(ButtonStyle.Success).setEmoji('🛍️')
            .setDisabled(!shopItems || shopItems.length === 0 || shopItems.every(item => item.stock <= 0)) // Disable if no items or all out of stock
    );
    mainControls.addComponents(
        new ButtonBuilder().setCustomId('shop_instant_restock_prompt').setLabel(`Instant Restock`).setStyle(ButtonStyle.Primary).setEmoji('🔄') // Text includes cost now
    );
    rows.push(mainControls);
    return rows;
}

async function buildBankEmbed(user, guildId, systemsManager) {

    /* ------------------------------------------------------------------
     * 1.  Gather basics that were already there
     * ------------------------------------------------------------------ */
    const balance      = systemsManager.getBalance(user.id, guildId);
    const bankInfo     = systemsManager.getBankBalance(user.id, guildId);
    const bankCapacity = systemsManager.getBankCapacity(user.id, guildId);
    const currentTier  = bankInfo.bankTier;

    const coinEmoji    = systemsManager.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
    const gemEmoji     = systemsManager.gemEmoji  || DEFAULT_GEM_EMOJI_FALLBACK;


    /* ------------------------------------------------------------------
     * 2.  NEW – Calculate interest figures
     * ------------------------------------------------------------------ */
    const BANK_TIERS_CFG = systemsManager.gameConfig.globalSettings.BANK_TIERS || BANK_TIERS;
    const interestRate   = BANK_TIERS_CFG[currentTier]?.interestRate ?? 0;               // % per day

    const userRow            = systemsManager.getUser(user.id, guildId);                 // full DB row
    const lastInterestTs = userRow.lastInterestTimestamp || 0;
const ONE_DAY_MS     = 24 * 60 * 60 * 1000;

const baseTs = lastInterestTs === 0 ? Date.now() : lastInterestTs;
const nextInterestTs = baseTs + ONE_DAY_MS;
    const coinInterestGain   = Math.floor(bankInfo.bankCoins * interestRate / 100);
    const gemInterestGain    = Math.floor(bankInfo.bankGems  * interestRate / 100);

    /* ------------------------------------------------------------------
     * 3.  Build embed
     * ------------------------------------------------------------------ */
    const embed = new EmbedBuilder()
        .setColor(0xDAA520)
        .setAuthor({ name: `${user.username}'s Bank Account`, iconURL: user.displayAvatarURL() })
        .setTitle(`🏦 Bank – Tier ${currentTier}`)
        /* Existing balance fields */
        .addFields(
            {
                name: '💰 Your Inventory',
                value: `${coinEmoji} Coins: \`${formatNumber(balance.coins)}\`\n` +
                       `${gemEmoji} Gems:  \`${formatNumber(balance.gems)}\``,
                inline: false
            },
            {
                name: '🏛️ Your Bank',
                value: `${coinEmoji} Coins: \`${formatNumber(bankInfo.bankCoins)}\`\n` +
                       `${gemEmoji} Gems:  \`${formatNumber(bankInfo.bankGems)}\``,
                inline: false
            }
        )
        /* NEW interest field */
        .addFields({
            name: '📈 Daily Interest',
            value:
                `Rate: **${interestRate}%**\n` +
                `Est. Credit: **+${formatNumber(coinInterestGain)}** ${coinEmoji}, **+${formatNumber(gemInterestGain)}** ${gemEmoji}\n` +
                `Next Credit: <t:${Math.floor(nextInterestTs / 1000)}:R>`,
            inline: false
        })
        .setTimestamp()
        .setFooter({
            text: `Manage your finances securely. This message auto-deletes after ${BANK_INTERACTION_TIMEOUT_MS / 1000}s of inactivity.`
        });

    /* Upgrade teaser kept exactly as before */
    if (BANK_TIERS_CFG[currentTier]?.nextTier !== null) {
        const nextTierInfo  = BANK_TIERS_CFG[currentTier];
        const nextTierStats = BANK_TIERS_CFG[nextTierInfo.nextTier];
        embed.addFields({
            name: `✨ Upgrade to Tier ${nextTierInfo.nextTier}`,
            value: `Cost: **${formatNumber(nextTierInfo.upgradeCostCoins)}** ${coinEmoji}, ` +
                   `**${formatNumber(nextTierInfo.upgradeCostGems)}** ${gemEmoji}\n` +
                   `New Capacity: **${formatNumber(nextTierStats.coinCap)}** coins / ` +
                   `**${formatNumber(nextTierStats.gemCap)}** gems`,
            inline: false
        });
    } else {
        embed.addFields({ name: '✨ Bank Tier', value: 'You have reached the maximum bank tier!' });
    }

    return embed;
}

function getBankComponents(userId, guildId, systemsManager) {
    const bankInfo = systemsManager.getBankBalance(userId, guildId);
    const currentTier = bankInfo.bankTier;
    const bankTiersConfig = systemsManager.gameConfig.globalSettings.BANK_TIERS || BANK_TIERS;
    const canUpgrade = bankTiersConfig[currentTier] && bankTiersConfig[currentTier].nextTier !== null;
    const coinEmoji = systemsManager.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
    const gemEmoji = systemsManager.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
    const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bank_deposit_coins').setLabel('Deposit Coins').setStyle(ButtonStyle.Success).setEmoji(coinEmoji), new ButtonBuilder().setCustomId('bank_withdraw_coins').setLabel('Withdraw Coins').setStyle(ButtonStyle.Primary).setEmoji(coinEmoji));
    const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bank_deposit_gems').setLabel('Deposit Gems').setStyle(ButtonStyle.Success).setEmoji(gemEmoji), new ButtonBuilder().setCustomId('bank_withdraw_gems').setLabel('Withdraw Gems').setStyle(ButtonStyle.Primary).setEmoji(gemEmoji));
    const row3 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bank_upgrade').setLabel('Upgrade Bank').setStyle(ButtonStyle.Secondary).setEmoji('✨').setDisabled(!canUpgrade));
    return [row1, row2, row3];
}

async function buildInventoryEmbed(user, guildId, systemsManager, currentTab = 'items') {
    try {
        const embed = new EmbedBuilder();
        const balance = systemsManager.getBalance(user.id, guildId);
        const categorizedInventory = systemsManager.getUserInventory(user.id, guildId); // This should already be filtered
        const activeCharmInstances = systemsManager.getActiveCharms(user.id, guildId);

        const coinEmoji = systemsManager.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
        const gemEmoji = systemsManager.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
        const robuxEmoji = systemsManager.robuxEmoji || DEFAULT_ROBUX_EMOJI_FALLBACK;

        embed.setAuthor({ name: `${user.username}'s Inventory`, iconURL: user.displayAvatarURL() })
             .setTimestamp();

        if (currentTab === 'items') {
            embed.setTitle('🗒️ General Items & Valuables');
            embed.setColor(0xAED6F1); // Light blue

            // Ensure generalItemsDisplay does not include currencies if they somehow slipped through
            const generalItemsDisplay = categorizedInventory.generalItems.filter(item => {
                const itemConf = systemsManager._getItemMasterProperty(item.itemId, null);
                return itemConf && itemConf.type !== systemsManager.itemTypes.CURRENCY && itemConf.type !== systemsManager.itemTypes.CURRENCY_ITEM && item.itemId !== ITEM_IDS.ROBUX && item.itemId !== ITEM_IDS.COINS && item.itemId !== ITEM_IDS.GEMS;
            });
            const valuableItemsDisplay = categorizedInventory.cosmicTokens;

            if (generalItemsDisplay.length === 0 && valuableItemsDisplay.length === 0) {
                embed.setDescription("You have no general items or valuables currently.");
            } else {
                if (generalItemsDisplay.length > 0) {
                    generalItemsDisplay.forEach(item => {
                        embed.addFields({
                            name: `${item.emoji || '❓'} ${item.name}`,
                            value: `Quantity: \`${item.quantity.toLocaleString()}\`\nID: \`${item.itemId}\``,
                            inline: true
                        });
                    });
                }
                if (valuableItemsDisplay.length > 0) {
                     embed.addFields({ name: '\u200B\n💎 Special Valuables', value: '\u200B'}); // Separator
                    valuableItemsDisplay.forEach(item => {
                        embed.addFields({
                            name: `${item.emoji || '✨'} ${item.name}`,
                            value: `Quantity: \`${item.quantity.toLocaleString()}\`\nID: \`${item.itemId}\``,
                            inline: true
                        });
                    });
                }
                if (!embed.data.description && (generalItemsDisplay.length > 0 || valuableItemsDisplay.length > 0)) {
                    embed.setDescription("Your collection of items and special valuables.");
                }
            }
        } else if (currentTab === 'lootboxes') {
            embed.setTitle('📦 Chests');
            embed.setColor(0xF5B041); // Orange
            const lootBoxItemsDisplay = categorizedInventory.lootBoxes;

            if (lootBoxItemsDisplay.length > 0) {
                embed.setDescription("Here are the chests you've collected:");
                lootBoxItemsDisplay.forEach(item => {
                    let boxDetails = `Quantity: \`${item.quantity.toLocaleString()}\``;
                    const itemConfig = systemsManager._getItemMasterProperty(item.itemId, null, {}); // Get full config
                    if (itemConfig?.numRolls) { // Check if numRolls exists in the master config
                        boxDetails += `\nRolls per box: \`${itemConfig.numRolls}\``;
                    }
                    boxDetails += `\nID: \`${item.itemId}\``;
                    embed.addFields({
                        name: `${item.emoji || '📦'} ${item.name}`,
                        value: boxDetails,
                        inline: true
                    });
                });
            } else {
                embed.setDescription("You have no chests. Try chatting, participating in events, or check the shop!");
            }
        } else if (currentTab === 'balance') {
            embed.setTitle('💰 Wallet & Bank');
            embed.setColor(0x58D68D); // Green
            const bankInfo = systemsManager.getBankBalance(user.id, guildId);
            const bankCapacity = systemsManager.getBankCapacity(user.id, guildId);
            const robuxEmoji = systemsManager.robuxEmoji || DEFAULT_ROBUX_EMOJI_FALLBACK; // New
            const fishEmoji = systemsManager.fishDollarEmoji || DEFAULT_FISH_DOLLAR_EMOJI_FALLBACK;

            embed.setDescription("Your current currency holdings.")
                 .addFields(
                    { name: `${coinEmoji} Wallet Coins`, value: `\`${formatNumber(balance.coins)}\``, inline: true },
                    { name: `${gemEmoji} Wallet Gems`, value: `\`${formatNumber(balance.gems)}\``, inline: true },
                    { name: `${robuxEmoji} Wallet Robux`, value: `\`${formatNumber(balance.robux)}\``, inline: true },
                    { name: `${fishEmoji} Wallet Fish Dollars`, value: `\`${formatNumber(balance.fishDollars)}\``, inline: true },
                    { name: '\u200B', value: '\u200B', inline: false }, // Spacer
                    { name: `🏛️ Bank Coins`, value: `\`${formatNumber(bankInfo.bankCoins)}\``, inline: true },
                    { name: `🏛️ Bank Gems`, value: `\`${formatNumber(bankInfo.bankGems)}\``, inline: true },
                    // Robux not bankable, so no bank display for it yet
                    { name: `🏦 Bank Tier`, value: `\`${bankInfo.bankTier}\``, inline: true }
                 );
        } else if (currentTab === 'charms') {
            embed.setTitle('✨ Active Charms & Boosts');
            embed.setColor(0xAF7AC5); // Purple

            if (activeCharmInstances.length > 0) {
                embed.setDescription("Your currently active charms and their effects:");
                // Group active charms by type for display, summing quantities if multiple of same type are active
                const groupedDisplayCharms = activeCharmInstances.reduce((acc, charmInstanceDb) => {
                    const charmId = charmInstanceDb.charmId; // The ID of the item that was used to activate
                    if (!acc[charmId]) {
                        const charmConfig = systemsManager._getItemMasterProperty(charmId, null, {}); // Get master config for the item
                        acc[charmId] = {
                            name: charmConfig.name || systemsManager.getItemNameById(charmId, guildId), // Fallback name
                            emoji: charmConfig.emoji || systemsManager.getItemEmojiById(charmId, guildId) || '✨',
                            quantity: 0, // Will be incremented
                            dbCharmType: charmInstanceDb.charmType, // The type stored in DB (e.g., 'coin_charm_type')
                            dbBoostValue: charmInstanceDb.boostValue, // The boost value stored in DB
                            duration: charmConfig.durationHours || "Permanent" // From master config
                        };
                    }
                    acc[charmId].quantity++;
                    return acc;
                }, {});

                Object.values(groupedDisplayCharms).forEach(displayCharm => {
                    let effectDesc = "Effect: ";
                    const type = displayCharm.dbCharmType; const boost = displayCharm.dbBoostValue;
                    if (type === systemsManager.CHARM_TYPES.COIN) effectDesc += `+${boost.toFixed(0)}% ${coinEmoji}`;
                    else if (type === systemsManager.CHARM_TYPES.XP) effectDesc += `+${boost.toFixed(0)} XP/msg`;
                    else if (type === systemsManager.CHARM_TYPES.GEM) effectDesc += `+${boost.toFixed(0)}% ${gemEmoji} (from Boxes)`;
                    else if (type === systemsManager.CHARM_TYPES.LUCK) effectDesc += `+${boost.toFixed(0)}% 🍀 (Base for first charm)`; // This is base, actual is calculated
                    else effectDesc += "Unknown"; // Fallback
                    let durationText = displayCharm.duration === "Permanent" ? "Permanent" : `${displayCharm.duration} hours`;
                    embed.addFields({ name: `${displayCharm.emoji} ${displayCharm.name} (x${displayCharm.quantity})`, value: `${effectDesc}\n⏳ Duration: ${durationText}`, inline: false });
                });
            } else { embed.setDescription("You have no active charms. Use charm items from your inventory or find them in chests/shop!"); }

            // Calculate total effective boosts
            let totalCoinBoost = 0, totalGemBoost = 0, totalXpBoost = 0;
            activeCharmInstances.forEach(c => {
                const charmTypeForBoost = c.charmType; const boostValueForBoost = c.boostValue;
                if (boostValueForBoost !== undefined && boostValueForBoost !== null && charmTypeForBoost) {
                    if (charmTypeForBoost === systemsManager.CHARM_TYPES.COIN) totalCoinBoost += boostValueForBoost;
                    else if (charmTypeForBoost === systemsManager.CHARM_TYPES.GEM) totalGemBoost += boostValueForBoost;
                    else if (charmTypeForBoost === systemsManager.CHARM_TYPES.XP) totalXpBoost += boostValueForBoost;
                    // Luck is handled separately due to diminishing returns
                }
            });

            // Luck display calculations removed from here


            // Display charms in inventory (not yet active)
            const ownedCharms = categorizedInventory.charms;
            if (ownedCharms.length > 0) {
                embed.addFields({ name: '\u200B\n🎒 Charms in Inventory (Ready to Use)', value: '\u200B', inline: false }); // Separator
                ownedCharms.forEach(item => {
                    embed.addFields({ name: `${item.emoji || '✨'} ${item.name}`, value: `Quantity: \`${item.quantity.toLocaleString()}\`\nID: \`${item.itemId}\``, inline: true });
                });
            }
        } else if (currentTab === 'perks') {
            embed.setTitle('🎁 Perks');
            embed.setColor(0xF1C40F);

            const rolePerkInfo = systemsManager.getActiveRolePerks(user.id, guildId);
            const charmInstances = systemsManager.getActiveCharms(user.id, guildId);

            let coinBoost = (rolePerkInfo.totals.coinMultiplier - 1) * 100;
            let gemBoost = (rolePerkInfo.totals.gemMultiplier - 1) * 100;
            let discountBoost = rolePerkInfo.totals.discountPercent;
            let xpBoost = rolePerkInfo.totals.xpPerMessage;
            let gemPerMsg = rolePerkInfo.totals.gemPerMessage;

            charmInstances.forEach(c => {
                if (c.charmType === systemsManager.CHARM_TYPES.COIN) coinBoost += c.boostValue || 0;
                else if (c.charmType === systemsManager.CHARM_TYPES.GEM) gemBoost += c.boostValue || 0;
                else if (c.charmType === systemsManager.CHARM_TYPES.XP) xpBoost += c.boostValue || 0;
                else if (c.charmType === systemsManager.CHARM_TYPES.DISCOUNT) discountBoost += c.boostValue || 0;
            });

            const wk = systemsManager.globalWeekendMultipliers || {};
            if (wk.currency && wk.currency > 1) coinBoost += (wk.currency - 1) * 100;
            if (wk.gem && wk.gem > 1) gemBoost += (wk.gem - 1) * 100;
            if (wk.xp && wk.xp > 1) {
                const baseXp = systemsManager.gameConfig.globalSettings.BASE_XP_PER_MESSAGE[0] || XP_PER_MESSAGE_BASE;
                xpBoost += (baseXp + xpBoost) * (wk.xp - 1);
            }

            const roleList = rolePerkInfo.roles.map(id => `<@&${id}>`).join(', ') || 'None';
            const badgeList = rolePerkInfo.badges.map(id => systemsManager.getAllBadges()?.[id]?.emoji || id).join(' ') || 'None';
            const perkLines = [];
            if (coinBoost > 0) perkLines.push(`${COIN_BOOST_EMOJI} Coin Boost: \`+${coinBoost.toFixed(0)}%\``);
            if (gemBoost > 0) perkLines.push(`${GEM_BOOST_EMOJI} Gem Boost: \`+${gemBoost.toFixed(0)}%\``);
            if (discountBoost > 0) perkLines.push(`${DISCOUNT_BOOST_EMOJI} Discount: \`+${discountBoost.toFixed(0)}%\``);
            if (xpBoost > 0) perkLines.push(`${XP_BOOST_EMOJI} XP Boost: \`+${xpBoost.toFixed(0)} XP/msg\``);
            if (gemPerMsg > 0) perkLines.push(`${GEM_CHAT_BOOST_EMOJI} Gems/msg: \`+${gemPerMsg}\``);

            embed.addFields(
                { name: 'Active Role Perks', value: roleList },
                { name: 'Active Badge Perks', value: badgeList },
                { name: 'Total Perks', value: perkLines.join('\n') || 'None' }
            );
        }
        // Fallback description if embed is still empty
        if (!embed.data.description && (!embed.data.fields || embed.data.fields.length === 0) && currentTab !== 'balance') { // Don't add generic desc for balance tab
             embed.setDescription("It's a bit empty here. Explore and gather some items!");
        } else if (!embed.data.description && embed.data.fields && embed.data.fields.length > 0 && currentTab !== 'balance') { // Don't add generic desc for balance tab
            embed.setDescription(`Viewing your ${currentTab}.`);
        }
        return { embed };
    } catch (error) {
        console.error("[buildInventoryEmbed Internal Error]", error);
        const errorEmbed = new EmbedBuilder().setColor(0xFF0000).setTitle("Inventory Error").setDescription("Sorry, there was an error displaying your inventory. Please try again later.");
        return { embed: errorEmbed };
    }
}

function getInventoryNavComponents(currentTab, customId = 'inventory_nav_select') {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('Select a category')
        .addOptions(
            { label: 'Items', value: 'items', emoji: '🗒️', default: currentTab === 'items' },
            { label: 'Chests', value: 'lootboxes', emoji: '📦', default: currentTab === 'lootboxes' },
            { label: 'Balance', value: 'balance', emoji: '💰', default: currentTab === 'balance' },
            { label: 'Active Charms', value: 'charms', emoji: '✨', default: currentTab === 'charms' },
            { label: 'Perks', value: 'perks', emoji: '🎁', default: currentTab === 'perks' }
        );
    return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildSessionPreviewEmbed(sessionData) {
    const embed = new EmbedBuilder();
    if (sessionData.embedData.title) embed.setTitle(sessionData.embedData.title);
    if (sessionData.embedData.description) embed.setDescription(sessionData.embedData.description);
    if (sessionData.embedData.color !== null && sessionData.embedData.color !== undefined) embed.setColor(sessionData.embedData.color);
    if (sessionData.embedData.footerText) embed.setFooter({ text: sessionData.embedData.footerText });
    if (sessionData.embedData.thumbnailUrl) embed.setThumbnail(sessionData.embedData.thumbnailUrl);
    if (sessionData.embedData.imageUrl) embed.setImage(sessionData.embedData.imageUrl);
    if (sessionData.embedData.timestamp) embed.setTimestamp();
    if (sessionData.embedData.fields && sessionData.embedData.fields.length > 0) {
        sessionData.embedData.fields.forEach(field => {
            embed.addFields({ name: field.name || "Unnamed Field", value: field.value || "No Value", inline: field.inline || false });
        });
    }
    // Check if the embed is effectively empty
    const isEmpty = !embed.data.title && !embed.data.description && (!embed.data.fields || embed.data.fields.length === 0) && !embed.data.image && !embed.data.thumbnail && !embed.data.footer;
    if (isEmpty) {
        embed.setDescription("*Preview is empty. Add title, description, fields, image/thumbnail, or footer.*");
        if (!embed.data.color) embed.setColor(0x2B2D31); // Default dark color for empty preview
    }
    return embed;
}

function getSessionBuilderComponents(sessionId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eb_setTitle_${sessionId}`).setLabel('Title').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`eb_setDesc_${sessionId}`).setLabel('Description').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`eb_setColor_${sessionId}`).setLabel('Color (Hex)').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`eb_setFooter_${sessionId}`).setLabel('Footer Text').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eb_setThumb_${sessionId}`).setLabel('Thumbnail URL').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`eb_setImage_${sessionId}`).setLabel('Image URL').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`eb_toggleTimestamp_${sessionId}`).setLabel('Timestamp On/Off').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`eb_manageFields_${sessionId}`).setLabel('Manage Fields').setStyle(ButtonStyle.Secondary) // Placeholder for now
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eb_send_${sessionId}`).setLabel('Send Embed').setStyle(ButtonStyle.Success).setEmoji('🚀'),
            new ButtonBuilder().setCustomId(`eb_cancel_${sessionId}`).setLabel('Cancel & Delete Panel').setStyle(ButtonStyle.Danger)
        )
    ];
}

client.once('ready', async c => {
    console.log(`Logged in as ${c.user.tag}! Bot is ready at ${new Date().toISOString()}.`);
    startGitHubWebhookServer(c);

    try {
        await getDeployCommands()();
        console.log('[Startup] Slash commands deployed.');
    } catch (deployErr) {
        console.error('[Startup] Failed to deploy slash commands:', deployErr);
    }

    if (LOGO_SYNC_GUILD_ID) {
        try {
            const targetGuild = await c.guilds.fetch(LOGO_SYNC_GUILD_ID);
            const iconURL = targetGuild.iconURL({ extension: 'png', size: 4096 });
            if (iconURL) {
                await c.user.setAvatar(iconURL);
                console.log(`[Logo Sync] Bot avatar updated to match guild ${targetGuild.name}.`);
            } else {
                console.warn(`[Logo Sync] Guild ${LOGO_SYNC_GUILD_ID} has no icon to sync.`);
            }
        } catch (err) {
            console.error(`[Logo Sync] Failed to sync bot avatar: ${err.message}`);
        }
    }

    try {
        const commandFiles = fsSync.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                // Provide more specific feedback about which command is problematic
                console.warn(`[WARNING] The command at ${path.join(commandsPath, file)} is missing a required "data" or "execute" property. This command will not be loaded into client.commands.`);
            }
        }
    } catch (error) {
        console.error('[ERROR] Critical error during command loading on bot startup:', error);
        // Consider exiting if commands can't be loaded, as the bot might be unusable.
        // process.exit(1);
    }

    console.log(`[MAX_LEVEL] Max level configured to: ${client.levelSystem.gameConfig.globalSettings.MAX_LEVEL || MAX_LEVEL}`);

    // Initialize coin and gem emojis from config
    client.levelSystem.coinEmoji = client.levelSystem.gameConfig.items.coins?.emoji || DEFAULT_COIN_EMOJI_FALLBACK;
    client.levelSystem.gemEmoji = client.levelSystem.gameConfig.items.gems?.emoji || DEFAULT_GEM_EMOJI_FALLBACK;
    client.levelSystem.robuxEmoji = client.levelSystem.gameConfig.items.robux?.emoji || DEFAULT_ROBUX_EMOJI_FALLBACK; // New
    client.levelSystem.fishDollarEmoji = client.levelSystem.gameConfig.items.fish_dollar?.emoji || DEFAULT_FISH_DOLLAR_EMOJI_FALLBACK;
    console.log(`[Emojis] Initialized Coin Emoji: ${client.levelSystem.coinEmoji}, Gem Emoji: ${client.levelSystem.gemEmoji}, Robux Emoji: ${client.levelSystem.robuxEmoji}, Fish Dollar Emoji: ${client.levelSystem.fishDollarEmoji}`);

    // Set client instance in SystemsManager
    if (client.levelSystem && typeof client.levelSystem.setClient === 'function') {
        client.levelSystem.setClient(client);
    } else if (client.levelSystem) { // Fallback if setClient method isn't defined (should be)
        client.levelSystem.client = client;
    }
    if (client.levelSystem && typeof client.levelSystem.recalculateAllLuckBonuses === 'function') {
        client.levelSystem.recalculateAllLuckBonuses();
        console.log('[Startup] Recalculated luck bonuses for all users.');
    }

    if (client.levelSystem && typeof client.levelSystem.resumeVoiceSessions === 'function') {
        await client.levelSystem.resumeVoiceSessions();
        console.log('[Startup] Resumed voice sessions.');
    }

    console.log('Attempting to load and restore previous giveaway states...');
    const { activeGiveaways: loadedActiveGiveaways, giveawaySetups: loadedGiveawaySetups } = await loadGiveaways();

    // Restore giveaway setups
    for (const userId in loadedGiveawaySetups) {
        const setupConfig = loadedGiveawaySetups[userId];
        // Convert color string back to number if needed
        if (typeof setupConfig.embed.color === 'string' && setupConfig.embed.color.startsWith('#')) {
             setupConfig.embed.color = parseInt(setupConfig.embed.color.slice(1), 16);
        }
        // Ensure new fields exist
        if (setupConfig.actualStartTime === undefined) setupConfig.actualStartTime = null;
        if (setupConfig.duration === undefined) setupConfig.duration = null; // Default will be applied later if still null

        client.giveawaySetups.set(userId, setupConfig);
        console.log(`[RESTORE] Restored giveaway setup for user ${userId}. Status: ${setupConfig.status}`);
        try {
            // Attempt to re-send/update the setup message in the setup channel
            const tempInteraction = { // Mock interaction object for sendSetupChannelMessage
                client: c, // The ready client instance
                channel: await c.channels.fetch(setupConfig.setupChannelId).catch(()=>null),
                user: {id: userId} // Minimal user object
            };
            if (tempInteraction.channel) { // Only proceed if channel is found
                await sendSetupChannelMessage(tempInteraction, setupConfig); // This will try to edit or send new
                console.log(`[RESTORE] Updated setup message for user ${userId} in channel <#${setupConfig.setupChannelId}>.`);
            } else {
                 console.warn(`[RESTORE] Setup channel ${setupConfig.setupChannelId} for user ${userId} not found. Cannot update message.`);
                 client.giveawaySetups.delete(userId); // Remove invalid setup
            }
        } catch (err) {
            console.error(`[RESTORE ERROR] Failed to update setup message for user ${userId}:`, err);
            client.giveawaySetups.delete(userId); // Remove on error
        }
    }

    // Restore active giveaways
    for (const messageId in loadedActiveGiveaways) {
        const giveaway = loadedActiveGiveaways[messageId];
        // Convert color string back to number
        if (typeof giveaway.embed.color === 'string' && giveaway.embed.color.startsWith('#')) {
             giveaway.embed.color = parseInt(giveaway.embed.color.slice(1), 16);
        }
        // Ensure new fields exist
        if (giveaway.actualStartTime === undefined) giveaway.actualStartTime = null;
        if (giveaway.duration === undefined) giveaway.duration = 5 * 60 * 1000; // Default to 5 mins if not set

        client.activeGiveaways.set(messageId, giveaway);

        const now = Date.now();
        const actualEndTime = giveaway.endTime; // endTime should be stored correctly by startInstant/Scheduled

        if (giveaway.expired) { // If it was already marked as expired
            console.log(`[RESTORE] Giveaway ${messageId} for "${giveaway.prize}" in <#${giveaway.channelId}> was already expired. No action needed.`);
            continue;
        }

        if (giveaway.scheduled && giveaway.actualStartTime && giveaway.actualStartTime > now) {
            // This is a scheduled giveaway that hasn't started yet
            const timeUntilStart = giveaway.actualStartTime - now;
            console.log(`[RESTORE] Restored scheduled giveaway for "${giveaway.prize}" in <#${giveaway.channelId}>. Starting in ${Math.ceil(timeUntilStart / (60 * 1000))} minutes. Link: https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`);
            setTimeout(async () => {
                const currentGiveaway = client.activeGiveaways.get(messageId);
                if (currentGiveaway && currentGiveaway.scheduled) {
                    // Delete the "scheduled" message
                    const channel = await client.channels.fetch(currentGiveaway.channelId).catch(() => null);
                    if (channel) {
                        const scheduledMsg = await channel.messages.fetch(currentGiveaway.messageId).catch(() => null);
                        if (scheduledMsg && scheduledMsg.deletable) await scheduledMsg.delete().catch(console.error);
                    }
                    // Start the actual giveaway
                    const configToStart = { ...currentGiveaway, actualStartTime: null }; // Clear actualStartTime for instant start logic
                    await startInstantGiveaway(client, configToStart);
                    client.activeGiveaways.delete(messageId); // Remove the "scheduled" placeholder entry
                    saveGiveaways(client.activeGiveaways, client.giveawaySetups);
                }
            }, timeUntilStart);
        } else if (giveaway.scheduled && giveaway.actualStartTime && giveaway.actualStartTime <= now) {
            // Scheduled giveaway whose start time has passed during downtime
            console.log(`[RESTORE] Scheduled giveaway for "${giveaway.prize}" in <#${giveaway.channelId}> was already due. Starting instantly. Link: https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`);
            const configToStart = { ...giveaway, actualStartTime: null };
             // Delete the "scheduled" message first
             const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
             if (channel) {
                 const scheduledMsg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                 if (scheduledMsg && scheduledMsg.deletable) await scheduledMsg.delete().catch(console.error);
             }
            await startInstantGiveaway(client, configToStart);
            client.activeGiveaways.delete(messageId); // Remove placeholder
            saveGiveaways(client.activeGiveaways, client.giveawaySetups);
        } else { // This is an instant giveaway that was running or already ended
            const remainingDuration = actualEndTime - now;
            if (remainingDuration > 0) {
                console.log(`[RESTORE] Restored active giveaway for "${giveaway.prize}" in <#${giveaway.channelId}>. Ending in ${Math.ceil(remainingDuration / (60 * 1000))} minutes. Link: https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`);
                setTimeout(async () => {
                    await endGiveaway(client, messageId);
                }, remainingDuration);
            } else {
                // Giveaway ended during downtime
                console.log(`[RESTORE] Giveaway ${messageId} for "${giveaway.prize}" in <#${giveaway.channelId}> was already ended. Processing results. Link: https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`);
                await endGiveaway(client, messageId); // This will handle winner selection, etc.
            }
        }
    }
    console.log('Giveaway restoration complete.');


    client.user.setActivity('levels, items, & shop!', { type: ActivityType.Watching });
    try {
        embedBuildingSessions = client.levelSystem.loadAllEmbedSessions(); // Load from DB
        console.log(`[EmbedSessions] Loaded ${embedBuildingSessions.size} embed building sessions from database.`);
        // Cleanup old sessions (older than 7 days)
        const sevenDaysAgoTimestamp = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        if (client.levelSystem.db) { // Ensure DB is available
            const result = client.levelSystem.db.prepare('DELETE FROM embed_sessions WHERE createdAt < ?').run(sevenDaysAgoTimestamp);
            if (result.changes > 0) console.log(`[EmbedSessions] Cleaned up ${result.changes} old embed sessions from DB.`);
        } else { console.warn("[EmbedSessions] levelSystem.db not accessible for startup cleanup."); }
    } catch (e) { console.error("[EmbedSessions] Error during embed session loading/cleanup at startup:", e); }

    // Start scheduled tasks
scheduleDailyLeaderboardUpdate(client);

// ✅ Make sure weekend state is correct *first*
await scheduleWeekendBoosts(client);   // ← moved up (it runs an immediate check)

    // Log weekend status on each restart
    try {
        const now = new Date();
        const active = isDateInWeekendRange(now);
        const tzDate = new Date(now.getTime() + WEEKEND_TZ_OFFSET_HOURS * 60 * 60 * 1000); // UTC+7 offset
        const msg = `[Startup] Weekend range check: ${active ? 'IN' : 'OUT'} of weekend at ${tzDate.toUTCString().replace('GMT', 'UTC+7')}`;
        console.log(msg);
        await logToBotLogChannel(msg).catch(()=>{});
    } catch (err) {
        console.error('[Startup] Failed to report weekend status:', err);
    }

/* now it’s safe to restock the shop */
if (client.levelSystem && client.levelSystem.shopManager) {
    scheduleShopRestock(client);
} else {
    console.error("[Shop] ShopManager not available at startup – restock disabled.");
}

scheduleStreakLossCheck(client);
scheduleDailyReadyNotifications(client);
scheduleVoiceActivityRewards(client);
    initBuildBattleEvent(client);
    initFishSeason(client);
    initFishMarket(client);
    initFishStore(client);
    initWeather(client);

    // Config checks
    if (!LEVEL_UP_CHANNEL_ID) console.warn("[Config Check] LEVEL_UP_CHANNEL_ID not defined.");
    if (!LOOTBOX_DROP_CHANNEL_ID) console.warn("[Config Check] LOOTBOX_DROP_CHANNEL_ID not defined.");
    if (!CHARM_ALERT_CHANNEL_ID) console.warn("[Config Check] CHARM_ALERT_CHANNEL_ID not defined.");
    if (!WELCOME_CHANNEL_ID && !client.guilds.cache.some(g => g.systemChannelId)) console.warn("[Config Check] WELCOME_CHANNEL_ID not defined and no default system channels found.");
    
    // Check for essential item IDs from gameConfig (now accessed via systemsManager instance)
    if (!client.levelSystem.SPECIAL_ROLE_ID_TO_GRANT) console.warn("[Config Check] Special Role ID (from gameConfig via SystemsManager) not defined.");
    if (!client.levelSystem.COSMIC_ROLE_TOKEN_ID) console.warn("[Config Check] COSMIC_ROLE_TOKEN_ID (from gameConfig via SystemsManager) not defined.");

    if (!VERY_RARE_ITEM_ALERT_CHANNEL_ID) console.warn("[Config Check] VERY_RARE_ITEM_ALERT_CHANNEL_ID not defined.");

    if (!ROBUX_WITHDRAWAL_LOG_CHANNEL_ID) {
        console.warn("[Config Check] ROBUX_WITHDRAWAL_LOG_CHANNEL_ID is not defined in index.js. Robux withdrawal requests will not be logged.");
    } else {
        try {
            await client.channels.fetch(ROBUX_WITHDRAWAL_LOG_CHANNEL_ID);
            console.log(`[Config Check] Robux withdrawal log channel (${ROBUX_WITHDRAWAL_LOG_CHANNEL_ID}) found.`);
        } catch (e) {
            console.error(`[Config Check] CRITICAL: Robux withdrawal log channel ID ${ROBUX_WITHDRAWAL_LOG_CHANNEL_ID} is invalid or bot cannot access it. Withdrawals will fail to log.`);
        }
    }

});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    if (client.afkUsers.has(message.author.id)) {
        const data = client.afkUsers.get(message.author.id);
        client.afkUsers.delete(message.author.id);
        if (data.oldNickname && message.member && message.member.manageable) {
            await message.member.setNickname(data.oldNickname).catch(()=>{});
        }
        try { await message.author.send('Welcome back! Your AFK status has been removed.'); } catch {}
    }

    let member = message.member;
    if (!member) { // Attempt to fetch if not readily available (e.g., due to intents or caching)
        try { member = await message.guild.members.fetch(message.author.id); }
        catch (e) { console.warn(`[MessageCreate] Could not fetch member ${message.author.id} in guild ${message.guild.id}`); return; }
    }
    if (!member) return; // If still no member, cannot proceed


    // Award special role on message send chance
    await checkAndAwardSpecialRole(member, 'sending a message');

    if (message.mentions.users.size > 0) {
        for (const [id, user] of message.mentions.users) {
            if (client.afkUsers.has(id) && id !== message.author.id) {
                const data = client.afkUsers.get(id);
                const now = Date.now();
                if (now - (data.lastPing || 0) >= AFK_REPLY_INTERVAL_MS) {
                    data.lastPing = now;
                    const minutes = Math.floor((now - data.timestamp) / 60000);
                    const duration = minutes >= 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes}m`;
                    const base = `**${user.username}** is AFK${data.reason ? ' — ' + data.reason : ''} (since ${duration} ago)`;
                    const msg = afkMessages[Math.floor(Math.random() * afkMessages.length)]
                        .replace('{author}', `**${message.author.username}**`)
                        .replace('{user}', `**${user.username}**`);
                    await message.reply({ content: `${msg}\n${base}` }).catch(() => {});
                }
            }
        }
    }

    // XP and Coin Gain Logic
    const rolePerkData = client.levelSystem.getActiveRolePerks(message.author.id, message.guild.id);
    let gainedXpThisMessage = false;
    const xpCooldownKey = `xp-${message.author.id}-${message.guild.id}`;
    // Use configured cooldown, fallback to global const
    const configuredXpCooldownSeconds = client.levelSystem.gameConfig.globalSettings.XP_COOLDOWN_SECONDS || XP_COOLDOWN_SECONDS;

    if (client.levelSystem.xpCooldowns.has(xpCooldownKey)) {
        if (Date.now() - client.levelSystem.xpCooldowns.get(xpCooldownKey) >= configuredXpCooldownSeconds * 1000) {
            client.levelSystem.xpCooldowns.set(xpCooldownKey, Date.now()); // Reset cooldown
            gainedXpThisMessage = true;
        }
    } else { // First message or cooldown expired
        client.levelSystem.xpCooldowns.set(xpCooldownKey, Date.now());
        gainedXpThisMessage = true;
    }

    if (gainedXpThisMessage) {
        let xpResult;
        try {
            // Use configured XP per message, fallback to global const
            const configuredXpPerMessage = client.levelSystem.gameConfig.globalSettings.BASE_XP_PER_MESSAGE[0] || XP_PER_MESSAGE_BASE;
            const xpWithPerks = configuredXpPerMessage + (rolePerkData.totals.xpPerMessage || 0);
            xpResult = await client.levelSystem.addXP(message.author.id, message.guild.id, xpWithPerks, member, false, WEEKEND_MULTIPLIERS.xp); // Pass current weekend XP multiplier
            if (xpResult.leveledUp) {
                const gemReward = Math.pow(xpResult.newLevel, 2);
                client.levelSystem.addGems(message.author.id, message.guild.id, gemReward, "level_up");

                const coinMultiplierForEmbed = Math.pow(2, Math.floor(xpResult.newLevel / 5));

                const botMember = message.guild.members.me; // Get the bot's member object
                if (!botMember) { // Should always exist, but good check
                    console.error(`[LevelUp] Bot member not found in guild ${message.guild.name}.`); return;
                }
                const levelUpImageURL = getImageUrlForLevel(xpResult.newLevel) || message.author.displayAvatarURL({ dynamic: true });
                const gemEmoji = client.levelSystem.gemEmoji || '💎';
                const levelUpEmbed = new EmbedBuilder()
                    .setColor(0x00FF00).setTitle('<:levelup:1373261581126860910> Level Up! 🎉')
                    .setDescription(`<a:sparkly:1373275364230697061> Congratulations ${message.author}! You've advanced to **Level ${xpResult.newLevel}**!`)
                    .setThumbnail(levelUpImageURL)
                    .addFields({ name: 'Rewards', value: `+${gemReward} ${gemEmoji}\nChat coin multiplier: x${coinMultiplierForEmbed}` })
                    .setTimestamp()
                    .setFooter({ text: `Leveled up in: ${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true }) });

                const guildLevelUpChannelId = client.levelSystem.getGuildSettings(message.guild.id).levelUpChannelId || LEVEL_UP_CHANNEL_ID;
                let targetChannel = guildLevelUpChannelId ? message.guild.channels.cache.get(guildLevelUpChannelId) : null;

                if (targetChannel && targetChannel.isTextBased()) {
                    const permissionsInTarget = targetChannel.permissionsFor(botMember);
                    if (permissionsInTarget?.has(PermissionsBitField.Flags.SendMessages) && permissionsInTarget.has(PermissionsBitField.Flags.EmbedLinks)) {
                        await targetChannel.send({ embeds: [levelUpEmbed] }).catch(err => console.error(`[LevelUp] Failed to send level up message to ${targetChannel.name}:`, err.message));
                    } else console.warn(`[LevelUp] Missing SendMessages or EmbedLinks permission in target level up channel ${targetChannel?.name}.`);
                } else if (guildLevelUpChannelId) console.warn(`[LevelUp] Specific level up channel ${guildLevelUpChannelId} not found or not text-based.`);
                // else: No specific channel set, and default is not found/valid, so no message sent (can be logged if needed)
            }
        } catch (error) { console.error('[XP System] Error in messageCreate (addXP):', error); }

        // Coin gain logic
        const configuredMinCoins = client.levelSystem.gameConfig.globalSettings.BASE_COINS_PER_MESSAGE[0] || MIN_COINS_PER_MESSAGE;
        const configuredMaxCoins = client.levelSystem.gameConfig.globalSettings.BASE_COINS_PER_MESSAGE[1] || MAX_COINS_PER_MESSAGE;

        if (configuredMinCoins > 0 && configuredMaxCoins >= configuredMinCoins) {
            const minCoins = Math.min(configuredMinCoins, configuredMaxCoins);
            const maxCoins = Math.max(configuredMinCoins, configuredMaxCoins);
            const coinsEarnedBase = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;
            const levelForCoins = xpResult ? xpResult.newLevel : client.levelSystem.getUser(message.author.id, message.guild.id).level;
            const coinMultiplier = Math.pow(2, Math.floor(levelForCoins / 5));
            const coinsEarned = coinsEarnedBase * coinMultiplier;
            if (coinsEarned > 0) client.levelSystem.addCoins(message.author.id, message.guild.id, coinsEarned, "chat_message", WEEKEND_MULTIPLIERS);
            if (rolePerkData.totals.gemPerMessage > 0) {
                client.levelSystem.addGems(message.author.id, message.guild.id, rolePerkData.totals.gemPerMessage, "role_perk_chat", WEEKEND_MULTIPLIERS, true);
            }
        }
    }
    // Direct Drop Logic
    try {
        const directDropResult = client.levelSystem.handleDirectDrop(message.author.id, message.guild.id, member, WEEKEND_MULTIPLIERS); // Pass weekend multipliers

        if (directDropResult.droppedItem) {
            const { droppedItem, config, shouldAnnounce, grantedSpecialRole } = directDropResult;
            const itemName = droppedItem.name || client.levelSystem.getItemNameById(droppedItem.id, message.guild.id); // Fallback if name isn't in config
            const itemEmoji = droppedItem.emoji || client.levelSystem.getItemEmojiById(droppedItem.id, message.guild.id); // Fallback

            if (grantedSpecialRole && droppedItem.id === client.levelSystem.COSMIC_ROLE_TOKEN_ID) { // Use instance property
                // Announcement for cosmic role is handled by checkAndAwardSpecialRole if VERY_RARE_ITEM_ALERT_CHANNEL_ID is set
            } else if (shouldAnnounce) {
                const guildLootDropChannelId = client.levelSystem.getGuildSettings(message.guild.id).lootDropAlertChannelId || LOOTBOX_DROP_CHANNEL_ID;
                if (guildLootDropChannelId) {
                    const alertChannel = await client.channels.fetch(guildLootDropChannelId).catch(() => null);
                    if (alertChannel && alertChannel.isTextBased()) {
                    const botMemberForLoot = message.guild.members.me; // Get bot member
                    if (botMemberForLoot && alertChannel.permissionsFor(botMemberForLoot).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
                        const itemConfig = config; // Already have this from directDropResult
                        const itemNameDisplay = itemName; // Already have this
                        const itemEmojiDisplay = itemEmoji; // Already have this

                        const rarityString = client.levelSystem._getItemRarityString(droppedItem.id, itemConfig, itemConfig.type);
                        const rarityDetails = client.levelSystem.itemRarities[rarityString.toUpperCase()] || client.levelSystem.itemRarities.COMMON; // Fallback
                        const embedColor = rarityDetails.color;

                        let alertTitle = `${itemEmojiDisplay} A Wild ${itemNameDisplay} Appeared! 🎉`;
                        let eventDescription = `${message.author} stumbled upon a **${itemNameDisplay}** while chatting in <#${message.channel.id}>!`;
                        let alertImage = itemConfig.imageUrl || null; // Use item's specific image if available

                        // Customize title/description based on rarity for extra flair
                        if (rarityString === client.levelSystem.itemRarities.PRISMATIC?.name) {
                            alertTitle = `🌈 PRISMATIC FIND! ${itemEmojiDisplay} ${itemNameDisplay}! 🌈`;
                            eventDescription = `${message.author} has discovered an ultra rare **${itemNameDisplay}**!`;
                        }
                        else if (rarityString === client.levelSystem.itemRarities.SECRET.name) {
                            alertTitle = `✨🌌 SECRET DISCOVERY! ${itemEmojiDisplay} ${itemNameDisplay}! 🌌✨`;
                            eventDescription = `${message.author} has uncovered a **${itemNameDisplay}**! This is an EXTREMELY rare, almost mythical find!`;
                            alertImage = 'https://i.ibb.co/Sx21B4G/output-onlinegiftools-3.gif'; // Example GIF
                        }
                        else if (rarityString === client.levelSystem.itemRarities.MYTHICAL.name) {
                            alertTitle = `🌟 MYTHICAL ITEM FOUND! ${itemEmojiDisplay} ${itemNameDisplay}! 🌟`;
                            eventDescription = `By the ancient gods! ${message.author} has unearthed a **${itemNameDisplay}**! A discovery of legendary proportions!`;
                            alertImage = 'https://i.ibb.co/6KJJ6fP/nh1.png'; // Example mythic image
                        }
                        else if (rarityString === client.levelSystem.itemRarities.LEGENDARY.name) {
                            alertTitle = `👑 LEGENDARY DROP! ${itemEmojiDisplay} ${itemNameDisplay}! 👑`;
                            eventDescription = `Unbelievable! ${message.author} has found a **${itemNameDisplay}**! A true treasure from the depths!`;
                            alertImage = 'https://i.ibb.co/MyCXX90z/nh7.png'; // Example legendary image
                        }
                        else if (rarityString === client.levelSystem.itemRarities.EPIC.name && itemConfig.id === 'epic_loot_box') { // Specific for epic chest
                            alertTitle = `💜 EPIC CHEST! ${itemEmojiDisplay} ${itemNameDisplay}! 💜`;
                            eventDescription = `What's inside?! ${message.author} found an **${itemNameDisplay}**! This could contain something truly amazing!`;
                            alertImage = 'https://i.ibb.co/TMfz2f6Q/nh6.png'; // Epic box image
                        }
                        // Ensure image is set if one was determined
                        if (!alertImage && itemConfig.imageUrl) alertImage = itemConfig.imageUrl;


                        const lootEmbed = new EmbedBuilder()
                            .setColor(embedColor).setTitle(alertTitle).setDescription(eventDescription)
                            .setThumbnail(itemConfig.imageUrl || null) // Always use item's direct image for thumbnail
                            .addFields(
                                { name: '🔍 Discovered By', value: `${message.author.tag}`, inline: true },
                                { name: '💎 Rarity Tier', value: `**${rarityString}**`, inline: true },
                                { name: '🎲 Approx. Chance', value: `\`1 in ${Math.round(1 / directDropResult.baseProbability).toLocaleString()}\``, inline: true } // Display calculated overall probability
                            ).setTimestamp().setFooter({ text: `Obtained from: Chatting in ${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true }) });
                        await alertChannel.send({ embeds: [lootEmbed] });
                    } else console.warn(`[Loot Drop] Bot missing SendMessages or EmbedLinks permission in configured loot drop channel: ${guildLootDropChannelId}`);
                } else console.warn(`[Loot Drop] Configured loot drop channel ${guildLootDropChannelId} not found or not text-based.`);
            }
            } // else: item dropped, but no public announcement needed (e.g., below threshold or user disabled alerts)
        }
    } catch (error) { console.error('[Loot System] Error in messageCreate (direct drop):', error); }
});

client.on('guildMemberAdd', async member => {
    if (member.user.bot) return; // Ignore bots
    try {
        // Ensure user exists in DB on join
        client.levelSystem.getUser(member.id, member.guild.id);
        // Check and award roles based on their current level (if they rejoined with existing stats)
        await client.levelSystem.checkAndAwardRoles(member, client.levelSystem.getLevelInfo(member.id, member.guild.id).level);

        // Assign default role to new members
        try {
            const joinRole = member.guild.roles.cache.get(NEW_MEMBER_ROLE_ID);
            const botMember = member.guild.members.me;
            if (joinRole) {
                if (botMember && botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) && botMember.roles.highest.position > joinRole.position) {
                    if (!member.roles.cache.has(NEW_MEMBER_ROLE_ID)) {
                        await member.roles.add(joinRole);
                    }
                } else {
                    console.warn(`[GuildMemberAdd] Missing permissions or hierarchy to assign join role in guild ${member.guild.name}.`);
                }
            } else {
                console.warn(`[GuildMemberAdd] Join role ID ${NEW_MEMBER_ROLE_ID} not found in guild ${member.guild.name}.`);
            }
        } catch (err) {
            console.error(`[GuildMemberAdd] Error assigning join role to ${member.user.tag}:`, err);
        }

        const guildWelcomeChannelId = client.levelSystem.getGuildSettings(member.guild.id).welcomeChannelId || WELCOME_CHANNEL_ID;
        let welcomeChannel = guildWelcomeChannelId ? member.guild.channels.cache.get(guildWelcomeChannelId) : member.guild.systemChannel; // Fallback to system channel

        if (welcomeChannel && welcomeChannel.isTextBased()) {
            const botMember = member.guild.members.me;
            if (botMember && welcomeChannel.permissionsFor(botMember)?.has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71).setTitle(`🎉 Welcome to ${member.guild.name}, ${member.displayName}!`)
                    .setDescription(`We're thrilled to have you, ${member}! Feel free to look around and say hi. Check out our rules channel too!`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 })).setTimestamp()
                    .setFooter({ text: `User Joined: ${member.user.tag}`, iconURL: member.guild.iconURL({ dynamic: true }) });
                await welcomeChannel.send({ content: `Hey ${member}! Welcome to the server! 👋`, embeds: [welcomeEmbed] }).catch(err => console.error(`[GuildMemberAdd] Failed to send welcome message to ${welcomeChannel.name}:`, err.message));
            } else console.warn(`[GuildMemberAdd] Missing SendMessages or EmbedLinks permission in welcome channel ${welcomeChannel?.name}.`);
        } else if (guildWelcomeChannelId) console.warn(`[GuildMemberAdd] Welcome channel ${guildWelcomeChannelId} not found or not text-based.`);
        // else: No welcome channel configured or found, no message sent.
    } catch (error) { console.error(`[GuildMemberAdd] Error handling new member ${member.user.tag}:`, error); }
});

client.on('interactionCreate', async interaction => {
    // FIX 2: Allow specific DM interactions like giveaway claims
    const isGiveawayClaimInteraction = interaction.isButton() && interaction.customId?.startsWith('claim_');
    const isDailyStreakRestore = interaction.isButton() && interaction.customId?.startsWith('restore_streak_confirm');
    const isSplitStealInteraction = interaction.isButton() && interaction.customId?.startsWith('splitsteal_');

    if (!interaction.guild && !isGiveawayClaimInteraction && !isDailyStreakRestore && !isSplitStealInteraction) {
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Sorry, I can only work inside servers.", ephemeral: true }).catch(() => {});
        }
        return;
    }

    let member = interaction.member;
    if (!member && interaction.guild) {
        try { member = await interaction.guild.members.fetch(interaction.user.id); }
        catch (e) {
            if (interaction.guild) return sendInteractionError(interaction, "Could not verify your membership details. Please try again.", true);
        }
    }
    if (!member && interaction.guild) {
        return sendInteractionError(interaction, "Could not process interaction: member details unavailable.", true);
    }

    const isStaff = () => member && (member.permissions.has(PermissionsBitField.Flags.ManageGuild) || (STAFF_ROLE_IDS && STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId))));
    const isAdmin = () => member && (member.permissions.has(PermissionsBitField.Flags.Administrator) || (STAFF_ROLE_IDS && STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId))));

    const { commandName } = interaction;
    let deferredThisInteraction = false;

    try {
        if (interaction.isAutocomplete()) {
            if (!interaction.guild) return;

            const focusedValue = interaction.options.getFocused(true);
            const searchTerm = focusedValue.value.toLowerCase();
            let choices = [];

            if (commandName === 'use-item' && focusedValue.name === 'item') {
                const userInventoryCategorized = client.levelSystem.getUserInventory(interaction.user.id, interaction.guild.id);
                const usableItems = [
                    ...userInventoryCategorized.generalItems,
                    ...userInventoryCategorized.lootBoxes,
                    ...userInventoryCategorized.cosmicTokens,
                    ...userInventoryCategorized.charms
                ].filter(i => ![
                    ITEM_IDS.DISCOUNT_10,
                    ITEM_IDS.DISCOUNT_25,
                    ITEM_IDS.DISCOUNT_50,
                    ITEM_IDS.DISCOUNT_100,
                    ITEM_IDS.DAILY_SKIP_TICKET
                ].includes(i.itemId));
                choices = usableItems
                    .filter(item => item.name.toLowerCase().includes(searchTerm) || item.itemId.toLowerCase().includes(searchTerm))
                    .map(item => ({ name: `${item.name} (Qty: ${item.quantity}, ID: ${item.itemId})`, value: item.itemId }))
                    .slice(0, 25);
            } else if (commandName === 'give-item' && focusedValue.name === 'item_id') {
                choices = Object.values(client.levelSystem.gameConfig.items)
                    .filter(item => item.type !== client.levelSystem.itemTypes.JUNK && item.type !== client.levelSystem.itemTypes.CURRENCY)
                    .filter(item => item.name.toLowerCase().includes(searchTerm) || item.id.toLowerCase().includes(searchTerm))
                    .map(item => ({ name: `${item.name} (ID: ${item.id})`, value: item.id }))
                    .slice(0, 25);
            } else if (commandName === 'item-info' && focusedValue.name === 'item_name') {
                 choices = Object.values(client.levelSystem.gameConfig.items)
                    .filter(item => item.type !== client.levelSystem.itemTypes.JUNK)
                    .filter(item => item.name.toLowerCase().includes(searchTerm) || item.id.toLowerCase().includes(searchTerm))
                    .map(item => ({ name: `${item.name} (ID: ${item.id})`, value: item.id }))
                    .slice(0, 25);
            } else if (commandName === 'award-badge' && focusedValue.name === 'badge') {
                choices = Object.values(client.levelSystem.getAllBadges())
                    .filter(b => b.name.toLowerCase().includes(searchTerm) || b.id.toLowerCase().includes(searchTerm))
                    .map(b => ({ name: `${b.name} (ID: ${b.id})`, value: b.id }))
                    .slice(0, 25);
            }
            if (!interaction.responded) {
                await interaction.respond(choices).catch(e => console.error(`[Autocomplete ${commandName}] Error responding for ${focusedValue.name}:`, e.message));
            }
            return;
        }

        if ((interaction.isButton() || interaction.isModalSubmit()) && client.giveawaySetups.has(interaction.user.id)) {
            const giveawayConfig = client.giveawaySetups.get(interaction.user.id);
            if (giveawayConfig && interaction.channelId && giveawayConfig.setupChannelId === interaction.channelId) {
                await handleGiveawaySetupInteraction(interaction, client.giveawaySetups);
                return;
            }
        }

        if ((interaction.isButton() || interaction.isStringSelectMenu()) && interaction.message && interaction.message.interaction && interaction.message.interaction.user && interaction.message.interaction.user.id !== interaction.user.id) {
            const replyOpts = { content: "You can't use someone else's command.", ephemeral: true };
            if (!interaction.replied && !interaction.deferred) await interaction.reply(replyOpts).catch(()=>{});
            else await interaction.followUp(replyOpts).catch(()=>{});
            return;
        }

        if (interaction.isChatInputCommand()) {
            if (!interaction.guild) {
                return sendInteractionError(interaction, "This command can only be used in a server.", true);
            }

            if (commandName === 'daily') {
                const subcommand = interaction.options.getSubcommand();
                if (subcommand === 'check') {
                    if (!interaction.replied && !interaction.deferred) {
                        await safeDeferReply(interaction, { ephemeral: false });
                        deferredThisInteraction = true;
                    }
                    try {
                        const { embed, components } = await buildDailyEmbed(interaction, client);
                        await safeEditReply(interaction, { embeds: [embed], components: components }, false); // Don't auto-delete daily panel
                    } catch (dailyError) {
                        console.error('[DailyCheck Command] Error:', dailyError);
                        await sendInteractionError(interaction, "Could not display daily rewards.", true, deferredThisInteraction);
                    }
                } else if (subcommand === 'restore-streak') {
                     if (!interaction.replied && !interaction.deferred) {
                        const deferOpts = interaction.guild ? { ephemeral: true } : {};
                    await safeDeferReply(interaction, deferOpts);
                        deferredThisInteraction = true;
                    }
                    const result = client.levelSystem.attemptStreakRestore(interaction.user.id, interaction.guild.id);
                     await safeEditReply(interaction, { content: result.message, ephemeral: true });
                }
                return;
            }

            if (commandName === 'withdraw-robux') {
                if (!interaction.replied && !interaction.deferred) {
                    // No immediate defer here, showModal will handle acknowledgement.
                }

                // Check cooldown and balance first (before showing modal)
                const userBalance = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                const canWithdrawCheck = client.levelSystem.canUserWithdrawRobux(interaction.user.id, interaction.guild.id, 1); // Check for min 1 to see cooldown

                if (!canWithdrawCheck.canWithdraw && canWithdrawCheck.reason.includes('cooldown')) {
                    return sendInteractionError(interaction, `❌ ${canWithdrawCheck.reason}`, true);
                }
                // Balance check will happen after amount input.

                const modal = new ModalBuilder()
                    .setCustomId('withdraw_robux_modal')
                    .setTitle('Robux Withdrawal Request');

                const robloxUsernameInput = new TextInputBuilder()
                    .setCustomId('roblox_username')
                    .setLabel("Your Roblox Username")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder("Enter your exact Roblox username");

                const amountInput = new TextInputBuilder()
                    .setCustomId('robux_amount')
                    .setLabel("Amount of Robux to Withdraw")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("e.g., 100")
                    .setRequired(true);

                const gamepassLinkInput = new TextInputBuilder()
                    .setCustomId('gamepass_link')
                    .setLabel("Gamepass/Item Link (for payment)")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("https://www.roblox.com/game-pass/...")
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(robloxUsernameInput),
                    new ActionRowBuilder().addComponents(amountInput),
                    new ActionRowBuilder().addComponents(gamepassLinkInput)
                );

                await interaction.showModal(modal).catch(async e => {
                    console.error("Failed to show withdraw_robux_modal:", e);
                    // If showModal fails, we need to ensure the interaction is somehow replied to if it wasn't deferred.
                    if (!interaction.replied && !interaction.deferred) {
                        await sendInteractionError(interaction, "Failed to open withdrawal form. Please try again.", true);
                    } else {
                        await sendInteractionError(interaction, "Failed to open withdrawal form. Please try again.", true, true);
                    }
                });
                return;
            }


            if (commandName === 'add-user') {
                if (!isStaff()) return sendInteractionError(interaction, "You do not have permission to use this command (Staff Only).", true);

                const targetUser = interaction.options.getUser('user');
                if (!targetUser) return sendInteractionError(interaction, "Target user not specified.", true);
                const targetMemberForCmd = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!targetMemberForCmd) return sendInteractionError(interaction, "The specified user is not a member of this server.", true);

                const removeItemId = interaction.options.getString('item_id');
                const removeAmount = interaction.options.getInteger('amount');
                if (removeItemId && removeAmount) {
                    const itemConfig = client.levelSystem._getItemMasterProperty(removeItemId, null, {});
                    if (!itemConfig || !itemConfig.id) return sendInteractionError(interaction, `Invalid item ID: \`${removeItemId}\`.`, true);
                    const success = client.levelSystem.takeItem(targetUser.id, interaction.guild.id, removeItemId, removeAmount);
                    if (success) return interaction.reply({ content: `✅ Removed ${removeAmount}x ${itemConfig.name || removeItemId} from ${targetUser}.`, ephemeral: true });
                    else return sendInteractionError(interaction, 'Failed to remove item. User may not have enough.', true);
                }

                if (!interaction.replied && !interaction.deferred) {
                    const deferOpts = interaction.guild ? { ephemeral: true } : {};
                    await safeDeferReply(interaction, deferOpts);
                    deferredThisInteraction = true;
                }

                const sessionId = `${interaction.user.id}_${targetUser.id}_${Date.now()}`;
                const sessionData = {
                    sessionId, adminUserId: interaction.user.id, targetUserId: targetUser.id,
                    targetUserTag: targetUser.tag, guildId: interaction.guild.id,
                    panelChannelId: interaction.channel.id, operations: [],
                    createdAt: Math.floor(Date.now() / 1000)
                };
                userManagementSessions.set(sessionId, sessionData);

                const panelEmbed = buildUserManagementPanelEmbed(targetUser, sessionData.operations);
                const panelComponents = getUserManagementPanelComponents(sessionId, sessionData.operations.length);

                // Send the panel as a new message, not as a reply to the ephemeral command invocation.
                const panelMessage = await interaction.channel.send({
                    content: `Interactive panel for managing ${targetUser}. This panel is only visible to you and will expire.`,
                    embeds: [panelEmbed], components: panelComponents, fetchReply: true
                    // ephemeral: false // Panel itself is not ephemeral
                }).catch(async e => {
                    console.error("Failed to send user management panel:", e);
                    userManagementSessions.delete(sessionId);
                    await sendInteractionError(interaction, "Failed to start user management panel.", true, deferredThisInteraction);
                    return null;
                });

                if (panelMessage) {
                    sessionData.panelMessageId = panelMessage.id;
                    userManagementSessions.set(sessionId, sessionData); // Update session with panel message ID
                    // Edit the original ephemeral reply to confirm panel creation
                    await safeEditReply(interaction, { content: `User management panel for ${targetUser} started in this channel.`, ephemeral: true});

                    const timeout = setTimeout(async () => {
                        const currentSession = userManagementSessions.get(sessionId);
                        if (currentSession) {
                            userManagementSessions.delete(sessionId);
                            if (currentSession.panelMessageId) {
                                const msg = await interaction.channel.messages.fetch(currentSession.panelMessageId).catch(() => null);
                                if (msg && msg.deletable) {
                                    await msg.delete().catch(e => { if (e.code !== 10008) console.warn("Failed to delete timed out user management panel:", e.message);});
                                }
                            }
                            console.log(`User management session ${sessionId} for ${targetUser.tag} timed out and was cleaned up.`);
                        }
                    }, USER_MANAGEMENT_PANEL_TIMEOUT_MS);
                    sessionData.timeoutInstance = timeout;
                } else { // If panelMessage failed to send
                    if (!deferredThisInteraction) await safeDeferReply(interaction, {ephemeral: true}); // Ensure deferred if not already
                    await sendInteractionError(interaction, "Failed to initialize user management panel message.", true, true);
                }
                return;
            }


            if (commandName === 'admin-reset-data') {
                if (!isAdmin()) return sendInteractionError(interaction, "You do not have permission to use this command (Administrator required).", true);
                const targetGuildIdInput = interaction.options.getString('target_guild_id');
                const confirmationPhrase = interaction.options.getString('confirmation');
                const expectedConfirmation = "CONFIRM DATA RESET";
                const targetUser = interaction.options.getUser('user');
                const resetAllUsers = interaction.options.getBoolean('reset_all_users');
                const resetOptions = {
                    doLevelsAndXp: interaction.options.getBoolean('reset_levels_xp') || false,
                    doBalances: interaction.options.getBoolean('reset_balances') || false,
                    doInventory: interaction.options.getBoolean('reset_inventory') || false,
                    doActiveCharms: interaction.options.getBoolean('reset_active_charms') || false,
                };
                if (targetGuildIdInput !== interaction.guildId) return sendInteractionError(interaction, "Target Guild ID does not match current server's ID. Reset cancelled.", true);
                if (!targetUser && resetAllUsers !== true) return sendInteractionError(interaction, "You must explicitly confirm reset applies to ALL users by setting 'reset_all_users' to true, or specify a user. Reset cancelled.", true);
                if (confirmationPhrase !== expectedConfirmation) return sendInteractionError(interaction, `Incorrect confirmation phrase. Must type EXACTLY: "${expectedConfirmation}". Reset cancelled.`, true);
                if (!resetOptions.doLevelsAndXp && !resetOptions.doBalances && !resetOptions.doInventory && !resetOptions.doActiveCharms) {
                    return sendInteractionError(interaction, "No data types selected for reset. No action taken.", true);
                }

                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    let result;
                    if (targetUser) {
                        console.log(`[ADMIN COMMAND] User ${interaction.user.tag} initiated selective data reset for user ${targetUser.id} in guild ${interaction.guildId} with options:`, resetOptions);
                        result = client.levelSystem.resetUserDataSelective(targetUser.id, interaction.guild.id, resetOptions);
                    } else {
                        console.log(`[ADMIN COMMAND] User ${interaction.user.tag} initiated selective data reset for guild ${interaction.guildId} with options:`, resetOptions);
                        result = client.levelSystem.resetGuildData(interaction.guild.id, resetOptions);
                    }
                    if (result.success) {
                        let replyMessage;
                        if (targetUser) {
                            replyMessage = `✅ **SUCCESSFULLY RESET DATA FOR <@${targetUser.id}>.**\n`;
                        } else {
                            replyMessage = `✅ **SUCCESSFULLY PERFORMED SELECTIVE DATA RESET FOR THIS GUILD (${interaction.guild.name}).**\n`;
                        }
                        if (result.details && result.details.length > 0) replyMessage += result.details.map(d => `> - ${d}`).join('\n');
                        else replyMessage += "> - No specific changes were logged, but operation marked successful based on selected options.";
                        replyMessage += `\n\n**THIS ACTION WAS IRREVERSIBLE FOR THE SELECTED DATA TYPES.**`;
                        await safeEditReply(interaction, { content: replyMessage, ephemeral: true }, false, 0);
                    } else {
                        let errorMessage = `Data reset failed: ${result.message || 'Unknown error'}\n`;
                        if (result.details && result.details.length > 0) errorMessage += result.details.map(d => `> - ${d}`).join('\n');
                        await sendInteractionError(interaction, errorMessage, true, deferredThisInteraction);
                    }
                } catch (error) { console.error('[AdminResetData Command] Critical error:', error); await sendInteractionError(interaction, 'A critical error occurred while attempting to reset data.', true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'add-xp' || commandName === 'add-level' || commandName === 'set-level' || commandName === 'add-coin' || commandName === 'add-gem' || commandName === 'add-robux' || commandName === 'add-daily-streak') {
                if (!isStaff()) return sendInteractionError(interaction, "You don't have permission.", true, false);
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    const targetUser = interaction.options.getUser('user');
                    const amount = interaction.options.getInteger('amount');
                    let targetMemberForAdminCmd = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(()=>null);
                    if (!targetMemberForAdminCmd) return sendInteractionError(interaction, "Target user not found.", true, deferredThisInteraction);

                    if (commandName === 'add-xp') {
                        if (amount === null) return sendInteractionError(interaction, `Amount option not provided.`, true, deferredThisInteraction);
                        const xpResult = client.levelSystem.addXP(targetUser.id, interaction.guildId, amount, targetMemberForAdminCmd, true);
                        await safeEditReply(interaction, { content: `✅ Added ${xpResult.xpEarned} XP to ${targetUser}. New level: ${xpResult.newLevel}, New XP: ${xpResult.newXp}.` });
                    }
                    else if (commandName === 'add-level') {
                        if (amount === null) return sendInteractionError(interaction, `Amount option not provided.`, true, deferredThisInteraction);
                        const levelResult = await client.levelSystem.addLevelManually(targetUser.id, interaction.guildId, amount, targetMemberForAdminCmd);
                        await safeEditReply(interaction, { content: `✅ Added ${amount > 0 ? amount : ` (decreased by ${Math.abs(amount)})`} levels to ${targetUser}. New level: ${levelResult.newLevel}.` });
                    }
                    else if (commandName === 'set-level') {
                        const levelToSet = interaction.options.getInteger('level');
                        if (levelToSet === null) return sendInteractionError(interaction, `Level option not provided.`, true, deferredThisInteraction);
                        const maxLevelConfig = client.levelSystem.gameConfig.globalSettings.MAX_LEVEL || MAX_LEVEL;
                        if (levelToSet > maxLevelConfig || levelToSet < 0) return sendInteractionError(interaction, `Level must be 0-${maxLevelConfig}.`, true, deferredThisInteraction);
                        const result = await client.levelSystem.setLevel(targetUser.id, interaction.guildId, levelToSet, targetMemberForAdminCmd);
                        await safeEditReply(interaction, { content: `✅ Set ${targetUser}'s level to ${result.newLevel} (XP reset).` });
                    }
                    else if (commandName === 'add-coin') {
                        if (amount === null) return sendInteractionError(interaction, `Amount option not provided.`, true, deferredThisInteraction);
                        const bank = interaction.options.getBoolean('bank');
                        const coinEmoji = client.levelSystem.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
                        if (bank) {
                            const before = client.levelSystem.getBankBalance(targetUser.id, interaction.guildId).bankCoins;
                            let newBal = before + amount;
                            if (newBal < 0) { amount = -before; newBal = 0; }
                            client.levelSystem.updateUser(targetUser.id, interaction.guildId, { bankCoins: newBal });
                            await safeEditReply(interaction, { content: `✅ Bank coins adjusted by ${amount}. New bank balance: ${newBal} ${coinEmoji}.` });
                        } else {
                            const coinResult = client.levelSystem.addCoins(targetUser.id, interaction.guildId, amount, "admin_command");
                            await safeEditReply(interaction, { content: `✅ Added ${coinResult.added} ${coinEmoji} to ${targetUser}. New balance: ${coinResult.newBalance}.` });
                        }
                    }
                    else if (commandName === 'add-gem') {
                         if (amount === null) return sendInteractionError(interaction, `Amount option not provided.`, true, deferredThisInteraction);
                        const bank = interaction.options.getBoolean('bank');
                        const gemEmoji = client.levelSystem.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
                        if (bank) {
                            const before = client.levelSystem.getBankBalance(targetUser.id, interaction.guildId).bankGems;
                            let newBal = before + amount;
                            if (newBal < 0) { amount = -before; newBal = 0; }
                            client.levelSystem.updateUser(targetUser.id, interaction.guildId, { bankGems: newBal });
                            await safeEditReply(interaction, { content: `✅ Bank gems adjusted by ${amount}. New bank balance: ${newBal} ${gemEmoji}.` });
                        } else {
                            const gemResult = client.levelSystem.addGems(targetUser.id, interaction.guildId, amount, "admin_command");
                            await safeEditReply(interaction, { content: `✅ Added ${gemResult.added} ${gemEmoji} to ${targetUser}. New balance: ${gemResult.newBalance}.` });
                        }
                    }
                    else if (commandName === 'add-robux') { // New case for Robux
                         if (amount === null) return sendInteractionError(interaction, `Amount option not provided.`, true, deferredThisInteraction);
                        const robuxResult = client.levelSystem.addRobux(targetUser.id, interaction.guildId, amount, "admin_command");
                        const robuxEmoji = client.levelSystem.robuxEmoji || DEFAULT_ROBUX_EMOJI_FALLBACK;
                        await safeEditReply(interaction, { content: `✅ Added ${robuxResult.added} ${robuxEmoji} to ${targetUser}. New balance: ${robuxResult.newBalance}.` });
                    }
                    else if (commandName === 'add-daily-streak') {
                        if (amount === null || amount <= 0) return sendInteractionError(interaction, 'Amount must be a positive integer.', true, deferredThisInteraction);
                        const streakResult = client.levelSystem.addDailyStreak(targetUser.id, interaction.guildId, amount);
                        await safeEditReply(interaction, { content: `✅ Increased ${targetUser}'s daily streak from ${streakResult.oldStreak} to ${streakResult.newStreak}.` });
                    }
                } catch (error) { console.error(`[Admin Modify Stat Error - ${commandName}]`, error); await sendInteractionError(interaction, 'Failed to modify user stat.', true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'give-item') {
                if (!isStaff()) return sendInteractionError(interaction, "You don't have permission.", true, false);
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    const targetUser = interaction.options.getUser('user');
                    const itemId = interaction.options.getString('item_id');
                    const amount = interaction.options.getInteger('amount');
                    const remove = interaction.options.getBoolean('remove');
                    if (amount <= 0) return sendInteractionError(interaction, "Amount must be positive.", true, deferredThisInteraction);
                    const itemConfig = client.levelSystem._getItemMasterProperty(itemId, null, {});
                    if (!itemConfig || !itemConfig.id) return sendInteractionError(interaction, `Invalid item ID: \`${itemId}\`. Config not found.`, true, deferredThisInteraction);
                    let itemTypeToGive = itemConfig.type;
                    if (!itemTypeToGive) {
                        console.warn(`[GiveItem Command] Item ID: ${itemId} (Name: ${itemConfig.name || 'Unknown'}) has undefined type in master config. Attempting to infer...`);
                        if (itemId.includes('_loot_box')) itemTypeToGive = client.levelSystem.itemTypes.LOOT_BOX;
                        else if (itemId.includes('_charm')) itemTypeToGive = client.levelSystem.itemTypes.CHARM;
                        else if (itemId === client.levelSystem.COSMIC_ROLE_TOKEN_ID) itemTypeToGive = client.levelSystem.itemTypes.COSMIC_TOKEN;
                        else itemTypeToGive = client.levelSystem.itemTypes.ITEM;
                        console.warn(`[GiveItem Command] Inferred type: ${itemTypeToGive}`);
                    }
                    if (!itemTypeToGive) return sendInteractionError(interaction, `Item ID: \`${itemId}\` (Name: ${itemConfig.name || 'Unknown'}) has undefined type.`, true, deferredThisInteraction);
                    if (remove) {
                        const success = client.levelSystem.takeItem(targetUser.id, interaction.guild.id, itemId, amount);
                        if (success) await safeEditReply(interaction, { content: `✅ Removed ${amount}x ${itemConfig.name || itemId} from ${targetUser}.` });
                        else await sendInteractionError(interaction, `Failed to remove item. User may not have enough.`, true, deferredThisInteraction);
                    } else {
                        const giveResult = client.levelSystem.addItemToInventory(targetUser.id, interaction.guild.id, itemId, itemTypeToGive, amount, 'admin_command_give');
                        if (giveResult.success) await safeEditReply(interaction, { content: `✅ ${giveResult.message}` });
                        else await sendInteractionError(interaction, giveResult.message || "Failed to give item.", true, deferredThisInteraction);
                    }
                } catch (giveItemError) { console.error('[GiveItem Command] Error:', giveItemError); await sendInteractionError(interaction, "Failed to give item. Internal error.", true, deferredThisInteraction); }
                return;
            }
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle-notifications')
        .setDescription('Enable or disable all non-daily notifications for this bot instance.')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Set to true to enable non-daily notifications.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction, client) {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }

        const enabled = interaction.options.getBoolean('enabled');
        
        // Modify the property on the client object
        client.NON_DAILY_NOTIFICATIONS_ENABLED = enabled;

        await interaction.reply({ 
            content: `✅ All non-daily notifications have been **${enabled ? 'ENABLED' : 'DISABLED'}**.`, 
            ephemeral: true 
        });
    },
};
            if (commandName === 'adminshop') {
                if (!isStaff()) return sendInteractionError(interaction, "No permission for admin shop.", true, false);
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const subcommand = interaction.options.getSubcommand();
                try {
                    if (!client.levelSystem || !client.levelSystem.shopManager) return sendInteractionError(interaction, "Shop system not initialized.", true, deferredThisInteraction);
                    const shopManagerInstance = client.levelSystem.shopManager;
                    if (subcommand === 'restock') {
                        const restockResult = await shopManagerInstance.restockShop(interaction.guild.id, true);
                        if (restockResult.success) {
                            await safeEditReply(interaction, { content: '✅ Shop manually restocked!' });
                            await refreshShopDisplayForGuild(interaction.guild.id, client);
                            await sendRestockAlerts(client, interaction.guild, restockResult);
                        } else await sendInteractionError(interaction, `Failed to restock: ${restockResult.message}`, true, deferredThisInteraction);
                    } else if (subcommand === 'setchannel') {
                        const newShopChannel = interaction.options.getChannel('channel');
                        if (!newShopChannel || newShopChannel.type !== ChannelType.GuildText) return sendInteractionError(interaction, 'Invalid text channel.', true, deferredThisInteraction);
                        shopManagerInstance.updateGuildShopSettings(interaction.guild.id, { shopChannelId: newShopChannel.id, shopMessageId: null });
                        await safeEditReply(interaction, { content: `✅ Shop display channel set to ${newShopChannel}.` });
                    } else if (subcommand === 'settitle') { // Assuming this subcommand exists or you'll add it
                        const newTitle = interaction.options.getString('title');
                        if (!newTitle || newTitle.length > 100) return sendInteractionError(interaction, 'Title must be 1-100 characters.', true, deferredThisInteraction);
                        shopManagerInstance.updateGuildShopSettings(interaction.guild.id, { shopTitle: newTitle });
                        await safeEditReply(interaction, { content: `✅ Shop title updated to: "${newTitle}".`});
                        await refreshShopDisplayForGuild(interaction.guild.id, client);
                    }
                } catch (adminShopError) { console.error(`[AdminShop Error]`, adminShopError); await sendInteractionError(interaction, "Error in admin shop.", true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'bank') {
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: false }); deferredThisInteraction = true; }
                try {
                    const bankEmbed = await buildBankEmbed(interaction.user, interaction.guild.id, client.levelSystem);
                    const bankComponents = getBankComponents(interaction.user.id, interaction.guild.id, client.levelSystem);
                    const bankMessage = await safeEditReply(interaction, { embeds: [bankEmbed], components: bankComponents, fetchReply: true });
                    if (bankMessage) { const bankMessageKey = `${interaction.user.id}_${interaction.guild.id}`; await setBankMessageTimeout(interaction, bankMessage.id, bankMessageKey); }
                } catch (error) { console.error(`[Bank Command] Error for ${interaction.user.tag}:`, error); await sendInteractionError(interaction, "Could not display bank info.", true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'shop') {
                let targetChannelForShop = interaction.options.getChannel('channel');
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: !targetChannelForShop }); deferredThisInteraction = true; }
                if (!targetChannelForShop) targetChannelForShop = interaction.channel;
                else if (!targetChannelForShop.isTextBased()) return sendInteractionError(interaction, "Shop can only be in text channels.", true, deferredThisInteraction);
                try {
                    if (!client.levelSystem || !client.levelSystem.shopManager) return sendInteractionError(interaction, "Shop system unavailable.", true, deferredThisInteraction);
                    const { embed: shopEmbed, shopItems } = await buildShopEmbed(interaction.guild.id, client.levelSystem, client.levelSystem.shopManager);
                    const components = getShopComponents(shopItems, client.levelSystem);
                    const sentMessage = await targetChannelForShop.send({ embeds: [shopEmbed], components }).catch(async e => { console.error(`[Shop Command] Failed to send shop to ${targetChannelForShop.name}: ${e.message}`); await sendInteractionError(interaction, "Could not display shop.", true, deferredThisInteraction); return null; });
                    if (sentMessage) {
                        const currentShopSettings = client.levelSystem.shopManager.getGuildShopSettings(interaction.guild.id);
                        const newShopSettings = { ...currentShopSettings, shopChannelId: targetChannelForShop.id, shopMessageId: sentMessage.id };
                        client.levelSystem.shopManager.setGuildShopSettings(interaction.guild.id, newShopSettings); // Use set, not update, to ensure all fields are present if new
                        const successMsg = targetChannelForShop.id === interaction.channelId ? `🛍️ Shop displayed above!` : `🛍️ Shop displayed in ${targetChannelForShop}!`;
                        await safeEditReply(interaction, { content: successMsg, ephemeral: true, embeds: [], components: [] });
                    }
                } catch (shopError) { console.error(`[Shop Command] Error:`, shopError); await sendInteractionError(interaction, "Error displaying shop.", true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'inventory') {
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: false }); deferredThisInteraction = true; }
                try {
                    const { embed } = await buildInventoryEmbed(interaction.user, interaction.guild.id, client.levelSystem, 'items');
                    const components = getInventoryNavComponents('items');
                    const sentMessage = await safeEditReply(interaction, { embeds: [embed], components: components, fetchReply: true });
                    if (sentMessage?.id) {
                        const inventoryKey = `${interaction.user.id}_${interaction.guild.id}_inv`;
                        const existingTimeout = inventoryInteractionTimeouts.get(inventoryKey);
                        if (existingTimeout) clearTimeout(existingTimeout);
                        const newTimeout = setTimeout(async () => {
                            try {
                                const currentMessage = await interaction.channel.messages.fetch(sentMessage.id).catch(() => null);
                                if (currentMessage && currentMessage.editable) {
                                    await currentMessage.edit({ content: "Inventory session timed out.", embeds: [], components: [] }).catch(e => { if (e.code !== 10008) console.warn("Failed to edit timed out inventory: ", e.message)});
                                }
                            } catch (e) { if (e.code !== 10008) console.warn("Error handling inventory timeout edit: ", e.message); }
                            inventoryInteractionTimeouts.delete(inventoryKey);
                        }, INVENTORY_MESSAGE_TIMEOUT_MS);
                        inventoryInteractionTimeouts.set(inventoryKey, newTimeout);
                    }
                } catch (invError) { console.error(`[Inventory Command] Error:`, invError); await sendInteractionError(interaction, "Could not display inventory.", true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'fish') {
                const sub = interaction.options.getSubcommand();
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                if (sub === 'inventory') {
                    const page = 1;
                    const { embed, totalPages } = buildFishInventoryEmbed(interaction.user.id, interaction.guild.id, page, false);
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('fish_inv_prev').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
                        new ButtonBuilder().setCustomId('fish_inv_next').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(totalPages === 1),
                        new ButtonBuilder().setCustomId('fish_inv_togglefav').setLabel('FAV-LIST').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('fish_inv_fav').setLabel('❤️').setStyle(ButtonStyle.Success)
                    );
                    const sent = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true, ephemeral: false });
                    client.fishInventorySessions.set(sent.id, { userId: interaction.user.id, guildId: interaction.guild.id, page, favorites: false });
                    return;
                } else if (sub === 'wallet') {
                    const bal = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                    const fishEmoji = client.levelSystem.fishDollarEmoji || DEFAULT_FISH_DOLLAR_EMOJI_FALLBACK;
                    const embed = new EmbedBuilder()
                        .setColor('#00ff99')
                        .setTitle('Fish Wallet')
                        .setDescription(`You have **${formatNumber(bal.fishDollars)}** ${fishEmoji}`);
                    return interaction.reply({ embeds: [embed], ephemeral: false });
                } else {
                    if (!client.fishData || !client.fishData.length) {
                        return interaction.reply({ content: 'Fish data unavailable.', ephemeral: true });
                    }
                    const userInv = client.levelSystem.getUserInventory(interaction.user.id, interaction.guild.id);
                    const rodItem = userInv.generalItems.find(i => i.itemId.startsWith('fishing_rod')) || {};
                    const baitItem = userInv.generalItems.find(i => i.itemId === 'worm');
                    let baitCount = baitItem ? baitItem.quantity : 0;
                    if (baitCount > MAX_BAIT) {
                        client.levelSystem.setItemQuantity(interaction.user.id, interaction.guild.id, 'worm', MAX_BAIT);
                        baitCount = MAX_BAIT;
                    }
                    const invCheck = client.userFishInventories.get(key) || [];
                    if (invCheck.length >= FISH_INVENTORY_CAP) {
                        const embed = buildFishingStartEmbed({emoji:'🎣', tier:1, power:1, durability:10}, baitCount, 'Inventory full!');
                        await interaction.reply({ embeds:[embed], content:'Your fish inventory is full.', ephemeral:false });
                        return;
                    }
                    if (!rodItem.itemId || baitCount <= 0) {
                        const missing = [];
                        if (!rodItem.itemId) missing.push('a fishing rod');
                        if (baitCount <= 0) missing.push('bait');
                        const alertMsg = `<:serror:1390640264392998942> Hey ${interaction.user}, you need ${missing.join(' and ')} to fish!`;
                    const rodConfig = rodItem.itemId ? client.levelSystem.gameConfig.items[rodItem.itemId] : null;
                    const rodInfo = rodConfig ? { emoji: rodConfig.emoji || '🎣', power: rodConfig.power || 1, durability: rodItem.quantity || rodConfig.durability || 10, tier: (rodConfig.name && rodConfig.name.match(/(\d+)/)) ? RegExp.$1 : 1 } : null;
                    const embed = buildFishingStartEmbed(rodInfo, baitCount, alertMsg);
                    await interaction.reply({ embeds: [embed], ephemeral: false });
                    return;
                }
                const rodConfig = rodItem.itemId ? client.levelSystem.gameConfig.items[rodItem.itemId] : null;
                const rodInfo = rodConfig ? { emoji: rodConfig.emoji || '🎣', power: rodConfig.power || 1, durability: rodItem.quantity || rodConfig.durability || 10, tier: (rodConfig.name && rodConfig.name.match(/(\d+)/)) ? RegExp.$1 : 1 } : null;
                const embed = buildFishingStartEmbed(rodInfo, baitCount);
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fishing_fish').setLabel('FISH').setStyle(ButtonStyle.Success));
                const sent = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
                fishingSessions.set(key, { messageId: sent.id, stage: 'start', rod: rodInfo, rodItemId: rodItem.itemId, remainingDurability: rodInfo.durability, bait: baitCount, durabilityLoss: 0, shakeTimeout: null });
                return;
                }
            }
            if (commandName === 'slots') {
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const last = slotsCooldowns.get(key);
                if (last && Date.now() - last < SLOTS_COOLDOWN_MS) {
                    const remaining = Math.ceil((SLOTS_COOLDOWN_MS - (Date.now() - last)) / 60000);
                    return sendInteractionError(interaction, `Please wait ${remaining}m before using /slots again.`, true);
                }
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: false }); deferredThisInteraction = true; }
                const embed = buildSlotsEmbed(interaction.user, null);
                const components = [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('slots_roll').setLabel('ROLL').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('slots_bet').setLabel('BET').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('slots_prize').setLabel('PRIZE').setStyle(ButtonStyle.Secondary)
                )];
                const sent = await safeEditReply(interaction, { embeds: [embed], components, fetchReply: true });
                if (sent?.id) {
                    slotsSessions.set(key, { messageId: sent.id, bet: null });
                    slotsCooldowns.set(key, Date.now());
                }
                return;
            }
            if (commandName === 'split-steal') {
                const user1 = interaction.options.getUser('user1');
                const user2 = interaction.options.getUser('user2');
                const channel = interaction.options.getChannel('channel');
                const splitPrize = interaction.options.getString('splitprize');
                const stealPrize = interaction.options.getString('stealprize');

                if (!channel || !channel.isTextBased()) {
                    return sendInteractionError(interaction, 'Invalid channel provided.', true);
                }

                const gameId = `${Date.now()}_${Math.floor(Math.random()*1000)}`;
                splitStealGames.set(gameId, {
                    user1Id: user1.id,
                    user2Id: user2.id,
                    channelId: channel.id,
                    splitPrize,
                    stealPrize,
                    choices: {}
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`splitsteal_${gameId}_split`).setLabel('Split').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`splitsteal_${gameId}_steal`).setLabel('Steal').setStyle(ButtonStyle.Danger)
                );

                const msg1 = `<@${user1.id}> you are playing a game **SPLIT OR STEAL** with <@${user2.id}>\nYou have 2 option! One, chose SPLIT if you want to share the prize with the other. Two, choose steal you will get ${stealPrize} for your own, but there's a risk if your competitor choose STEAL, both you get nothing`;
                const msg2 = `<@${user2.id}> you are playing a game **SPLIT OR STEAL** with <@${user1.id}>\nYou have 2 option! One, chose SPLIT if you want to share the prize with the other. Two, choose steal you will get ${stealPrize} for your own, but there's a risk if your competitor choose STEAL, both you get nothing`;
                try { await user1.send({ content: msg1, components: [row] }); } catch(e){ if(e.code!==50007) console.warn(`[SplitSteal] DM user1 failed: ${e.message}`); }
                try { await user2.send({ content: msg2, components: [row] }); } catch(e){ if(e.code!==50007) console.warn(`[SplitSteal] DM user2 failed: ${e.message}`); }

                await safeEditReply(interaction, { content: 'Split or Steal game started. Check participant DMs.', ephemeral: true });
                return;
            }
            if (commandName === 'use-item') {
                 if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: false }); deferredThisInteraction = true; }
                 try {
                     const selectedItemId = interaction.options.getString('item');
                     const amount = interaction.options.getInteger('amount') || 1;
                     const itemConfig = client.levelSystem._getItemMasterProperty(selectedItemId, null, {});
                     if (!itemConfig || !itemConfig.id) return safeEditReply(interaction, { content: `❌ Item config for ID "${selectedItemId}" not found.`, ephemeral: true });
                     const userInventoryCategorized = client.levelSystem.getUserInventory(interaction.user.id, interaction.guild.id);
                     const itemToUse = [...userInventoryCategorized.generalItems, ...userInventoryCategorized.lootBoxes, ...userInventoryCategorized.cosmicTokens, ...userInventoryCategorized.charms].find(item => item.itemId === selectedItemId);
                     if (!itemToUse) return safeEditReply(interaction, { content: `❌ Item "${itemConfig.name || selectedItemId}" not in inventory.`, ephemeral: true });
                     if (itemToUse.quantity < amount) return safeEditReply(interaction, { content: `❌ Not enough ${itemConfig.name || selectedItemId}. You have ${itemToUse.quantity}.`, ephemeral: true });
                     const itemType = itemConfig.type;
                     const maxUnboxConfig = client.levelSystem.gameConfig.globalSettings.MAX_UNBOX_AMOUNTS || MAX_UNBOX_AMOUNTS;

                     if (itemType === client.levelSystem.itemTypes.LOOT_BOX || itemType === SHOP_ITEM_TYPES.LOOTBOX) {
                         const maxUnbox = maxUnboxConfig[selectedItemId];
                         if (maxUnbox !== undefined && amount > maxUnbox) return safeEditReply(interaction, { content: `❌ Max ${maxUnbox} ${itemConfig.name || selectedItemId} at a time.`, ephemeral: true });
                         const waitingEmbed = new EmbedBuilder().setTitle(`Opening ${itemConfig.name || 'Chest'}...`).setColor(itemConfig.color || 0xAAAAAA).setThumbnail('https://i.ibb.co/d431dF0G/output-onlinegiftools-2.gif').setDescription("Rolling items...").setTimestamp();
                         await safeEditReply(interaction, { embeds: [waitingEmbed], ephemeral: false }); // Don't delete this one immediately
                     }
                     const result = await client.levelSystem.useItem(interaction.user.id, interaction.guild.id, selectedItemId, amount, WEEKEND_MULTIPLIERS, member, checkAndAwardSpecialRole); // Pass member and function
                      if (result.success) {
                         if (itemType === client.levelSystem.itemTypes.LOOT_BOX || itemType === SHOP_ITEM_TYPES.LOOTBOX) {
                             setTimeout(async () => { // Delay to show animation
                                const resultEmbed = new EmbedBuilder()
                                    .setTitle(`🎁 Opened ${amount}x ${itemConfig.emoji || '📦'} ${itemConfig.name}! 🎁`)
                                    .setColor(itemConfig.color || 0xAAAAAA)
                                    .setDescription(result.itemsRolled.map(r => `${r.emoji || '❓'} **${r.name}** (x${r.quantity}) \`(${client.levelSystem._getItemRarityString(r.id, r, r.type)}, Chance: ${formatPercent(r.rolledChance || 0)})\``).join('\n') || 'No items received (this should not happen).')
                                    .setTimestamp();
                                if(result.grantedSpecialRole) resultEmbed.addFields({name: "✨ SPECIAL ROLE AWARDED! ✨", value: "You obtained a Cosmic Role Token and the special role was granted!"});
                                if(result.charmsObtainedDetails && result.charmsObtainedDetails.length > 0) { // Display charms activated
                                    resultEmbed.addFields({name: "🔮 Charms Activated!", value: result.charmsObtainedDetails.map(cd => `${cd.emoji} ${cd.name} (x${cd.quantity || 1})`).join('\n')});
                                }
                                await safeEditReply(interaction, { embeds: [resultEmbed], ephemeral: false }, true, USE_ITEM_REPLY_TIMEOUT_MS); // Delete after timeout
                             }, itemType === client.levelSystem.itemTypes.LOOT_BOX ? UNBOXING_ANIMATION_DURATION_MS : 100); // Animation duration or short delay
                         } else { // For non-lootbox items
                             await safeEditReply(interaction, { content: `✅ ${result.message}`, ephemeral: false }, true, USE_ITEM_REPLY_TIMEOUT_MS);
                         } 
                         // Send public announcement for rare items instead of DM
                         if (result.itemsToNotify && result.itemsToNotify.length > 0) {
                            const announceChannel = await client.channels.fetch(RARE_ITEM_ANNOUNCE_CHANNEL_ID).catch(() => null);
                            if (announceChannel && announceChannel.isTextBased()) {
                                const notifyEmbed = new EmbedBuilder()
                                    .setTitle("📢 Rare Item Obtained!")
                                    .setColor(0xFFD700)
                                    .setDescription(`${interaction.user} received some noteworthy items!`)
                                    .setTimestamp();

                                result.itemsToNotify.forEach(notifyItem => {
                                    const rarityDetails = client.levelSystem.itemRarities[client.levelSystem._getItemRarityString(notifyItem.id, notifyItem, notifyItem.type).toUpperCase()] || client.levelSystem.itemRarities.COMMON;
                                    notifyEmbed.setColor(rarityDetails.color); // Set color based on the (first) rare item's rarity
                                    notifyEmbed.addFields({
                                        name: `${notifyItem.emoji || '❓'} ${notifyItem.name} (x${notifyItem.quantity})`,
                                        value: `From: **${notifyItem.fromBox || 'Unknown Box'}**\nRolled Chance: \`${formatPercent(notifyItem.chance || 0)}\` (Threshold: ${notifyItem.threshold})`,
                                        inline: false
                                    });
                                });
                                await announceChannel.send({ embeds: [notifyEmbed] }).catch(e => console.warn("Failed to send rare item announcement to channel: ", e.message));
                            } else { console.warn(`[RareItemAnnounce] Channel with ID ${RARE_ITEM_ANNOUNCE_CHANNEL_ID} not found or is not a text channel.`); }
                         }
                         // Send public alert for charms activated
                         if (result.charmsObtainedDetails && result.charmsObtainedDetails.length > 0 && CHARM_ALERT_CHANNEL_ID) {
                            const charmAlertChannel = await client.channels.fetch(CHARM_ALERT_CHANNEL_ID).catch(() => null);
                            if (charmAlertChannel && charmAlertChannel.isTextBased()) {
                                const charmAlertEmbed = new EmbedBuilder().setTitle("🔮 Charm Activation Alert!").setColor(0xDA70D6).setDescription(`${interaction.user} activated charms:`);
                                result.charmsObtainedDetails.forEach(cd => {
                                    charmAlertEmbed.addFields({ name: `${cd.emoji} ${cd.name} (x${cd.quantity || 1})`, value: `Source: ${cd.source || 'Chest'}`});
                                });
                                await charmAlertChannel.send({ embeds: [charmAlertEmbed]}).catch(e => console.warn("Failed to send charm alert: ", e.message));
                            }
                         }
                     } else await safeEditReply(interaction, { content: `❌ ${result.message || "Failed to use item."}`, ephemeral: true, components: [] }); // Clear components on failure
                 } catch (useItemError) { console.error(`[UseItem Error]`, useItemError); await sendInteractionError(interaction, "Error using item.", true, deferredThisInteraction); }
                 return;
            }
            if (commandName === 'usersettings') {
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const subcommand = interaction.options.getSubcommand();
                const userId = interaction.user.id; const guildId = interaction.guild.id;
                try {
                    if (subcommand === 'view') {
                        const userDmSettings = client.levelSystem.getUserDmSettings(userId, guildId);
                        const userGlobalAlertSettings = client.levelSystem.getUserGlobalLootAlertSettings(userId, guildId);
                        const guildDefaultShopDm = client.levelSystem.getGuildSettings(guildId).shopRestockDmEnabled; // Default from guild
                        let shopDmStatus = SETTINGS_EMOJI_DISABLED + " Disabled"; // Default pessimistic
                        if (userDmSettings.enableShopRestockDm === true) shopDmStatus = SETTINGS_EMOJI_ENABLED + " Enabled";
                        else if (userDmSettings.enableShopRestockDm === null && guildDefaultShopDm) shopDmStatus = SETTINGS_EMOJI_ENABLED + " Enabled (Guild Default)";
                        else if (userDmSettings.enableShopRestockDm === null && !guildDefaultShopDm) shopDmStatus = SETTINGS_EMOJI_DISABLED + " Disabled (Guild Default)";
                        // else if (userDmSettings.enableShopRestockDm === false) it's already "Disabled"

                        const settingsEmbed = new EmbedBuilder()
                            .setTitle(`${interaction.user.username}'s Settings`)
                            .setColor(0x3498DB)
                            .addFields(
                                { name: '🛍️ Shop Restock DMs', value: shopDmStatus, inline: false },
                                { name: '📢 Global Loot Alert Rarity Threshold', value: `Announce items with rarity value ≥ \`${userGlobalAlertSettings.alertRarityThreshold}\` (0 to disable, ${client.levelSystem.COSMIC_ROLE_TOKEN_ID} always alerts if enabled)`, inline: false}
                                // Add more settings fields here later
                            )
                            .setFooter({text: "Use subcommands to change settings."});
                        await safeEditReply(interaction, { embeds: [settingsEmbed], ephemeral: true });
                    }
                    
                } catch (userSettingsError) { console.error('[UserSettings Error]', userSettingsError); await sendInteractionError(interaction, 'Error managing settings.', true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'set-setting') {
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    const { embed, components } = buildSettingsEmbed(interaction.user.id, interaction.guild.id, client.levelSystem);
                    await safeEditReply(interaction, { embeds: [embed], components, ephemeral: true });
                } catch (settingsError) { console.error('[SetSetting Error]', settingsError); await sendInteractionError(interaction, 'Failed to display settings.', true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'item-info') {
                const itemNameInput = interaction.options.getString('item_name', false); // Optional
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: false }); deferredThisInteraction = true; } // This reply will be public
                try {
                    if (itemNameInput) { // Direct search
                        const itemEmbed = await client.levelSystem.buildItemInfoEmbed(itemNameInput, null, interaction.user.id, interaction.guild.id, client);
                        await safeEditReply(interaction, { embeds: [itemEmbed], ephemeral: false }, true); // Public reply for direct search, auto-deletes
                    }
                    else { // Browse functionality
                        const categoryButtons = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId('item_info_category_select_lootboxes').setLabel('Chests').setStyle(ButtonStyle.Primary).setEmoji('📦'),
                                new ButtonBuilder().setCustomId('item_info_category_select_charms').setLabel('Charms').setStyle(ButtonStyle.Primary).setEmoji('✨'),
                                new ButtonBuilder().setCustomId('item_info_category_select_others').setLabel('Other Items').setStyle(ButtonStyle.Primary).setEmoji('🔖'),
                                new ButtonBuilder().setCustomId('item_info_cancel_browse').setLabel('Cancel').setStyle(ButtonStyle.Danger) // Added cancel
                            );
                        await safeEditReply(interaction, { content: 'Select an item category to browse:', components: [categoryButtons], ephemeral: false }, true); // Browse is public, auto-deletes
                    }
                } catch (itemInfoError) { console.error('[ItemInfo Command] Error:', itemInfoError); await sendInteractionError(interaction, "Error displaying item info.", false, deferredThisInteraction); }
                return;
            }
            if (commandName === 'ping') {
                 if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, ); deferredThisInteraction = true; }
                 await safeEditReply(interaction, { content: `Pong! Latency: ${client.ws.ping}ms`}, true);
                 return;
            }
            if (commandName === 'afk') {
                 if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                 const reason = interaction.options.getString('reason');
                 client.afkUsers.set(interaction.user.id, {
                     timestamp: Date.now(),
                     reason,
                     lastPing: 0,
                     oldNickname: interaction.member?.nickname || null
                 });
                 if (interaction.member && interaction.member.manageable) {
                     const current = interaction.member.nickname || interaction.member.user.username;
                     if (!current.startsWith('[AFK] ')) {
                         await interaction.member.setNickname(`[AFK] ${current}`).catch(()=>{});
                     }
                 }
                 await safeEditReply(interaction, { content: `You are now AFK${reason ? `: ${reason}` : ''}.`, ephemeral: true }, true);
                 return;
            }
            if (commandName === 'check-weather') {
                 if (!interaction.replied && !interaction.deferred) {
                     await safeDeferReply(interaction, { ephemeral: false });
                     deferredThisInteraction = true;
                 }
                 const cmd = client.commands.get('check-weather');
                 if (cmd && typeof cmd.execute === 'function') {
                     await cmd.execute(interaction, client);
                 } else {
                     const embed = buildWeatherEmbed();
                     await safeEditReply(interaction, { embeds: [embed] }, true);
                 }
                 return;
            }
            if (commandName === 'level') {
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: false }); deferredThisInteraction = true; }
                try {
                    const targetUser = interaction.options.getUser('user') || interaction.user;
                    const targetMemberForLevel = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(()=>null);
                    if (!targetMemberForLevel) return sendInteractionError(interaction, "Member not found.", true, deferredThisInteraction); // Use deferred flag
                    const levelInfo = client.levelSystem.getLevelInfo(targetUser.id, interaction.guild.id);
                    const highestRoleNameAndId = client.levelSystem.getHighestCurrentLevelRoleNameAndId(targetMemberForLevel, levelInfo.level);
                    let embedColor = LEVEL_ROLE_COLORS.default;
                    if (highestRoleNameAndId?.id && LEVEL_ROLE_COLORS[highestRoleNameAndId.id]) {
                        embedColor = LEVEL_ROLE_COLORS[highestRoleNameAndId.id];
                    }
                    const xpProgress = levelInfo.xp; const xpToNext = levelInfo.xpNeeded;
                    const maxLevelConfigured = client.levelSystem.gameConfig.globalSettings.MAX_LEVEL || MAX_LEVEL;
                    const progressPercentage = xpToNext > 0 ? Math.min(100, Math.max(0, (xpProgress / xpToNext) * 100)) : (levelInfo.level >= maxLevelConfigured ? 100 : 0);
                    const progressBar = '🟩'.repeat(Math.floor(progressPercentage / 10)) + '⬛'.repeat(10 - Math.floor(progressPercentage / 10));
                    const xpToNextDisplay = levelInfo.level >= maxLevelConfigured ? 'Max Level Reached' : `${(xpToNext - xpProgress).toLocaleString()} XP`;
                    const levelEmbed = new EmbedBuilder()
                        .setColor(embedColor).setAuthor({ name: `${targetUser.username}'s Level Progress`, iconURL: targetUser.displayAvatarURL({ dynamic: true })})
                        .setThumbnail(getImageUrlForLevel(levelInfo.level))
                        .addFields(
                            { name: '🏆 Level', value: `\`${levelInfo.level}\``, inline: true },
                            { name: '✨ XP', value: `\`${levelInfo.xp.toLocaleString()} / ${xpToNext > 0 ? xpToNext.toLocaleString() : '-'}\``, inline: true },
                            { name: '📈 Rank', value: `\`#${levelInfo.rank}\``, inline: true },
                            { name: '📊 Progress', value: `${progressBar} \`${progressPercentage.toFixed(1)}%\``, inline: false},
                            { name: '🎯 XP to Next Level', value: `\`${xpToNextDisplay}\``, inline: false },
                            { name: '🎖️ Highest Role', value: `${highestRoleNameAndId.name} (<@&${highestRoleNameAndId.id}>)`, inline: false}
                        ).setTimestamp().setFooter({ text: `Viewing stats in: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL({ dynamic: true }) });
                await safeEditReply(interaction, { embeds: [levelEmbed], ephemeral: false }, true);
            } catch (levelError) { console.error(`[Level Command] Error:`, levelError); await sendInteractionError(interaction, "Could not fetch level info.", true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'see-user') {
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: false }); deferredThisInteraction = true; }
                try {
                    const targetUser = interaction.options.getUser('user');
                    const infoType = interaction.options.getString('info');
                    if (!targetUser) return sendInteractionError(interaction, 'Target user not specified.', true, deferredThisInteraction);
                    const targetMember = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(()=>null);
                    if (!targetMember) return sendInteractionError(interaction, 'Member not found.', true, deferredThisInteraction);

                    if (infoType === 'inventory') {
                        const { embed } = await buildInventoryEmbed(targetUser, interaction.guild.id, client.levelSystem, 'items');
                        const customId = `see_user_inventory_nav_select_${targetUser.id}`;
                        const components = getInventoryNavComponents('items', customId);
                        const sentMessage = await safeEditReply(interaction, { embeds: [embed], components, fetchReply: true, ephemeral: false }, true);
                        if (sentMessage?.id) {
                            const inventoryKey = `${interaction.user.id}_${targetUser.id}_${interaction.guild.id}_seeinv`;
                            const existingTimeout = inventoryInteractionTimeouts.get(inventoryKey);
                            if (existingTimeout) clearTimeout(existingTimeout);
                            const newTimeout = setTimeout(async () => {
                                try {
                                    const currentMessage = await interaction.channel.messages.fetch(sentMessage.id).catch(() => null);
                                    if (currentMessage && currentMessage.editable) {
                                        await currentMessage.edit({ content: "Inventory session timed out.", embeds: [], components: [] }).catch(e => { if (e.code !== 10008) console.warn("Failed to edit timed out see-user inventory:", e.message); });
                                    }
                                } catch (e) { if (e.code !== 10008) console.warn("Error handling see-user inventory timeout edit:", e.message); }
                                inventoryInteractionTimeouts.delete(inventoryKey);
                            }, INVENTORY_MESSAGE_TIMEOUT_MS);
                            inventoryInteractionTimeouts.set(inventoryKey, newTimeout);
                        }
                    } else if (infoType === 'bank') {
                        const bankEmbed = await buildBankEmbed(targetUser, interaction.guild.id, client.levelSystem);
                        await safeEditReply(interaction, { embeds: [bankEmbed], ephemeral: false }, true);
                    } else if (infoType === 'level') {
                        const levelInfo = client.levelSystem.getLevelInfo(targetUser.id, interaction.guild.id);
                        const highestRoleNameAndId = client.levelSystem.getHighestCurrentLevelRoleNameAndId(targetMember, levelInfo.level);
                        let embedColor = LEVEL_ROLE_COLORS.default;
                        if (highestRoleNameAndId?.id && LEVEL_ROLE_COLORS[highestRoleNameAndId.id]) embedColor = LEVEL_ROLE_COLORS[highestRoleNameAndId.id];
                        const xpProgress = levelInfo.xp; const xpToNext = levelInfo.xpNeeded;
                        const maxLevelConfigured = client.levelSystem.gameConfig.globalSettings.MAX_LEVEL || MAX_LEVEL;
                        const progressPercentage = xpToNext > 0 ? Math.min(100, Math.max(0, (xpProgress / xpToNext) * 100)) : (levelInfo.level >= maxLevelConfigured ? 100 : 0);
                        const progressBar = '🟩'.repeat(Math.floor(progressPercentage / 10)) + '⬛'.repeat(10 - Math.floor(progressPercentage / 10));
                        const xpToNextDisplay = levelInfo.level >= maxLevelConfigured ? 'Max Level Reached' : `${(xpToNext - xpProgress).toLocaleString()} XP`;
                        const levelEmbed = new EmbedBuilder()
                            .setColor(embedColor).setAuthor({ name: `${targetUser.username}'s Level Progress`, iconURL: targetUser.displayAvatarURL({ dynamic: true })})
                            .setThumbnail(getImageUrlForLevel(levelInfo.level))
                            .addFields(
                                { name: '🏆 Level', value: `\`${levelInfo.level}\``, inline: true },
                                { name: '✨ XP', value: `\`${levelInfo.xp.toLocaleString()} / ${xpToNext > 0 ? xpToNext.toLocaleString() : '-'}\``, inline: true },
                                { name: '📈 Rank', value: `\`#${levelInfo.rank}\``, inline: true },
                                { name: '📊 Progress', value: `${progressBar} \`${progressPercentage.toFixed(1)}%\``, inline: false },
                                { name: '🎯 XP to Next Level', value: `\`${xpToNextDisplay}\``, inline: false },
                                { name: '🎖️ Highest Role', value: `${highestRoleNameAndId.name} (<@&${highestRoleNameAndId.id}>)`, inline: false }
                            )
                            .setTimestamp()
                            .setFooter({ text: `Viewing stats in: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL({ dynamic: true }) });
                        await safeEditReply(interaction, { embeds: [levelEmbed], ephemeral: false }, true);
                    } else {
                        await sendInteractionError(interaction, 'Invalid info type.', true, deferredThisInteraction);
                    }
                } catch (seeUserError) { console.error('[SeeUser Command] Error:', seeUserError); await sendInteractionError(interaction, 'Could not fetch user info.', true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'export-guild-data') {
                if (!isAdmin()) return sendInteractionError(interaction, "Admin only.", true, false);
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    const guildData = client.levelSystem.exportAllGuildUserData(interaction.guild.id);
                    if (guildData.success && guildData.data) {
                        const filePath = path.join(__dirname, `guild_data_${interaction.guild.id}_${Date.now()}.json`);
                        await fs.writeFile(filePath, JSON.stringify(guildData.data, null, 2));
                        await safeEditReply(interaction, { content: `Guild data exported for ${interaction.guild.name}.`, files: [filePath], ephemeral: true });
                        await fs.unlink(filePath).catch(e => console.warn("Failed to delete temporary export file:", e.message));
                    } else await sendInteractionError(interaction, guildData.message || "Failed to export.", true, deferredThisInteraction);
                } catch (exportError) { console.error('[ExportData Error]', exportError); await sendInteractionError(interaction, "Export failed due to internal error.", true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'backup-database') {
                 if (!isAdmin()) return sendInteractionError(interaction, "Admin only.", true, false);
                 if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                 const backupDir = path.resolve(__dirname, 'backups');
                 const backupFilePath = path.join(backupDir, `database_backup_${Date.now()}.db`);
                 try {
                     await fs.mkdir(backupDir, { recursive: true });
                     client.levelSystem.db.backup(backupFilePath)
                         .then(() => safeEditReply(interaction, { content: `Database backed up successfully to internal storage. Path hint: \`${path.basename(backupFilePath)}\``, ephemeral: true}))
                         .catch(err => { console.error('DB Backup Error:', err); sendInteractionError(interaction, `Database backup failed: ${err.message}`, true, deferredThisInteraction); });
                 } catch (backupSetupError) { console.error('DB Backup Setup Error:', backupSetupError); sendInteractionError(interaction, `Database backup setup failed: ${backupSetupError.message}`, true, deferredThisInteraction); }
                 return;
            }
            if (commandName === 'botinfo') {
                 if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, {ephemeral: false}); deferredThisInteraction = true; }
                const uptime = process.uptime(); const days = Math.floor(uptime / 86400); const hours = Math.floor((uptime % 86400) / 3600);
                const minutes = Math.floor((uptime % 3600) / 60); const seconds = Math.floor(uptime % 60);
                const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                const botVersion = packageJson.version || 'N/A';
                const infoEmbed = new EmbedBuilder()
                    .setColor(0x7289DA).setTitle(`${client.user.username} - Bot Information`)
                    .setThumbnail(client.user.displayAvatarURL())
                    .addFields(
                        { name: '🤖 Version', value: `v${botVersion}`, inline: true },
                        { name: 'Uptime', value: uptimeString, inline: true },
                        { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true },
                        { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                        { name: 'Node.js', value: process.version, inline: true },
                        { name: 'Discord.js', value: `v${require('discord.js').version}`, inline: true },
                        { name: 'Developer', value: '<@902736357766594611>', inline: false }
                    ).setTimestamp().setFooter({ text: `Requested by ${interaction.user.tag}` });
                await safeEditReply(interaction, { embeds: [infoEmbed] }, true);
                return;
            }
             if (commandName === 'createembed') {
                if (!isStaff()) return sendInteractionError(interaction, "Staff only.", true, false);
                const targetChannel = interaction.options.getChannel('channel');
                const roleToMention = interaction.options.getRole('mention_role');
                if (!targetChannel || !targetChannel.isTextBased()) return sendInteractionError(interaction, "Invalid text channel.", true, false);
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }

                const sessionId = `${interaction.user.id}_${Date.now()}`;
                const sessionData = {
                    sessionId, userId: interaction.user.id, guildId: interaction.guild.id,
                    targetChannelId: targetChannel.id, panelChannelId: interaction.channel.id, roleToMentionId: roleToMention?.id || null,
                    embedData: { title: null, description: null, color: null, fields: [], footerText: null, thumbnailUrl: null, imageUrl: null, timestamp: false },
                    createdAt: Math.floor(Date.now() / 1000)
                };
                client.levelSystem.saveEmbedSession(sessionId, sessionData); // Save to DB
                embedBuildingSessions.set(sessionId, sessionData); // Also keep in memory for active use

                const previewEmbed = buildSessionPreviewEmbed(sessionData);
                const components = getSessionBuilderComponents(sessionId);
                const panelMessage = await interaction.channel.send({ content: `Embed Builder Panel for <#${targetChannel.id}> (Role to mention: ${roleToMention ? `<@&${roleToMention.id}>` : 'None'})`, embeds: [previewEmbed], components, fetchReply: true })
                    .catch(async e => { console.error("Failed to send embed builder panel:", e); await sendInteractionError(interaction, "Failed to start embed builder panel.", true, deferredThisInteraction); return null; });

                if (panelMessage) {
                     sessionData.builderMessageId = panelMessage.id; // Store panel message ID
                     client.levelSystem.saveEmbedSession(sessionId, sessionData); // Update DB with message ID
                     await safeEditReply(interaction, { content: `Embed builder panel started in this channel for <#${targetChannel.id}>.`, ephemeral: true });
                     // Set timeout to clean up session
                     const timeout = setTimeout(() => {
                        if (embedBuildingSessions.has(sessionId)) {
                            client.levelSystem.deleteEmbedSession(sessionId); // Remove from DB
                            embedBuildingSessions.delete(sessionId); // Remove from memory
                            if (panelMessage.deletable) panelMessage.delete().catch(e => {if(e.code !== 10008)console.warn("Failed to delete timed out embed panel (from eb_ timeout):", e.message)});
                            console.log(`Embed builder session ${sessionId} timed out and was cleaned up.`);
                        }
                    }, EMBED_BUILDER_TIMEOUT_MS);
                sessionData.timeoutInstance = timeout; // Store timeout to clear if cancelled early
                }
                return;
            }
            if (commandName === 'submit-ticket') {
                const now = Date.now();
                const year = new Date().getUTCFullYear();
                const startTime = new Date(Date.UTC(year, 6, 31, 17, 0, 0)).getTime();
                const endTime = new Date(Date.UTC(year, 7, 7, 17, 0, 0)).getTime();
                if (now < startTime) {
                    return sendInteractionError(interaction, 'This command is not active yet.', true);
                }
                if (now >= endTime) {
                    return sendInteractionError(interaction, 'This command is no longer active.', true);
                }

                const modal = new ModalBuilder()
                    .setCustomId('submit_ticket_modal')
                    .setTitle('Build Submission Form');

                const ignInput = new TextInputBuilder()
                    .setCustomId('ign_input')
                    .setLabel('🏷️ IGN (discord username)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('vietnamph')
                    .setRequired(true);

                const titleInput = new TextInputBuilder()
                    .setCustomId('build_title_input')
                    .setLabel('✨ Build title')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('<Your build\u2019s name>')
                    .setRequired(true);

                const themeInput = new TextInputBuilder()
                    .setCustomId('theme_fit_input')
                    .setLabel('🎯 Theme fit (1-2 sentences)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Floating islands with a zen temple and cherry-blossom garden.')
                    .setRequired(true);

                const gameInput = new TextInputBuilder()
                    .setCustomId('game_version_input')
                    .setLabel('🗺️ Game & Version')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Minecraft Java 1.20.6 (no mods, OptiFine only)')
                    .setRequired(true);

                const deviceInput = new TextInputBuilder()
                    .setCustomId('device_used_input')
                    .setLabel('💻 Device used')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('PC / Mobile / Console + basic specs')
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId('short_desc_input')
                    .setLabel('📝 Short description (≤1000 words)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('What makes your build special, key details, inspiration')
                    .setRequired(true);

                const verifyInput = new TextInputBuilder()
                    .setCustomId('verification_input')
                    .setLabel('Verification')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(SUBMIT_TICKET_VERIFICATION_TEXT)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(ignInput),
                    new ActionRowBuilder().addComponents(titleInput),
                    new ActionRowBuilder().addComponents(themeInput),
                    new ActionRowBuilder().addComponents(gameInput),
                    new ActionRowBuilder().addComponents(deviceInput),
                    new ActionRowBuilder().addComponents(descInput),
                    new ActionRowBuilder().addComponents(verifyInput)
                );

                await interaction.showModal(modal).catch(async e => {
                    console.error('Failed to show submit_ticket_modal:', e);
                    if (!interaction.replied && !interaction.deferred) {
                        await sendInteractionError(interaction, 'Failed to open submission form.', true);
                    } else {
                        await sendInteractionError(interaction, 'Failed to open submission form.', true, true);
                    }
                });
                return;
            }
            if (commandName === 'leaderboard') {
                const guildId = interaction.guild.id;
                const subcommandGroup = interaction.options.getSubcommandGroup(false);
                const subcommand = interaction.options.getSubcommand(false);
                let deferredByThisLogic = false;

                if (subcommandGroup === 'config') {
                    if (!isAdmin()) {
                        return sendInteractionError(interaction, "You do not have permission to configure the leaderboard.", true);
                    }
                    if (subcommand === 'channel') {
                        const newChannel = interaction.options.getChannel('set');
                        if (!interaction.replied && !interaction.deferred) {
                            await safeDeferReply(interaction, { ephemeral: true });
                            deferredByThisLogic = true;
                        }

                        if (!newChannel || newChannel.type !== ChannelType.GuildText) {
                            return sendInteractionError(interaction, 'Invalid text channel specified for leaderboard.', true, deferredByThisLogic);
                        }
                        client.levelSystem.setGuildSettings(guildId, { leaderboardChannelId: newChannel.id, leaderboardMessageId: null });
                        await safeEditReply(interaction, { content: `✅ Leaderboard channel set to ${newChannel}. A new leaderboard will be posted there on the next update.` });
                    } else {
                        await sendInteractionError(interaction, "Invalid leaderboard configuration option.", true, deferredByThisLogic || interaction.deferred);
                    }
                } else if (subcommand === 'view') {
                    if (!interaction.replied && !interaction.deferred) {
                        await safeDeferReply(interaction, { ephemeral: false });
                        deferredByThisLogic = true;
                    }
                    const leaderboardData = client.levelSystem.getLeaderboard(guildId, LEADERBOARD_LIMIT);
                    const coinData = client.levelSystem.getCoinLeaderboard(guildId, 5);
                    const gemData = client.levelSystem.getGemLeaderboard(guildId, 5);
                    const valueData = client.levelSystem.getValueLeaderboard(guildId, 5);

                    const embed = await formatLeaderboardEmbed(
                        leaderboardData,
                        client,
                        guildId,
                        client.levelSystem,
                        60 * 60 * 1000
                    );
                    const coinEmbed = await formatCoinLeaderboardEmbed(coinData, client, 60 * 60 * 1000);
                    const gemEmbed = await formatGemLeaderboardEmbed(gemData, client, 60 * 60 * 1000);
                    const valueEmbed = await formatValueLeaderboardEmbed(valueData, client, 60 * 60 * 1000);

                    await safeEditReply(interaction, { embeds: [embed, coinEmbed, gemEmbed, valueEmbed], ephemeral: false }, true);
                } else if (subcommand === 'postnow') {
                    if (!isAdmin()) {
                        return sendInteractionError(interaction, "You do not have permission to force a leaderboard update.", true);
                    }
                    if (!interaction.replied && !interaction.deferred) {
                        await safeDeferReply(interaction, { ephemeral: true });
                        deferredByThisLogic = true;
                    }
                    const result = await postOrUpdateLeaderboard(client, guildId, client.levelSystem, LEADERBOARD_LIMIT, true);
                    if (result.success) {
                        await safeEditReply(interaction, { content: `✅ Leaderboard ${result.updated ? 'updated' : 'posted'} in <#${result.channelId}>.`, ephemeral: true });
                    } else {
                        await sendInteractionError(interaction, `Failed to post/update leaderboard: ${result.message}`, true, deferredByThisLogic || interaction.deferred);
                    }
                } else {
                     if (!interaction.replied && !interaction.deferred) {
                        await safeDeferReply(interaction, { ephemeral: true });
                        deferredByThisLogic = true;
                    }
                    await sendInteractionError(interaction, "Unknown or incomplete leaderboard command.", true, deferredByThisLogic || interaction.deferred);
                }
                return;
            }
            if (commandName === 'database') {
                if (!isAdmin()) return sendInteractionError(interaction, "Admin only.", true, false);
                 if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const tableName = interaction.options.getString('table');
                try {
                    const data = client.levelSystem.getAllTableData(tableName);
                    if (data.success) {
                        const filePath = path.join(__dirname, `${tableName}_data_${Date.now()}.json`);
                        await fs.writeFile(filePath, JSON.stringify(data.data, null, 2));
                        await safeEditReply(interaction, { content: `Data for table \`${tableName}\` exported.`, files: [filePath], ephemeral: true });
                        await fs.unlink(filePath).catch(e => console.warn("Failed to delete temporary db export file:", e.message));
                    } else await sendInteractionError(interaction, `Failed to get data: ${data.message}`, true, deferredThisInteraction);
                } catch (dbViewError) { console.error('[DBView Error]', dbViewError); await sendInteractionError(interaction, "Error viewing database.", true, deferredThisInteraction); }
                return;
            }
            if (commandName === 'start-giveaway') {
                const command = client.commands.get(commandName);
                if (command) await command.execute(interaction);
                else { console.error(`[Giveaway Command] start-giveaway not found.`); await sendInteractionError(interaction, "Giveaway command not loaded.", true); }
                return;
            }
            if (commandName === 'start-vote') {
                const channel = interaction.options.getChannel('channel');
                const timeStr = interaction.options.getString('time');
                const pingRole = interaction.options.getRole('ping');

                if (!channel || !channel.isTextBased()) {
                    return sendInteractionError(interaction, 'Invalid channel provided.', true);
                }

                const durationMs = parseDuration(timeStr);
                if (!durationMs || durationMs < 5000) {
                    return sendInteractionError(interaction, 'Invalid time format. Use number followed by s,m,h,d.', true);
                }

                client.voteSetups.set(interaction.user.id, {
                    channelId: channel.id,
                    duration: durationMs,
                    pingRoleId: pingRole ? pingRole.id : null
                });

                const modal = new ModalBuilder()
                    .setCustomId('start_vote_modal')
                    .setTitle('Create a Vote');

                const infoInput = new TextInputBuilder()
                    .setCustomId('vote_info_input')
                    .setLabel('Vote Information')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                const choicesInput = new TextInputBuilder()
                    .setCustomId('vote_choices_input')
                    .setLabel('Vote choice')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Use Choice1#-10# separated by commas. Example: Choice1# yes, Choice2# no')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(infoInput),
                    new ActionRowBuilder().addComponents(choicesInput)
                );

                await interaction.showModal(modal).catch(async e => {
                    console.error('Show modal error', e);
                    await sendInteractionError(interaction, 'Failed to open form.', true);
                });
                return;
            }
            if (commandName === 'delete-all-commands') {
                if (process.env.OWNER_ID && interaction.user.id !== process.env.OWNER_ID) {
                    return sendInteractionError(interaction, 'Owner only.', true, false);
                }
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const scope = interaction.options.getString('scope');
                const confirmation = interaction.options.getString('confirmation');
                if (confirmation !== "CONFIRM DELETE ALL") {
                    return sendInteractionError(interaction, 'Confirmation phrase incorrect. Deletion cancelled.', true, deferredThisInteraction);
                }
                try {
                    if (scope === 'global') {
                        await client.application.commands.set([]);
                        console.log('[DELETE CMDS] All global application commands deleted.');
                        await safeEditReply(interaction, { content: 'All GLOBAL application (/) commands have been requested for deletion. It might take up to an hour to reflect.', ephemeral: true });
                    } else if (scope === 'guild' && interaction.guild) {
                        await interaction.guild.commands.set([]);
                        console.log(`[DELETE CMDS] All commands for guild ${interaction.guild.name} deleted.`);
                        await safeEditReply(interaction, { content: `All GUILD application (/) commands for ${interaction.guild.name} have been requested for deletion.`, ephemeral: true });
                    } else {
                        await sendInteractionError(interaction, 'Invalid scope or guild context missing for guild-specific deletion.', true, deferredThisInteraction);
                    }
                } catch (delCmdError) {
                    console.error('[DELETE CMDS] Error deleting commands:', delCmdError);
                    await sendInteractionError(interaction, 'Failed to delete commands.', true, deferredThisInteraction);
                }
                return;
            }

            if (commandName === 'deploy-commands') {
                if (process.env.OWNER_ID && interaction.user.id !== process.env.OWNER_ID) {
                    return sendInteractionError(interaction, 'Owner only.', true, false);
                }
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const scope = interaction.options.getString('scope');
                try {
                    if (scope === 'global') {
                        await getDeployCommands()(process.env.DISCORD_TOKEN, process.env.CLIENT_ID, null);
                        await safeEditReply(interaction, { content: 'Global slash commands redeployed (can take up to an hour).', ephemeral: true });
                    } else if (scope === 'guild' && interaction.guild) {
                        await getDeployCommands()(process.env.DISCORD_TOKEN, process.env.CLIENT_ID, interaction.guild.id);
                        await safeEditReply(interaction, { content: `Guild slash commands redeployed for ${interaction.guild.name}.`, ephemeral: true });
                    } else {
                        await getDeployCommands()();
                        await safeEditReply(interaction, { content: 'Slash commands redeployed using default scope.', ephemeral: true });
                    }
                } catch (deployErr) {
                    console.error('[DEPLOY CMDS] Error redeploying commands:', deployErr);
                    await sendInteractionError(interaction, 'Failed to deploy commands.', true, deferredThisInteraction);
                }
                return;
            }
            const unhandledCommand = client.commands.get(commandName);
            if(unhandledCommand) {
                 if (commandName !== 'check-badge' && !interaction.replied && !interaction.deferred) {
                     await safeDeferReply(interaction, {ephemeral: true});
                     deferredThisInteraction = true;
                 }
                 if (commandName === 'add-user' || commandName === 'withdraw-robux') { /* Already handled by new logic */ }
                 else { await unhandledCommand.execute(interaction, client); } // Ensure client is passed if needed by command
                 return;
            }

            console.warn(`[ChatInputCommand] Unhandled or command file not found: ${commandName} by ${interaction.user.tag}`);
            await sendInteractionError(interaction, `Command "${commandName}" not implemented or error.`, true, deferredThisInteraction);


        } else if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
            const customId = interaction.customId;

            if (customId === 'claim_daily_reward') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) {
                    const deferOpts = interaction.guild ? { ephemeral: true } : {};
                    await safeDeferReply(interaction, deferOpts);
                    deferredThisInteraction = true;
                }
                try {
                    const result = client.levelSystem.claimDailyReward(interaction.user.id, interaction.guild.id);
                    if (result.success) {
                        await safeEditReply(interaction, { content: `✅ **Success!** ${result.message}`, ephemeral: true });
                        
                        // Update the original embed
                        const { embed: newEmbed, components: newComponents } = await buildDailyEmbed(interaction, client);
                        if (interaction.message && interaction.message.editable) {
                            await interaction.message.edit({ embeds: [newEmbed], components: newComponents }).catch(e => {
                                console.warn("Failed to edit daily embed after claim:", e.message);
                            });
                        }
                    } else {
                        await sendInteractionError(interaction, result.message || "Failed to claim reward.", true, deferredThisInteraction);
                    }
                } catch (claimError) { console.error('[ClaimDaily Error]', claimError); await sendInteractionError(interaction, "An error occurred while claiming your reward.", true, deferredThisInteraction); }
                return;
            }
            if (customId === 'skip_daily_gems' || customId === 'skip_daily_ticket') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    let result;
                    if (customId === 'skip_daily_gems') {
                        result = client.levelSystem.skipDailyReward(interaction.user.id, interaction.guild.id);
                    } else {
                        result = client.levelSystem.skipDailyRewardWithTicket(interaction.user.id, interaction.guild.id);
                    }
                    if (result.success) {
                        await safeEditReply(interaction, { content: `✅ **Success!** ${result.message}`, ephemeral: true });
                        const { embed: newEmbed, components: newComponents } = await buildDailyEmbed(interaction, client);
                        if (interaction.message && interaction.message.editable) {
                            await interaction.message.edit({ embeds: [newEmbed], components: newComponents }).catch(e => { console.warn('Failed to edit daily embed after skip:', e.message); });
                        }
                    } else {
                        await sendInteractionError(interaction, result.message || 'Failed to skip reward.', true, deferredThisInteraction);
                    }
                } catch (skipError) {
                    console.error('[SkipDaily Error]', skipError);
                    await sendInteractionError(interaction, 'An error occurred while skipping.', true, deferredThisInteraction);
                }
                return;
            }
            if (customId === 'setting_toggle_daily') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(()=>{}); }
                const userId = interaction.user.id; const guildId = interaction.guild.id;
                const current = client.levelSystem.getUserDmSettings(userId, guildId).enableDailyReadyDm;
                const newVal = current ? false : true;
                client.levelSystem.updateUserDmSettings(userId, guildId, { enableDailyReadyDm: newVal });
                const { embed, components } = buildSettingsEmbed(userId, guildId, client.levelSystem);
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [embed], components }).catch(()=>{});
                } else {
                    await interaction.update({ embeds: [embed], components }).catch(()=>{});
                }
                return;
            }
            if (customId === 'setting_set_rarity') {
                if (!interaction.isButton()) return;
                const modal = new ModalBuilder()
                    .setCustomId('setting_rarity_modal')
                    .setTitle('Set Rarity Threshold');
                const input = new TextInputBuilder()
                    .setCustomId('rarity_threshold_input')
                    .setLabel('Rarity value (e.g., 1000)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal).catch(async e => { console.error('Show modal error', e); await sendInteractionError(interaction, 'Failed to show input.', true, deferredThisInteraction); });
                return;
            }
            if (customId === 'setting_rarity_modal') {
                if (!interaction.isModalSubmit()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const rawVal = interaction.fields.getTextInputValue('rarity_threshold_input');
                const cleaned = rawVal.replace(/,/g, '');
                const val = parseInt(cleaned);
                if (isNaN(val) || val < 0) {
                    return sendInteractionError(interaction, 'Invalid number.', true, deferredThisInteraction);
                }
                client.levelSystem.setUserGlobalLootAlertSettings(interaction.user.id, interaction.guild.id, val);
                const { embed, components } = buildSettingsEmbed(interaction.user.id, interaction.guild.id, client.levelSystem);
                if (interaction.message && interaction.message.editable) {
                    await interaction.message.edit({ embeds: [embed], components }).catch(() => {});
                }
                await interaction.editReply({ content: '✅ Setting updated!', embeds: [], components: [] }).catch(() => {});
                return;
            }
            if (customId === 'setting_shop') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(() => {}); }
                const { embed, components } = buildShopSettingsEmbed(interaction.user.id, interaction.guild.id, client.levelSystem);
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [embed], components }).catch(() => {});
                } else {
                    await interaction.update({ embeds: [embed], components }).catch(() => {});
                }
                return;
            }
            if (customId === 'shop_setting_back_main') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(() => {}); }
                const { embed, components } = buildSettingsEmbed(interaction.user.id, interaction.guild.id, client.levelSystem);
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [embed], components }).catch(() => {});
                } else {
                    await interaction.update({ embeds: [embed], components }).catch(() => {});
                }
                return;
            }
            if (customId === 'shop_setting_lootbox' || customId === 'shop_setting_charm' || customId === 'shop_setting_exclusive' || customId === 'shop_setting_discount') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(() => {}); }
                const category = customId.split('_')[2];
                const { embed, components } = buildShopCategoryEmbed(interaction.user.id, interaction.guild.id, client.levelSystem, category === 'lootbox' ? 'loot_box_item' : category === 'charm' ? 'charm_item' : category === 'exclusive' ? 'special_role_item' : 'discount');
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [embed], components }).catch(() => {});
                } else {
                    await interaction.update({ embeds: [embed], components }).catch(() => {});
                }
                return;
            }
            if (customId === 'shop_category_back') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(() => {}); }
                const { embed, components } = buildShopSettingsEmbed(interaction.user.id, interaction.guild.id, client.levelSystem);
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [embed], components }).catch(() => {});
                } else {
                    await interaction.update({ embeds: [embed], components }).catch(() => {});
                }
                return;
            }
            if (customId.startsWith('shop_change_modal_')) {
                if (!interaction.isButton()) return;
                const category = customId.replace('shop_change_modal_', '');
                const modal = new ModalBuilder().setCustomId(`shop_change_submit_${category}`).setTitle('Toggle Shop Item Alert');
                const idInput = new TextInputBuilder().setCustomId('item_id').setLabel('Item ID').setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                await interaction.showModal(modal).catch(async e => { console.error('Show modal error', e); await sendInteractionError(interaction, 'Failed to open form.', true, false); });
                return;
            }
            if (customId.startsWith('shop_change_submit_')) {
                if (!interaction.isModalSubmit()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const rawCategory = customId.replace('shop_change_submit_', '');
                const itemIdInput = interaction.fields.getTextInputValue('item_id').trim();
                const itemId = itemIdInput.toLowerCase();

                // Normalize category to match item types used in config
                let normalizedCategory = rawCategory;
                if (['lootbox', 'loot_box_item'].includes(rawCategory)) normalizedCategory = 'loot_box_item';
                else if (['charm', 'charm_item'].includes(rawCategory)) normalizedCategory = 'charm_item';
                else if (['exclusive', 'special_role_item'].includes(rawCategory)) normalizedCategory = 'special_role_item';

                let validIds = [];
                if (normalizedCategory === 'discount') {
                    validIds = SHOP_DISCOUNT_IDS.map(id => id.toLowerCase());
                } else if (['loot_box_item', 'charm_item', 'special_role_item'].includes(normalizedCategory)) {
                    validIds = Object.values(client.levelSystem.gameConfig.items)
                        .filter(it => it.type === normalizedCategory)
                        .map(it => String(it.id).toLowerCase());
                }
                if (validIds.length > 0 && !validIds.includes(itemId)) {
                    await interaction.editReply({ content: `❌ Invalid item ID \`${itemIdInput}\` for this category.`, embeds: [], components: [] });
                    return;
                }
                const current = client.levelSystem.getUserShopAlertSetting(interaction.user.id, interaction.guild.id, itemId).enableAlert;
                const newVal = current ? false : true;
                client.levelSystem.setUserShopAlertSetting(interaction.user.id, interaction.guild.id, itemId, newVal);
                const { embed, components } = buildShopCategoryEmbed(interaction.user.id, interaction.guild.id, client.levelSystem, normalizedCategory);
                if (interaction.message && interaction.message.editable) {
                    await interaction.message.edit({ embeds: [embed], components }).catch(() => {});
                }
                await interaction.editReply({ content: `✅ Alerts for \`${itemIdInput}\` ${newVal ? 'enabled' : 'disabled'}!`, embeds: [], components: [] }).catch(() => {});
                return;
            }
            if (customId.startsWith('restore_streak_confirm_')) {
                if (!interaction.isButton()) return;
                const parts = customId.split('_');
                const guildId = parts[3];
                const oldStreak = parseInt(parts[4]);

                if (!interaction.replied && !interaction.deferred) {
                    const deferOpts = interaction.guild ? { ephemeral: true } : {};
                    await safeDeferReply(interaction, deferOpts);
                    deferredThisInteraction = true;
                }

                const result = client.levelSystem.attemptStreakRestore(interaction.user.id, guildId, oldStreak);
                await safeEditReply(interaction, { content: result.message, embeds:[], components:[] });

                if (result.success && interaction.message.deletable) {
                    await interaction.message.delete().catch(()=>{}); // Delete the DM after successful restore
                }
                return;
            }

            if (customId === 'withdraw_robux_modal') {
                if (!interaction.isModalSubmit()) return;
                if (!interaction.guild) return sendInteractionError(interaction, "Withdrawals must be initiated from a server.", true);

                if (!interaction.replied && !interaction.deferred) {
                    await safeDeferReply(interaction, { ephemeral: true });
                    deferredThisInteraction = true;
                }

                const robloxUsername = interaction.fields.getTextInputValue('roblox_username');
                const amountStr = interaction.fields.getTextInputValue('robux_amount');
                const gamepassLink = interaction.fields.getTextInputValue('gamepass_link');
                const amount = parseAbbreviatedNumber(amountStr);

                if (isNaN(amount) || amount <= 0) {
                    return sendInteractionError(interaction, "Invalid Robux amount. Please enter a positive number.", true, deferredThisInteraction);
                }
                if (!robloxUsername.trim() || !gamepassLink.trim()) {
                    return sendInteractionError(interaction, "Roblox username and gamepass link cannot be empty.", true, deferredThisInteraction);
                }
                if (!/^https?:\/\/www\.roblox\.com\/(game-pass|catalog)\/\d+(\/.*)?$/.test(gamepassLink)) {
                    return sendInteractionError(interaction, "Invalid gamepass/item link format. Please provide a valid Roblox link.", true, deferredThisInteraction);
                }


                const canWithdrawCheck = client.levelSystem.canUserWithdrawRobux(interaction.user.id, interaction.guild.id, amount);
                if (!canWithdrawCheck.canWithdraw) {
                    return sendInteractionError(interaction, `❌ ${canWithdrawCheck.reason}`, true, deferredThisInteraction);
                }

                if (!ROBUX_WITHDRAWAL_LOG_CHANNEL_ID) {
                    console.error("CRITICAL: ROBUX_WITHDRAWAL_LOG_CHANNEL_ID is not set. Cannot process withdrawal.");
                    return sendInteractionError(interaction, "Withdrawal system is currently unavailable. Please contact staff.", true, deferredThisInteraction);
                }

                const logChannel = await client.channels.fetch(ROBUX_WITHDRAWAL_LOG_CHANNEL_ID).catch(() => null);
                if (!logChannel || !logChannel.isTextBased()) {
                    console.error(`CRITICAL: Robux withdrawal log channel (${ROBUX_WITHDRAWAL_LOG_CHANNEL_ID}) not found or not text-based.`);
                    return sendInteractionError(interaction, "Withdrawal system error. Please contact staff.", true, deferredThisInteraction);
                }

                // Create DB entry first to get withdrawalId
                const dbRequest = client.levelSystem.createRobuxWithdrawalRequest(
                    interaction.user.id,
                    interaction.guild.id,
                    robloxUsername,
                    amount,
                    gamepassLink,
                    null // logMessageId will be updated after sending
                );

                if (!dbRequest.success) {
                    return sendInteractionError(interaction, dbRequest.message || "Failed to create withdrawal request in database.", true, deferredThisInteraction);
                }
                const withdrawalId = dbRequest.withdrawalId;

                const requestDataForEmbed = client.levelSystem.getRobuxWithdrawalRequest(withdrawalId); // Fetch fresh data with timestamp
                const requestEmbed = buildRobuxWithdrawalRequestEmbed(requestDataForEmbed, interaction.user);
                const actionComponents = getRobuxWithdrawalActionComponents(withdrawalId);

                try {
                    const logMessage = await logChannel.send({
                        content: `💰 New Robux Withdrawal Request from ${interaction.user.tag}`,
                        embeds: [requestEmbed],
                        components: actionComponents
                    });
                    // Update DB with logMessageId
                    client.levelSystem.db.prepare('UPDATE robux_withdrawals SET logMessageId = ? WHERE withdrawalId = ?').run(logMessage.id, withdrawalId);
                    robuxWithdrawalRequests.set(withdrawalId.toString(), logMessage.id); // Store for potential updates

                    await safeEditReply(interaction, { content: "✅ Your Robux withdrawal request has been submitted and sent to staff for review. You will be DMed with the outcome.", ephemeral: true });
                } catch (logError) {
                    console.error("Failed to send Robux withdrawal request to log channel:", logError);
                    // Attempt to mark the DB request as errored or delete it? For now, just inform user.
                    await sendInteractionError(interaction, "Failed to send your request to staff. Please try again or contact support.", true, deferredThisInteraction);
                }
                return;
            }

            if (customId === 'submit_ticket_modal') {
                if (!interaction.isModalSubmit()) return;
                if (!interaction.guild) return sendInteractionError(interaction, 'This interaction must be used in a server.', true);

                if (!interaction.replied && !interaction.deferred) {
                    await safeDeferReply(interaction, { ephemeral: true });
                    deferredThisInteraction = true;
                }

                const ign = interaction.fields.getTextInputValue('ign_input');
                const title = interaction.fields.getTextInputValue('build_title_input');
                const theme = interaction.fields.getTextInputValue('theme_fit_input');
                const gameVersion = interaction.fields.getTextInputValue('game_version_input');
                const deviceUsed = interaction.fields.getTextInputValue('device_used_input');
                const shortDesc = interaction.fields.getTextInputValue('short_desc_input');
                const verification = interaction.fields.getTextInputValue('verification_input');

                try {
                    const newChannel = await interaction.guild.channels.create({
                        name: `${interaction.user.username}-build`,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                        ]
                    });
                    await newChannel.setName(`${interaction.user.username}'s Build`).catch(() => {});

                    const embed = new EmbedBuilder()
                        .setTitle('Build Submission')
                        .addFields(
                            { name: 'IGN', value: ign || 'N/A' },
                            { name: 'Build Title', value: title || 'N/A' },
                            { name: 'Theme Fit', value: theme || 'N/A' },
                            { name: 'Game & Version', value: gameVersion || 'N/A' },
                            { name: 'Device Used', value: deviceUsed || 'N/A' },
                            { name: 'Short Description', value: shortDesc || 'N/A' },
                            { name: 'Verification', value: verification || 'N/A' }
                        )
                        .setTimestamp();

                    await newChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });
                    await safeEditReply(interaction, { content: `Channel created: <#${newChannel.id}>`, ephemeral: true });
                } catch (ticketError) {
                    console.error('[submit-ticket]', ticketError);
                    await sendInteractionError(interaction, 'Failed to create build channel.', true, deferredThisInteraction);
                }
                return;
            }

            if (customId === 'start_vote_modal') {
                if (!interaction.isModalSubmit()) return;
                const setup = client.voteSetups.get(interaction.user.id);
                if (!setup) return sendInteractionError(interaction, 'Vote setup not found or expired.', true);

                if (!interaction.replied && !interaction.deferred) {
                    await safeDeferReply(interaction, { ephemeral: true });
                    deferredThisInteraction = true;
                }

                client.voteSetups.delete(interaction.user.id);
                const info = interaction.fields.getTextInputValue('vote_info_input');
                const choicesInput = interaction.fields.getTextInputValue('vote_choices_input');
                const choices = choicesInput.split(',').map(c => c.trim()).filter(Boolean).slice(0, 10);
                const parsedChoices = choices.map(c => {
                    const m = c.match(/^(?:choice\d+#)?\s*(.*)$/i);
                    return (m ? m[1] : c).trim();
                }).filter(t => t.length > 0);

                if (parsedChoices.length < 2) {
                    return sendInteractionError(interaction, 'Please provide at least two choices.', true, deferredThisInteraction);
                }

                const channel = await client.channels.fetch(setup.channelId).catch(() => null);
                if (!channel || !channel.isTextBased()) {
                    return sendInteractionError(interaction, 'Could not find the selected channel.', true, deferredThisInteraction);
                }

                const endTs = Math.floor((Date.now() + setup.duration) / 1000);
                const numberEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

                const voteEmbed = new EmbedBuilder()
                    .setTitle(`${interaction.user.username} has started a voting!`)
                    .setDescription(`# ${info}\n\nVote ends <t:${endTs}:R>`)
                    .setColor('#00FF00');

                parsedChoices.forEach((choice, idx) => {
                    voteEmbed.addFields({ name: numberEmojis[idx], value: choice });
                });

                let content = null;
                if (setup.pingRoleId) {
                    content = setup.pingRoleId === interaction.guild.id
                        ? '@everyone'
                        : `<@&${setup.pingRoleId}>`;
                }
                const voteMessage = await channel.send({ content, embeds: [voteEmbed] }).catch(() => null);
                if (!voteMessage) {
                    return sendInteractionError(interaction, 'Failed to send vote message.', true, deferredThisInteraction);
                }

                for (let i = 0; i < parsedChoices.length; i++) {
                    await voteMessage.react(numberEmojis[i]).catch(() => {});
                }

                setTimeout(async () => {
                    try {
                        const fetched = await channel.messages.fetch(voteMessage.id).catch(() => null);
                        if (!fetched) return;
                        const counts = parsedChoices.map((_, idx) => {
                            const react = fetched.reactions.cache.get(numberEmojis[idx]);
                            return react ? Math.max(react.count - 1, 0) : 0;
                        });
                        const maxVotes = Math.max(...counts);
                        const winners = parsedChoices.filter((_, idx) => counts[idx] === maxVotes);

                        const endEmbed = EmbedBuilder.from(voteEmbed.data).setColor('#FF0000');
                        await fetched.edit({ embeds: [endEmbed] }).catch(() => {});
                        await fetched.reactions.removeAll().catch(() => {});

                        const resultEmbed = new EmbedBuilder()
                            .setTitle('Vote Result')
                            .setDescription(`Winner: ${winners.join(', ') || 'No votes cast'}`)
                            .setColor('#FF0000');

                        await channel.send({ embeds: [resultEmbed] }).catch(() => {});
                    } catch (e) { console.error('Vote end error', e); }
                }, setup.duration);

                await safeEditReply(interaction, { content: `Vote started in <#${channel.id}>`, ephemeral: true });
                return;
            }


            if (customId.startsWith('rwr_accept_') || customId.startsWith('rwr_deny_')) {
                if (!interaction.isButton()) return;
                if (!isStaff()) return sendInteractionError(interaction, "You do not have permission to process withdrawal requests.", true);

                const parts = customId.split('_');
                const actionType = parts[1]; // 'accept' or 'deny'
                const withdrawalId = parseInt(parts[2]);

                if (isNaN(withdrawalId)) return sendInteractionError(interaction, "Invalid withdrawal ID in button.", true);

                const withdrawalRequest = client.levelSystem.getRobuxWithdrawalRequest(withdrawalId);
                if (!withdrawalRequest) return sendInteractionError(interaction, "Withdrawal request not found or already processed.", true);
                if (withdrawalRequest.status !== 'PENDING') return sendInteractionError(interaction, `This request is already **${withdrawalRequest.status}**.`, true);

                let modal;
                if (actionType === 'accept') {
                    modal = new ModalBuilder()
                        .setCustomId(`rwr_accept_modal_${withdrawalId}`)
                        .setTitle(`Accept Robux Withdraw ID: ${withdrawalId}`);
                    const evidenceInput = new TextInputBuilder()
                        .setCustomId('rwr_evidence_input')
                        .setLabel("Evidence/Note (e.g., Txn ID, Screenshot)")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false) // Make it optional
                        .setPlaceholder("Optional: Link to transaction proof, etc.");
                    modal.addComponents(new ActionRowBuilder().addComponents(evidenceInput));
                } else { // deny
                    modal = new ModalBuilder()
                        .setCustomId(`rwr_deny_modal_${withdrawalId}`)
                        .setTitle(`Deny Robux Withdraw ID: ${withdrawalId}`);
                    const reasonInput = new TextInputBuilder()
                        .setCustomId('rwr_reason_input')
                        .setLabel("Reason for Denial")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setPlaceholder("Explain why the request is being denied.");
                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                }
                await interaction.showModal(modal).catch(async e => {
                    console.error(`Failed to show rwr_${actionType}_modal:`, e);
                    await sendInteractionError(interaction, "Failed to open processing form.", true, true);
                });
                return;
            }

            if (customId.startsWith('rwr_accept_modal_') || customId.startsWith('rwr_deny_modal_')) {
                if (!interaction.isModalSubmit()) return;
                if (!isStaff()) return sendInteractionError(interaction, "You do not have permission to process withdrawal requests.", true);

                if (!interaction.replied && !interaction.deferred) {
                    await safeDeferReply(interaction, { ephemeral: true });
                    deferredThisInteraction = true;
                }

                const parts = customId.split('_');
                const actionType = parts[1]; // 'accept' or 'deny'
                const withdrawalId = parseInt(parts[parts.length -1]); // Get ID from end

                const withdrawalRequest = client.levelSystem.getRobuxWithdrawalRequest(withdrawalId);
                if (!withdrawalRequest) return sendInteractionError(interaction, "Withdrawal request not found or already processed.", true, deferredThisInteraction);
                if (withdrawalRequest.status !== 'PENDING') return sendInteractionError(interaction, `This request is already **${withdrawalRequest.status}**.`, true, deferredThisInteraction);

                let staffNote = "";
                let newStatus = "";
                let userDMEmbed = new EmbedBuilder();
                const targetUserForDM = await client.users.fetch(withdrawalRequest.userId).catch(() => null);

                if (actionType === 'accept') {
                    newStatus = 'ACCEPTED';
                    staffNote = interaction.fields.getTextInputValue('rwr_evidence_input') || "No evidence/note provided.";

                    // Deduct Robux and update cooldown
                    const recordResult = client.levelSystem.recordRobuxWithdrawal(withdrawalRequest.userId, withdrawalRequest.guildId, withdrawalRequest.amount);
                    if (!recordResult.success) {
                        await client.levelSystem.updateRobuxWithdrawalRequest(withdrawalId, 'ERROR_PROCESSING', interaction.user.id, `Failed to deduct Robux: ${recordResult.message}`);
                        // Update log message to show error
                        const logChannel = await client.channels.fetch(ROBUX_WITHDRAWAL_LOG_CHANNEL_ID).catch(() => null);
                        if (logChannel && withdrawalRequest.logMessageId) {
                            const logMsg = await logChannel.messages.fetch(withdrawalRequest.logMessageId).catch(() => null);
                            if (logMsg) {
                                const errorEmbed = buildRobuxWithdrawalRequestEmbed(
                                    { ...withdrawalRequest, status: 'ERROR_PROCESSING', reasonOrEvidence: `Failed to deduct Robux: ${recordResult.message}` },
                                    targetUserForDM || { tag: 'Unknown User', id: withdrawalRequest.userId, displayAvatarURL: () => null }
                                );
                                await logMsg.edit({ embeds: [errorEmbed], components: [] }).catch(console.error);
                            }
                        }
                        return sendInteractionError(interaction, `❌ Error processing acceptance: ${recordResult.message}. Request status updated to ERROR.`, true, deferredThisInteraction);
                    }

                    userDMEmbed.setTitle("✅ Robux Withdrawal Accepted!")
                               .setColor(0x00FF00)
                               .setDescription(`Your request to withdraw **${withdrawalRequest.amount} Robux** has been accepted by staff!`)
                               .addFields(
                                   { name: "Roblox Username", value: `\`${withdrawalRequest.robloxUsername}\`` },
                                   { name: "Gamepass/Item", value: `[Link](${withdrawalRequest.gamepassLink})` }
                               )
                               .setTimestamp();
                    if (staffNote !== "No evidence/note provided.") {
                        userDMEmbed.addFields({ name: "Note from Staff / Evidence", value: staffNote });
                    }
                    userDMEmbed.setFooter({ text: "Please allow some time for the Robux to be processed to your account."});

                } else { // deny
                    newStatus = 'DENIED';
                    staffNote = interaction.fields.getTextInputValue('rwr_reason_input');
                    userDMEmbed.setTitle("❌ Robux Withdrawal Denied")
                               .setColor(0xFF0000)
                               .setDescription(`Your request to withdraw **${withdrawalRequest.amount} Robux** has been denied by staff.`)
                               .addFields(
                                   { name: "Roblox Username", value: `\`${withdrawalRequest.robloxUsername}\`` },
                                   { name: "Reason for Denial", value: staffNote }
                               )
                               .setTimestamp()
                               .setFooter({text: "If you believe this is a mistake, please contact staff."});
                }

                client.levelSystem.updateRobuxWithdrawalRequest(withdrawalId, newStatus, interaction.user.id, staffNote);

                // DM the user
                if (targetUserForDM) {
                    try {
                        await targetUserForDM.send({ embeds: [userDMEmbed] });
                    } catch (dmError) {
                        console.warn(`Failed to DM user ${targetUserForDM.tag} about withdrawal ${withdrawalId}: ${dmError.message}`);
                        // Optionally, inform staff if DM fails
                        await safeEditReply(interaction, { content: `Processed request. **Failed to DM user ${targetUserForDM.tag}.** Please inform them manually if needed.`, ephemeral: true});
                    }
                } else {
                    console.warn(`Could not fetch user ${withdrawalRequest.userId} to DM for withdrawal ${withdrawalId}.`);
                }

                // Update the log message
                const logChannel = await client.channels.fetch(ROBUX_WITHDRAWAL_LOG_CHANNEL_ID).catch(() => null);
                if (logChannel && withdrawalRequest.logMessageId) {
                    const logMsg = await logChannel.messages.fetch(withdrawalRequest.logMessageId).catch(() => null);
                    if (logMsg) {
                        const updatedRequestData = client.levelSystem.getRobuxWithdrawalRequest(withdrawalId); // Get latest data
                        const updatedLogEmbed = buildRobuxWithdrawalRequestEmbed(updatedRequestData, targetUserForDM || { tag: 'Unknown User', id: withdrawalRequest.userId, displayAvatarURL: () => null });
                        await logMsg.edit({ embeds: [updatedLogEmbed], components: [] }).catch(console.error); // Remove buttons
                    }
                }
                robuxWithdrawalRequests.delete(withdrawalId.toString()); // Remove from active map

                await safeEditReply(interaction, { content: `✅ Withdrawal request ID ${withdrawalId} has been **${newStatus}**. User notified.`, ephemeral: true });
                return;
            }


            if (customId.startsWith('ums_')) {
                // --- START OF FIX ---
                let extractedSessionId;
                let operationPrefix = '';

                if (customId.startsWith('ums_add_operation_modal_')) {
                    operationPrefix = 'ums_add_operation_modal_';
                } else if (customId.startsWith('ums_add_operation_')) {
                    operationPrefix = 'ums_add_operation_';
                } else if (customId.startsWith('ums_process_operations_')) {
                    operationPrefix = 'ums_process_operations_';
                } else if (customId.startsWith('ums_cancel_session_')) {
                    operationPrefix = 'ums_cancel_session_';
                } else {
                    console.warn(`[UMS Interaction] Unhandled customId prefix: ${customId}`);
                    return sendInteractionError(interaction, "Unknown panel interaction type.", true);
                }
                extractedSessionId = customId.substring(operationPrefix.length);
                // --- END OF FIX ---

                const session = userManagementSessions.get(extractedSessionId);

                if (!session || session.adminUserId !== interaction.user.id || session.panelChannelId !== interaction.channel.id) {
                     // Added detailed logging for easier debugging if this condition is met
                    console.log(`[UMS Check Failed] CustomID: ${customId}, Extracted SID: ${extractedSessionId}, Session Found: ${!!session}, Admin Match: ${session ? session.adminUserId === interaction.user.id : 'N/A'}, Channel Match: ${session ? session.panelChannelId === interaction.channel.id : 'N/A'}, Interaction User: ${interaction.user.id}, Interaction Channel: ${interaction.channel.id}`);
                    return sendInteractionError(interaction, "This user management panel is invalid, expired, or not yours.", true);
                }

                // Reset timeout
                if (session.timeoutInstance) clearTimeout(session.timeoutInstance);
                session.timeoutInstance = setTimeout(async () => {
                    const currentSession = userManagementSessions.get(extractedSessionId); // Use corrected sessionId
                    if (currentSession) {
                        userManagementSessions.delete(extractedSessionId); // Use corrected sessionId
                        if (currentSession.panelMessageId) {
                            // Try to fetch the channel from the session data if interaction.channel is not reliable here
                            const panelChannelForTimeout = await client.channels.fetch(currentSession.panelChannelId).catch(() => null);
                            if (panelChannelForTimeout) {
                                const msg = await panelChannelForTimeout.messages.fetch(currentSession.panelMessageId).catch(() => null);
                                if (msg && msg.deletable) {
                                    await msg.delete().catch(e => {if(e.code !== 10008) console.warn("Failed to delete timed out UMS panel (from component timeout):", e.message)});
                                }
                            }
                        }
                        console.log(`User management session ${extractedSessionId} for target ${currentSession.targetUserTag} timed out (component interaction).`);
                    }
                }, USER_MANAGEMENT_PANEL_TIMEOUT_MS);


                if (customId.startsWith('ums_add_operation_modal_')) { // This is a modal submission
                    if (!interaction.isModalSubmit()) return;
                    
                    const operationsText = interaction.fields.getTextInputValue('ums_operations_text_input');
                    const lines = operationsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    let addedOpsCount = 0;
                    let parsingErrors = [];

                    for (const line of lines) {
                        const parts = line.split('-').map(p => p.trim());
                        // Basic structure: action - type - target - amount (amount optional for role)
                        // e.g., + - role - 12345 (3 parts)
                        // e.g., + - coin - 100 (3 parts)
                        // e.g., + - item - common_loot_box - 5 (4 parts)

                        if (parts.length < 3) {
                            parsingErrors.push(`Skipped: "${line}" (Format error: too few parts)`);
                            continue;
                        }

                        const actionPart = parts[0].toLowerCase();
                        const type = parts[1].toLowerCase();
                        let action;
                        let operationTargetId;
                        let operationAmount;

                        if (actionPart === '+' || actionPart === 'add') action = 'add';
                        else if (actionPart === '-' || actionPart === 'remove') action = 'remove';
                        else {
                            parsingErrors.push(`Skipped: "${line}" (Invalid action: ${actionPart})`);
                            continue;
                        }

                        let normalizedType = type;

                        if (type === 'role') {
                            if (parts.length !== 3) {
                                parsingErrors.push(`Skipped: "${line}" (Format error for role: should be [+/-] - role - ID)`);
                                continue;
                            }
                            operationTargetId = parts[2];
                            if (!/^\d+$/.test(operationTargetId)) {
                                parsingErrors.push(`Skipped: "${line}" (Invalid role ID: ${operationTargetId})`);
                                continue;
                            }
                            operationAmount = null; // Roles don't have an amount
                        } else if (type === 'coin' || type === 'gem' || type === 'robux') {
                            if (parts.length !== 3) {
                                parsingErrors.push(`Skipped: "${line}" (Format error for ${type}: should be [+/-] - ${type} - amount)`);
                                continue;
                            }
                            normalizedType = 'currency';
                            operationTargetId = (type === 'coin') ? 'coins' : (type === 'gem') ? 'gems' : 'robux';
                            operationAmount = parseInt(parts[2]); // Amount is parts[2]
                            if (isNaN(operationAmount)) {
                                parsingErrors.push(`Skipped: "${line}" (Invalid amount for ${type}: ${parts[2]})`);
                                continue;
                            }
                        } else if (type === 'item') {
                            if (parts.length !== 4) {
                                parsingErrors.push(`Skipped: "${line}" (Format error for item: should be [+/-] - item - ID - amount)`);
                                continue;
                            }
                            operationTargetId = parts[2];
                            operationAmount = parseInt(parts[3]);
                            if (isNaN(operationAmount)) {
                                parsingErrors.push(`Skipped: "${line}" (Invalid amount for item: ${parts[3]})`);
                                continue;
                            }
                        } else {
                            parsingErrors.push(`Skipped: "${line}" (Invalid type: ${type})`);
                            continue;
                        }

                        // Universal amount processing (e.g. making negative amounts consistent)
                        if (operationAmount !== null && operationAmount !== undefined) { // Check for undefined too
                            if (action === 'remove' && operationAmount < 0) {
                                operationAmount = Math.abs(operationAmount);
                            } else if (action === 'add' && operationAmount < 0) { // Adding a negative is removing a positive
                                action = 'remove';
                                operationAmount = Math.abs(operationAmount);
                            }
                            // For item/currency types, amount must be positive. Role amount is null.
                            if (operationAmount <= 0 && (type === 'item' || type === 'coin' || type === 'gem' || type === 'robux')) {
                                parsingErrors.push(`Skipped: "${line}" (Amount must be positive and > 0 for ${type})`);
                                continue;
                            }
                        } else if (type === 'item' || type === 'coin' || type === 'gem' || type === 'robux') {
                            // Amount is mandatory and must be parsed correctly for these types
                            parsingErrors.push(`Skipped: "${line}" (Amount missing or invalid for ${type})`);
                            continue;
                        }
                        session.operations.push({ action, type: normalizedType, targetId: operationTargetId, amount: operationAmount });
                        addedOpsCount++;
                    }

                    let feedbackMessage = `${addedOpsCount} operation(s) added to the queue. Panel updated.`;
                    if (parsingErrors.length > 0) {
                        feedbackMessage += `\n\n**Parsing Issues:**\n${parsingErrors.join('\n')}`.substring(0, 1900);
                    }

                    const updatedEmbed = buildUserManagementPanelEmbed({ tag: session.targetUserTag, id: session.targetUserId }, session.operations);
                    const updatedComponents = getUserManagementPanelComponents(extractedSessionId, session.operations.length);
                    if (interaction.message && interaction.message.editable) {
                        await interaction.message.edit({ embeds: [updatedEmbed], components: updatedComponents }).catch(console.error);
                    }
                    await interaction.reply({ content: feedbackMessage, ephemeral: true }).catch(async (e) => {
                        console.warn("UMS Modal Add Op: Initial reply failed, trying followup", e.message);
                        await interaction.followUp({ content: feedbackMessage, ephemeral: true}).catch(e2 => console.error("UMS Modal Add Op: Followup also failed", e2.message));
                    });
                    return;
                }


                else if (customId.startsWith('ums_add_operation_') && interaction.isButton()) { // This is the button click to show the modal
            const modal = new ModalBuilder()
                .setCustomId(`ums_add_operation_modal_${extractedSessionId}`) // Use corrected sessionId for modal ID
                .setTitle(`Add Operation for ${session.targetUserTag}`);
            const operationsInput = new TextInputBuilder()
                .setCustomId('ums_operations_text_input')
                .setLabel('Operations (one per line)')
                // SHORTENED PLACEHOLDER
                .setPlaceholder('e.g., + - coin - 100\n- - item - some_item_id - 1')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(operationsInput));
            await interaction.showModal(modal).catch(console.error);
            return; // Important to return after showing modal
        }


                else if (customId.startsWith('ums_process_operations_')) {
                    if (!interaction.isButton()) return;
                    let deferredThisProcess = false;
                    if (!interaction.replied && !interaction.deferred) {
                         await safeDeferReply(interaction, { ephemeral: true });
                         deferredThisProcess = true;
                    }

                    if (session.operations.length === 0) {
                        return sendInteractionError(interaction, "No operations to process.", true, deferredThisProcess);
                    }

                    let resultsLog = [`**Processing operations for ${session.targetUserTag}:**`];
                    const targetMemberForOps = await interaction.guild.members.fetch(session.targetUserId).catch(() => null);

                    if (!targetMemberForOps) {
                        resultsLog.push(`❌ **CRITICAL ERROR:** Target user ${session.targetUserTag} (${session.targetUserId}) not found in the server. Cannot process operations.`);
                        // No need to loop if target member is not found
                    } else {
                        for (const op of session.operations) {
                            let opResult = `Op: ${op.action} ${op.type} ${op.targetId}${op.amount !== null && op.amount !== undefined ? ` (${op.amount})` : ''}`;
                            try {
                                if (op.type === 'role') {
                                    const role = await interaction.guild.roles.fetch(op.targetId).catch(() => null);
                                    if (!role) {
                                        opResult += ` - ❌ FAILED: Role ID ${op.targetId} not found.`;
                                    } else if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles) || interaction.guild.members.me.roles.highest.position <= role.position) {
                                        opResult += ` - ❌ FAILED: Bot missing permissions or role hierarchy for ${role.name}.`;
                                    }
                                     else {
                                        if (op.action === 'add') {
                                            if (targetMemberForOps.roles.cache.has(role.id)) {
                                                opResult += ` - ⚠️ SKIPPED: User already has role ${role.name}.`;
                                            } else {
                                                await targetMemberForOps.roles.add(role.id);
                                                opResult += ` - ✅ SUCCESS: Added role ${role.name}.`;
                                            }
                                        } else if (op.action === 'remove') {
                                             if (!targetMemberForOps.roles.cache.has(role.id)) {
                                                opResult += ` - ⚠️ SKIPPED: User does not have role ${role.name}.`;
                                            } else {
                                                await targetMemberForOps.roles.remove(role.id);
                                                opResult += ` - ✅ SUCCESS: Removed role ${role.name}.`;
                                            }
                                        }
                                    }
                                } else if (op.type === 'currency') {
                                    const currencyId = op.targetId.toLowerCase();
                                    const amountToChange = op.action === 'add' ? op.amount : -op.amount;
                                    if (currencyId === ITEM_IDS.COINS) {
                                        const coinResult = client.levelSystem.addCoins(session.targetUserId, session.guildId, amountToChange, "admin_add_user_panel");
                                        opResult += ` - ✅ SUCCESS: Coins changed by ${coinResult.added}. New balance: ${coinResult.newBalance}.`;
                                    } else if (currencyId === ITEM_IDS.GEMS) {
                                        const gemResult = client.levelSystem.addGems(session.targetUserId, session.guildId, amountToChange, "admin_add_user_panel");
                                        opResult += ` - ✅ SUCCESS: Gems changed by ${gemResult.added}. New balance: ${gemResult.newBalance}.`;
                                    } else if (currencyId === ITEM_IDS.ROBUX) { // New case for Robux
                                        const robuxResult = client.levelSystem.addRobux(session.targetUserId, session.guildId, amountToChange, "admin_add_user_panel");
                                        opResult += ` - ✅ SUCCESS: Robux changed by ${robuxResult.added}. New balance: ${robuxResult.newBalance}.`;
                                    } else {
                                        opResult += ` - ❌ FAILED: Unknown currency ID ${op.targetId}.`;
                                    }
                                } else if (op.type === 'item') {
                                    // Call _getItemMasterProperty without the third argument, relying on its internal default for propertyName=null
                                    const itemConfig = client.levelSystem._getItemMasterProperty(op.targetId, null); 

                                    if (!itemConfig) { // Checks for null or undefined (item not found)
                                        opResult += ` - ❌ FAILED: Item ID "${op.targetId}" (from operation input) not found in game configuration.`;
                                    } else if (!itemConfig.id || typeof itemConfig.type === 'undefined') { // Item found, but essential 'id' or 'type' is misconfigured (missing essential .id or .type property).
                                        console.error(`[UMS Process Error] Misconfigured item found via op.targetId "${op.targetId}". Resolved itemConfig:`, itemConfig);
                                        opResult += ` - ❌ FAILED: Item ID "${op.targetId}" (from op input, resolved to config key: ${itemConfig?.id || 'UNKNOWN'}) is misconfigured (missing essential .id or .type property).`;
                                    } else {
                                        // itemConfig is now guaranteed to be a valid object with .id and .type
                                        const itemTypeForGive = itemConfig.type; // Directly use .type; it's guaranteed.

                                        if (op.amount === null || op.amount === undefined || op.amount <= 0) {
                                            opResult += ` - ❌ FAILED: Amount for item "${itemConfig.name || itemConfig.id}" must be a positive number.`;
                                        } else if (op.action === 'add') {
                                            // Use itemConfig.id to ensure we're using the canonical ID from the resolved config
                                            const giveResult = client.levelSystem.giveItem(session.targetUserId, session.guildId, itemConfig.id, op.amount, itemTypeForGive, 'admin_add_user_panel_give');
                                            opResult += giveResult.success ? ` - ✅ SUCCESS: ${giveResult.message}` : ` - ❌ FAILED: ${giveResult.message}`;
                                        } else if (op.action === 'remove') {
                                            // Use itemConfig.id here as well
                                            const takeResult = client.levelSystem.takeItem(session.targetUserId, session.guildId, itemConfig.id, op.amount);
                                            opResult += takeResult ? ` - ✅ SUCCESS: Removed ${op.amount}x ${itemConfig.name || itemConfig.id}.` : ` - ❌ FAILED: Could not remove ${op.amount}x ${itemConfig.name || itemConfig.id} (not enough, item not found, or other issue).`;
                                        }
                                    }}
                            } catch (e) {
                                console.error(`[UMS Process Error] Operation: ${JSON.stringify(op)} - Error:`, e);
                                opResult += ` - ❌ FAILED: Internal error during processing.`;
                            }
                            resultsLog.push(opResult);
                        }
                    }

                    userManagementSessions.delete(extractedSessionId);
                    if (session.timeoutInstance) clearTimeout(session.timeoutInstance);

                    const resultEmbed = new EmbedBuilder()
                        .setTitle(`User Management Results for ${session.targetUserTag}`)
                        .setDescription(resultsLog.join('\n').substring(0, 4000))
                        .setColor(resultsLog.some(log => log.includes('FAILED') || log.includes('CRITICAL')) ? 0xE74C3C : 0x2ECC71)
                        .setTimestamp();

                    const panelMsg = session.panelMessageId ? await interaction.channel.messages.fetch(session.panelMessageId).catch(()=>null) : null;
                    if (panelMsg && panelMsg.editable) {
                        await panelMsg.edit({
                            content: `User management session for ${session.targetUserTag} completed.`,
                            embeds: [resultEmbed], components: []
                        }).catch(e => console.warn("Failed to edit UMS panel on process completion:", e.message));
                    } else {
                        if(panelMsg && panelMsg.deletable) await panelMsg.delete().catch(()=>{}); // Delete if not editable but deletable
                        await interaction.channel.send({ embeds: [resultEmbed] }).catch(e => console.warn("Failed to send UMS results as new message:", e.message));
                    }
                    await safeEditReply(interaction, { content: `Operations processed for ${session.targetUserTag}. See results in the panel message or a new message if the panel was gone.`, ephemeral: true });
                    return;
                }

                else if (customId.startsWith('ums_cancel_session_')) {
                    if (!interaction.isButton()) return;
                     if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferUpdate().catch(console.error);
                    }
                    userManagementSessions.delete(extractedSessionId);
                    if (session.timeoutInstance) clearTimeout(session.timeoutInstance);
                    const panelMsgToCancel = session.panelMessageId ? await interaction.channel.messages.fetch(session.panelMessageId).catch(()=>null) : null;

                    if (panelMsgToCancel && panelMsgToCancel.editable) {
                        await panelMsgToCancel.edit({
                            content: `User management session for ${session.targetUserTag} cancelled by admin.`,
                            embeds: [new EmbedBuilder().setTitle("Session Cancelled").setColor(0xE74C3C).setDescription("No operations were processed.")],
                            components: []
                        }).catch(e => console.warn("Failed to edit UMS panel on cancel:", e.message));
                    } else if (panelMsgToCancel && panelMsgToCancel.deletable) {
                        await panelMsgToCancel.delete().catch(e=>console.warn("Failed to delete UMS panel on cancel:", e.message));
                    }

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({content: "User management panel cancelled.", ephemeral: true}).catch(()=>{});
                    } else {
                        await interaction.reply({content: "User management panel cancelled.", ephemeral: true}).catch(()=>{});
                    }
                    return;
                }
                 // Fallback if a customId starts with ums_ but isn't handled by the specific `else if` blocks above
                 console.warn(`[UMS Interaction] Unhandled ums_ component interaction: ${customId}`);
                 if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                     await sendInteractionError(interaction, "This specific panel action is not recognized.", true);
                 } else if (interaction.isRepliable()) {
                     await sendInteractionError(interaction, "This specific panel action is not recognized.", true, true);
                 }
                 return; // Explicit return
            }


            if (customId === 'shop_buy_item') {
                if (!interaction.guild) return sendInteractionError(interaction, "Shop interactions require a server context.", true);
                if (!interaction.isButton()) return;
                const shopItemsAvailable = client.levelSystem.shopManager.getShopItems(interaction.guild.id)
                    .filter(item => item.stock > 0);
                if (shopItemsAvailable.length === 0) {
                    return safeReply(interaction, { content: '🛍️ The shop is currently empty or all items are out of stock.', ephemeral: true });
                }
                const buyModal = new ModalBuilder()
                    .setCustomId('shop_buy_item_modal')
                    .setTitle('Buy Item from Shop');
                const itemIdInput = new TextInputBuilder()
                    .setCustomId('shop_item_id_input')
                    .setLabel('Item ID to Purchase')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the exact Item ID (e.g., common_loot_box)')
                    .setRequired(true);
                const amountInput = new TextInputBuilder()
                    .setCustomId('shop_amount_input')
                    .setLabel('Amount to Purchase (1-99)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter a number (e.g., 1 or 10)')
                    .setValue('1')
                    .setRequired(true);
                buyModal.addComponents(new ActionRowBuilder().addComponents(itemIdInput), new ActionRowBuilder().addComponents(amountInput));
                await interaction.showModal(buyModal).catch(async e => {
                     console.error('[ShopBuyModal Show Error]', e);
                     await sendInteractionError(interaction, "Failed to open buy modal.", true);
                });
                return;
            }
            if (customId === 'shop_buy_item_modal') {
                if (!interaction.guild) return sendInteractionError(interaction, "Shop interactions require a server context.", true);
                if (!interaction.isModalSubmit()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    const itemIdToBuy = interaction.fields.getTextInputValue('shop_item_id_input').trim();
                    const amountStr = interaction.fields.getTextInputValue('shop_amount_input').trim();
                    const amountToBuy = parseAbbreviatedNumber(amountStr);

                    const itemMasterConfigForMax = client.levelSystem._getItemMasterProperty(itemIdToBuy, null);
                    const maxPurchaseLimit = itemMasterConfigForMax?.maxPurchaseAmountPerTransactionOverride || client.levelSystem.gameConfig.globalSettings.MAX_PURCHASE_AMOUNT_PER_TRANSACTION || 99;


                    if (isNaN(amountToBuy) || amountToBuy <= 0 || amountToBuy > maxPurchaseLimit) {
                        return sendInteractionError(interaction, `Invalid amount. Must be a number between 1 and ${maxPurchaseLimit}.`, true, deferredThisInteraction);
                    }
                    if (!itemIdToBuy) return sendInteractionError(interaction, "Item ID cannot be empty.", true, deferredThisInteraction);
                    const purchaseResult = await client.levelSystem.shopManager.purchaseItem(interaction.user.id, interaction.guild.id, itemIdToBuy, amountToBuy, member, { simulateOnly: true });
                    if (purchaseResult.success) {
                        const originalTotal = purchaseResult.totalCost + purchaseResult.discountAmount;
                        let discountLine = `Discount Applied: ${purchaseResult.discountAmount.toLocaleString()} ${purchaseResult.currencyEmoji}`;
                        if (purchaseResult.discountAmount > 0) discountLine += ` (${purchaseResult.discountPercent}%)`;
                        let summaryValue = `${discountLine}\nTotal: ${purchaseResult.totalCost.toLocaleString()} ${purchaseResult.currencyEmoji}`;
                        if (purchaseResult.discountAmount > 0) summaryValue += `\n-# Original Total: ${originalTotal.toLocaleString()} ${purchaseResult.currencyEmoji}`;
                        summaryValue += `\nRemaining Stock: ${purchaseResult.newStock}`;
                        const receiptEmbed = new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setTitle('🧾 Purchase Receipt')
                            .setDescription('Review your purchase below.')
                            .addFields(
                                { name: 'Item', value: `${purchaseResult.emoji} ${purchaseResult.itemName} (ID: ${purchaseResult.itemId})\nQuantity: ${purchaseResult.amount}\nPrice Each: ${purchaseResult.pricePerItem.toLocaleString()} ${purchaseResult.currencyEmoji}` },
                                { name: 'Summary', value: summaryValue }
                            )
                            .setTimestamp();

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`shop_confirm|${purchaseResult.itemId}|${purchaseResult.amount}|0|`).setLabel('Confirm').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId(`shop_apply_discount|${purchaseResult.itemId}|${purchaseResult.amount}`).setLabel('Apply Discount').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('shop_cancel').setLabel('Deny').setStyle(ButtonStyle.Danger)
                        );

                        await safeEditReply(interaction, { embeds: [receiptEmbed], components: [row], ephemeral: true }, false);
                    } else if (purchaseResult.itemId) {
                        const failedEmbed = new EmbedBuilder()
                            .setColor(0xe74c3c)
                            .setTitle('❌ Purchase Failed')
                            .setDescription(purchaseResult.message || 'Purchase failed.')
                            .addFields(
                                { name: 'Item', value: `${purchaseResult.emoji} ${purchaseResult.itemName} (ID: ${purchaseResult.itemId})\nAmount: ${purchaseResult.amount}\nPrice Each: ${purchaseResult.pricePerItem.toLocaleString()} ${purchaseResult.currencyEmoji}` },
                                { name: 'SUMMARY', value: `Discount: ${purchaseResult.discountAmount.toLocaleString()} ${purchaseResult.currencyEmoji}\nTotal Price: ${purchaseResult.totalCost.toLocaleString()} ${purchaseResult.currencyEmoji}\nYou need more funds.` }
                            )
                            .setTimestamp();
                        await safeEditReply(interaction, { embeds: [failedEmbed], ephemeral: true }, true);
                    } else {
                        await sendInteractionError(interaction, purchaseResult.message || "Purchase failed.", true, deferredThisInteraction);
                    }
                } catch (shopBuyError) { console.error('[ShopBuyModal Process Error]', shopBuyError); await sendInteractionError(interaction, "Error processing purchase.", true, deferredThisInteraction); }
                return;
            }
            if (customId.startsWith('shop_confirm|')) {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    const parts = customId.split('|');
                    const itemId = parts[1];
                    const amt = parseInt(parts[2]);
                    const extraDisc = parseFloat(parts[3]) || 0;
                    const ticketId = parts[4] || '';
                    const result = await client.levelSystem.shopManager.purchaseItem(interaction.user.id, interaction.guild.id, itemId, amt, member, { extraDiscountPercent: extraDisc });
                    if (result.success) {
                        if (ticketId) client.levelSystem.takeItem(interaction.user.id, interaction.guild.id, ticketId, 1);
                        const updatedBalance = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                        const coinEmoji = client.levelSystem.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
                        const gemEmoji  = client.levelSystem.gemEmoji  || DEFAULT_GEM_EMOJI_FALLBACK;
                        const robuxEmoji = client.levelSystem.robuxEmoji || DEFAULT_ROBUX_EMOJI_FALLBACK;
                        const originalTotal = result.totalCost + result.discountAmount;
                        let discountLine = `Discount Applied: ${result.discountAmount.toLocaleString()} ${result.currencyEmoji}`;
                        if (result.discountAmount > 0) discountLine += ` (${result.discountPercent}%)`;
                        let summaryValue = `${discountLine}\nTotal Paid: ${result.totalCost.toLocaleString()} ${result.currencyEmoji}`;
                        if (result.discountAmount > 0) summaryValue += `\n-# Original Total: ${originalTotal.toLocaleString()} ${result.currencyEmoji}`;
                        summaryValue += `\nRemaining Stock: ${result.newStock}`;
                        const receiptEmbed = new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setTitle('🧾 Purchase Receipt')
                            .setDescription('Thank you for your purchase!')
                            .addFields(
                                { name: 'Item Purchased', value: `${result.emoji} ${result.itemName} (ID: ${result.itemId})\nQuantity: ${result.amount}\nPrice Each: ${result.pricePerItem.toLocaleString()} ${result.currencyEmoji}` },
                                { name: 'Summary', value: summaryValue },
                                { name: 'Your Balance', value: `${coinEmoji} ${updatedBalance.coins.toLocaleString()} | ${gemEmoji} ${updatedBalance.gems.toLocaleString()} | ${robuxEmoji} ${updatedBalance.robux.toLocaleString()}` }
                            )
                            .setTimestamp();
                        await safeEditReply(interaction, { embeds: [receiptEmbed], components: [], ephemeral: true }, false);
                        await refreshShopDisplayForGuild(interaction.guild.id, client);
                        if (itemId === client.levelSystem.COSMIC_ROLE_TOKEN_ID || client.levelSystem._getItemMasterProperty(itemId, 'id') === client.levelSystem.COSMIC_ROLE_TOKEN_ID) {
                            const itemCfg = client.levelSystem._getItemMasterProperty(itemId, null);
                            await checkAndAwardSpecialRole(member, `purchasing ${itemCfg?.name || itemId}`, itemCfg?.name || itemId);
                        }
                    } else if (result.itemId) {
                        const failedEmbed = new EmbedBuilder()
                            .setColor(0xe74c3c)
                            .setTitle('❌ Purchase Failed')
                            .setDescription(result.message || 'Purchase failed.')
                            .addFields(
                                { name: 'Item', value: `${result.emoji}${result.itemName} (ID: ${result.itemId})\nAmount: ${result.amount}\nPrice Each: ${result.pricePerItem.toLocaleString()} ${result.currencyEmoji}` },
                                { name: 'SUMMARY', value: `Discount: ${result.discountAmount.toLocaleString()} ${result.currencyEmoji}\nTotal Price: ${result.totalCost.toLocaleString()} ${result.currencyEmoji}\nYou need more funds.` }
                            )
                            .setTimestamp();
                        await safeEditReply(interaction, { embeds: [failedEmbed], components: [], ephemeral: true }, true);
                    } else {
                        await sendInteractionError(interaction, result.message || 'Purchase failed.', true, deferredThisInteraction);
                    }
                } catch (confirmErr) { console.error('[ShopConfirm Error]', confirmErr); await sendInteractionError(interaction, 'Error processing purchase.', true, deferredThisInteraction); }
                return;
            }
            if (customId.startsWith('shop_apply_discount|')) {
                if (!interaction.isButton()) return;
                const parts = customId.split('|');
                const itemId = parts[1];
                const amt = parseInt(parts[2]);

                const modal = new ModalBuilder()
                    .setCustomId(`shop_discount_modal|${itemId}|${amt}`)
                    .setTitle('Apply Discount Ticket');
                const input = new TextInputBuilder()
                    .setCustomId('discount_type_input')
                    .setLabel('Discount Percent (10 / 25 / 50 / 100)')
                    .setPlaceholder('10 / 25 / 50 / 100')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal).catch(async e => { console.error('Show modal error', e); await sendInteractionError(interaction, 'Failed to open input.', true); });
                return;
            }
            if (customId.startsWith('shop_discount_modal|')) {
                if (!interaction.isModalSubmit()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    const parts = customId.split('|');
                    const itemId = parts[1];
                    const amt = parseInt(parts[2]);
                    const pctStr = interaction.fields.getTextInputValue('discount_type_input');
                    const pct = parseInt(pctStr);
                    const pctMap = {
                        10: client.levelSystem.DISCOUNT_TICKET_10_ID,
                        25: client.levelSystem.DISCOUNT_TICKET_25_ID,
                        50: client.levelSystem.DISCOUNT_TICKET_50_ID,
                        100: client.levelSystem.DISCOUNT_TICKET_100_ID
                    };
                    const ticketId = pctMap[pct];
                    if (!ticketId) {
                        return sendInteractionError(interaction, 'Invalid discount type.', true, deferredThisInteraction);
                    }
                    const inv = client.levelSystem.getItemFromInventory(interaction.user.id, interaction.guild.id, ticketId);
                    if (!inv || inv.quantity < 1) {
                        return sendInteractionError(interaction, 'You do not have that discount ticket.', true, deferredThisInteraction);
                    }

                    const preview = await client.levelSystem.shopManager.purchaseItem(interaction.user.id, interaction.guild.id, itemId, amt, member, { simulateOnly: true, extraDiscountPercent: pct });
                    if (!preview.success) {
                        if (preview.itemId) {
                            const failEmbed = new EmbedBuilder()
                                .setColor(0xe74c3c)
                                .setTitle('❌ Purchase Failed')
                                .setDescription(preview.message || 'Purchase failed.')
                                .addFields(
                                    { name: 'Item', value: `${preview.emoji}${preview.itemName} (ID: ${preview.itemId})\nAmount: ${preview.amount}\nPrice Each: ${preview.pricePerItem.toLocaleString()} ${preview.currencyEmoji}` },
                                    { name: 'SUMMARY', value: `Discount: ${preview.discountAmount.toLocaleString()} ${preview.currencyEmoji}\nTotal Price: ${preview.totalCost.toLocaleString()} ${preview.currencyEmoji}\nYou need more funds.` }
                                )
                                .setTimestamp();
                            await safeEditReply(interaction, { embeds: [failEmbed], components: [], ephemeral: true }, true);
                        } else {
                            await sendInteractionError(interaction, preview.message || 'Purchase failed.', true, deferredThisInteraction);
                        }
                        return;
                    }

                    const originalTotal = preview.totalCost + preview.discountAmount;
                    let discountLine = `Discount Applied: ${preview.discountAmount.toLocaleString()} ${preview.currencyEmoji}`;
                    if (preview.discountAmount > 0) discountLine += ` (${preview.discountPercent}%)`;
                    let summaryValue = `${discountLine}\nTotal: ${preview.totalCost.toLocaleString()} ${preview.currencyEmoji}`;
                    if (preview.discountAmount > 0) summaryValue += `\n-# Original Total: ${originalTotal.toLocaleString()} ${preview.currencyEmoji}`;
                    summaryValue += `\nRemaining Stock: ${preview.newStock}`;

                    const receiptEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle('🧾 Purchase Receipt')
                        .setDescription(`Using ${pct}% discount ticket.`)
                        .addFields(
                            { name: 'Item', value: `${preview.emoji} ${preview.itemName} (ID: ${preview.itemId})\nQuantity: ${preview.amount}\nPrice Each: ${preview.pricePerItem.toLocaleString()} ${preview.currencyEmoji}` },
                            { name: 'Summary', value: summaryValue }
                        )
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`shop_confirm|${preview.itemId}|${preview.amount}|${pct}|${ticketId}`).setLabel('Confirm').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`shop_apply_discount|${preview.itemId}|${preview.amount}`).setLabel('Apply Discount').setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('shop_cancel').setLabel('Deny').setStyle(ButtonStyle.Danger)
                    );
                    await safeEditReply(interaction, { embeds: [receiptEmbed], components: [row], ephemeral: true }, false);
                } catch (applyErr) { console.error('[ShopApplyDiscount Error]', applyErr); await sendInteractionError(interaction, 'Error applying discount.', true, deferredThisInteraction); }
                return;
            }
            if (customId === 'shop_cancel') {
                if (!interaction.isButton()) return;
                await interaction.reply({ content: 'Purchase cancelled.', ephemeral: true }).catch(() => {});
                return;
            }
            if (customId === 'shop_instant_restock_prompt') {
                if (!interaction.guild) return sendInteractionError(interaction, "Shop interactions require a server context.", true);
                if (!interaction.isButton()) return;
                 const instantRestockGemCost = client.levelSystem.gameConfig.globalSettings.INSTANT_RESTOCK_GEM_COST || 5;
                const confirmModal = new ModalBuilder()
                    .setCustomId('shop_instant_restock_modal')
                    .setTitle(`Confirm Restock (${instantRestockGemCost} Gems)`);
                const confirmationInput = new TextInputBuilder()
                    .setCustomId('shop_restock_confirmation_input')
                    .setLabel('Type "CONFIRM" to proceed')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('CONFIRM')
                    .setRequired(true);
                confirmModal.addComponents(new ActionRowBuilder().addComponents(confirmationInput));
                await interaction.showModal(confirmModal).catch(async e => {
                    console.error('[ShopRestockPromptModal Show Error]', e);
                    await sendInteractionError(interaction, "Failed to open restock confirmation.", true);
                });
                return;
            }
            if (customId === 'shop_instant_restock_modal') {
                if (!interaction.guild) return sendInteractionError(interaction, "Shop interactions require a server context.", true);
                if (!interaction.isModalSubmit()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                try {
                    const confirmation = interaction.fields.getTextInputValue('shop_restock_confirmation_input');
                    if (confirmation.trim().toLowerCase() !== "confirm") {
                        return sendInteractionError(interaction, "Restock not confirmed.", true, deferredThisInteraction);
                    }

                    const instantRestockGemCost = client.levelSystem.gameConfig.globalSettings.INSTANT_RESTOCK_GEM_COST || 5;
                    const userBalance = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                    const gemEmoji = client.levelSystem.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;

                    if (userBalance.gems < instantRestockGemCost) {
                        return sendInteractionError(interaction, `You need ${instantRestockGemCost} ${gemEmoji} for an instant restock. You have ${userBalance.gems}.`, true, deferredThisInteraction);
                    }

                    client.levelSystem.addGems(interaction.user.id, interaction.guild.id, -instantRestockGemCost, "shop_instant_restock_cost");
                    const restockResult = await client.levelSystem.shopManager.restockShop(interaction.guild.id, true); // True for forced

                    if (restockResult.success) {
                        await safeEditReply(interaction, { content: `✅ Shop instantly restocked for ${instantRestockGemCost} ${gemEmoji}!`, ephemeral: false }, true, 10000);
                        await refreshShopDisplayForGuild(interaction.guild.id, client);
                        await sendRestockAlerts(client, interaction.guild, restockResult, true);
                    } else {
                        // Refund gems if restock failed after payment
                        client.levelSystem.addGems(interaction.user.id, interaction.guild.id, instantRestockGemCost, "shop_restock_refund");
                        await sendInteractionError(interaction, `Failed to instantly restock: ${restockResult.message}. Gems refunded.`, true, deferredThisInteraction);
                    }
                } catch (shopRestockError) { console.error('[ShopInstantRestockModal Process Error]', shopRestockError); await sendInteractionError(interaction, "Error processing instant restock.", true, deferredThisInteraction); }
                return;
            }

            if (customId === 'slots_prize') {
                if (!interaction.isButton()) return;
                const embed = buildSlotsPrizeEmbed();
                await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
                return;
            }

            if (customId === 'slots_bet') {
                if (!interaction.isButton()) return;
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const session = slotsSessions.get(key);
                if (!session || session.messageId !== interaction.message.id) return;
                const modal = new ModalBuilder()
                    .setCustomId('slots_bet_modal')
                    .setTitle('Place Your Bet');
                const curInput = new TextInputBuilder()
                    .setCustomId('slots_currency')
                    .setLabel('Currency (coin/gem)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const amtInput = new TextInputBuilder()
                    .setCustomId('slots_amount')
                    .setLabel('Amount')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(curInput), new ActionRowBuilder().addComponents(amtInput));
                await interaction.showModal(modal).catch(() => {});
                return;
            }

            if (customId === 'slots_bet_modal') {
                if (!interaction.isModalSubmit()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const session = slotsSessions.get(key);
                if (!session) {
                    const errEmbed = buildSlotsEmbed(interaction.user, null, null, null, null,
                        '<:serror:1390640264392998942> Start a slots game first using /slots.');
                    await safeEditReply(interaction, { embeds: [errEmbed], ephemeral: true });
                    return;
                }
                const currencyRaw = interaction.fields.getTextInputValue('slots_currency').toLowerCase();
                const amountRaw = interaction.fields.getTextInputValue('slots_amount').replace(/,/g, '');
                const isAllBet = amountRaw.trim().toLowerCase() === 'all';
                const parsedAmount = parseAbbreviatedNumber(amountRaw);
                if (!isAllBet && (isNaN(parsedAmount) || parsedAmount <= 0)) {
                    const errEmbed = buildSlotsEmbed(interaction.user, session.bet, null, null, null,
                        '<:serror:1390640264392998942> Invalid bet amount.');
                    try {
                        const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                        if (msg && msg.editable) await msg.edit({ embeds: [errEmbed] });
                    } catch {}
                    await safeEditReply(interaction, { content: ' ', ephemeral: true });
                    return;
                }
                if (currencyRaw.includes('robux')) {
                    const errEmbed = buildSlotsEmbed(interaction.user, session.bet, null, null, null,
                        '<:serror:1390640264392998942> You cannot bet Robux.');
                    try {
                        const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                        if (msg && msg.editable) await msg.edit({ embeds: [errEmbed] });
                    } catch {}
                    await safeEditReply(interaction, { content: ' ', ephemeral: true });
                    return;
                }
                const currency = currencyRaw.includes('gem') ? 'gems' : 'coins';
                const balance = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                const bank = client.levelSystem.getBankBalance(interaction.user.id, interaction.guild.id);
                const total = currency === 'coins' ? balance.coins + bank.bankCoins : balance.gems + bank.bankGems;
                const amount = isAllBet ? total : parsedAmount;
                if (total < amount) {
                    const errEmbed = buildSlotsEmbed(interaction.user, session.bet, null, null, null,
                        '<:serror:1390640264392998942> Insufficient funds for that bet.');
                    try {
                        const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                        if (msg && msg.editable) await msg.edit({ embeds: [errEmbed] });
                    } catch {}
                    await safeEditReply(interaction, { content: ' ', ephemeral: true });
                    return;
                }
                const emoji = currency === 'coins' ? client.levelSystem.coinEmoji : client.levelSystem.gemEmoji;
                if (isAllBet) {
                    session.pendingBet = { currency, amount, currencyEmoji: emoji, currencyId: currency === 'coins' ? client.levelSystem.COINS_ID : client.levelSystem.GEMS_ID };
                    slotsSessions.set(key, session);
                    const confirmEmbed = new EmbedBuilder()
                        .setColor(0xe67e22)
                        .setTitle('All In Bet')
                        .setDescription(`${interaction.user}, you are about to bet **${formatNumber(amount)}** ${emoji}.`);
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('slots_all_confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('slots_all_deny').setLabel('Deny').setStyle(ButtonStyle.Secondary)
                    );
                    await safeEditReply(interaction, { embeds: [confirmEmbed], components: [row], ephemeral: true });
                    return;
                }
                session.bet = { currency, amount, currencyEmoji: emoji, currencyId: currency === 'coins' ? client.levelSystem.COINS_ID : client.levelSystem.GEMS_ID };
                slotsSessions.set(key, session);
                const embed = buildSlotsEmbed(interaction.user, session.bet);
                const components = [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('slots_roll').setLabel('ROLL').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('slots_bet').setLabel('BET').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('slots_prize').setLabel('PRIZE').setStyle(ButtonStyle.Secondary)
                )];
                try {
                    const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                    if (msg && msg.editable) await msg.edit({ embeds: [embed], components });
                } catch {}
                await interaction.editReply({ content: 'Bet updated!', embeds: [], components: [] }).catch(() => {});
                return;
            }

            if (customId === 'slots_all_confirm') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const session = slotsSessions.get(key);
                if (!session || !session.pendingBet) {
                    const errEmbed = buildSlotsEmbed(interaction.user, session?.bet || null, null, null, null,
                        '<:serror:1390640264392998942> No all-in bet pending.');
                    try {
                        if (session) {
                            const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                            if (msg && msg.editable) await msg.edit({ embeds: [errEmbed] });
                        }
                    } catch {}
                    await safeEditReply(interaction, { content: ' ', ephemeral: true });
                    return;
                }
                session.bet = session.pendingBet;
                delete session.pendingBet;
                slotsSessions.set(key, session);
                const embed = buildSlotsEmbed(interaction.user, session.bet);
                const components = [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('slots_roll').setLabel('ROLL').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('slots_bet').setLabel('BET').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('slots_prize').setLabel('PRIZE').setStyle(ButtonStyle.Secondary)
                )];
                try {
                    const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                    if (msg && msg.editable) await msg.edit({ embeds: [embed], components });
                } catch {}
                await safeEditReply(interaction, { content: 'Bet updated!', embeds: [], components: [], ephemeral: true });
                return;
            }
            if (customId === 'slots_all_deny') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const session = slotsSessions.get(key);
                if (session && session.pendingBet) {
                    delete session.pendingBet;
                    slotsSessions.set(key, session);
                }
                await safeEditReply(interaction, { content: 'Bet cancelled.', embeds: [], components: [], ephemeral: true });
                return;
            }
            if (customId === 'slots_roll') {
                if (!interaction.isButton()) return;
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const session = slotsSessions.get(key);
                if (!session || session.messageId !== interaction.message.id || !session.bet) {
                    const errEmbed = buildSlotsEmbed(interaction.user, null, null, null, null, '<:serror:1390640264392998942> You didn\'t place a bet');
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.update({ embeds: [errEmbed], components: [] }).catch(() => {});
                    } else if (interaction.message && interaction.message.editable) {
                        await interaction.message.edit({ embeds: [errEmbed], components: [] }).catch(() => {});
                    }
                    return;
                }
                const balCheck = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                const bankCheck = client.levelSystem.getBankBalance(interaction.user.id, interaction.guild.id);
                const walletCheck = session.bet.currency === 'coins' ? balCheck.coins : balCheck.gems;
                const bankAmountCheck = session.bet.currency === 'coins' ? bankCheck.bankCoins : bankCheck.bankGems;
                if (walletCheck + bankAmountCheck < session.bet.amount) {
                    const errEmbed = buildSlotsEmbed(interaction.user, session.bet, null, null, null,
                        '<:serror:1390640264392998942> Bet too high.');
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.update({ embeds: [errEmbed], components: [] }).catch(() => {});
                    } else if (interaction.message && interaction.message.editable) {
                        await interaction.message.edit({ embeds: [errEmbed], components: [] }).catch(() => {});
                    }
                    return;
                }
                const rollingEmbed = buildSlotsEmbed(interaction.user, session.bet, [
                    {emoji:'<a:randomslots:1390621328586833960>',id:'r'},
                    {emoji:'<a:randomslots:1390621328586833960>',id:'r'},
                    {emoji:'<a:randomslots:1390621328586833960>',id:'r'}
                ]);
                const disabledComponents = [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('slots_roll').setLabel('ROLL').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('slots_bet').setLabel('BET').setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId('slots_prize').setLabel('PRIZE').setStyle(ButtonStyle.Secondary).setDisabled(true)
                )];
                const enabledComponents = [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('slots_roll').setLabel('ROLL').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('slots_bet').setLabel('BET').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('slots_prize').setLabel('PRIZE').setStyle(ButtonStyle.Secondary)
                )];
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.update({ embeds: [rollingEmbed], components: disabledComponents }).catch(() => {});
                } else if (interaction.message && interaction.message.editable) {
                    await interaction.message.edit({ embeds: [rollingEmbed], components: disabledComponents }).catch(() => {});
                }
                setTimeout(async () => {
                    const symbols = [
                        pickRandomSymbolForUser(key),
                        pickRandomSymbolForUser(key),
                        pickRandomSymbolForUser(key)
                    ];
                    const multiplier = calculateMultiplier(symbols);
                    const prize = session.bet.amount * multiplier;
                    if (prize > 0) {
                        const bal = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                        const bankBal = client.levelSystem.getBankBalance(interaction.user.id, interaction.guild.id);
                        let wallet = session.bet.currency === 'coins' ? bal.coins : bal.gems;
                        if (wallet < session.bet.amount) {
                            const need = session.bet.amount - wallet;
                            client.levelSystem.withdrawFromBank(interaction.user.id, interaction.guild.id, session.bet.currency, need);
                        }
                        if (session.bet.currency === 'coins') {
                            client.levelSystem.addCoins(interaction.user.id, interaction.guild.id, -session.bet.amount, 'slots_bet');
                            client.levelSystem.addCoins(interaction.user.id, interaction.guild.id, prize, 'slots_win', { currency: 1.0 }, true);
                        } else {
                            client.levelSystem.addGems(interaction.user.id, interaction.guild.id, -session.bet.amount, 'slots_bet');
                            client.levelSystem.addGems(interaction.user.id, interaction.guild.id, prize, 'slots_win', { gem: 1.0 }, true);
                        }
                    } else if (prize < 0) {
                        let cost = -prize;
                        const bal = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                        const bankBal = client.levelSystem.getBankBalance(interaction.user.id, interaction.guild.id);
                        let wallet = session.bet.currency === 'coins' ? bal.coins : bal.gems;
                        if (wallet < cost) {
                            const need = cost - wallet;
                            client.levelSystem.withdrawFromBank(interaction.user.id, interaction.guild.id, session.bet.currency, need);
                        }
                        if (session.bet.currency === 'coins') client.levelSystem.addCoins(interaction.user.id, interaction.guild.id, -cost, 'slots_loss');
                        else client.levelSystem.addGems(interaction.user.id, interaction.guild.id, -cost, 'slots_loss');
                    } else {
                        const bal = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                        const bankBal = client.levelSystem.getBankBalance(interaction.user.id, interaction.guild.id);
                        let wallet = session.bet.currency === 'coins' ? bal.coins : bal.gems;
                        if (wallet < session.bet.amount) {
                            const need = session.bet.amount - wallet;
                            client.levelSystem.withdrawFromBank(interaction.user.id, interaction.guild.id, session.bet.currency, need);
                        }
                        if (session.bet.currency === 'coins') client.levelSystem.addCoins(interaction.user.id, interaction.guild.id, -session.bet.amount, 'slots_loss');
                        else client.levelSystem.addGems(interaction.user.id, interaction.guild.id, -session.bet.amount, 'slots_loss');
                    }
                    const finalEmbed = buildSlotsEmbed(interaction.user, session.bet, symbols, multiplier, prize);
                    if (symbols.every(s => s.id === 'shoe')) {
                        slotsLuckBoosts.set(key, {
                            multiplier: 1,
                            expiry: Date.now() + SLOT_LUCK_BOOST_DURATION_MS
                        });
                        finalEmbed.addFields({
                            name: 'Luck Boost Activated! 🍀',
                            value: 'Boost lasts 5 minutes. Rare symbols are 100% easier to roll.'
                        });
                    }
                    try {
                        if (interaction.message && interaction.message.editable) await interaction.message.edit({ embeds:[finalEmbed], components: enabledComponents });
                    } catch {}
                    if (symbols.every(s => s.id === 'lucky7')) {
                        const ch = await client.channels.fetch('1373564899199811625').catch(() => null);
                        if (ch?.isTextBased?.()) {
                            const e = new EmbedBuilder().setColor(randomColor()).setTitle('JACKPOT!').setDescription(`${interaction.user} rolled 3 Lucky 7s!`);
                            await ch.send({ embeds:[e] }).catch(()=>{});
                        }
                    } else if (symbols.every(s => s.id === 'diamond_gem')) {
                        const ch = await client.channels.fetch('1373564899199811625').catch(() => null);
                        if (ch?.isTextBased?.()) {
                            const e = new EmbedBuilder().setColor(randomColor()).setTitle('Luxury Win!').setDescription(`${interaction.user} rolled 3 Diamonds!`);
                            await ch.send({ embeds:[e] }).catch(()=>{});
                        }
                    }
                }, 2000);
                return;
            }

            const bankMessageKey = interaction.guild ? `${interaction.user.id}_${interaction.guild.id}` : null;
            if (customId.startsWith('bank_')) {
                if (!interaction.guild) return sendInteractionError(interaction, "Bank interactions require a server context.", true);
                if (!interaction.isButton() && !interaction.isModalSubmit()) return;

                const activeBankInteraction = client.activeBankMessages.get(bankMessageKey);
                if (activeBankInteraction && activeBankInteraction.messageId !== interaction.message.id) {
                    // This bank panel is outdated, guide user to the new one or ignore.
                    // safeReply is not a standard function, assuming it is meant to be interaction.reply or similar
                    await interaction.reply({ content: "Please use your most recent bank panel.", ephemeral: true }).catch(() => {});
                    return;
                }

                if (interaction.isButton()) {
    const action = customId.split('_')[1];
    if (action === 'upgrade') {
        // Acknowledge the interaction and update the panel at the end
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferUpdate().catch(e => console.warn("Bank upgrade button deferUpdate failed:", e.message));
        }

        // Perform the upgrade logic
        const upgradeResult = client.levelSystem.upgradeBankTier(interaction.user.id, interaction.guild.id);

        // Send an ephemeral follow-up to the user with the result
        await interaction.followUp({ content: upgradeResult.message, ephemeral: true }).catch(e => console.warn("Bank upgrade followup failed:", e.message));

        if (upgradeResult.success && upgradeResult.newTier && upgradeResult.newTier >= 10) {
            try {
                const role = interaction.guild.roles.cache.get(BANK_MAXED_ROLE_ID);
                if (role && interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles) && interaction.guild.members.me.roles.highest.position > role.position) {
                    if (!interaction.member.roles.cache.has(BANK_MAXED_ROLE_ID)) {
                        await interaction.member.roles.add(role).catch(() => {});
                    }
                }
            } catch (e) {
                console.warn(`[BankUpgradeRole] Failed to assign role: ${e.message}`);
            }
        }

        // After all interaction responses are done, update the original message panel
        try {
            const updatedBankEmbed = await buildBankEmbed(interaction.user, interaction.guild.id, client.levelSystem);
            const updatedBankComponents = getBankComponents(interaction.user.id, interaction.guild.id, client.levelSystem);
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [updatedBankEmbed], components: updatedBankComponents }).catch(() => {});
                await setBankMessageTimeout(interaction, interaction.message.id, bankMessageKey);
            } else if (interaction.message && interaction.message.editable) {
                await interaction.message.edit({ embeds: [updatedBankEmbed], components: updatedBankComponents }).catch(() => {});
                await setBankMessageTimeout(interaction, interaction.message.id, bankMessageKey);
            }
        } catch (e) {
            console.error("Error refreshing bank panel after upgrade:", e);
        }
        // It's crucial to return here to prevent any further logic from running.
        return;

    } else { // deposit or withdraw
        const currencyType = customId.split('_')[2]; // coins or gems
        const modal = new ModalBuilder()
            .setCustomId(`bank_${action}_${currencyType}_modal`)
            .setTitle(`${action === 'deposit' ? 'Deposit' : 'Withdraw'} ${currencyType === 'coins' ? 'Coins' : 'Gems'}`);
        const amountInput = new TextInputBuilder()
            .setCustomId('bank_amount_input')
            .setLabel('Amount')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter amount or "all"')
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
        
        await interaction.showModal(modal).catch(async e => {
            // Add specific handling for the "Unknown Interaction" error
            if (e.code === 10062) {
                console.warn(`[Bank Modal] Attempted to show modal for an expired interaction (${customId}). User may have been too slow to click.`);
            } else if (e.code !== 40060) { // 40060 = Interaction Already Replied
                console.error(`[Bank Modal Show Error - ${customId}]`, e);
            }
        });
        return; // This return is correct and was already here.
    }
                } else if (interaction.isModalSubmit()) { // Modal submission for deposit/withdraw
                     if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                    try {
                        const modalAction = customId.split('_')[1];
                        const modalCurrency = customId.split('_')[2];
                        const amountStr = interaction.fields.getTextInputValue('bank_amount_input').toLowerCase();
                        const user = client.levelSystem.getUser(interaction.user.id, interaction.guild.id); // Get latest user data
                        let amount;

                        if (amountStr === 'all') {
                            if (modalAction === 'deposit') {
                                amount = modalCurrency === 'coins' ? user.coins : user.gems;
                            } else { // withdraw
                                amount = modalCurrency === 'coins' ? user.bankCoins : user.bankGems;
                            }
                        } else {
                            amount = parseAbbreviatedNumber(amountStr);
                            if (isNaN(amount) || amount <= 0) return sendInteractionError(interaction, "Invalid amount. Please enter a number or 'all'.", true, deferredThisInteraction);
                        }

                        let result;
                        if (modalAction === 'deposit') result = client.levelSystem.depositToBank(interaction.user.id, interaction.guild.id, modalCurrency, amount);
                        else result = client.levelSystem.withdrawFromBank(interaction.user.id, interaction.guild.id, modalCurrency, amount);

                        await safeEditReply(interaction, { content: result.message, ephemeral: true });
                    } catch (bankModalError) { console.error(`[Bank Modal Process Error - ${customId}]`, bankModalError); await sendInteractionError(interaction, "Error processing bank transaction.", true, deferredThisInteraction); }
                }
                // Refresh bank embed after any action
                try {
                    const updatedBankEmbed = await buildBankEmbed(interaction.user, interaction.guild.id, client.levelSystem);
                    const updatedBankComponents = getBankComponents(interaction.user.id, interaction.guild.id, client.levelSystem);
                    if (interaction.message && interaction.message.editable) { // Check if original message is editable
                        await interaction.message.edit({ embeds: [updatedBankEmbed], components: updatedBankComponents }).catch(e => console.warn("Failed to edit bank message after action", e.message));
                        // Reset timeout for the bank message
                        await setBankMessageTimeout(interaction, interaction.message.id, bankMessageKey);
                    }
                } catch (bankRefreshError) { console.error('[Bank Interaction] Error refreshing bank embed:', bankRefreshError); }
                return;
            }

            if (customId === 'inventory_nav_select') {
                if (!interaction.guild) return sendInteractionError(interaction, "Inventory interactions require a server context.", true);
                if (!interaction.isStringSelectMenu()) return;
                const selectedTab = interaction.values[0];
                try {
                    const { embed } = await buildInventoryEmbed(interaction.user, interaction.guild.id, client.levelSystem, selectedTab);
                    const components = getInventoryNavComponents(selectedTab);
                    await interaction.update({ embeds: [embed], components });
                } catch (invNavError) { console.error('[Inventory Nav Error]', invNavError); await sendInteractionError(interaction, "Could not update inventory view.", true); }
                return;
            }

            if (customId.startsWith('see_user_inventory_nav_select_')) {
                if (!interaction.guild) return sendInteractionError(interaction, "Inventory interactions require a server context.", true);
                if (!interaction.isStringSelectMenu()) return;
                const selectedTab = interaction.values[0];
                const targetUserId = customId.replace('see_user_inventory_nav_select_', '');
                try {
                    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
                    if (!targetUser) return sendInteractionError(interaction, 'User not found.', true);
                    const { embed } = await buildInventoryEmbed(targetUser, interaction.guild.id, client.levelSystem, selectedTab);
                    const components = getInventoryNavComponents(selectedTab, customId);
                    await interaction.update({ embeds: [embed], components });
                } catch (invNavError) { console.error('[SeeUser Inventory Nav Error]', invNavError); await sendInteractionError(interaction, 'Could not update inventory view.', true); }
                return;
            }

            if (customId === 'item_info_cancel_browse') {
                if (!interaction.isButton()) return;
                await interaction.update({}).catch(() => {});
                if (interaction.message.deletable) {
                    await interaction.message.delete().catch(() => {});
                }
                return;
            }
            if (customId.startsWith('item_info_category_select_')) {
                if (!interaction.guild) return sendInteractionError(interaction, "Item info interactions require a server context.", true);
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(e => console.warn("Item info cat select deferUpdate failed", e)); }
                const category = customId.replace('item_info_category_select_', '');
                let itemsForCategory = [];
                if (category === 'lootboxes') itemsForCategory = client.levelSystem.getAllLootBoxDefinitionsForInfo();
                else if (category === 'charms') itemsForCategory = client.levelSystem.getAllCharmDefinitionsForInfo();
                else if (category === 'others') itemsForCategory = client.levelSystem.getAllOtherItemsForInfo();

                if (itemsForCategory.length === 0) {
                    return safeEditReply(interaction, { content: 'No items found in this category.', components: [], ephemeral: false }, true);
                }
                const itemOptions = itemsForCategory.slice(0, 25).map(item => ({
                    label: item.name,
                    description: item.description || item.name,
                    value: item.id,
                    emoji: item.emoji || undefined
                }));
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`item_info_specific_select_${category}`)
                    .setPlaceholder(`Select a ${category.slice(0,-1)} to view details`)
                    .addOptions(itemOptions);
                await safeEditReply(interaction, { components: [new ActionRowBuilder().addComponents(selectMenu), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('item_info_back_to_categories').setLabel('Back').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('item_info_cancel_browse').setLabel('Cancel').setStyle(ButtonStyle.Danger))], ephemeral: false }, true);
                return;
            }
            if (customId.startsWith('item_info_specific_select')) {
                if (!interaction.guild) return sendInteractionError(interaction, "Item info interactions require a server context.", true);
                if (!interaction.isStringSelectMenu()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(e => console.warn("Item info specific select deferUpdate failed", e)); }
                const category = customId.replace('item_info_specific_select_', '');
                const selectedItemId = interaction.values[0];
                try {
                    const itemEmbed = await client.levelSystem.buildItemInfoEmbed(selectedItemId, null, interaction.user.id, interaction.guild.id, client);
                    const backRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`item_info_back_${category}`).setLabel('Back').setStyle(ButtonStyle.Secondary)
                    );
                    await safeEditReply(interaction, { embeds: [itemEmbed], components: [backRow], content: null, ephemeral: false }, true);
                } catch (itemInfoDisplayError) { console.error('[ItemInfo Specific Display Error]', itemInfoDisplayError); await sendInteractionError(interaction, "Could not display item details.", false, true); } // Pass deferred
                return;
            }
            if (customId === 'item_info_back_to_categories') {
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(() => {}); }
                const categoryButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('item_info_category_select_lootboxes').setLabel('Chests').setStyle(ButtonStyle.Primary).setEmoji('📦'),
                        new ButtonBuilder().setCustomId('item_info_category_select_charms').setLabel('Charms').setStyle(ButtonStyle.Primary).setEmoji('✨'),
                        new ButtonBuilder().setCustomId('item_info_category_select_others').setLabel('Other Items').setStyle(ButtonStyle.Primary).setEmoji('🔖'),
                        new ButtonBuilder().setCustomId('item_info_cancel_browse').setLabel('Cancel').setStyle(ButtonStyle.Danger)
                    );
                await safeEditReply(interaction, { content: 'Select an item category to browse:', components: [categoryButtons], ephemeral: false }, true);
                return;
            }
            if (customId.startsWith('item_info_back_')) {
                if (!interaction.guild) return sendInteractionError(interaction, "Item info interactions require a server context.", true);
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(() => {}); }
                const category = customId.replace('item_info_back_', '');
                let itemsForCategory = [];
                if (category === 'lootboxes') itemsForCategory = client.levelSystem.getAllLootBoxDefinitionsForInfo();
                else if (category === 'charms') itemsForCategory = client.levelSystem.getAllCharmDefinitionsForInfo();
                else if (category === 'others') itemsForCategory = client.levelSystem.getAllOtherItemsForInfo();
                if (itemsForCategory.length === 0) {
                    return safeEditReply(interaction, { content: 'No items found in this category.', components: [], ephemeral: false }, true);
                }
                const itemOptions = itemsForCategory.slice(0, 25).map(item => ({
                    label: item.name,
                    description: item.description || item.name,
                    value: item.id,
                    emoji: item.emoji || undefined
                }));
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`item_info_specific_select_${category}`)
                    .setPlaceholder(`Select a ${category.slice(0,-1)} to view details`)
                    .addOptions(itemOptions);
                const components = [
                    new ActionRowBuilder().addComponents(selectMenu),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('item_info_back_to_categories').setLabel('Back').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('item_info_cancel_browse').setLabel('Cancel').setStyle(ButtonStyle.Danger)
                    )
                ];
                await safeEditReply(interaction, { components, embeds: [], content: 'Select an item:', ephemeral: false }, true);
                return;
            }
            if (customId.startsWith('badge_goto_') || customId.startsWith('badge_view_')) {
                if (!interaction.isButton()) return;
                const parts = customId.split('_');
                let view, page;
                if (parts[1] === 'goto') {
                    view = parts[2];
                    page = parseInt(parts[3]) || 1;
                } else {
                    view = parts[2];
                    page = parseInt(parts[3]) || 1;
                }
                const { embed, pageCount, page: curPage } = buildBadgeEmbed(interaction.user.id, interaction.guild.id, client, view, page);
                const components = getBadgeComponents(view, curPage, pageCount);
                await interaction.update({ embeds: [embed], components }).catch(() => {});
                return;
            }
            if (customId.startsWith('eb_')) {
                if (!interaction.message || !interaction.message.guildId) {
                     return sendInteractionError(interaction, "Embed builder panel context lost or invalid.", true);
                }
                const sessionId = customId.substring(customId.lastIndexOf('_') + 1);
                const session = embedBuildingSessions.get(sessionId);
                if (!session || session.userId !== interaction.user.id) {
                    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                        return sendInteractionError(interaction, "This embed builder session is invalid, expired, or not yours.", true);
                    } else if (interaction.isRepliable()) { // If already deferred/replied
                        return sendInteractionError(interaction, "This embed builder session is invalid, expired, or not yours.", true, true);
                    }
                    return; // Cannot reply further
                }

                // Reset timeout
                if (session.timeoutInstance) clearTimeout(session.timeoutInstance);
                session.timeoutInstance = setTimeout(async () => {
                    if (embedBuildingSessions.has(sessionId)) {
                        client.levelSystem.deleteEmbedSession(sessionId); // Remove from DB
                        embedBuildingSessions.delete(sessionId); // Remove from memory
                        // Attempt to delete the panel message
                        if (interaction.message && interaction.message.deletable) { // interaction.message should be the panel message
                            try { await interaction.message.delete(); }
                            catch (e) { if (e.code !== 10008) console.warn("Failed to delete timed out embed panel (from eb_ timeout):", e.message); }
                        }
                        console.log(`Embed builder session ${sessionId} timed out and was cleaned up from component interaction.`);
                    }
                }, EMBED_BUILDER_TIMEOUT_MS);

                if (interaction.isButton()) {
                    const action = customId.substring(3, customId.lastIndexOf('_'));
                    let modal;
                    switch (action) {
                        case 'setTitle':
                            modal = new ModalBuilder().setCustomId(`eb_setTitleModal_${sessionId}`).setTitle('Set Embed Title');
                            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eb_title_input').setLabel('Title').setStyle(TextInputStyle.Short).setValue(session.embedData.title || '').setRequired(false)));
                            await interaction.showModal(modal).catch(console.error);
                            break;
                        case 'setDesc':
                             modal = new ModalBuilder().setCustomId(`eb_setDescModal_${sessionId}`).setTitle('Set Embed Description');
                             modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eb_desc_input').setLabel('Description').setStyle(TextInputStyle.Paragraph).setValue(session.embedData.description || '').setRequired(false)));
                             await interaction.showModal(modal).catch(console.error);
                            break;
                        case 'setColor':
                            modal = new ModalBuilder().setCustomId(`eb_setColorModal_${sessionId}`).setTitle('Set Embed Color');
                            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eb_color_input').setLabel('Hex Color (e.g., #FF0000 or FF0000)').setStyle(TextInputStyle.Short).setValue(session.embedData.color ? `#${session.embedData.color.toString(16).padStart(6, '0')}` : '').setRequired(false)));
                            await interaction.showModal(modal).catch(console.error);
                            break;
                         case 'setFooter':
                            modal = new ModalBuilder().setCustomId(`eb_setFooterModal_${sessionId}`).setTitle('Set Embed Footer');
                            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eb_footer_input').setLabel('Footer Text').setStyle(TextInputStyle.Short).setValue(session.embedData.footerText || '').setRequired(false)));
                            await interaction.showModal(modal).catch(console.error);
                            break;
                        case 'setThumb':
                            modal = new ModalBuilder().setCustomId(`eb_setThumbModal_${sessionId}`).setTitle('Set Embed Thumbnail URL');
                            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eb_thumb_url_input').setLabel('Thumbnail URL').setStyle(TextInputStyle.Short).setValue(session.embedData.thumbnailUrl || '').setRequired(false)));
                            await interaction.showModal(modal).catch(console.error);
                            break;
                        case 'setImage':
                            modal = new ModalBuilder().setCustomId(`eb_setImageModal_${sessionId}`).setTitle('Set Embed Image URL');
                            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eb_image_url_input').setLabel('Image URL').setStyle(TextInputStyle.Short).setValue(session.embedData.imageUrl || '').setRequired(false)));
                            await interaction.showModal(modal).catch(console.error);
                            break;
                        case 'toggleTimestamp':
                             if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(console.warn); }
                            session.embedData.timestamp = !session.embedData.timestamp;
                            client.levelSystem.saveEmbedSession(sessionId, session); // Save change to DB
                            const updatedPreviewTS = buildSessionPreviewEmbed(session);
                            const updatedComponentsTS = getSessionBuilderComponents(sessionId);
                            await interaction.message.edit({ embeds: [updatedPreviewTS], components: updatedComponentsTS }).catch(console.error);
                            break;
                        case 'manageFields': // Placeholder
                             if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(console.warn); }
                            await safeEditReply(interaction, { content: "Field management is a complex feature. Placeholder for now.", ephemeral: true, components:[] });
                            break;
                        case 'send':
                             if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(console.warn); }
                            const targetChannel = await client.channels.fetch(session.targetChannelId).catch(() => null);
                            if (!targetChannel || !targetChannel.isTextBased()) {
                                await sendInteractionError(interaction, "Target channel not found or invalid.", true, true); // Pass deferred
                                break;
                            }
                            const finalEmbed = buildSessionPreviewEmbed(session);
                             if (!finalEmbed.data.title && !finalEmbed.data.description && (!finalEmbed.data.fields || finalEmbed.data.fields.length === 0) && !finalEmbed.data.image && !finalEmbed.data.thumbnail) {
                                await sendInteractionError(interaction, "Cannot send an empty embed.", true, true); // Pass deferred
                                break;
                            }
                            try {
                                await targetChannel.send({ content: session.roleToMentionId ? `<@&${session.roleToMentionId}>` : null, embeds: [finalEmbed] });
                                await safeEditReply(interaction, { content: `Embed sent to <#${targetChannel.id}>! This panel will now be deleted.`, embeds:[], components: [], ephemeral: true }, true, 5000);
                                client.levelSystem.deleteEmbedSession(sessionId); // Delete from DB
                                embedBuildingSessions.delete(sessionId); // Delete from memory
                                if (interaction.message.deletable) await interaction.message.delete().catch(e=>{if(e.code !== 10008)console.warn("Failed to delete panel after send", e.message)});
                            } catch (sendError) {
                                console.error("Failed to send embed:", sendError);
                                await sendInteractionError(interaction, "Failed to send embed. Check bot permissions in target channel.", true, true); // Pass deferred
                            }
                            break;
                        case 'cancel':
                            if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(console.warn); }
                            client.levelSystem.deleteEmbedSession(sessionId); // Delete from DB
                            embedBuildingSessions.delete(sessionId); // Delete from memory
                            if (interaction.message && interaction.message.deletable) { // interaction.message should be the panel
                                await interaction.message.delete().catch(e => {if(e.code !== 10008)console.warn("Failed to delete embed builder panel (button):", e.message)});
                            }
                            await safeEditReply(interaction, { content: 'Embed creation cancelled and panel deleted.', components: [], embeds:[] }).catch(()=>{}); // Try to edit the original interaction reply
                            break;
                    }
                } else if (interaction.isModalSubmit()) { // Modal submissions for embed builder
                    if (!interaction.replied && !interaction.deferred) { await interaction.deferUpdate().catch(console.warn); } // Acknowledge modal submission

                    const actionType = customId.split('_')[1]; // e.g., 'setTitleModal' -> 'setTitleModal'
                    switch (actionType) {
                        case 'setTitleModal':
                            session.embedData.title = interaction.fields.getTextInputValue('eb_title_input') || null;
                            break;
                        case 'setDescModal':
                             session.embedData.description = interaction.fields.getTextInputValue('eb_desc_input') || null;
                            break;
                        case 'setColorModal':
                            const colorHex = interaction.fields.getTextInputValue('eb_color_input').replace('#', '');
                            session.embedData.color = colorHex ? parseInt(colorHex, 16) : null;
                            break;
                         case 'setFooterModal':
                            session.embedData.footerText = interaction.fields.getTextInputValue('eb_footer_input') || null;
                            break;
                        case 'setThumbModal':
                            session.embedData.thumbnailUrl = interaction.fields.getTextInputValue('eb_thumb_url_input') || null;
                            break;
                        case 'setImageModal':
                            session.embedData.imageUrl = interaction.fields.getTextInputValue('eb_image_url_input') || null;
                            break;
                    }
                    client.levelSystem.saveEmbedSession(sessionId, session); // Save changes to DB
                    const previewEmbed = buildSessionPreviewEmbed(session);
                    const builderComponents = getSessionBuilderComponents(sessionId);
                    // Update the panel message (interaction.message here refers to the panel message)
                    if(interaction.message && interaction.message.editable) {
                        await interaction.message.edit({ embeds: [previewEmbed], components: builderComponents }).catch(console.error);
                    }
                }
                return;
            }

            if (customId.startsWith('check_rank_')) {
                if (!interaction.guild) return sendInteractionError(interaction, 'Rank check requires a server context.', true);
                if (!interaction.isButton()) return;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferredThisInteraction = true; }
                const type = customId.replace('check_rank_', '');
                await interaction.guild.members.fetch().catch(()=>{});
                const blacklistSet = new Set();
                for (const rId of LEADERBOARD_BLACKLIST_ROLE_IDS) {
                    const role = interaction.guild.roles.cache.get(rId);
                    if (role) role.members.forEach(m => blacklistSet.add(m.id));
                }
                let replyMsg = 'Rank info unavailable.';
                if (type === 'level') {
                    const info = client.levelSystem.getLevelInfo(interaction.user.id, interaction.guild.id);
                    replyMsg = `Your level rank is **#${info.rank}**.`;
                } else if (type === 'coins') {
                    const data = client.levelSystem.getCoinRank(interaction.user.id, interaction.guild.id, Array.from(blacklistSet));
                    replyMsg = `Your coins rank is **#${data.rank}** with ${data.totalCoins.toLocaleString()} coins.`;
                } else if (type === 'gems') {
                    const data = client.levelSystem.getGemRank(interaction.user.id, interaction.guild.id, Array.from(blacklistSet));
                    replyMsg = `Your gems rank is **#${data.rank}** with ${data.totalGems.toLocaleString()} gems.`;
                } else if (type === 'value') {
                    const data = client.levelSystem.getValueRank(interaction.user.id, interaction.guild.id, Array.from(blacklistSet));
                    replyMsg = `Your value rank is **#${data.rank}** with total value ${data.totalValue.toLocaleString()}.`;
                }
                await safeEditReply(interaction, { content: replyMsg, ephemeral: true });
                return;
            }

            if (customId === 'enter_giveaway') {
                if (!interaction.guild) return sendInteractionError(interaction, "Giveaway entry requires a server context.", true);
                if (!interaction.isButton()) return;
                await handleEnterGiveaway(interaction, client.activeGiveaways);
                return;
            }
            if (customId.startsWith('claim_')) {
                if (!interaction.isButton()) return;
                await handleClaimPrize(interaction, client.activeGiveaways);
                return;
            }
            if (customId === 'join_build_battle') {
                if (!interaction.isButton()) return;
                await handleJoinInteraction(interaction);
                return;
            }
            if (customId === 'fish_market_sell') {
                if (!interaction.isButton()) return;
                const modal = new ModalBuilder()
                    .setCustomId('fish_sell_modal')
                    .setTitle('Sell Fish');
                const input = new TextInputBuilder()
                    .setCustomId('fish_sell_ids')
                    .setLabel('List the FISH\'s ID you mean to sell')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., C01041,C13400 or all')
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal).catch(() => {});
                return;
            }
            if (customId === 'fish_market_value') {
                if (!interaction.isButton()) return;
                const modal = new ModalBuilder()
                    .setCustomId('fish_value_modal')
                    .setTitle('Check Fish Value');
                const input = new TextInputBuilder()
                    .setCustomId('fish_value_id')
                    .setLabel('What fish ID?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter a fish ID')
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal).catch(() => {});
                return;
            }
            if (customId === 'fish_store_purchase') {
                if (!interaction.isButton()) return;
                const modal = new ModalBuilder()
                    .setCustomId('fish_store_purchase_modal')
                    .setTitle('Purchase Fishing Items');
                const idInput = new TextInputBuilder()
                    .setCustomId('fish_store_item_id')
                    .setLabel('Item ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('fishing_rod_tier1 or worm')
                    .setRequired(true);
                const amtInput = new TextInputBuilder()
                    .setCustomId('fish_store_amount')
                    .setLabel('Amount')
                    .setStyle(TextInputStyle.Short)
                    .setValue('1')
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(idInput), new ActionRowBuilder().addComponents(amtInput));
                await interaction.showModal(modal).catch(() => {});
                return;
            }
            if (customId === 'fish_store_purchase_modal') {
                if (!interaction.isModalSubmit()) return;
                let deferred = false;
                if (!interaction.replied && !interaction.deferred) { await safeDeferReply(interaction, { ephemeral: true }); deferred = true; }
                try {
                    const itemId = interaction.fields.getTextInputValue('fish_store_item_id').trim();
                    const amt = parseInt(interaction.fields.getTextInputValue('fish_store_amount').trim());
                    if (!itemId) return sendInteractionError(interaction, 'Item ID cannot be empty.', true, deferred);
                    if (isNaN(amt) || amt <= 0) return sendInteractionError(interaction, 'Amount must be a positive number.', true, deferred);
                    if (!['fishing_rod_tier1','worm'].includes(itemId)) return sendInteractionError(interaction, 'Invalid item ID.', true, deferred);
                    if (itemId === 'fishing_rod_tier1' && amt > 1) return sendInteractionError(interaction, 'You can only purchase one fishing rod.', true, deferred);
                    const userInv = client.levelSystem.getUserInventory(interaction.user.id, interaction.guild.id);
                    if (itemId === 'fishing_rod_tier1') {
                        const existing = userInv.generalItems.find(i => i.itemId.startsWith('fishing_rod'));
                        if (existing) return sendInteractionError(interaction, 'You already own a fishing rod.', true, deferred);
                    }
                    if (itemId === 'worm') {
                        const existingBait = userInv.generalItems.find(i => i.itemId === 'worm');
                        const current = existingBait ? existingBait.quantity : 0;
                        if (current + amt > MAX_BAIT) return sendInteractionError(interaction, `You can only hold ${MAX_BAIT} bait.`, true, deferred);
                    }
                    const price = itemId === 'fishing_rod_tier1' ? 10000 : 100;
                    const total = price * amt;
                    const bal = client.levelSystem.getBalance(interaction.user.id, interaction.guild.id);
                    const coinEmoji = client.levelSystem.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
                    if (bal.coins < total) return sendInteractionError(interaction, `You need ${total.toLocaleString()} ${coinEmoji} but only have ${bal.coins.toLocaleString()}.`, true, deferred);
                    client.levelSystem.addCoins(interaction.user.id, interaction.guild.id, -total, 'fish_store_purchase');
                    client.levelSystem.giveItem(interaction.user.id, interaction.guild.id, itemId, amt, client.levelSystem.itemTypes.ITEM, 'fish_store_purchase');
                    if (itemId === 'fishing_rod_tier1') {
                        const rodCfg = client.levelSystem.gameConfig.items[itemId];
                        client.levelSystem.setItemQuantity(interaction.user.id, interaction.guild.id, itemId, rodCfg.durability);
                    }
                    await interaction.editReply({ content: `Purchased ${amt}x ${itemId} for ${total.toLocaleString()} ${coinEmoji}.`, ephemeral: true });
                } catch (err) {
                    console.error('[FishStore Purchase]', err);
                    await sendInteractionError(interaction, 'Purchase failed.', true, deferred);
                }
                return;
            }
            if (customId === 'fish_sell_modal') {
                if (!interaction.isModalSubmit()) return;
                const idsStr = interaction.fields.getTextInputValue('fish_sell_ids').trim();
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const inv = client.userFishInventories.get(key) || [];
                const favs = client.userFavoriteFishInventories.get(key) || [];
                if (idsStr.trim().toLowerCase() === 'all') {
                    let total = 0; let baseTotal = 0;
                    for (const f of inv.slice()) {
                        if (favs.find(x => x.id === f.id)) continue;
                        const val = calculateFishValue(f);
                        total += val; baseTotal += f.baseValue || val;
                    }
                    const remaining = inv.filter(f => favs.find(x => x.id === f.id));
                    client.userFishInventories.set(key, remaining);
                    client.levelSystem.addFishDollars(interaction.user.id, interaction.guild.id, total, 'fish_sell_all');
                    persistFishData();
                    let msg = `Sold all fish for ${total.toFixed(2)} ${client.levelSystem.fishDollarEmoji || DEFAULT_FISH_DOLLAR_EMOJI_FALLBACK}`;
                    if (baseTotal !== total) msg += ` (${baseTotal.toFixed(2)})`;
                    return interaction.reply({ content: msg, ephemeral: true });
                }
                const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);
                let total = 0; let sold = 0; let baseTotal = 0;
                for (const id of ids) {
                    const idx = inv.findIndex(f => f.id === id && !favs.find(x => x.id === id));
                    if (idx !== -1) {
                        const fish = inv[idx];
                        const val = calculateFishValue(fish);
                        total += val; baseTotal += fish.baseValue || val;
                        inv.splice(idx,1); sold++;
                    }
                }
                if (sold === 0) return interaction.reply({ content: 'No matching fish found.', ephemeral: true });
                client.userFishInventories.set(key, inv);
                client.levelSystem.addFishDollars(interaction.user.id, interaction.guild.id, total, 'fish_sell');
                persistFishData();
                let msg = `Sold ${sold} fish for ${total.toFixed(2)} ${client.levelSystem.fishDollarEmoji || DEFAULT_FISH_DOLLAR_EMOJI_FALLBACK}`;
                if (baseTotal !== total) msg += ` (${baseTotal.toFixed(2)})`;
                return interaction.reply({ content: msg, ephemeral: true });
            }
            if (customId === 'fish_value_modal') {
                if (!interaction.isModalSubmit()) return;
                const id = interaction.fields.getTextInputValue('fish_value_id').trim();
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const inv = client.userFishInventories.get(key) || [];
                const fish = inv.find(f => f.id === id);
                if (!fish) return interaction.reply({ content: 'You do not own that fish.', ephemeral: true });
                const value = calculateFishValue(fish);
                fish.value = value;
                client.userFishInventories.set(key, inv);
                persistFishData();
                let msg = `Value: ${value.toFixed(2)} ${client.levelSystem.fishDollarEmoji || DEFAULT_FISH_DOLLAR_EMOJI_FALLBACK}`;
                if (fish.baseValue && fish.baseValue !== value) msg += ` (${fish.baseValue.toFixed(2)})`;
                return interaction.reply({ content: msg, ephemeral: true });
            }

            if (customId === 'fish_inv_prev' || customId === 'fish_inv_next' || customId === 'fish_inv_togglefav') {
                if (!interaction.isButton()) return;
                const session = client.fishInventorySessions.get(interaction.message.id);
                if (!session || session.userId !== interaction.user.id) return interaction.deferUpdate();
                let { page, favorites } = session;
                if (customId === 'fish_inv_prev') page--;
                if (customId === 'fish_inv_next') page++;
                if (customId === 'fish_inv_togglefav') { favorites = !favorites; page = 1; }
                const { embed, totalPages } = buildFishInventoryEmbed(session.userId, session.guildId, page, favorites);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fish_inv_prev').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(page <= 1),
                    new ButtonBuilder().setCustomId('fish_inv_next').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages),
                    new ButtonBuilder().setCustomId('fish_inv_togglefav').setLabel(favorites ? 'NOR-LIST' : 'FAV-LIST').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('fish_inv_fav').setLabel('❤️').setStyle(ButtonStyle.Success)
                );
                await interaction.update({ embeds: [embed], components: [row] }).catch(()=>{});
                client.fishInventorySessions.set(interaction.message.id, { userId: session.userId, guildId: session.guildId, page, favorites });
                return;
            }

            if (customId === 'fish_inv_fav') {
                if (!interaction.isButton()) return;
                const session = client.fishInventorySessions.get(interaction.message.id);
                if (!session || session.userId !== interaction.user.id) return interaction.deferUpdate();
                const modal = new ModalBuilder().setTitle('Favorite Fish').setCustomId('fish_inv_fav_modal');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('fav_fish_id').setLabel('What fish ID you want to favorite?').setStyle(TextInputStyle.Short).setRequired(true)
                ));
                await interaction.showModal(modal).catch(()=>{});
                return;
            }

            if (customId === 'fish_inv_fav_modal') {
                if (!interaction.isModalSubmit()) return;
                const session = client.fishInventorySessions.get(interaction.message.id);
                if (!session || session.userId !== interaction.user.id) return interaction.reply({ content: 'Session expired.', ephemeral: true });
                const id = interaction.fields.getTextInputValue('fav_fish_id').trim();
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const inv = client.userFishInventories.get(key) || [];
                const favs = client.userFavoriteFishInventories.get(key) || [];
                const idx = inv.findIndex(f => f.id === id);
                if (idx === -1) return interaction.reply({ content: 'Fish not found.', ephemeral: true });
                const fish = inv.splice(idx,1)[0];
                favs.push(fish);
                client.userFishInventories.set(key, inv);
                client.userFavoriteFishInventories.set(key, favs);
                persistFishData();
                const page = session.page;
                const { embed, totalPages } = buildFishInventoryEmbed(session.userId, session.guildId, page, session.favorites);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fish_inv_prev').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(page <= 1),
                    new ButtonBuilder().setCustomId('fish_inv_next').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages),
                    new ButtonBuilder().setCustomId('fish_inv_togglefav').setLabel(session.favorites ? 'NOR-LIST' : 'FAV-LIST').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('fish_inv_fav').setLabel('❤️').setStyle(ButtonStyle.Success)
                );
                await interaction.update({ embeds: [embed], components: [row] }).catch(()=>{});
                client.fishInventorySessions.set(interaction.message.id, { userId: session.userId, guildId: session.guildId, page, favorites: session.favorites });
                return;
            }

            if (customId === 'fish_index_prev' || customId === 'fish_index_next' || customId === 'fish_index_filter') {
                const session = client.fishIndexSessions.get(interaction.message.id);
                if (!session || session.userId !== interaction.user.id) return interaction.deferUpdate();
                let { page, rarity } = session;
                if (customId === 'fish_index_prev') page--;
                if (customId === 'fish_index_next') page++;
                if (customId === 'fish_index_filter') {
                    if (!interaction.isStringSelectMenu()) return;
                    rarity = interaction.values[0];
                    page = 1;
                }
                const fishData = interaction.client.fishData || [];
                const symbol = RARITY_NAME_TO_SYMBOL[rarity];
                const filtered = symbol ? fishData.filter(f => f.rarity === symbol) : fishData;
                const pageSize = 10;
                const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
                if (page < 1) page = 1; if (page > pageCount) page = pageCount;
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const inv = interaction.client.userFishInventories.get(key) || [];
                const discovered = new Map();
                for (const f of inv) { const cur = discovered.get(f.name) || 0; if (f.weight > cur) discovered.set(f.name, f.weight); }
                const color = rarity ? (FISH_RARITY_COLORS[rarity] || '#3498DB') : '#3498DB';
                const embed = new EmbedBuilder().setTitle('Fish Index').setColor(color).setDescription(`Page ${page}/${pageCount}`);
                for (const fish of filtered.slice((page-1)*pageSize, page*pageSize)) {
                    const known = discovered.has(fish.name);
                    const name = known ? `${fish.name} ${fish.emoji || ''}` : '???';
                    const rarityName = RARITY_SYMBOL_TO_NAME[fish.rarity] || fish.rarity;
                    const value = known ? `Rarity: ${rarityName}\nHighest Weight: ${discovered.get(fish.name).toFixed(2)}` : '???';
                    embed.addFields({ name, value, inline: false });
                }
                const rarities = ORDERED_RARITIES;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fish_index_prev').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(page <= 1),
                    new ButtonBuilder().setCustomId('fish_index_next').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(page >= pageCount)
                );
                const select = new StringSelectMenuBuilder().setCustomId('fish_index_filter').setPlaceholder('choose rarity').addOptions(rarities.map(r => ({ label: r, value: r, default: r === rarity })));
                const row2 = new ActionRowBuilder().addComponents(select);
                await interaction.update({ embeds: [embed], components: [row, row2] }).catch(()=>{});
                client.fishIndexSessions.set(interaction.message.id, { userId: session.userId, guildId: session.guildId, page, rarity });
                return;
            }

            if (customId === 'fishing_fish') {
                if (!interaction.isButton()) return;
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const session = fishingSessions.get(key);
                if (!session || session.messageId !== interaction.message.id) return;
                const invCheck = client.userFishInventories.get(key) || [];
                if (invCheck.length >= FISH_INVENTORY_CAP) {
                    const embed = buildFishingStartEmbed(session.rod, session.bait, 'Inventory full!');
                    await interaction.update({ embeds: [embed], components: [] }).catch(() => {});
                    fishingSessions.delete(key);
                    return;
                }
                session.stage = 'wait';
                session.channelId = interaction.channelId;
                const waitMs = FISH_WAIT_MIN_MS + Math.random() * (FISH_WAIT_MAX_MS - FISH_WAIT_MIN_MS);
                session.waitRemaining = waitMs;
                clearTimeout(session.shakeTimeout);
                session.shakeTimeout = null;
                const embed = buildFishingWaitEmbed();
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fishing_shake').setLabel('SHAKE').setStyle(ButtonStyle.Primary));
                await interaction.update({ embeds: [embed], components: [row] });
                session.waitTimeout = setTimeout(() => startFishingGame(key), waitMs);
                session.lastShake = 0;
                fishingSessions.set(key, session);
                return;
            }

            if (customId === 'fishing_shake') {
                if (!interaction.isButton()) return;
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const session = fishingSessions.get(key);
                if (!session || session.stage !== 'wait' || session.messageId !== interaction.message.id) return;
                const now = Date.now();
                if (session.lastShake && now - session.lastShake < FISH_SHAKE_COOLDOWN_MS) {
                    return interaction.deferUpdate().catch(() => {});
                }
                session.lastShake = now;
                session.waitRemaining = Math.max(0, session.waitRemaining - 5000);
                clearTimeout(session.waitTimeout);
                session.waitTimeout = setTimeout(() => startFishingGame(key), session.waitRemaining);
                const rowDisabled = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fishing_shake').setLabel('SHAKE').setStyle(ButtonStyle.Primary).setDisabled(true));
                await interaction.update({ components: [rowDisabled] }).catch(() => {});
                clearTimeout(session.shakeTimeout);
                session.shakeTimeout = setTimeout(async () => {
                    const channel = await client.channels.fetch(session.channelId).catch(() => null);
                    const msg = channel ? await channel.messages.fetch(session.messageId).catch(() => null) : null;
                    if (msg && session.stage === 'wait') {
                        const rowRe = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fishing_shake').setLabel('SHAKE').setStyle(ButtonStyle.Primary));
                        await msg.edit({ components: [rowRe] }).catch(() => {});
                    }
                }, FISH_SHAKE_COOLDOWN_MS);
                fishingSessions.set(key, session);
                return;
            }

            if (customId.startsWith('fishing_btn_')) {
                if (!interaction.isButton()) return;
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const session = fishingSessions.get(key);
                if (!session || session.stage !== 'game' || session.messageId !== interaction.message.id) return;
                const idx = parseInt(customId.split('_')[2]);
                await interaction.deferUpdate().catch(()=>{});
                if (Date.now() >= session.endTime) return finishFishing(false, key);
                if (idx === session.fishIndex) {
                    session.progress += session.rod.power;
                    if (session.progress >= session.fish.powerReq) {
                        return finishFishing(true, key);
                    }
                } else {
                    session.durabilityLoss += session.fish.durabilityLoss;
                    if (session.rodItemId && (session.remainingDurability - session.durabilityLoss <= 0)) {
                        client.levelSystem.takeItem(interaction.user.id, interaction.guild.id, session.rodItemId, session.remainingDurability);
                        session.rodBroken = true;
                        fishingSessions.set(key, session);
                        return finishFishing(false, key, true);
                    }
                }
                session.fishIndex = Math.floor(Math.random()*session.buttonCount);
                updateFishingMessage(key);
                // Reset the 5s move timer whenever a button is pressed
                if (session.moveInterval) clearInterval(session.moveInterval);
                session.moveInterval = setInterval(() => {
                    session.fishIndex = Math.floor(Math.random() * session.buttonCount);
                    updateFishingMessage(key);
                }, 5000);
                fishingSessions.set(key, session);
                return;
            }

            if (customId === 'fishing_again') {
                if (!interaction.isButton()) return;
                const key = `${interaction.user.id}_${interaction.guild.id}`;
                const userInv = client.levelSystem.getUserInventory(interaction.user.id, interaction.guild.id);
                const rodItem = userInv.generalItems.find(i => i.itemId.startsWith('fishing_rod')) || {};
                const baitItem = userInv.generalItems.find(i => i.itemId === 'worm');
                let baitCount = baitItem ? baitItem.quantity : 0;
                if (baitCount > MAX_BAIT) {
                    client.levelSystem.setItemQuantity(interaction.user.id, interaction.guild.id, 'worm', MAX_BAIT);
                    baitCount = MAX_BAIT;
                }
                if (!rodItem.itemId) {
                    const alertMsg = `<:serror:1390640264392998942> Hey ${interaction.user}, you need a fishing rod to fish!`;
                    const embed = buildFishingStartEmbed(null, baitCount, alertMsg);
                    await interaction.update({ embeds: [embed], components: [] }).catch(() => {});
                    fishingSessions.delete(key);
                    return;
                }
                const rodConfig = client.levelSystem.gameConfig.items[rodItem.itemId] || client.levelSystem.gameConfig.items['fishing_rod_tier1'];
                const rodInfo = { emoji: rodConfig.emoji || '🎣', power: rodConfig.power || 1, durability: rodItem.quantity || rodConfig.durability || 10, tier: (rodConfig.name && rodConfig.name.match(/(\d+)/)) ? RegExp.$1 : 1 };
                const invCheck = client.userFishInventories.get(key) || [];
                if (invCheck.length >= FISH_INVENTORY_CAP) {
                    const embed = buildFishingStartEmbed(rodInfo, baitCount, 'Inventory full!');
                    await interaction.update({ embeds: [embed], components: [] }).catch(() => {});
                    fishingSessions.delete(key);
                    return;
                }
                const embed = buildFishingWaitEmbed();
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fishing_shake').setLabel('SHAKE').setStyle(ButtonStyle.Primary));
                await interaction.update({ embeds: [embed], components: [row] }).catch(() => {});
                const waitMs = FISH_WAIT_MIN_MS + Math.random() * (FISH_WAIT_MAX_MS - FISH_WAIT_MIN_MS);
                const newSession = { messageId: interaction.message.id, channelId: interaction.channelId, stage: 'wait', rod: rodInfo, rodItemId: rodItem.itemId, remainingDurability: rodInfo.durability, bait: baitCount, durabilityLoss: 0, waitRemaining: waitMs, shakeTimeout: null };
                newSession.waitTimeout = setTimeout(() => startFishingGame(key), waitMs);
                fishingSessions.set(key, newSession);
                return;
            }

            if (customId.startsWith('splitsteal_')) {
                if (!interaction.isButton()) return;
                const parts = customId.split('_');
                const gameId = `${parts[1]}_${parts[2]}`; // include both timestamp and random
                const action = parts[3]; // split or steal
                const game = splitStealGames.get(gameId);
                if (!game) return interaction.reply({ content: 'This game has expired.', ephemeral: true }).catch(() => {});
                if (![game.user1Id, game.user2Id].includes(interaction.user.id)) {
                    return interaction.reply({ content: 'You are not part of this game.', ephemeral: true }).catch(() => {});
                }
                if (game.choices[interaction.user.id]) {
                    return interaction.reply({ content: 'You already made your choice.', ephemeral: true }).catch(() => {});
                }
                game.choices[interaction.user.id] = action;
                splitStealGames.set(gameId, game);
                await interaction.update({ content: `You chose to ${action}.`, components: [] }).catch(() => {});
                if (Object.keys(game.choices).length === 2) {
                    const channel = await client.channels.fetch(game.channelId).catch(() => null);
                    if (channel && channel.isTextBased()) {
                        const choice1 = game.choices[game.user1Id];
                        const choice2 = game.choices[game.user2Id];
                        let msg;
                        let color;
                        if (choice1 === 'split' && choice2 === 'split') {
                            msg = `Both players chose to split! They each get ${game.splitPrize}.`;
                            color = '#00ff00';
                        } else if (choice1 === 'steal' && choice2 === 'split') {
                            msg = `<@${game.user1Id}> stole from <@${game.user2Id}> and takes ${game.stealPrize}!`;
                            color = '#ff0000';
                        } else if (choice2 === 'steal' && choice1 === 'split') {
                            msg = `<@${game.user2Id}> stole from <@${game.user1Id}> and takes ${game.stealPrize}!`;
                            color = '#ff0000';
                        } else {
                            msg = 'Both players tried to steal and get nothing!';
                            color = '#000000';
                        }
                        const descLines = [
                            `<@${game.user1Id}>: ${choice1.charAt(0).toUpperCase() + choice1.slice(1)}`,
                            `<@${game.user2Id}>: ${choice2.charAt(0).toUpperCase() + choice2.slice(1)}`,
                            '',
                            msg
                        ];
                        const embed = new EmbedBuilder()
                            .setTitle('Split or Steal Result')
                            .setDescription(descLines.join('\n'))
                            .setColor(color);
                        await channel.send({ embeds: [embed] }).catch(() => {});
                    }
                    splitStealGames.delete(gameId);
                }
                return;
            }


            console.warn(`[ComponentInteraction] Unhandled Custom ID: ${customId} by ${interaction.user.tag} (Type: ${interaction.type})`);
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await sendInteractionError(interaction, "This interaction is not handled or has expired.", true);
            } else if (interaction.isRepliable() && (interaction.replied || interaction.deferred)) {
                await sendInteractionError(interaction, "This interaction is not handled or has expired.", true, true);
            }
        }
    } catch (mainInteractionError) {
        console.error(`[InteractionCreate Critical Error] ID: ${interaction?.id}, User: ${interaction?.user?.tag}, Cmd/ID: ${interaction?.commandName || interaction?.customId}`, mainInteractionError);
        logToBotLogChannel(`Critical interaction error for ${interaction?.user?.tag}: ${mainInteractionError.message}`).catch(()=>{});
        if (interaction.isRepliable()) {
            const errorOptions = { content: "Oops! Something went terribly wrong. Please try again later.", embeds:[], components:[], ephemeral: true };
            if (!interaction.replied && !interaction.deferred) { try { await interaction.reply(errorOptions); } catch (e) { /* ignore */ } }
            else if (interaction.deferred && !interaction.replied) { try { await interaction.editReply(errorOptions); } catch (e) { /* ignore */ } }
            else if (interaction.replied) { try { await interaction.followUp(errorOptions); } catch (e) { /* ignore */ } }
        }
    }
});


client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const voiceDropResult = await client.levelSystem.handleVoiceStateUpdate(oldState, newState, checkAndAwardSpecialRole, WEEKEND_MULTIPLIERS); // Pass checkAndAwardSpecialRole and multipliers
        if (voiceDropResult && voiceDropResult.droppedItem) {
            const { droppedItem, config, shouldAnnounce, grantedSpecialRole } = voiceDropResult;
            const memberForVoice = newState.member || oldState.member; // member is already part of voiceDropResult
            const guildForVoice = newState.guild || oldState.guild; // guild is already part of voiceDropResult

            if (grantedSpecialRole && droppedItem.id === client.levelSystem.COSMIC_ROLE_TOKEN_ID) { // Use instance property
                // Announcement for cosmic role is handled by checkAndAwardSpecialRole
            } else if (shouldAnnounce) {
                const guildLootDropChannelId = client.levelSystem.getGuildSettings(guildForVoice.id).lootDropAlertChannelId || LOOTBOX_DROP_CHANNEL_ID;
                if (guildLootDropChannelId) {
                    const alertChannel = await client.channels.fetch(guildLootDropChannelId).catch(() => null);
                    if (alertChannel && alertChannel.isTextBased()) {
                        const botMemberForLoot = guildForVoice.members.me;
                        if (botMemberForLoot && alertChannel.permissionsFor(botMemberForLoot).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
                           const itemConfig = config;
                           const itemNameDisplay = droppedItem.name || client.levelSystem.getItemNameById(droppedItem.id, guildForVoice.id);
                           const itemEmojiDisplay = droppedItem.emoji || client.levelSystem.getItemEmojiById(droppedItem.id, guildForVoice.id);

                           const rarityString = client.levelSystem._getItemRarityString(droppedItem.id, itemConfig, itemConfig.type);
                           const rarityDetails = client.levelSystem.itemRarities[rarityString.toUpperCase()] || client.levelSystem.itemRarities.COMMON;
                           const embedColor = rarityDetails.color;

                           let alertTitle = `${itemEmojiDisplay} A Wild ${itemNameDisplay} Appeared! 🎉`;
                           let eventDescription = `${memberForVoice.user} received a **${itemNameDisplay}** from voice activity!`;
                           let alertImage = itemConfig.imageUrl || null; // Default to item's image if any

                            // (Optional: Customize title/image based on rarity for voice drops too, similar to chat drops)

                            const lootEmbed = new EmbedBuilder()
                                .setColor(embedColor).setTitle(alertTitle).setDescription(eventDescription)
                                .setThumbnail(itemConfig.imageUrl || null)
                                .addFields(
                                    { name: '🎤 Recipient', value: `${memberForVoice.user.tag}`, inline: true },
                                    { name: '💎 Rarity Tier', value: `**${rarityString}**`, inline: true }
                                    // (Optional: Add approx chance if you calculate it for voice drops)
                                ).setTimestamp().setFooter({ text: `Obtained from: Voice Activity in ${guildForVoice.name}`, iconURL: guildForVoice.iconURL({ dynamic: true }) });
                            await alertChannel.send({ embeds: [lootEmbed] });
                        } else console.warn(`[Voice Loot Drop] Bot missing SendMessages or EmbedLinks permission in configured loot drop channel: ${guildLootDropChannelId}`);
                    } else console.warn(`[Voice Loot Drop] Configured loot drop channel ${guildLootDropChannelId} not found or not text-based.`);
                }
            }
        }
    } catch (error) {
        console.error('[VoiceStateUpdate] Error processing voice activity rewards/drops:', error);
    }
});
client.on('guildMemberRemove', async member => {
    try {
        const guildWelcomeChannelId = client.levelSystem.getGuildSettings(member.guild.id).welcomeChannelId || WELCOME_CHANNEL_ID;
        let leaveChannel = guildWelcomeChannelId ? member.guild.channels.cache.get(guildWelcomeChannelId) : member.guild.systemChannel;
        if (leaveChannel && leaveChannel.isTextBased()) {
            const botMember = member.guild.members.me;
            if (botMember && leaveChannel.permissionsFor(botMember)?.has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
                const leaveEmbed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle(`😢 Goodbye, ${member.displayName}!`)
                    .setDescription(`${member.user.tag} has left the server. We'll miss you!`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setTimestamp()
                    .setFooter({ text: `User Left: ${member.user.tag}`, iconURL: member.guild.iconURL({ dynamic: true }) });
                await leaveChannel.send({ embeds: [leaveEmbed] }).catch(err => console.error(`[GuildMemberRemove] Failed to send leave message to ${leaveChannel.name}:`, err.message));
            } else console.warn(`[GuildMemberRemove] Bot missing permissions in leave channel ${leaveChannel?.name}.`);
        } else if (guildWelcomeChannelId) console.warn(`[GuildMemberRemove] Leave channel ${guildWelcomeChannelId} not found or not text-based.`);

        // Clear active bank message for the user in this guild
        const bankMessageKey = `${member.id}_${member.guild.id}`;
        if (client.activeBankMessages.has(bankMessageKey)) {
            const bankData = client.activeBankMessages.get(bankMessageKey);
            if (bankData.timeoutId) clearTimeout(bankData.timeoutId);
            client.activeBankMessages.delete(bankMessageKey);
            console.log(`[GuildMemberRemove] Cleared active bank message timeout for ${member.user.tag}.`);
        }

        // Clear active inventory timeout
        const inventoryKey = `${member.id}_${member.guild.id}_inv`;
        if (inventoryInteractionTimeouts.has(inventoryKey)) {
            clearTimeout(inventoryInteractionTimeouts.get(inventoryKey));
            inventoryInteractionTimeouts.delete(inventoryKey);
            console.log(`[GuildMemberRemove] Cleared active inventory timeout for ${member.user.tag}.`);
        }

        // Clear from active voice users
        const voiceStateKey = `${member.id}-${member.guild.id}`;
        if (client.levelSystem.activeVoiceUsers.has(voiceStateKey)) {
            await client.levelSystem._finalizeVoiceSession(member.id, member.guild.id, member, WEEKEND_MULTIPLIERS);
            console.log(`[GuildMemberRemove] Processed voice session for ${member.user.tag} upon leaving.`);
        }

        // New: Clean up user management sessions if the admin leaves or target user leaves
        const adminSessionsToRemove = [];
        const targetSessionsToRemove = [];
        for (const [sessionId, sessionData] of userManagementSessions) {
            if (sessionData.guildId === member.guild.id) {
                if (sessionData.adminUserId === member.id) adminSessionsToRemove.push(sessionId);
                if (sessionData.targetUserId === member.id) targetSessionsToRemove.push(sessionId);
            }
        }
        const allSessionsToRemove = [...new Set([...adminSessionsToRemove, ...targetSessionsToRemove])];
        for (const sessionId of allSessionsToRemove) {
            const session = userManagementSessions.get(sessionId);
            if (session) {
                userManagementSessions.delete(sessionId);
                if (session.timeoutInstance) clearTimeout(session.timeoutInstance);
                if (session.panelMessageId && session.panelChannelId) {
                    const panelChannel = await client.channels.fetch(session.panelChannelId).catch(() => null);
                    if (panelChannel) {
                        const msg = await panelChannel.messages.fetch(session.panelMessageId).catch(() => null);
                        if (msg && msg.editable) { // Check editable
                            await msg.edit({ content: 'This user management session was automatically closed because a relevant user left the server.', embeds:[], components: [] }).catch(() => {});
                        } else if (msg && msg.deletable) { // Fallback to delete
                             await msg.delete().catch(()=>{});
                        }
                    }
                }
                console.log(`User management session ${sessionId} closed due to member remove event.`);
            }
        }

    } catch (error) {
        console.error(`[GuildMemberRemove] Error handling member leaving ${member.user.tag}:`, error);
    }
});

client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (LOGO_SYNC_GUILD_ID && newGuild.id === LOGO_SYNC_GUILD_ID && oldGuild.icon !== newGuild.icon) {
        try {
            const iconURL = newGuild.iconURL({ extension: 'png', size: 4096 });
            if (iconURL) {
                await client.user.setAvatar(iconURL);
                console.log(`[Logo Sync] Bot avatar updated due to guild icon change in ${newGuild.name}.`);
            }
        } catch (err) {
            console.error(`[Logo Sync] Failed to update bot avatar on guildUpdate: ${err.message}`);
        }
    }
});


async function startBot() {
    try {
        const loaded = await loadFishInventories();
        client.userFishInventories = loaded.inventories;
        client.userFavoriteFishInventories = loaded.favorites;
        client.serverFishLog = loaded.serverLog;
    } catch (e) {
        console.error('[FishInventoryManager] Load failed', e);
    }
    setInterval(persistFishData, 300000);

    client.login(process.env.DISCORD_TOKEN).catch(error => {
        console.error(`[FATAL LOGIN ERROR] Failed to log in: ${error.message}`);
        console.error("Ensure your DISCORD_TOKEN is correctly set in the .env file and is valid.");
        console.error("Also, check if your bot has all necessary Privileged Gateway Intents enabled in the Discord Developer Portal (Presence, Server Members, Message Content).");
        process.exit(1);
    });
}

startBot();

process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled Rejection:', reason);
    await logToBotLogChannel(`Unhandled Rejection: ${reason?.message || reason}`).catch(()=>{});
});

process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    await logToBotLogChannel(`Uncaught Exception: ${err.message}`).catch(()=>{});
});

['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => {
        console.log(`Received ${sig}, saving fish data...`);
        persistFishData();
        setTimeout(() => process.exit(0), 100);
    });
});
