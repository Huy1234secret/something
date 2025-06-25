// shopManager.js
const SHOP_ITEM_TYPES = {
    LOOTBOX: 'loot_box_item',
    CHARM: 'charm_item',
    SPECIAL_ROLE_ITEM: 'special_role_item', 
    GENERAL: 'general_item'
};

const CHARM_TYPES = {
    COIN: 'coin_charm_type',
    XP: 'xp_charm_type',
    GEM: 'gem_charm_type',
    // LUCK: 'luck_charm_type', // Removed
    DISCOUNT: 'discount_charm_type',
    TAX_REDUCTION: 'tax_reduction_charm_type'
};

// These constants are now primarily sourced from gameConfig.globalSettings
// const INSTANT_RESTOCK_GEM_COST = 5; 
// const MAX_PURCHASE_AMOUNT_PER_TRANSACTION = 99;

class ShopManager {
    constructor(db, systemsManager) {
        console.log('[ShopManager Constructor] Initializing ShopManager...');
        if (!db) {
            console.error("[ShopManager Constructor] CRITICAL: Database instance (db) is null or undefined.");
            throw new Error("ShopManager requires a valid database instance.");
        }
        if (!systemsManager || !systemsManager.gameConfig) {
            console.error("[ShopManager Constructor] CRITICAL: SystemsManager instance or gameConfig is missing.");
            throw new Error("ShopManager requires a SystemsManager instance with gameConfig.");
        }
        this.db = db;
        this.systemsManager = systemsManager; 
        this.initializeSchema();
        console.log('[ShopManager Constructor] ShopManager initialized.');
    }

