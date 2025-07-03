const REWARDS = require('./battlePassRewards.js');

class BattlePassManager {
    constructor(dataFile, startTime, endTime) {
        this.dataFile = dataFile;
        this.startTime = startTime;
        this.endTime = endTime;
        this.data = { users: {}, level100PrizeClaimed: false };
        this.fs = require('node:fs');
        this.path = require('node:path');
        this.load();
    }
    load() {
        try {
            if (this.fs.existsSync(this.dataFile)) {
                const raw = this.fs.readFileSync(this.dataFile, 'utf8');
                this.data = JSON.parse(raw);
                if (typeof this.data.level100PrizeClaimed !== 'boolean') {
                    // backwards compatibility with older field name
                    this.data.level100PrizeClaimed = this.data.level100RobuxClaimed || false;
                }
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
            this.data.users[key] = { xp: 0, level: 0, lastClaim: 0, rebirths: 0 };
        } else {
            if (typeof this.data.users[key].rebirths !== 'number') this.data.users[key].rebirths = 0;
        }
        return this.data.users[key];
    }
    addPoints(userId, guildId, points) {
        if (Date.now() < this.startTime || Date.now() > this.endTime) return;
        const key = this._key(userId, guildId);
        const user = this._getUser(key);
        user.xp += points;
        user.level = this.levelFromPoints(user.xp, user.rebirths);
        this.save();
    }
    getPoints(userId, guildId) {
        return this._getUser(this._key(userId, guildId)).xp;
    }
    getRebirths(userId, guildId) {
        return this._getUser(this._key(userId, guildId)).rebirths || 0;
    }
    pointsNeededForLevel(level, rebirths = 0) {
        const next = level + 1;
        let base;
        if (next <= 30) base = 20 * next;
        else if (next <= 60) base = 40 * next;
        else base = 60 * next;
        const mult = Math.pow(1.35, rebirths);
        return Math.ceil(base * mult);
    }
    pointsForLevel(level, rebirths = 0) {
        let total = 0;
        for (let i = 0; i < level; i++) total += this.pointsNeededForLevel(i, rebirths);
        return total;
    }
    levelFromPoints(points, rebirths = 0) {
        let level = 0;
        let total = 0;
        while (level < 100) {
            const need = this.pointsNeededForLevel(level, rebirths);
            if (points < total + need) break;
            total += need;
            level++;
        }
        return level;
    }
    progressInfo(points, rebirths = 0) {
        const level = this.levelFromPoints(points, rebirths);
        const prevTotal = this.pointsForLevel(level, rebirths);
        const needed = this.pointsNeededForLevel(level, rebirths);
        const progress = points - prevTotal;
        const percent = needed > 0 ? Math.min(100, (progress / needed) * 100) : 100;
        return { level, progress, needed, percent };
    }
    getProgress(userId, guildId) {
        const pts = this.getPoints(userId, guildId);
        const user = this._getUser(this._key(userId, guildId));
        const reb = user.rebirths || 0;
        return { points: pts, lastClaim: user.lastClaim, rebirths: reb, ...this.progressInfo(pts, reb) };
    }

    getRewardSet(level) {
        const base = REWARDS[level] ? [...REWARDS[level]] : null;
        if (!base) return null;
        if (level === 100) {
            if (this.data.level100PrizeClaimed) {
                const replaced = [];
                for (const r of base) {
                    if (r.currency === 'robux' || (r.text && r.text.includes('Gift Card'))) {
                        replaced.push({ item: 'void_chest', amount: 3 });
                    } else {
                        replaced.push(r);
                    }
                }
                return replaced;
            }
        }
        return base;
    }

    getNextRewards(userId, guildId, count = 3) {
        const user = this._getUser(this._key(userId, guildId));
        const rewards = [];
        for (let i = 1; i <= count; i++) {
            const lvl = user.lastClaim + i;
            const set = this.getRewardSet(lvl);
            rewards.push({ level: lvl, rewards: set });
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
        const rewardSet = this.getRewardSet(nextLevel);
        if (!rewardSet) return { success: false, message: 'No reward available.' };
        const mult = Math.pow(2, user.rebirths || 0);
        const messages = [];
        for (const r of rewardSet) {
            if (r.currency === 'coins') {
                const amt = r.amount * mult;
                systemsManager.addCoins(userId, guildId, amt, 'bp_reward');
                messages.push(`${amt.toLocaleString()} Coins`);
            } else if (r.currency === 'gems') {
                const amt = r.amount * mult;
                systemsManager.addGems(userId, guildId, amt, 'bp_reward');
                messages.push(`${amt.toLocaleString()} Gems`);
            } else if (r.currency === 'robux') {
                const amt = r.amount * mult;
                const result = systemsManager.addRobux(userId, guildId, amt, 'bp_reward');
                if (result.success) {
                    messages.push(`${amt.toLocaleString()} Robux`);
                }
            } else if (r.item) {
                const itemCfg = systemsManager._getItemMasterProperty(r.item, null);
                const amt = r.amount * mult;
                systemsManager.giveItem(userId, guildId, r.item, amt, itemCfg.type, 'bp_reward');
                messages.push(`${amt}x ${itemCfg.name}`);
            } else if (r.text) {
                // text-only reward (e.g., external gift card)
                messages.push(r.text);
            } else if (r.role) {
                if (member && member.manageable) {
                    member.roles.add(r.role).catch(e => console.warn('[BattlePassManager] role add error', e.message));
                }
                messages.push(`Role <@&${r.role}>`);
            }
        }
        user.lastClaim = nextLevel;
        let firstClaim = false;
        if (nextLevel === 100 && !this.data.level100PrizeClaimed) {
            this.data.level100PrizeClaimed = true;
            firstClaim = true;
        }
        this.save();
        return { success: true, message: messages.join(', '), firstClaim };
    }

    rebirth(userId, guildId) {
        const key = this._key(userId, guildId);
        const user = this._getUser(key);
        user.xp = 0;
        user.level = 0;
        user.lastClaim = 0;
        user.rebirths = (user.rebirths || 0) + 1;
        this.save();
    }

    isEnded() {
        return Date.now() > this.endTime;
    }
}
module.exports = BattlePassManager;
