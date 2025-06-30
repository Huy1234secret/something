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

        // Restock interval for the shop in minutes. Hard-coded to 5 to prevent
        // environment variables from overriding this value unintentionally.
        SHOP_RESTOCK_INTERVAL_MINUTES: 5,
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
        WEEKEND_COIN_MULTIPLIER: 2,
        WEEKEND_GEM_MULTIPLIER:  2,
        WEEKEND_XP_MULTIPLIER:   2,
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
            { discount: 1.00, probability: 0.001, label: "FREE! (WD)" },
            { discount: 0.50, probability: 0.019, label: "50% OFF (WD)" },
            { discount: 0.25, probability: 0.130, label: "25% OFF (WD)" },
            { discount: 0.10, probability: 0.850, label: "10% OFF (WD)" }
        ],
        NORMAL_SHOP_DISCOUNT_TIERS: [
            { discount: 0.50, probability: 0.010, label: "50% OFF!"      },
            { discount: 0.25, probability: 0.090, label: "25% OFF"       },
            { discount: 0.10, probability: 0.450, label: "10% OFF"       },
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
            legendary_loot_box:   50,
            mythical_chest: 25,
            void_chest: 10,
            magic_chest: 50,
            inf_chest: 10
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
            id: "common_loot_box", name: "Common Chest", type: "loot_box_item",
            directDropWeight: 0.095,
            emoji: "<:common:1385904265184149525>", rarityValue: 100,
            description: "A common chest containing a few items.",
            basePrice: 100, appearanceChanceInShop: 1, stockRangeShop: [100, 200],
            isRareForShopAlert: false,
            isAlertWorthyByIdShop: false,
            color: 0xBDC3C7, imageUrl: "https://i.ibb.co/kVp9p2x9/nh4.png", numRolls: 3,
            itemPool: [
                { type: "currency", subType: "coins", min: 1, max: 5, probability: 0.8, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 1, max: 1, probability: 0.1, rarityValue: 25 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.01, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.005, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.000988, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.00001, rarityValue: 250000 },
                { type: "loot_box_item", id: "magic_chest", quantity: 1, probability: 0.000001, rarityValue: 500000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, rarityValue: 1000000 }
            ]
        },
        "rare_loot_box": {
            id: "rare_loot_box", name: "Rare Chest", type: "loot_box_item",
            directDropWeight: 0.0045, isRareWeekendEligibleChatDrop: true,
            emoji: "<:rare:1385904281424625795>", rarityValue: 1000,
            description: "A rare chest with better chances for good items.",
            basePrice: 900, appearanceChanceInShop: 0.5, stockRangeShop: [75, 150],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: false,
            color: 0x0070DD, imageUrl: "https://i.ibb.co/ynZN3pNd/nh5.png", numRolls: 5,
            itemPool: [
                { type: "currency", subType: "coins", min: 1, max: 10, probability: 0.8, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 1, max: 1, probability: 0.1, rarityValue: 25 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.1, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.01, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.005, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.00005, rarityValue: 250000 },
                { type: "loot_box_item", id: "magic_chest", quantity: 1, probability: 0.000002, rarityValue: 500000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, rarityValue: 1000000 }
            ]
        },
        "epic_loot_box": {
            id: "epic_loot_box", name: "Epic Chest", type: "loot_box_item",
            directDropWeight: 0.0008, isRareWeekendEligibleChatDrop: true,
            emoji: "<:epic:1385904294934609981>", rarityValue: 50000,
            description: "An epic chest containing valuable treasures.",
            basePrice: 4500, appearanceChanceInShop: 0.1, stockRangeShop: [50, 100],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0x9400D3, imageUrl: "https://i.ibb.co/TMfz2f6Q/nh6.png", numRolls: 10,
            itemPool: [
                { type: "currency", subType: "coins", min: 1, max: 25, probability: 0.8, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 1, max: 2, probability: 0.1, rarityValue: 25 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.1, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.05, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.01, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.0001, rarityValue: 250000 },
                { type: "loot_box_item", id: "mythical_chest", quantity: 1, probability: 0.000001, rarityValue: 750000 },
                { type: "loot_box_item", id: "magic_chest", quantity: 1, probability: 0.000003, rarityValue: 500000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, rarityValue: 1000000 }
            ]
        },
        "legendary_loot_box": {
            id: "legendary_loot_box", name: "Legendary Chest", type: "loot_box_item",
            directDropWeight: 0.0001, isRareWeekendEligibleChatDrop: true,
            emoji: "<:legend:1385904172481773598>", rarityValue: 250000,
            description: "A legendary chest of immense power and rarity.",
            basePrice: 20000, appearanceChanceInShop: 0.01, stockRangeShop: [25, 50],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0xFF8C00, imageUrl: "https://i.ibb.co/MyCXX90z/nh7.png", numRolls: 30,
            itemPool: [
                { type: "currency", subType: "coins", min: 1, max: 50, probability: 0.8, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 2, max: 2, probability: 0.1, rarityValue: 25 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.1, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.05, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.005, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.0005, rarityValue: 250000 },
                { type: "loot_box_item", id: "mythical_chest", quantity: 1, probability: 0.00001, rarityValue: 750000 },
                { type: "loot_box_item", id: "magic_chest", quantity: 1, probability: 0.000005, rarityValue: 500000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, rarityValue: 1000000 }
            ]
        },

        "mythical_chest": {
            id: "mythical_chest", name: "Mythical Chest", type: "loot_box_item",
            directDropWeight: 0.00008,
            emoji: "<:mythical:1385905307619950602>", rarityValue: 750000,
            description: "A chest rumored to contain unimaginable riches.",
            basePrice: 80000, appearanceChanceInShop: 0.005, stockRangeShop: [10, 25],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0xFFD700, numRolls: 50,
            itemPool: [
                { type: "currency", subType: "coins", min: 1, max: 100, probability: 0.8, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 5, max: 5, probability: 0.1, rarityValue: 25 },
                { type: "loot_box_item", id: "common_loot_box", quantity: 1, probability: 0.15, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", quantity: 1, probability: 0.05, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", quantity: 1, probability: 0.01, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", quantity: 1, probability: 0.001, rarityValue: 250000 },
                { type: "loot_box_item", id: "mythical_chest", quantity: 1, probability: 0.0001, rarityValue: 750000 },
                { type: "loot_box_item", id: "void_chest", quantity: 1, probability: 0.000001, rarityValue: 900000 },
                { type: "loot_box_item", id: "magic_chest", quantity: 1, probability: 0.001, rarityValue: 500000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, rarityValue: 1000000 }
            ]
        },

        "void_chest": {
            id: "void_chest", name: "Void Chest", type: "loot_box_item",
            directDropWeight: 0,
            emoji: "<:void:1385904203712696440>", rarityValue: 900000,
            description: "A dark chest from beyond the known world.",
            basePrice: 999999, appearanceChanceInShop: 0.0001, stockRangeShop: [1, 1],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0x000000, numRolls: 10,
            itemPool: [
                { type: "currency", subType: "coins", min: 100, max: 1000, probability: 0.35, rarityValue: 10 },
                { type: "currency", subType: "gems", min: 50, max: 500, probability: 0.2, rarityValue: 25 },
                { type: "loot_box_item", id: "common_loot_box", min: 25, max: 100, probability: 0.25, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", min: 10, max: 50, probability: 0.14, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", min: 5, max: 20, probability: 0.049, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", min: 2, max: 10, probability: 0.019, rarityValue: 250000 },
                { type: "loot_box_item", id: "mythical_chest", min: 1, max: 3, probability: 0.001, rarityValue: 750000 },
                { type: "loot_box_item", id: "gem_chest", min: 1, max: 3, probability: 0.0005, rarityValue: 500000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, rarityValue: 1000000 }
            ]
        },

        "inf_chest": {
            id: "inf_chest", name: "INF Chest", type: "loot_box_item",
            directDropWeight: 0,
            emoji: "<:inf:1385908034286518352>", rarityValue: 1000000,
            description: "The ultimate chest with endless rewards.",
            basePrice: 0, appearanceChanceInShop: 0, stockRangeShop: [1, 1],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0xFFFFFF, numRolls: 100,
            itemPool: [
                { type: "loot_box_item", id: "common_loot_box", min: 1, max: 10, probability: 0.399989, rarityValue: 100 },
                { type: "loot_box_item", id: "rare_loot_box", min: 1, max: 5, probability: 0.3, rarityValue: 1000 },
                { type: "loot_box_item", id: "epic_loot_box", min: 1, max: 3, probability: 0.2, rarityValue: 50000 },
                { type: "loot_box_item", id: "legendary_loot_box", min: 1, max: 2, probability: 0.09, rarityValue: 250000 },
                { type: "loot_box_item", id: "mythical_chest", quantity: 1, probability: 0.0099, rarityValue: 750000 },
                { type: "loot_box_item", id: "void_chest", quantity: 1, probability: 0.0001, rarityValue: 900000 },
                { type: "loot_box_item", id: "magic_chest", quantity: 1, probability: 0.00001, rarityValue: 500000 },
                { type: "cosmic_token", id: "cosmic_role_token", quantity: 1, probability: 0.000001, rarityValue: 1000000 }
            ]
        },

        "gem_chest": {
            id: "gem_chest", name: "Gem Chest", type: "loot_box_item",
            directDropWeight: 0,
            emoji: "<:gemchest:1385904250059624552>", rarityValue: 500000,
            description: "A chest filled with sparkling gems.",
            basePrice: 50000, appearanceChanceInShop: 0.00005, stockRangeShop: [1, 3],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0x00FFFF, numRolls: 5,
            itemPool: [
                { type: "currency", subType: "gems", min: 1, max: 10000, probability: 1, rarityValue: 25 }
            ]
        },

        "magic_chest": {
            id: "magic_chest", name: "Magic Chest", type: "loot_box_item",
            directDropWeight: 0,
            emoji: "<:magic:1385904234012213268>", rarityValue: 500000,
            description: "A chest containing mysterious magical items.",
            basePrice: 100000, appearanceChanceInShop: 0, stockRangeShop: [1, 1],
            isRareForShopAlert: true,
            isAlertWorthyByIdShop: true,
            color: 0x800080, numRolls: 5,
            itemPool: [
                { type: "charm_item", id: "coin_charm", probability: 0.9, rarityValue: 3000 },
                { type: "charm_item", id: "xp_charm", probability: 0.09, rarityValue: 5000 },
                { type: "charm_item", id: "gem_charm", probability: 0.01, rarityValue: 8000 }
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
        },

        "discount_ticket_10": {
            id: "discount_ticket_10", name: "10% Discount Ticket", type: "item",
            emoji: "<:copper10:1387285573177442457>", rarityValue: 0,
            description: "Apply a 10% discount to a shop purchase."
        },
        "discount_ticket_25": {
            id: "discount_ticket_25", name: "25% Discount Ticket", type: "item",
            emoji: "<silver25:1387285550997831720>", rarityValue: 0,
            description: "Apply a 25% discount to a shop purchase."
        },
        "discount_ticket_50": {
            id: "discount_ticket_50", name: "50% Discount Ticket", type: "item",
            emoji: "<:golden50:1387285563052392488>", rarityValue: 0,
            description: "Apply a 50% discount to a shop purchase."
        },
        "discount_ticket_100": {
            id: "discount_ticket_100", name: "100% Discount Ticket", type: "item",
            emoji: "<:rainbow100:1387285530865176687>", rarityValue: 0,
            description: "Apply a 100% discount to a shop purchase."
        },
        "daily_skip_ticket": {
            id: "daily_skip_ticket", name: "Daily Skip Ticket", type: "item",
            emoji: "<:skipdailyticket:1389239150703673448>", rarityValue: 0,
            description: "Skip the daily reward cooldown without spending gems."
        }
    },
    badges: {
        bp1_champion: {
            id: "bp1_champion",
            name: "Battle-Pass 1# Champion",
            emoji: "<:season1c:1389126156439261264>",
            obtainment: "Be the first to complete July 2025 Batte Pass (unobtainable after the Battle Pass ends)",
            type: "limited - obtainable",
            perk: "<:scoinmulti:1384503519330959380> Coin +100%, <:sgemmulti:1384507113048506428> Gem +25%, <:sxpmulti:1384502410059317410> XP +1"
        },
        bp1_complete: {
            id: "bp1_complete",
            name: "Battle-Pass 1#",
            emoji: "<:season1t:1389126139297140766>",
            obtainment: "complete July 2025 Battle Pass (unobtainable after the Battle Pass ends)",
            type: "limited - obtainable",
            perk: "<:scoinmulti:1384503519330959380> Coin +20%, <:sgemmulti:1384507113048506428> Gem +5%"
        },
        puzzle_champion_2025: {
            id: "puzzle_champion_2025",
            name: "Puzzle Champion 2025",
            emoji: "<:pccbdage:1389237940353241098>",
            obtainment: "Be the first to solve all puzzle in Puzzle Competiton 2025",
            type: "limited - obtainable",
            perk: "<:scoinmulti:1384503519330959380> Coin +100%, <:sgemmulti:1384507113048506428> Gem +25%, <:sxpmulti:1384502410059317410> XP +1"
        }
    },
    directChatDropTable: [ // Robux is NOT added here as it's command/shop only
        { itemId: "nothing_drop", directDropWeight: 0.900077 },
        { itemId: "common_loot_box", directDropWeight: 0.095 },
        { itemId: "rare_loot_box", directDropWeight: 0.0045 },
        { itemId: "epic_loot_box", directDropWeight: 0.0008 },
        { itemId: "legendary_loot_box", directDropWeight: 0.0001 },
        { itemId: "mythical_chest", directDropWeight: 0.00008 },
        { itemId: "gem_chest", directDropWeight: 0.00001 },
        { itemId: "cosmic_role_token", directDropWeight: 0.000001 }
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
