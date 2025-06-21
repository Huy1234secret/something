// game_config.js

const config = {
    /* ──────────────────────────────────────────────────────────────
     *  GLOBAL  SETTINGS
     * ────────────────────────────────────────────────────────────── */
    globalSettings: {
        /* ---------------------------------------------------------
         *  Message / voice rewards & shop ✉️🎤
         * --------------------------------------------------------- */
        CHAT_DROP_BASE_CHANCE: 1,       // 1  ≘ 100 % base chance (tweak as needed)
        VOICE_DROP_BASE_CHANCE: 1,      // 1  ≘ 100 %

        SHOP_RESTOCK_INTERVAL_MINUTES: parseInt(process.env.SHOP_RESTOCK_INTERVAL_MINUTES, 10) || 20,
        ALERT_WORTHY_DISCOUNT_PERCENT: 0.25,   // DM users if an item is ≥ 25 % off
        MAX_SHOP_SLOTS: 10,

        // Toggle to globally enable/disable all notifications except the daily ready alert
        // Set to `false` to suppress non-daily notifications across the bot
        NON_DAILY_NOTIFICATIONS_ENABLED: true,

        BASE_COINS_PER_MESSAGE: [1, 10],
        BASE_XP_PER_MESSAGE: 15,
        XP_COOLDOWN_SECONDS: 60,
        VOICE_XP_PER_INTERVAL: 5,
        VOICE_COIN_PER_INTERVAL: [1, 2],

        /* ---------------------------------------------------------
         *  Inventory caps (per user)
         * --------------------------------------------------------- */
        INVENTORY_COIN_CAP:  100_000_000,
        INVENTORY_GEM_CAP:   100_000,
        INVENTORY_ROBUX_CAP: 500,        // New currency example

        /* ---------------------------------------------------------
         *  🌟 NEW 10-Tier Bank System
         * ---------------------------------------------------------
         *  • Capacities grow each tier
         *  • `upgradeCostCoins` / `upgradeCostGems` control upgrade pricing
         *  • `interestRate` (0 % → 10 %) is used by bankInterestScheduler.js
         * --------------------------------------------------------- */
        BANK_TIERS: {
            0:  { coinCap:   10_000,   gemCap:   100, upgradeCostCoins:   8_000, upgradeCostGems:    0, interestRate: 0,  nextTier: 1  },
            1:  { coinCap:   50_000,   gemCap:   250, upgradeCostCoins:   40_000, upgradeCostGems:  200, interestRate: 1,  nextTier: 2  },
            2:  { coinCap:  150_000,   gemCap:   500, upgradeCostCoins:  120_000, upgradeCostGems:  400, interestRate: 2,  nextTier: 3  },
            3:  { coinCap:  300_000,   gemCap: 800, upgradeCostCoins:  240_000, upgradeCostGems:640, interestRate: 3,  nextTier: 4  },
            4:  { coinCap:  500_000,   gemCap: 1_200, upgradeCostCoins:  400_000, upgradeCostGems:960, interestRate: 4,  nextTier: 5  },
            5:  { coinCap:  750_000,   gemCap: 1_800, upgradeCostCoins:  600_000, upgradeCostGems:1_440, interestRate: 5,  nextTier: 6  },
            6:  { coinCap:  1_000_000,   gemCap: 2_500, upgradeCostCoins:  800_000, upgradeCostGems:2_000, interestRate: 6,  nextTier: 7  },
            7:  { coinCap:1_500_000,   gemCap: 3_750, upgradeCostCoins: 1_200_000, upgradeCostGems:3_000, interestRate: 7,  nextTier: 8  },
            8:  { coinCap:2_250_000,   gemCap: 5_000, upgradeCostCoins: 1_800_000, upgradeCostGems:4_000, interestRate: 8,  nextTier: 9  },
            9:  { coinCap:3_500_000,   gemCap: 7_500, upgradeCostCoins: 2_800_000, upgradeCostGems:6_000, interestRate: 9,  nextTier: 10 },
            10: { coinCap:5_000_000,   gemCap: 15_000, upgradeCostCoins:       0, upgradeCostGems:    0, interestRate:10,  nextTier: null }
        },
        /* ---------------------------------------------------------
         *  Weekend multipliers / discounts  🎉
         * --------------------------------------------------------- */
        WEEKEND_COIN_MULTIPLIER: 4,
        WEEKEND_GEM_MULTIPLIER:  4,
        WEEKEND_XP_MULTIPLIER:   4,
        WEEKEND_SHOP_STOCK_MULTIPLIER: 2,
        // Weekend range is defined in UTC+7.
        // The boost starts Saturday 00:00 UTC+7 and ends Monday 00:00 UTC+7.
        WEEKEND_DATE_RANGE: {
            startDay: 6,  // Saturday
            startHour: 0,
            endDay: 1,    // Monday
            endHour: 0
        },

        WEEKEND_SHOP_DISCOUNT_TIERS: [
            { discount: 1.00, probability: 0.001, label: "🎉 FREE! (Weekend Deal)" },
            { discount: 0.50, probability: 0.019, label: "🎉 50% OFF (Weekend Deal)" },
            { discount: 0.25, probability: 0.130, label: "🎉 25% OFF (Weekend Deal)" },
            { discount: 0.10, probability: 0.850, label: "🎉 10% OFF (Weekend Deal)" }
        ],
        NORMAL_SHOP_DISCOUNT_TIERS: [
            { discount: 0.50, probability: 0.010, label: "🔥 50% OFF!"      },
            { discount: 0.25, probability: 0.090, label: "✨ 25% OFF"       },
            { discount: 0.10, probability: 0.450, label: "💸 10% OFF"       },
            { discount: 0.00, probability: 0.450, label: ""                }
        ],

        /* ---------------------------------------------------------
         *  Miscellaneous defaults / emojis
         * --------------------------------------------------------- */
        DEFAULT_ANNOUNCE_RARITY_THRESHOLD: 1_000,
        DEFAULT_SHOP_RESTOCK_DM_ENABLED: false,
        SETTINGS_EMOJI_ENABLED:  '✅',
        SETTINGS_EMOJI_DISABLED: '❌',
        DEFAULT_SHOP_TITLE:      '🛒 Server Shop',

        INSTANT_RESTOCK_GEM_COST: 5,
        MAX_PURCHASE_AMOUNT_PER_TRANSACTION: 99,
        SPECIAL_ROLE_CHANCE: 1_000_000,

        /* ---------------------------------------------------------
         *  Max “bulk-open” amounts for loot boxes
         * --------------------------------------------------------- */
        MAX_UNBOX_AMOUNTS: {
            common_loot_box:     300,
            rare_loot_box:       200,
            epic_loot_box:       100,
            legendary_loot_box:   50
        }
    },

    /* ──────────────────────────────────────────────────────────────
     *  ITEM DEFINITIONS (abridged – keep yours as-is)
     * ────────────────────────────────────────────────────────────── */
    items: {
        // Currency
        coins: {
            id: "coins", name: "Coins", type: "currency",
            emoji: "<a:coin:1373568800783466567>", rarityValue: 0,
            description: "The primary currency for most transactions."
        },
        gems: {
            id: "gems", name: "Gems", type: "currency",
            emoji: "<a:gem:1374405019918401597>", rarityValue: 0,
            description: "A valuable currency used for special purchases and shop restocks."
        },
        robux: {                                     // Example extra currency
            id: "robux", name: "Robux", type: "currency",
            emoji: "<a:robux:1378395622683574353>",
            rarityValue: 5_000,
            description: "A premium-grade currency from another realm."
        },

        "nothing_drop": {
            id: "nothing_drop", name: "Nothing", type: "junk",
            directDropWeight: 0.947474, 
            emoji: "💨", rarityValue: 0,
            description: "Sometimes, you just get... air."
        },

        // Loot Boxes
        "common_loot_box": {
            id: "common_loot_box", name: "Common Loot Box", type: "loot_box_item",
            directDropWeight: 0.05, 
            emoji: "<:common:1373546771216728164>", rarityValue: 100,
            description: "A common box containing a few items.",
            basePrice: 250, appearanceChanceInShop: 1.0, stockRangeShop: [10, 40],
            isRareForShopAlert: false, 
            isAlertWorthyByIdShop: false, 
            color: 0xBDC3C7, imageUrl: "https://i.ibb.co/Q7R3YPmy/nh4.png", numRolls: 3,
            itemPool: [
                { type: "currency", subType: "coins", min: 1, max: 25, probability: 0.938888, rarityValue: 10 },
                { type: "charm_item", id: "coin_charm", probability: 0.00005, rarityValue: 3000 },
                { type: "charm_item", id: "xp_charm", probability: 0.00005, rarityValue: 5000 },
                { type: "charm_item", id: "gem_charm", probability: 0.000001, rarityValue: 8000 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.05, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.01, isRareWeekendEligiblePool: true, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.001, isRareWeekendEligiblePool: true, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.00001, isRareWeekendEligiblePool: true, rarityValue: 250000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, isRareWeekendEligiblePool: true, rarityValue: 1000000 } // Slightly increased prob after removing luck_charm
            ]
        },
        "rare_loot_box": {
            id: "rare_loot_box", name: "Rare Loot Box", type: "loot_box_item",
            directDropWeight: 0.0015, isRareWeekendEligibleChatDrop: true, 
            emoji: "<:rare:1373546796525289533>", rarityValue: 1000,
            description: "A rare box with better chances for good items.",
            basePrice: 1500, appearanceChanceInShop: 0.25, stockRangeShop: [7, 25],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: false,
            color: 0x0070DD, imageUrl: "https://i.ibb.co/zhmM6cvL/nh3.png", numRolls: 5,
            itemPool: [
                { type: "currency", subType: "coins", min: 25, max: 50, probability: 0.750001, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 1, max: 1, probability: 0.18876, rarityValue: 25 },
                { type: "charm_item", id: "coin_charm", probability: 0.0001, rarityValue: 3000 },
                { type: "charm_item", id: "xp_charm", probability: 0.00005, rarityValue: 5000 },
                { type: "charm_item", id: "gem_charm", probability: 0.000008, rarityValue: 8000 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.05, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.01, isRareWeekendEligiblePool: true, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.001, isRareWeekendEligiblePool: true, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.00008, isRareWeekendEligiblePool: true, rarityValue: 250000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, isRareWeekendEligiblePool: true, rarityValue: 1000000 } // Slightly increased
            ]
        },
        "epic_loot_box": {
            id: "epic_loot_box", name: "Epic Loot Box", type: "loot_box_item",
            directDropWeight: 0.0003, isRareWeekendEligibleChatDrop: true,
            emoji: "<:epic:1373546835355897938>", rarityValue: 50000,
            description: "An epic box containing valuable treasures.",
            basePrice: 7500, appearanceChanceInShop: 0.05, stockRangeShop: [3, 12],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0x9400D3, imageUrl: "https://i.ibb.co/LznxMrgN/nh2.png", numRolls: 10,
            itemPool: [
                { type: "currency", subType: "coins", min: 50, max: 100, probability: 0.6991045, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 1, max: 1, probability: 0.1938945, rarityValue: 25 },
                { type: "charm_item", id: "coin_charm", probability: 0.00045, rarityValue: 3000 },
                { type: "charm_item", id: "xp_charm", probability: 0.0001, rarityValue: 5000 },
                { type: "charm_item", id: "gem_charm", probability: 0.00005, rarityValue: 8000 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.05, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.05, isRareWeekendEligiblePool: true, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.005, isRareWeekendEligiblePool: true, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.0005, isRareWeekendEligiblePool: true, rarityValue: 250000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, isRareWeekendEligiblePool: true, rarityValue: 1000000 } // Slightly increased
            ]
        },
        "legendary_loot_box": {
            id: "legendary_loot_box", name: "Legendary Loot Box", type: "loot_box_item",
            directDropWeight: 0.00001, isRareWeekendEligibleChatDrop: true,
            emoji: "<:legend:1373546812144746596>", rarityValue: 250000,
            description: "A legendary box of immense power and rarity.",
            basePrice: 35000, appearanceChanceInShop: 0.001, stockRangeShop: [1, 3],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0xFF8C00, imageUrl: "https://i.ibb.co/vx4jNf2x/nh1.png", numRolls: 30,
            itemPool: [
                { type: "currency", subType: "coins", min: 100, max: 250, probability: 0.80001, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 1, max: 1, probability: 0.142089, rarityValue: 25 },
                { type: "charm_item", id: "coin_charm", probability: 0.001, rarityValue: 3000 },
                { type: "charm_item", id: "xp_charm", probability: 0.0008, rarityValue: 5000 },
                { type: "charm_item", id: "gem_charm", probability: 0.0001, rarityValue: 8000 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.05, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.05, isRareWeekendEligiblePool: true, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.005, isRareWeekendEligiblePool: true, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.001, isRareWeekendEligiblePool: true, rarityValue: 250000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, isRareWeekendEligiblePool: true, rarityValue: 1000000 } // Slightly increased
            ]
        },

        "xp_charm": {
            id: "xp_charm", name: "XP Charm", type: "charm_item",
            directDropWeight: 0.0001,
            emoji: "<:xpcharm:1373574621311402074>",
            rarityValue: 5000,
            description: "A charm that boosts your XP gain per message.",
            basePrice: 4000, appearanceChanceInShop: 0.00025, stockRangeShop: [1, 3],
            isRareForShopAlert: true, isAlertWorthyByIdShop: true,
            charmType: "xp_charm_type", boost: 1, 
        },
        // "luck_charm" item definition removed
        "coin_charm": {
            id: "coin_charm", name: "Coin Charm", type: "charm_item",
            directDropWeight: 0.0006,
            emoji: "<:coincharm:1373574436342730782>",
            rarityValue: 3000,
            description: "A charm that boosts your coin earnings.",
            basePrice: 6000, appearanceChanceInShop: 0.0009, stockRangeShop: [1, 2],
            isRareForShopAlert: true, isAlertWorthyByIdShop: true,
            charmType: "coin_charm_type", boost: 10, 
        },
        "gem_charm": {
            id: "gem_charm", name: "Gem Charm", type: "charm_item",
            directDropWeight: 0.00001,
            emoji: "<:gemcharm:1373574605310001184>",
            rarityValue: 8000,
            description: "A charm that increases your gem earnings from boxes.",
            basePrice: 10000, appearanceChanceInShop: 0.00001, stockRangeShop: [1, 1],
            isRareForShopAlert: true, isAlertWorthyByIdShop: true,
            charmType: "gem_charm_type", boost: 10, 
        },

        "cosmic_role_token": {
            id: "cosmic_role_token", name: "Cosmic Role Token", type: "cosmic_token", 
            directDropWeight: 0.000001, isRareWeekendEligibleChatDrop: true,
            emoji: "🌌", rarityValue: 1000000,
            description: "An extremely rare token that grants a special cosmic role.",
            basePrice: 77777, appearanceChanceInShop: 0.0000001, stockRangeShop: [1, 1], 
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            roleIdToGrant: "1372583188320227348" 
        }
    },
    directChatDropTable: [ // Robux is NOT added here as it's command/shop only
        { itemId: "nothing_drop", directDropWeight: 0.947474 },
        { itemId: "common_loot_box", directDropWeight: 0.05 },
        { itemId: "rare_loot_box", directDropWeight: 0.0015 },
        { itemId: "epic_loot_box", directDropWeight: 0.0003 },
        { itemId: "legendary_loot_box", directDropWeight: 0.00001 },
        { itemId: "xp_charm", directDropWeight: 0.0001 },
        { itemId: "coin_charm", directDropWeight: 0.0006 },
        { itemId: "gem_charm", directDropWeight: 0.00001 },
        { itemId: "cosmic_role_token", directDropWeight: 0.000006 } // Slightly increased after removing luck_charm
    ]
};

/* -------------------------------------------------------------
 *  Helper: back-fills rarity / emoji etc. for pool items
 * ------------------------------------------------------------- */
function populateItemDetailsInPools(cfg) {
    if (!cfg.pools) return;
    for (const poolName of Object.keys(cfg.pools)) {
        const pool = cfg.pools[poolName];
        pool.forEach(entry => {
            if (typeof entry === "string") {
                const item = cfg.items[entry];
                entry = cfg.items[entry] = { ...item };       // canonical
            } else {
                const item = cfg.items[entry.id];
                Object.assign(entry, { emoji: item.emoji, rarityValue: item.rarityValue });
            }
        });
    }
}

populateItemDetailsInPools(config);

module.exports = config;
