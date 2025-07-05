const fs = require('node:fs');
const path = require('node:path');

class QuestManager {
    constructor(dataFile, battlePassManager) {
        this.dataFile = dataFile;
        this.battlePass = battlePassManager;
        this.data = { users: {} };
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const raw = fs.readFileSync(this.dataFile, 'utf8');
                this.data = JSON.parse(raw);
            }
        } catch (e) { console.error('[QuestManager] Load error:', e); }
    }

    save() {
        try {
            const dir = path.dirname(this.dataFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
        } catch (e) { console.error('[QuestManager] Save error:', e); }
    }

    setBattlePassManager(bp) { this.battlePass = bp; }

    _key(userId, guildId) { return `${userId}-${guildId}`; }

    _getUser(key) {
        if (!this.data.users[key]) {
            this.data.users[key] = {
                daily: [], hourly: [], lastDaily: 0, lastHourly: 0
            };
        }
        return this.data.users[key];
    }

    _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _pickTemplates(templates) {
        const pool = [...templates];
        const chosen = [];
        for (let i = 0; i < 3 && pool.length; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            chosen.push(pool.splice(idx,1)[0]);
        }
        return chosen;
    }

    _generate(type, user) {
        const now = Date.now();
        const templates = type === 'daily' ? QuestManager.DAILY_TEMPLATES : QuestManager.HOURLY_TEMPLATES;
        const picks = this._pickTemplates(templates);
        user[type] = picks.map(t => {
            const target = this._randomInt(t.min, t.max);
            const reward = this._randomInt(t.rewardMin, t.rewardMax);
            return {
                event: t.event,
                description: t.desc.replace('{n}', target),
                target, reward, progress: 0, complete: false
            };
        });
        user['last' + (type === 'daily' ? 'Daily' : 'Hourly')] = now;
    }

    getQuests(userId, guildId) {
        const key = this._key(userId, guildId);
        const user = this._getUser(key);
        const now = Date.now();
        if (now - user.lastDaily >= 24 * 60 * 60 * 1000 || user.daily.length === 0) {
            this._generate('daily', user);
        }
        if (now - user.lastHourly >= 60 * 60 * 1000 || user.hourly.length === 0) {
            this._generate('hourly', user);
        }
        return user;
    }

    addProgress(userId, guildId, event, amount) {
        const key = this._key(userId, guildId);
        const user = this.getQuests(userId, guildId);
        let changed = false;
        for (const type of ['daily','hourly']) {
            for (const q of user[type]) {
                if (q.event === event && !q.complete) {
                    q.progress += amount;
                    if (q.progress >= q.target) {
                        q.progress = q.target;
                        q.complete = true;
                        if (this.battlePass) {
                            this.battlePass.addPoints(userId, guildId, q.reward);
                        }
                    }
                    changed = true;
                }
            }
        }
        if (changed) this.save();
    }
}

QuestManager.DAILY_TEMPLATES = [
    { event:'messages', min:500, max:1000, rewardMin:100, rewardMax:500, desc:'Send {n} messages' },
    { event:'voiceMinutes', min:60, max:600, rewardMin:30, rewardMax:300, desc:'Stay in voice for {n} minutes' },
    { event:'openLootBox', min:100, max:1000, rewardMin:50, rewardMax:500, desc:'Open {n} loot boxes' },
    { event:'slotsWin', min:5, max:25, rewardMin:250, rewardMax:1250, desc:'Win {n} times from slots' },
    { event:'rarityCommon', min:100, max:500, rewardMin:50, rewardMax:250, desc:'Get {n} common rarity items' },
    { event:'rarityRare', min:25, max:200, rewardMin:75, rewardMax:500, desc:'Get {n} rare rarity items' },
    { event:'rarityEpic', min:10, max:50, rewardMin:100, rewardMax:1000, desc:'Get {n} epic rarity items' },
    { event:'rarityLegendary', min:5, max:25, rewardMin:250, rewardMax:2500, desc:'Get {n} legendary rarity items' },
    { event:'rarityMythical', min:2, max:10, rewardMin:500, rewardMax:10000, desc:'Get {n} mythical rarity items' },
    { event:'raritySecret', min:1, max:2, rewardMin:1000, rewardMax:25000, desc:'Get {n} secret rarity items' }
];

QuestManager.HOURLY_TEMPLATES = [
    { event:'messages', min:50, max:100, rewardMin:10, rewardMax:50, desc:'Send {n} messages' },
    { event:'voiceMinutes', min:6, max:60, rewardMin:3, rewardMax:30, desc:'Stay in voice for {n} minutes' },
    { event:'openLootBox', min:10, max:100, rewardMin:5, rewardMax:50, desc:'Open {n} loot boxes' },
    { event:'slotsWin', min:1, max:5, rewardMin:25, rewardMax:125, desc:'Win {n} times from slots' },
    { event:'rarityCommon', min:10, max:50, rewardMin:5, rewardMax:25, desc:'Get {n} common rarity items' },
    { event:'rarityRare', min:5, max:20, rewardMin:7, rewardMax:50, desc:'Get {n} rare rarity items' },
    { event:'rarityEpic', min:5, max:10, rewardMin:10, rewardMax:100, desc:'Get {n} epic rarity items' },
    { event:'rarityLegendary', min:3, max:5, rewardMin:25, rewardMax:250, desc:'Get {n} legendary rarity items' },
    { event:'rarityMythical', min:1, max:3, rewardMin:50, rewardMax:500, desc:'Get {n} mythical rarity items' }
];

module.exports = QuestManager;