    initializeSchema() {
        try {
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS guildShopItems (
                    guildId TEXT NOT NULL,
                    slotId INTEGER NOT NULL,
                    itemId TEXT NOT NULL,
                    currentPrice INTEGER NOT NULL,
                    originalPrice INTEGER NOT NULL, 
                    stock INTEGER NOT NULL,
                    isWeekendSpecial INTEGER DEFAULT 0, 
                    discountLabel TEXT DEFAULT '', /* Added to store the specific discount label */
                    discountPercent REAL DEFAULT 0, /* Added to store the actual discount percentage */
                    PRIMARY KEY (guildId, slotId)
                );
            `);
            // Add new columns if they don't exist (for upgrades from older versions)
            const shopItemsInfo = this.db.prepare("PRAGMA table_info(guildShopItems)").all();
            if (!shopItemsInfo.some(col => col.name === 'discountLabel')) {
                this.db.exec(`ALTER TABLE guildShopItems ADD COLUMN discountLabel TEXT DEFAULT '';`);
            }
            if (!shopItemsInfo.some(col => col.name === 'discountPercent')) {
                this.db.exec(`ALTER TABLE guildShopItems ADD COLUMN discountPercent REAL DEFAULT 0;`);
            }


            this.db.exec(`
                CREATE TABLE IF NOT EXISTS guildShopSettings (
                    guildId TEXT PRIMARY KEY,
                    shopChannelId TEXT,
                    shopMessageId TEXT,
                    shopTitle TEXT, 
                    lastRestockTimestamp INTEGER DEFAULT 0,
                    restockIntervalMs INTEGER DEFAULT 21600000, 
                    nextRestockTimestamp INTEGER DEFAULT 0 
                );
            `);
            const shopSettingsInfo = this.db.prepare("PRAGMA table_info(guildShopSettings)").all();
            if (!shopSettingsInfo.some(col => col.name === 'shopMessageId')) {
                this.db.exec(`ALTER TABLE guildShopSettings ADD COLUMN shopMessageId TEXT;`);
            }
            if (!shopSettingsInfo.some(col => col.name === 'shopTitle')) {
                const defaultShopTitle = this.systemsManager.gameConfig.globalSettings?.DEFAULT_SHOP_TITLE || '🛒 Server Shop';
                this.db.exec(`ALTER TABLE guildShopSettings ADD COLUMN shopTitle TEXT DEFAULT '${defaultShopTitle.replace(/'/g, "''")}';`); 
            }
             if (!shopSettingsInfo.some(col => col.name === 'nextRestockTimestamp')) {
                 this.db.exec(`ALTER TABLE guildShopSettings ADD COLUMN nextRestockTimestamp INTEGER DEFAULT 0;`);
             }
        } catch (error) {
            console.error("[ShopManager] Error initializing schema:", error);
            throw error; 
        }
    }

    _performWeightedRandomPick(items, probabilityKey = 'probability') {
        if (!items || items.length === 0) return null;
        // Ensure probabilities sum to roughly 1, or normalize if they don't (though gameConfig should be set up correctly)
        const totalProbability = items.reduce((sum, item) => sum + (item[probabilityKey] || 0), 0);
        if (totalProbability <= 0) {
            // Fallback: if all probabilities are zero or negative, pick one at random from those with non-zero prob if any, else null
            const eligibleItems = items.filter(item => typeof item[probabilityKey] === 'number' && item[probabilityKey] > 0);
            if (eligibleItems.length > 0) return eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
            return null;
        }
        // If totalProbability is not close to 1, it implies the config needs review.
        // For this function, we'll proceed assuming the probabilities are correctly defined to sum to 1 for a proper distribution.
        // If they don't sum to 1, this method will still pick based on relative weights, but it's less statistically pure.

        const rand = Math.random(); // Random number between 0 (inclusive) and 1 (exclusive)
        let cumulativeProbability = 0;
        for (const item of items) {
            cumulativeProbability += (item[probabilityKey] || 0);
            if (rand < cumulativeProbability) { // Note: Using < for rand (0 to almost 1)
                return item;
            }
        }
        // Fallback for floating point inaccuracies or if probabilities don't sum to exactly 1
        return items[items.length - 1];
    }


    getGuildShopSettings(guildId) {
        const stmt = this.db.prepare(`SELECT * FROM guildShopSettings WHERE guildId = ?`);
        let settings = stmt.get(guildId);
        const defaultShopTitle = this.systemsManager.gameConfig.globalSettings?.DEFAULT_SHOP_TITLE || '🛒 Server Shop';
        const defaultRestockIntervalMinutes = this.systemsManager.gameConfig.globalSettings?.SHOP_RESTOCK_INTERVAL_MINUTES || 5;
        const defaultRestockIntervalMs = defaultRestockIntervalMinutes * 60 * 1000;

         if (!settings) {
            settings = {
                guildId: guildId, shopChannelId: null, shopMessageId: null, shopTitle: defaultShopTitle, 
                lastRestockTimestamp: 0, restockIntervalMs: defaultRestockIntervalMs, nextRestockTimestamp: 0 
            };
            this.setGuildShopSettings(guildId, settings); 
        }
        settings.shopTitle = settings.shopTitle || defaultShopTitle;
        settings.restockIntervalMs = settings.restockIntervalMs || defaultRestockIntervalMs; 
        settings.lastRestockTimestamp = settings.lastRestockTimestamp || 0;
        settings.nextRestockTimestamp = settings.nextRestockTimestamp || 0;
        return settings;
    }

    setGuildShopSettings(guildId, settings) {
        const defaultShopTitle = this.systemsManager.gameConfig.globalSettings?.DEFAULT_SHOP_TITLE || '🛒 Server Shop';
        const defaultRestockIntervalMinutes = this.systemsManager.gameConfig.globalSettings?.SHOP_RESTOCK_INTERVAL_MINUTES || 5;
        const defaultRestockIntervalMs = defaultRestockIntervalMinutes * 60 * 1000;

         const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO guildShopSettings (
                guildId, shopChannelId, shopMessageId, shopTitle,
                lastRestockTimestamp, restockIntervalMs, nextRestockTimestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            guildId, settings.shopChannelId, settings.shopMessageId, settings.shopTitle || defaultShopTitle,
            settings.lastRestockTimestamp || 0, settings.restockIntervalMs || defaultRestockIntervalMs,
            settings.nextRestockTimestamp || 0
        );
    }

    updateGuildShopSettings(guildId, updates) {
        const currentSettings = this.getGuildShopSettings(guildId);
        const newSettings = { ...currentSettings, ...updates };
        this.setGuildShopSettings(guildId, newSettings);
    }

    async restockShop(guildId, isForcedByAdmin = false) {
        try {
            const guildSettings = this.getGuildShopSettings(guildId);
            const nowMs = Date.now();
            const configuredIntervalMinutes = this.systemsManager.gameConfig.globalSettings?.SHOP_RESTOCK_INTERVAL_MINUTES || 5;
            const actualRestockIntervalMs = configuredIntervalMinutes * 60 * 1000;
            const lastRestockMs = guildSettings.lastRestockTimestamp || 0;
            const nextScheduledRestockBasedOnConfigMs = lastRestockMs + actualRestockIntervalMs;
            const nextRestockTimestampFromDbMs = guildSettings.nextRestockTimestamp || 0;

            if (!isForcedByAdmin && nowMs < nextRestockTimestampFromDbMs && nowMs < nextScheduledRestockBasedOnConfigMs) {
                return { success: false, message: "Shop not due for restock." };
            }
            console.log(`[ShopManager Restock Guild: ${guildId}] Starting restock... (Forced: ${isForcedByAdmin}, Interval: ${configuredIntervalMinutes} mins)`);

            const result = this.db.transaction(() => {
                this.db.prepare(`DELETE FROM guildShopItems WHERE guildId = ?`).run(guildId);
                console.log(`[ShopManager Restock Guild: ${guildId}] Cleared existing shop items from DB.`);

                const newShopItems = [];
                const maxShopSlots = this.systemsManager.gameConfig.globalSettings?.MAX_SHOP_SLOTS || 10;
                let alertableItemsFound = [];
                const allMasterItems = this.systemsManager.gameConfig.items;
                const allPossibleShopItems = Object.values(allMasterItems)
                    .filter(item => item.appearanceChanceInShop && item.appearanceChanceInShop > 0 && item.basePrice !== undefined && item.stockRangeShop);
                console.log(`[ShopManager Restock Guild: ${guildId}] Total possible shop items based on config: ${allPossibleShopItems.length}`);

                let itemsAvailableThisRestock = [];
                for (const itemConfig of allPossibleShopItems) {
                    if (Math.random() < itemConfig.appearanceChanceInShop) {
                        itemsAvailableThisRestock.push(itemConfig);
                    }
                }
                console.log(`[ShopManager Restock Guild: ${guildId}] Items that passed individual appearance roll: ${itemsAvailableThisRestock.length} IDs: ${itemsAvailableThisRestock.map(i => i.id).join('; ')}`);
                itemsAvailableThisRestock.sort(() => 0.5 - Math.random());

                let slotsFilled = 0;
                for (let slotId = 1; slotId <= maxShopSlots; slotId++) {
                    if (itemsAvailableThisRestock.length === 0) break; 
                    const selectedItemConfig = itemsAvailableThisRestock.shift(); 

                    if (selectedItemConfig) {
                        let stock = Math.floor(Math.random() * (selectedItemConfig.stockRangeShop[1] - selectedItemConfig.stockRangeShop[0] + 1)) + selectedItemConfig.stockRangeShop[0];
                        const originalPrice = selectedItemConfig.basePrice;
                        let currentPrice = originalPrice;
                        let isWeekendSpecialFlag = 0;
                        let itemDiscountPercent = 0;
                        let itemDiscountLabel = "";

                        const weekendSettingsGuild = this.systemsManager.getGuildSettings(guildId);
                        const isWeekend = weekendSettingsGuild.weekendBoostActive; 
                        const weekendShopStockMultiplier = this.systemsManager.gameConfig.globalSettings?.WEEKEND_SHOP_STOCK_MULTIPLIER || 1;

                        if (isWeekend && weekendShopStockMultiplier > 1) {
                            stock = Math.round(stock * weekendShopStockMultiplier);
                        }
                        
                        const discountTiersToUse = isWeekend ? 
                            this.systemsManager.gameConfig.globalSettings.WEEKEND_SHOP_DISCOUNT_TIERS :
                            this.systemsManager.gameConfig.globalSettings.NORMAL_SHOP_DISCOUNT_TIERS;

                        // Eligibility for ANY discount: item is rare OR it's the cosmic token OR any item during weekend if weekend tiers are defined
                        const cosmicTokenIdConst = this.systemsManager.gameConfig.items.cosmic_role_token?.id || 'cosmic_role_token';
                        const isEligibleForAnyDiscount = selectedItemConfig.isRareForShopAlert || selectedItemConfig.id === cosmicTokenIdConst || (isWeekend && discountTiersToUse.length > 0);


                        if (isEligibleForAnyDiscount && discountTiersToUse && discountTiersToUse.length > 0) {
                            const chosenDiscountTier = this._performWeightedRandomPick(discountTiersToUse, 'probability');
                            if (chosenDiscountTier && chosenDiscountTier.discount > 0) {
                                itemDiscountPercent = chosenDiscountTier.discount;
                                currentPrice = Math.round(originalPrice * (1 - itemDiscountPercent));
                                itemDiscountLabel = chosenDiscountTier.label || `${(itemDiscountPercent * 100).toFixed(0)}% OFF`;
                                if (isWeekend) {
                                     isWeekendSpecialFlag = 1; // Mark as special even if discount is from normal tier IF it's weekend
                                     if (!itemDiscountLabel.toLowerCase().includes("weekend deal")) { // Ensure weekend label is present
                                         itemDiscountLabel = `🎉 ${itemDiscountLabel.replace(/🏷️\s*/, '')} (Weekend Deal)`;
                                     }
                                }
                            } else if (chosenDiscountTier) { // 0% discount tier from normal list
                                itemDiscountLabel = chosenDiscountTier.label; // Should be ""
                                itemDiscountPercent = 0;
                            }
                        }
                        
                        this.updateShopItem(guildId, slotId, selectedItemConfig.id, currentPrice, originalPrice, stock, isWeekendSpecialFlag, itemDiscountLabel, itemDiscountPercent);

                        const shopEntry = {
                            slotId: slotId, itemId: selectedItemConfig.id, name: selectedItemConfig.name,
                            emoji: selectedItemConfig.emoji, currentPrice: currentPrice, originalPrice: originalPrice,
                            stock: stock, isWeekendSpecial: isWeekendSpecialFlag, description: selectedItemConfig.description,
                            itemType: selectedItemConfig.type, discountPercent: itemDiscountPercent, discountLabel: itemDiscountLabel
                        };
                        newShopItems.push(shopEntry);

                        const alertWorthyDiscountThreshold = this.systemsManager.gameConfig.globalSettings?.ALERT_WORTHY_DISCOUNT_PERCENT || 0.25;
                        if (stock > 0 && (isWeekendSpecialFlag === 1 || itemDiscountPercent >= alertWorthyDiscountThreshold)) {
                             alertableItemsFound.push({
                                id: selectedItemConfig.id, name: selectedItemConfig.name, emoji: selectedItemConfig.emoji,
                                price: currentPrice, originalPrice: originalPrice, stock: stock,
                                discountPercent: itemDiscountPercent, discountLabel: itemDiscountLabel, isWeekendSpecial: isWeekendSpecialFlag
                            });
                        }
                        slotsFilled++;
                    } else {
                        console.warn(`[ShopManager Restock Guild: ${guildId}] selectedItemConfig was null for slot ${slotId}.`);
                        break; 
                    }
                }
                const newNextRestockTimestampMs = nowMs + actualRestockIntervalMs;
                this.updateGuildShopSettings(guildId, {
                    lastRestockTimestamp: nowMs, nextRestockTimestamp: newNextRestockTimestampMs,
                    restockIntervalMs: actualRestockIntervalMs 
                });
                console.log(`[ShopManager Restock Guild: ${guildId}] Shop restock logic complete. ${slotsFilled} slots processed. Next restock using interval: ${configuredIntervalMinutes} mins.`);
                return { success: true, message: "Shop restocked.", items: newShopItems, alertableItemsFound };
            })();
            return result;
        } catch (error) {
            console.error(`[ShopManager] Critical error during shop restock for guild ${guildId}:`, error);
            return { success: false, message: "Critical error during restock." };
        }
    }

    getShopItems(guildId) {
        const stmt = this.db.prepare(`
            SELECT gsi.* FROM guildShopItems gsi
            WHERE gsi.guildId = ?
            ORDER BY gsi.slotId ASC
        `);
        const itemsFromDb = stmt.all(guildId);

        return itemsFromDb.map(dbItem => {
            const masterItemConfig = this.systemsManager._getItemMasterProperty(dbItem.itemId, null); 
            // discountPercent and discountLabel are now directly from DB
            return {
                ...dbItem, 
                name: masterItemConfig?.name || dbItem.itemId, 
                emoji: masterItemConfig?.emoji || '❓', 
                description: masterItemConfig?.description || null,
                itemType: masterItemConfig?.type || 'general_item',
                // MODIFIED LINE BELOW
                priceCurrency: (dbItem.itemId === this.systemsManager.ROBUX_ID && masterItemConfig) ? (masterItemConfig.priceCurrency || this.systemsManager.GEMS_ID) : (masterItemConfig?.priceCurrency || this.systemsManager.COINS_ID),
            };
        });
    }

    getShopItemBySlot(guildId, slotId) {
        const stmt = this.db.prepare(`SELECT * FROM guildShopItems WHERE guildId = ? AND slotId = ?`);
        const dbItem = stmt.get(guildId, slotId);
        if (!dbItem) return null;

        const masterItemConfig = this.systemsManager._getItemMasterProperty(dbItem.itemId, null);
         return {
            ...dbItem, 
            name: masterItemConfig?.name || dbItem.itemId,
            emoji: masterItemConfig?.emoji || '❓',
            description: masterItemConfig?.description || null,
            itemType: masterItemConfig?.type || 'general_item',
            // discountPercent and discountLabel are directly from dbItem
        };
    }

    updateShopItem(guildId, slotId, itemId, currentPrice, originalPrice, stock, isWeekendSpecial = 0, discountLabel = '', discountPercent = 0) {
         const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO guildShopItems (guildId, slotId, itemId, currentPrice, originalPrice, stock, isWeekendSpecial, discountLabel, discountPercent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(guildId, slotId, itemId, currentPrice, originalPrice, stock, isWeekendSpecial, discountLabel, discountPercent);
    }

    async purchaseItem(userId, guildId, itemIdToPurchase, amountToPurchase, member, options = {}) {
        const itemMasterConfigGlobal = this.systemsManager._getItemMasterProperty(itemIdToPurchase, null);
        const maxPurchaseAmount = itemMasterConfigGlobal?.maxPurchaseAmountPerTransactionOverride || this.systemsManager.gameConfig.globalSettings.MAX_PURCHASE_AMOUNT_PER_TRANSACTION || 99;

        if (!Number.isInteger(amountToPurchase) || amountToPurchase <= 0) {
            return { success: false, message: "Amount to purchase must be a positive whole number." };
        }
        if (amountToPurchase > maxPurchaseAmount) {
            return { success: false, message: `You can purchase a maximum of ${maxPurchaseAmount} items per transaction.` };
        }

        const currentShopItemsActive = this.getShopItems(guildId);
        const shopItemEntry = currentShopItemsActive.find(item => item.itemId === itemIdToPurchase && item.stock > 0);

        if (!shopItemEntry) {
            return { success: false, message: `Item ID "${itemIdToPurchase}" not found in shop or is out of stock.` };
        }

        // Use the master config for definitive properties like priceCurrency and type
        const itemConfigMaster = this.systemsManager._getItemMasterProperty(shopItemEntry.itemId, null);
        if (!itemConfigMaster) {
            console.error(`[ShopManager Purchase] Master config not found for item ID: ${shopItemEntry.itemId}`);
            return { success: false, message: "An error occurred: item master configuration missing." };
        }

        if (shopItemEntry.stock < amountToPurchase) {
            return { success: false, message: `Not enough stock for ${itemConfigMaster.name}. Only ${shopItemEntry.stock} available.` };
        }

        const userBalance = this.systemsManager.getBalance(userId, guildId);
        const baseCost = shopItemEntry.currentPrice * amountToPurchase;
        const rolePerks = this.systemsManager.getActiveRolePerks(userId, guildId);
        const baseDiscount = rolePerks.totals.discountPercent || 0;
        const extraDiscount = options.extraDiscountPercent || 0;
        const totalDiscountPercent = Math.min(100, baseDiscount + extraDiscount);
        const discountAmount = totalDiscountPercent > 0 ? Math.round(baseCost * (totalDiscountPercent / 100)) : 0;
        const totalCost = Math.max(0, Math.round(baseCost - discountAmount));

        // --- START OF CORRECTION FOR CURRENCY DEDUCTION ---
        let currencyToDeduct = itemConfigMaster.priceCurrency || this.systemsManager.COINS_ID; // Get from master config
        let userCurrencyBalance;
        let currencyEmojiForMessage;

        if (currencyToDeduct === this.systemsManager.GEMS_ID) {
            userCurrencyBalance = userBalance.gems;
            currencyEmojiForMessage = this.systemsManager.gemEmoji || DEFAULT_GEM_EMOJI_FALLBACK;
        } else { // Default to coins
            currencyToDeduct = this.systemsManager.COINS_ID; // Ensure it's explicitly coins if not gems
            userCurrencyBalance = userBalance.coins;
            currencyEmojiForMessage = this.systemsManager.coinEmoji || DEFAULT_COIN_EMOJI_FALLBACK;
        }

        if (userCurrencyBalance < totalCost) {
            return {
                success: false,
                message: `You need ${totalCost.toLocaleString()} ${currencyEmojiForMessage} but you only have ${userCurrencyBalance.toLocaleString()} ${currencyEmojiForMessage}.`,
                itemId: shopItemEntry.itemId,
                itemName: itemConfigMaster.name,
                emoji: itemConfigMaster.emoji || '❓',
                amount: amountToPurchase,
                pricePerItem: shopItemEntry.currentPrice,
                discountAmount,
                discountPercent: totalDiscountPercent,
                totalCost,
                currencyEmoji: currencyEmojiForMessage
            };
        }
        // --- END OF CORRECTION FOR CURRENCY DEDUCTION ---

        if (options.simulateOnly) {
            return {
                success: true,
                itemId: shopItemEntry.itemId,
                itemName: itemConfigMaster.name,
                emoji: itemConfigMaster.emoji || '❓',
                amount: amountToPurchase,
                pricePerItem: shopItemEntry.currentPrice,
                discountAmount,
                discountPercent: totalDiscountPercent,
                totalCost,
                currencyEmoji: currencyEmojiForMessage,
                newStock: shopItemEntry.stock - amountToPurchase,
                slotId: shopItemEntry.slotId
            };
        }

        const purchaseTransaction = this.db.transaction(() => {
            let deductionResult;
            // --- DEDUCT CORRECT CURRENCY ---
            if (currencyToDeduct === this.systemsManager.GEMS_ID) {
                deductionResult = this.systemsManager.addGems(userId, guildId, -totalCost, "shop_purchase");
            } else { // coins
                deductionResult = this.systemsManager.addCoins(userId, guildId, -totalCost, "shop_purchase");
            }

            if (!deductionResult || deductionResult.added !== -totalCost) {
                // This throw will be caught by the outer try-catch and roll back the transaction
                throw new Error(`Failed to deduct full cost. Needed ${totalCost} ${currencyToDeduct}. Balance issue or deduction error. Result: ${JSON.stringify(deductionResult)}`);
            }
            // --- END DEDUCT CORRECT CURRENCY ---

            const newStock = shopItemEntry.stock - amountToPurchase;
            this.updateShopItem(guildId, shopItemEntry.slotId, shopItemEntry.itemId, shopItemEntry.currentPrice, shopItemEntry.originalPrice, newStock, shopItemEntry.isWeekendSpecial, shopItemEntry.discountLabel, shopItemEntry.discountPercent);

            const giveResult = this.systemsManager.giveItem(userId, guildId, shopItemEntry.itemId, amountToPurchase, itemConfigMaster.type, `shop_purchase_${shopItemEntry.itemId}`);
            let itemAddMessagePart = "";
            if (giveResult.success) {
                itemAddMessagePart = giveResult.activated ? ` Effect applied!` : ` Added to your inventory.`;
            } else {
                console.error(`CRITICAL: Payment taken but failed to give item ${shopItemEntry.itemId} (amount ${amountToPurchase}) to ${userId} in ${guildId}. Reason: ${giveResult.message}`);
                throw new Error(`Failed to grant item ${shopItemEntry.itemId} after payment. Reason: ${giveResult.message}`); // This will also trigger rollback
            }
            return {
                success: true,
                itemId: shopItemEntry.itemId,
                itemName: itemConfigMaster.name,
                emoji: itemConfigMaster.emoji || '❓',
                amount: amountToPurchase,
                pricePerItem: shopItemEntry.currentPrice,
                discountAmount,
                discountPercent: totalDiscountPercent,
                totalCost,
                currencyEmoji: currencyEmojiForMessage,
                newStock: newStock,
                slotId: shopItemEntry.slotId
            };
        });

        try {
            const result = purchaseTransaction();
            // If the purchased item was Robux and it's a currency_item, the giveItem logic should handle adding to user's Robux balance.
            // No special handling needed here for Robux itself, as giveItem for type 'currency_item' (if 'robux' is defined this way)
            // or SystemsManager.addRobux() (if giveItem calls it) should manage the balance update.
            return result;
        } catch (error) {
            console.error(`[ShopManager] Transaction error during purchase for user ${userId}, item ${itemIdToPurchase} (amount ${amountToPurchase}) in guild ${guildId}:`, error);
            // Ensure the message clearly states the balance was not changed due to rollback.
            return { success: false, message: `A transaction error occurred: ${error.message}. Your balance has not been changed.` };
        }
    }

     async updateWeekendStatus(guildId, isWeekendNow) {
        console.log(`[ShopManager UpdateWeekendStatus Guild: ${guildId}] Weekend status changed to: ${isWeekendNow}.`);
        const currentShopItems = this.getShopItems(guildId); 
        let itemsUpdated = false; 
        const weekendShopStockMultiplier = this.systemsManager.gameConfig.globalSettings?.WEEKEND_SHOP_STOCK_MULTIPLIER || 1;
        const discountTiersToUse = isWeekendNow ? 
            this.systemsManager.gameConfig.globalSettings.WEEKEND_SHOP_DISCOUNT_TIERS :
            this.systemsManager.gameConfig.globalSettings.NORMAL_SHOP_DISCOUNT_TIERS;

        for (const shopItem of currentShopItems) {
            const masterItemConfig = this.systemsManager._getItemMasterProperty(shopItem.itemId, null);
            if (!masterItemConfig || masterItemConfig.basePrice === undefined) {
                console.log(`[ShopManager UpdateWeekendStatus Guild: ${guildId}] Skipping item ${shopItem.itemId} - no master config or base price.`);
                continue;
            }

            let newCurrentPrice = shopItem.originalPrice; 
            let newIsWeekendSpecial = 0;
            let newDiscountPercent = 0;
            let newDiscountLabel = "";
            let newStock = shopItem.stock; // Start with current stock

            // Adjust stock if weekend starts/ends AND multiplier is > 1
            const currentItemWasWeekendSpecial = shopItem.isWeekendSpecial === 1;

            if (isWeekendNow && !currentItemWasWeekendSpecial && weekendShopStockMultiplier > 1) {
                // Weekend is starting, item wasn't special before (implying it had base stock), multiply stock
                newStock = Math.round(shopItem.stock * weekendShopStockMultiplier);
            } else if (!isWeekendNow && currentItemWasWeekendSpecial && weekendShopStockMultiplier > 1) {
                 // Weekend is ending, item WAS special (implying stock MIGHT have been multiplied), revert stock by dividing
                newStock = Math.round(shopItem.stock / weekendShopStockMultiplier);
                // Ensure stock doesn't go below minimum defined in stockRangeShop after division
                if (masterItemConfig.stockRangeShop && newStock < masterItemConfig.stockRangeShop[0]) {
                     newStock = masterItemConfig.stockRangeShop[0];
                } else if (newStock < 1) { // Absolute minimum if no stockRangeShop defined or malformed
                    newStock = 1;
                }
            } // If weekendShopStockMultiplier is 1, or if weekend status isn't changing in a way that affects stock, newStock remains shopItem.stock


            const cosmicTokenIdConst = this.systemsManager.gameConfig.items.cosmic_role_token?.id || 'cosmic_role_token';
            const isEligibleForAnyDiscount = masterItemConfig.isRareForShopAlert || masterItemConfig.id === cosmicTokenIdConst || (isWeekendNow && discountTiersToUse.length > 0);

            if (isEligibleForAnyDiscount && discountTiersToUse && discountTiersToUse.length > 0) {
                const chosenDiscountTier = this._performWeightedRandomPick(discountTiersToUse, 'probability');
                if (chosenDiscountTier && chosenDiscountTier.discount > 0) {
                    newDiscountPercent = chosenDiscountTier.discount;
                    newCurrentPrice = Math.round(shopItem.originalPrice * (1 - newDiscountPercent));
                    newDiscountLabel = chosenDiscountTier.label || `${(newDiscountPercent * 100).toFixed(0)}% OFF`;
                    if (isWeekendNow) {
                        newIsWeekendSpecial = 1;
                         if (!newDiscountLabel.toLowerCase().includes("weekend deal")) {
                             newDiscountLabel = `🎉 ${newDiscountLabel.replace(/🏷️\s*/, '')} (Weekend Deal)`;
                         }
                    }
                } else if (chosenDiscountTier) { // 0% discount tier
                    newDiscountLabel = chosenDiscountTier.label; // Should be ""
                    newDiscountPercent = 0;
                }
            } // If not eligible or no tiers, price remains originalPrice (unless it was already discounted differently which this doesn't handle beyond weekend toggle)
              // Price should be reset to original IF weekend ends and it had a weekend-only discount.
              // This part implies if discountTiersToUse is empty (e.g. normal tiers if it was a weekend specific discount), price should revert.
              // The current logic: it re-rolls discount based on new "current" (weekend or normal) tiers.
              // This is generally fine, as it means items always get a chance at whatever current period's discounts are.
            
            if (shopItem.currentPrice !== newCurrentPrice || shopItem.isWeekendSpecial !== newIsWeekendSpecial || shopItem.discountLabel !== newDiscountLabel || shopItem.discountPercent !== newDiscountPercent || shopItem.stock !== newStock) {
                this.db.transaction(() => { 
                    this.updateShopItem(
                        guildId, shopItem.slotId, shopItem.itemId,
                        newCurrentPrice, shopItem.originalPrice, newStock,
                        newIsWeekendSpecial, newDiscountLabel, newDiscountPercent
                    );
                })(); 
                itemsUpdated = true; 
                console.log(`[ShopManager UpdateWeekendStatus Guild: ${guildId}] Item ${shopItem.itemId} (${masterItemConfig.name}) updated. Price: ${newCurrentPrice}, Stock: ${newStock}, Label: '${newDiscountLabel}', IsSpecial: ${newIsWeekendSpecial}`);
            }
        }
        if (itemsUpdated) {
            console.log(`[ShopManager UpdateWeekendStatus Guild: ${guildId}] Shop items updated due to weekend status change. Refreshing display if possible.`);
        } else {
            console.log(`[ShopManager UpdateWeekendStatus Guild: ${guildId}] No shop items required updates for weekend status change.`);
        }
        return itemsUpdated; 
    }
}
module.exports = {
    ShopManager,
    SHOP_ITEM_TYPES,
    CHARM_TYPES,
};