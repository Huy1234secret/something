const REWARDS = require('./battlePassRewards.js');

class BattlePassManager {
    constructor(dataFile, startTime, endTime) {
        this.dataFile = dataFile;
        this.startTime = startTime;
        this.endTime = endTime;
        this.data = { users: {} };
        this.fs = require('node:fs');
        this.path = require('node:path');
        this.load();
    }
    load() {
        try {
            if (this.fs.existsSync(this.dataFile)) {
                const raw = this.fs.readFileSync(this.dataFile, 'utf8');
                this.data = JSON.parse(raw);
                // Upgrade from old format if necessary
                if (this.data.userPoints) {
                    const upgraded = { users: {} };
                    for (const [key, pts] of Object.entries(this.data.userPoints)) {
                        upgraded.users[key] = {
                            xp: pts,
                            level: this.levelFromPoints(pts),
                            lastClaim: 0
                        };
                    }
                    this.data = upgraded;
                    this.save();
                }
            }
        } catch (e) { console.error('[BattlePassManager] Load error:', e); }
    }
    save() {
        try {
            const dir = this.path.dirname(this.dataFile);
            if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
            this.fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
        } catch (e) { console.error('[BattlePassManager] Save error:', e); }
    }
    _key(userId, guildId) { return `${userId}-${guildId}`; }
    _getUser(key) {
        if (!this.data.users[key]) {
            this.data.users[key] = { xp: 0, level: 0, lastClaim: 0 };
        }
        return this.data.users[key];
    }
    addPoints(userId, guildId, points) {
        if (Date.now() < this.startTime || Date.now() > this.endTime) return;
        const key = this._key(userId, guildId);
        const user = this._getUser(key);
        user.xp += points;
        user.level = this.levelFromPoints(user.xp);
        this.save();
    }
    getPoints(userId, guildId) {
        return this._getUser(this._key(userId, guildId)).xp;
    }
    pointsForLevel(level) { return 25 * level * (level + 1); }
    levelFromPoints(points) {
        const n = Math.floor((Math.sqrt(1 + 4 * (points / 25)) - 1) / 2);
        return Math.min(100, Math.max(0, n));
    }
    progressInfo(points) {
        const level = this.levelFromPoints(points);
        const prevTotal = this.pointsForLevel(level);
        const needed = 50 * (level + 1);
        const progress = points - prevTotal;
        const percent = needed > 0 ? Math.min(100, (progress / needed) * 100) : 100;
        return { level, progress, needed, percent };
    }
    getProgress(userId, guildId) {
        const pts = this.getPoints(userId, guildId);
        const user = this._getUser(this._key(userId, guildId));
        return { points: pts, lastClaim: user.lastClaim, ...this.progressInfo(pts) };
    }

    getNextRewards(userId, guildId, count = 3) {
        const user = this._getUser(this._key(userId, guildId));
        const rewards = [];
        for (let i = 1; i <= count; i++) {
            const lvl = user.lastClaim + i;
            if (REWARDS[lvl]) rewards.push({ level: lvl, rewards: REWARDS[lvl] });
        }
        return rewards;
    }

    claimReward(userId, guildId, systemsManager, member) {
        if (Date.now() < this.startTime || Date.now() > this.endTime) {
            return { success: false, message: 'Battle Pass not active.' };
        }
        const key = this._key(userId, guildId);
        const user = this._getUser(key);
        const nextLevel = user.lastClaim + 1;
        if (user.level < nextLevel) {
            return { success: false, message: `Reach level ${nextLevel} to claim this reward.` };
        }
        const rewardSet = REWARDS[nextLevel];
        if (!rewardSet) return { success: false, message: 'No reward available.' };
        const messages = [];
        for (const r of rewardSet) {
            if (r.currency === 'coins') {
                systemsManager.addCoins(userId, guildId, r.amount, 'bp_reward');
                messages.push(`${r.amount.toLocaleString()} Coins`);
            } else if (r.currency === 'gems') {
                systemsManager.addGems(userId, guildId, r.amount, 'bp_reward');
                messages.push(`${r.amount.toLocaleString()} Gems`);
            } else if (r.item) {
                const itemCfg = systemsManager._getItemMasterProperty(r.item, null);
                systemsManager.giveItem(userId, guildId, r.item, r.amount, itemCfg.type, 'bp_reward');
                messages.push(`${r.amount}x ${itemCfg.name}`);
            } else if (r.role) {
                if (member && member.manageable) {
                    member.roles.add(r.role).catch(e => console.warn('[BattlePassManager] role add error', e.message));
                }
                messages.push(`Role <@&${r.role}>`);
            }
        }
        user.lastClaim = nextLevel;
        this.save();
        return { success: true, message: messages.join(', ') };
    }

    isEnded() {
        return Date.now() > this.endTime;
    }
}
module.exports = BattlePassManager;
