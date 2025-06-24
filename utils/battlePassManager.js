class BattlePassManager {
    constructor(dataFile, startTime, endTime) {
        this.dataFile = dataFile;
        this.startTime = startTime;
        this.endTime = endTime;
        this.data = { userPoints: {} };
        this.fs = require('node:fs');
        this.path = require('node:path');
        this.load();
    }
    load() {
        try {
            if (this.fs.existsSync(this.dataFile)) {
                const raw = this.fs.readFileSync(this.dataFile, 'utf8');
                this.data = JSON.parse(raw);
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
    addPoints(userId, guildId, points) {
        if (Date.now() < this.startTime || Date.now() > this.endTime) return;
        const key = this._key(userId, guildId);
        this.data.userPoints[key] = (this.data.userPoints[key] || 0) + points;
        this.save();
    }
    getPoints(userId, guildId) { return this.data.userPoints[this._key(userId, guildId)] || 0; }
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
        return { points: pts, ...this.progressInfo(pts) };
    }
}
module.exports = BattlePassManager;
