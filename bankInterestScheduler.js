/**
 * bankInterestScheduler.js
 *
 * Adds a daily-interest system for player banks and keeps it in sync
 * with your SQLite data.  Plug-and-play with the rest of your bot:
 *
 *   const { scheduleDailyBankInterest } = require('./bankInterestScheduler.js');
 *   scheduleDailyBankInterest(client, client.levelSystem);
 *
 * Requirements:
 *   • `client`          – your logged-in Discord.js client
 *   • `systemsManager`  – whatever you exposed on `client.levelSystem`
 *                         (must contain `.db`, plus the BANK_TIERS
 *                         array shown below or imported via systems.js)
 *
 * The module:
 *   • Ensures a `lastInterestTimestamp` column exists in the `users` table
 *   • Runs every hour; credits interest once per 24 h per user
 *   • Credits interest to the user’s balance
 *   • Caps coins/gems at the inventory capacity and DM’s the user if full
*/

/* ------------------------------------------------------------------ */
/*  1.  Tier definition – 10 balanced tiers + helper for other files  */
/* ------------------------------------------------------------------ */
const BANK_TIERS = [
    /* idx 0 */ { name: 'Tier 0', coinCap: 10_000,  gemCap: 100,  upgradeCost: 8_000,  interestRate: 0  },
    /* idx 1 */ { name: 'Tier 1', coinCap: 50_000,  gemCap: 250,  upgradeCost: 40_000,  interestRate: 1  },
    /* idx 2 */ { name: 'Tier 2', coinCap:150_000,  gemCap: 500,  upgradeCost:120_000,  interestRate: 2  },
    /* idx 3 */ { name: 'Tier 3', coinCap:300_000,  gemCap: 800,upgradeCost:240_000,  interestRate: 3  },
    /* idx 4 */ { name: 'Tier 4', coinCap:500_000,  gemCap: 1_200,upgradeCost:400_000,  interestRate: 4  },
    /* idx 5 */ { name: 'Tier 5', coinCap:750_000,  gemCap: 1_800,upgradeCost:600_000,  interestRate: 5  },
    /* idx 6 */ { name: 'Tier 6', coinCap:1_000_000,  gemCap: 2_500,upgradeCost:800_000,  interestRate: 6  },
    /* idx 7 */ { name: 'Tier 7', coinCap:1_500_000,gemCap: 3_750,upgradeCost:1_200_000, interestRate: 7  },
    /* idx 8 */ { name: 'Tier 8', coinCap:2_250_000,gemCap: 5_000,upgradeCost:1_800_000, interestRate: 8  },
    /* idx 9 */ { name: 'Tier 9', coinCap:3_500_000,gemCap: 7_500,upgradeCost:2_800_000, interestRate: 9  },
    /* idx10 */ { name: 'Tier 10',coinCap:5_000_000,gemCap: 15_000,upgradeCost:null,   interestRate:10  }
];

// Export so other files (e.g. bank.js / systems.js) can `require()` it
module.exports.BANK_TIERS = BANK_TIERS;

const { INVENTORY_COIN_CAP, INVENTORY_GEM_CAP } = require('./systems.js');

/* ------------------------------------------------------------------ */
/*  2.  Public entry – call once after the bot is ready                */
/* ------------------------------------------------------------------ */
module.exports.scheduleDailyBankInterest = function scheduleDailyBankInterest(
    client,
    systemsManager             // shorthand for whatever you use (has .db)
) {
    ensureSchema(systemsManager);

    // First run immediately
    applyInterest(client, systemsManager).catch(console.error);

    // Then check hourly – credits only when ≥ 24 h have elapsed
    setInterval(
        () => applyInterest(client, systemsManager).catch(console.error),
        60 * 60 * 1000
    );
};

/* ------------------------------------------------------------------ */
/*  3.  Helpers                                                        */
/* ------------------------------------------------------------------ */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Adds `lastInterestTimestamp` to the users table if it doesn’t exist.
 * Column is INTEGER (milliseconds since epoch).
 */
function ensureSchema(systemsManager) {
    const cols = systemsManager.db
        .prepare('PRAGMA table_info(users);')
        .all()
        .map(c => c.name);

    if (!cols.includes('lastInterestTimestamp')) {
        systemsManager.db.exec(
            'ALTER TABLE users ADD COLUMN lastInterestTimestamp INTEGER DEFAULT 0;'
        );
        console.log('[BankInterest] Added lastInterestTimestamp column.');
    }
}

/**
 * Iterate over every user row, add interest if ≥ 24 h, save, DM summary.
 */
async function applyInterest(client, systemsManager) {
    const now = Date.now();

    const users = systemsManager.db.prepare(
        'SELECT userId, guildId, coins, gems, bankCoins, bankGems, bankTier, lastInterestTimestamp ' +
        'FROM users'
    ).all();

    const update = systemsManager.db.prepare(
        'UPDATE users SET coins = ?, gems = ?, lastInterestTimestamp = ? ' +
        'WHERE userId = ? AND guildId = ?'
    );

    for (const u of users) {
        if (now - (u.lastInterestTimestamp || 0) < ONE_DAY_MS) continue; // Not yet 24 h

        const tier     = BANK_TIERS[u.bankTier] ?? BANK_TIERS[0];
        const ratePct  = tier.interestRate ?? 0;
        const addCoins = Math.floor(u.bankCoins * ratePct / 100);
        const addGems  = Math.floor(u.bankGems  * ratePct / 100);

        let newCoins = u.coins + addCoins;
        let newGems  = u.gems  + addGems;

        const coinCap = systemsManager.gameConfig.globalSettings.INVENTORY_COIN_CAP || INVENTORY_COIN_CAP;
        const gemCap  = systemsManager.gameConfig.globalSettings.INVENTORY_GEM_CAP  || INVENTORY_GEM_CAP;

        let cappedCoins = false,
            cappedGems  = false;

        if (newCoins > coinCap) {
            newCoins    = coinCap;
            cappedCoins = true;
        }
        if (newGems > gemCap) {
            newGems   = gemCap;
            cappedGems = true;
        }

        update.run(newCoins, newGems, now, u.userId, u.guildId);

        /* ---- DM the user a polite summary -------------------------------- */
        try {
            const dm         = await client.users.fetch(u.userId);
            const coinEmoji  = systemsManager.coinEmoji ?? '🪙';
            const gemEmoji   = systemsManager.gemEmoji  ?? '💎';

            let msg  = `🏦 **Daily Bank Interest** – ${tier.name} (+${ratePct}%):\n`;
            msg     += `${coinEmoji} **+${addCoins.toLocaleString()}** coins to your balance\n`;
            msg     += `${gemEmoji} **+${addGems.toLocaleString()}** gems to your balance`;

            if (cappedCoins || cappedGems)
                msg +=
                    '\n⚠️ Your inventory was full; some interest was lost.';

            await dm.send(msg).catch(() => {});
        } catch {
            /* ignored – user may have DMs closed */
        }
    }
}
