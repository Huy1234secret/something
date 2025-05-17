// levelSystem.js
const db = require('better-sqlite3')('database.db');

const LEVEL_ROLES = {
    // Example: "level": "roleId"
    "1": "1372582451741851699",
    "2": "1372583177729867787",
    "3": "1372583185887662151",
    "4": "1372583186357555242",
    "20": "1372583187653595297",
};

class LevelingSystem {
    constructor() {
        this.maxLevel = 20; // Example max level
        this.voiceStates = new Map();
        this.xpCooldowns = new Map();
        this.db = db;

        // Initialize userStats table
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS userStats (
                userId TEXT,
                guildId TEXT,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 0,
                PRIMARY KEY (userId, guildId)
            )
        `).run();

        // Initialize embed_sessions table
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS embed_sessions (
                sessionId TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                guildId TEXT NOT NULL,
                targetChannelId TEXT,
                roleToMentionId TEXT,
                embedData TEXT,
                builderMessageId TEXT,
                createdAt INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `).run();

        // NEW: Initialize guild_settings table for leaderboard and other settings
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guildId TEXT PRIMARY KEY,
                leaderboardChannelId TEXT,
                leaderboardMessageId TEXT,
                leaderboardLastUpdated INTEGER 
            )
        `).run();
    }

    // --- Guild Settings Methods ---
    getGuildSettings(guildId) {
        try {
            return this.db.prepare('SELECT * FROM guild_settings WHERE guildId = ?').get(guildId);
        } catch (error) {
            console.error(`[DB Error] Failed to get settings for guild ${guildId}:`, error);
            return null;
        }
    }

    setGuildSettings(guildId, settingsToUpdate) {
        try {
            const currentSettings = this.getGuildSettings(guildId) || { guildId };
            const newSettings = { ...currentSettings, ...settingsToUpdate };

            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO guild_settings 
                (guildId, leaderboardChannelId, leaderboardMessageId, leaderboardLastUpdated) 
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(
                newSettings.guildId,
                newSettings.leaderboardChannelId,
                newSettings.leaderboardMessageId,
                newSettings.leaderboardLastUpdated
            );
            return true;
        } catch (error) {
            console.error(`[DB Error] Failed to set settings for guild ${guildId}:`, error);
            return false;
        }
    }

    // --- XP and Level Methods (existing methods) ---
    calculateXpNeeded(level) {
        return 5 * (level * level) + 50 * level + 100;
    }

    async checkAndAwardRoles(member, currentLevel) {
        if (!member || !member.guild || member.user.bot) return null;
        const botMember = member.guild.members.me;
        if (!botMember) {
            console.warn('[LevelSystem] checkAndAwardRoles: Could not fetch bot member.');
            return null;
        }
        if (!botMember.permissions.has('ManageRoles')) {
            // console.warn(`[LevelSystem] Bot is missing 'Manage Roles' permission in ${member.guild.name}`);
            return null;
        }
        if (!member.manageable) {
            // console.warn(`[LevelSystem] Member ${member.user.tag} is not manageable.`);
            // Still determine role name for display if needed
            return this.getHighestCurrentLevelRoleName(member, currentLevel, false);
        }

        let highestAssignedRoleName = null;
        const rolesToAdd = [];
        const rolesToRemove = [];

        for (const [levelStr, roleId] of Object.entries(LEVEL_ROLES)) {
            const levelReq = parseInt(levelStr);
            const roleToManage = member.guild.roles.cache.get(roleId);

            if (!roleToManage) {
                // console.warn(`[LevelSystem] Role ID ${roleId} for level ${levelReq} not found in ${member.guild.name}.`);
                continue;
            }
            if (!roleToManage.editable) {
                // console.warn(`[LevelSystem] Bot cannot edit role ${roleToManage.name} (ID: ${roleId}).`);
                continue;
            }

            if (currentLevel >= levelReq) {
                if (!member.roles.cache.has(roleId)) rolesToAdd.push(roleToManage);
            } else {
                if (member.roles.cache.has(roleId)) rolesToRemove.push(roleToManage);
            }
        }

        try {
            if (rolesToAdd.length > 0) await member.roles.add(rolesToAdd);
            if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove);
        } catch (error) {
            console.error(`[LevelSystem] Error managing roles for ${member.user.tag}:`, error.message);
        }
        return this.getHighestCurrentLevelRoleName(member, currentLevel, true); // Get name after changes
    }
    
    getHighestCurrentLevelRoleName(member, currentLevel, checkHasRole = true) {
        if (!member || !member.guild || typeof LEVEL_ROLES !== 'object' || LEVEL_ROLES === null) return null;
        let highestRoleNameForLevel = null; 
        let maxLevelRequirementMet = -1;
        for (const [levelStr, roleId] of Object.entries(LEVEL_ROLES)) {
            const levelReq = parseInt(levelStr);
            if (currentLevel >= levelReq) { // User meets requirement for this role
                if (checkHasRole && !member.roles.cache.has(roleId)) continue; // If checking current roles, skip if they don't have it

                if (levelReq > maxLevelRequirementMet) {
                    const role = member.guild.roles.cache.get(roleId);
                    if (role) { 
                        highestRoleNameForLevel = role.name; 
                        maxLevelRequirementMet = levelReq; 
                    }
                }
            }
        }
        return highestRoleNameForLevel;
    }


    async addXP(userId, guildId, xpAmount, member = null) {
        let user = this.db.prepare('SELECT * FROM userStats WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!user) {
            this.db.prepare('INSERT INTO userStats (userId, guildId, xp, level) VALUES (?, ?, 0, 0)').run(userId, guildId, 0, 0);
            user = { userId, guildId, xp: 0, level: 0 };
        }

        if (user.level >= this.maxLevel) return null;

        let newXP = user.xp + xpAmount;
        let newLevel = user.level;
        let leveledUp = false;
        let xpNeededForNextLevel = this.calculateXpNeeded(newLevel);

        while (newLevel < this.maxLevel && newXP >= xpNeededForNextLevel) {
            newXP -= xpNeededForNextLevel;
            newLevel++;
            leveledUp = true;
            if (newLevel < this.maxLevel) {
                xpNeededForNextLevel = this.calculateXpNeeded(newLevel);
            } else { newXP = 0; break; } // Max level reached, reset XP for that level
        }
        if (newLevel >= this.maxLevel) { newLevel = this.maxLevel; newXP = 0; } // Cap at max level
        if (newXP < 0) newXP = 0; // XP should not be negative

        this.db.prepare('UPDATE userStats SET xp = ?, level = ? WHERE userId = ? AND guildId = ?').run(newXP, newLevel, userId, guildId);
        if (member && leveledUp) await this.checkAndAwardRoles(member, newLevel); // Only check roles on actual level up
        return leveledUp ? newLevel : null;
    }

    async addXPManually(userId, guildId, xpAmount, member = null) {
        let user = this.db.prepare('SELECT * FROM userStats WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!user) {
            this.db.prepare('INSERT INTO userStats (userId, guildId, xp, level) VALUES (?, ?, 0, 0)').run(userId, guildId, 0, 0);
            user = { userId, guildId, xp: 0, level: 0 };
        }

        // Calculate total cumulative XP first
        let cumulativeXP = 0;
        for (let i = 0; i < user.level; i++) {
            cumulativeXP += this.calculateXpNeeded(i);
        }
        cumulativeXP += user.xp;
        
        let newTotalCumulativeXP = cumulativeXP + xpAmount;
        if (newTotalCumulativeXP < 0) newTotalCumulativeXP = 0;

        let newCalculatedLevel = 0;
        let remainingXPForCurrentLevel = newTotalCumulativeXP;

        while (newCalculatedLevel < this.maxLevel) {
            const xpNeededForThisLevel = this.calculateXpNeeded(newCalculatedLevel);
            if (remainingXPForCurrentLevel >= xpNeededForThisLevel) {
                remainingXPForCurrentLevel -= xpNeededForThisLevel;
                newCalculatedLevel++;
            } else {
                break;
            }
        }
        
        if (newCalculatedLevel >= this.maxLevel) {
            newCalculatedLevel = this.maxLevel;
            remainingXPForCurrentLevel = 0; // At max level, XP for current level is 0
        }

        this.db.prepare('UPDATE userStats SET xp = ?, level = ? WHERE userId = ? AND guildId = ?').run(remainingXPForCurrentLevel, newCalculatedLevel, userId, guildId);
        if (member) await this.checkAndAwardRoles(member, newCalculatedLevel);
        return { oldXP: user.xp, oldLevel: user.level, newXP: remainingXPForCurrentLevel, level: newCalculatedLevel };
    }

    async addLevelManually(userId, guildId, levelAmount, member = null) {
        let user = this.db.prepare('SELECT * FROM userStats WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!user) {
            this.db.prepare('INSERT INTO userStats (userId, guildId, xp, level) VALUES (?, ?, 0, 0)').run(userId, guildId, 0, 0);
            user = { userId, guildId, xp: 0, level: 0 };
        }
        let newLevel = Math.max(0, Math.min(this.maxLevel, user.level + levelAmount));
        this.db.prepare('UPDATE userStats SET level = ?, xp = 0 WHERE userId = ? AND guildId = ?').run(newLevel, userId, guildId); // Reset XP when manually changing level
        if (member) await this.checkAndAwardRoles(member, newLevel);
        return { oldLevel: user.level, newLevel: newLevel };
    }

    async setLevel(userId, guildId, level, member = null) {
        const oldUser = this.db.prepare('SELECT level FROM userStats WHERE userId = ? AND guildId = ?').get(userId, guildId);
        const oldLevel = oldUser ? oldUser.level : 0;
        let newLevel = Math.max(0, Math.min(this.maxLevel, level));
        this.db.prepare('INSERT OR REPLACE INTO userStats (userId, guildId, xp, level) VALUES (?, ?, 0, ?)').run(userId, guildId, newLevel); // Reset XP
        if (member) await this.checkAndAwardRoles(member, newLevel);
        return { oldLevel: oldLevel, newLevel: newLevel };
    }

    getLevelInfo(userId, guildId) {
        const user = this.db.prepare('SELECT * FROM userStats WHERE userId = ? AND guildId = ?').get(userId, guildId);
        const rank = this.getUserRank(userId, guildId);
        if (!user) return { level: 0, xp: 0, xpNeeded: this.calculateXpNeeded(0), rank: 0 }; // Rank 0 if not found
        return {
            level: user.level, xp: user.xp,
            xpNeeded: user.level >= this.maxLevel ? 0 : this.calculateXpNeeded(user.level), // XP needed is 0 if max level
            rank: rank
        };
    }

    getLeaderboard(guildId, limit = 10) {
        return this.db.prepare('SELECT userId, xp, level FROM userStats WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT ?').all(guildId, limit);
    }

    getUserRank(userId, guildId) {
        const allUsersRanked = this.db.prepare('SELECT userId FROM userStats WHERE guildId = ? ORDER BY level DESC, xp DESC').all(guildId);
        const rankIndex = allUsersRanked.findIndex(u => u.userId === userId);
        return rankIndex === -1 ? 0 : rankIndex + 1; // Return 0 if not ranked (e.g., no XP)
    }
    
    handleVoiceStateUpdate(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot || !member.guild) return;
        const userId = member.id; const guildId = member.guild.id;
        const voiceKey = `${userId}-${guildId}`; const xpPerMinuteInVoice = 5; // Configurable

        if (newState.channelId && (!newState.serverDeaf && !newState.selfDeaf)) { // User joined a voice channel or unmuted/undeafened
            if (!this.voiceStates.has(voiceKey) || (oldState.channelId && (oldState.serverDeaf || oldState.selfDeaf))) {
                 this.voiceStates.set(voiceKey, Date.now());
            }
        } else if ((!newState.channelId || newState.serverDeaf || newState.selfDeaf) && this.voiceStates.has(voiceKey)) { // User left or muted/deafened
            const joinTime = this.voiceStates.get(voiceKey);
            if (joinTime) {
                const minutesInVoice = Math.floor((Date.now() - joinTime) / 60000);
                if (minutesInVoice > 0) {
                    const xpEarned = minutesInVoice * xpPerMinuteInVoice;
                    this.addXP(userId, guildId, xpEarned, member)
                        .then(leveledUp => {
                            if (leveledUp !== null) { /* console.log(`[VoiceXP] ${member.user.tag} leveled up to ${leveledUp} via voice.`); */ }
                            else { /* console.log(`[VoiceXP] ${member.user.tag} earned ${xpEarned} XP from voice.`); */ }
                        }).catch(e => console.error('[VoiceXP] Error adding XP from voice:', e));
                }
                this.voiceStates.delete(voiceKey);
            }
        }
    }

    // --- Embed Session Management Functions (existing) ---
    saveEmbedSession(sessionId, sessionData) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO embed_sessions 
                (sessionId, userId, guildId, targetChannelId, roleToMentionId, embedData, builderMessageId, createdAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
            `);
            stmt.run(
                sessionId, sessionData.userId, sessionData.guildId, sessionData.targetChannelId,
                sessionData.roleToMentionId, JSON.stringify(sessionData.embedData), sessionData.builderMessageId
            );
            return true;
        } catch (error) { console.error(`[DB EmbedSession] Save error for session ${sessionId}:`, error); return false; }
    }

    fetchEmbedSession(sessionId) {
        try {
            const row = this.db.prepare('SELECT * FROM embed_sessions WHERE sessionId = ?').get(sessionId);
            if (row) return { ...row, embedData: JSON.parse(row.embedData) };
            return null;
        } catch (error) { console.error(`[DB EmbedSession] Fetch error for session ${sessionId}:`, error); return null; }
    }
    
    updateEmbedSession(sessionId, sessionDataUpdate) {
        try {
            const currentData = this.db.prepare('SELECT * FROM embed_sessions WHERE sessionId = ?').get(sessionId);
            if (!currentData) return false;

            const updatedData = { ...currentData, ...sessionDataUpdate };
            // Ensure embedData is stringified if it's part of the update and is an object
            if (sessionDataUpdate.embedData && typeof sessionDataUpdate.embedData === 'object') {
                updatedData.embedData = JSON.stringify(sessionDataUpdate.embedData);
            } else if (typeof currentData.embedData === 'string' && !sessionDataUpdate.hasOwnProperty('embedData')) {
                 // Keep existing stringified embedData if not explicitly updated
                 updatedData.embedData = currentData.embedData;
            } else if (sessionDataUpdate.embedData === null) { // Handle explicit nulling
                 updatedData.embedData = null;
            }


            const stmt = this.db.prepare(`
                UPDATE embed_sessions SET 
                userId = ?, guildId = ?, targetChannelId = ?, roleToMentionId = ?, 
                embedData = ?, builderMessageId = ?
                WHERE sessionId = ?
            `);
            stmt.run(
                updatedData.userId, updatedData.guildId, updatedData.targetChannelId, 
                updatedData.roleToMentionId, updatedData.embedData, 
                updatedData.builderMessageId, sessionId
            );
            return true;
        } catch (error) { console.error(`[DB EmbedSession] Update error for session ${sessionId}:`, error); return false; }
    }

    deleteEmbedSession(sessionId) {
        try {
            this.db.prepare('DELETE FROM embed_sessions WHERE sessionId = ?').run(sessionId);
            return true;
        } catch (error) { console.error(`[DB EmbedSession] Delete error for session ${sessionId}:`, error); return false; }
    }

    loadAllEmbedSessions() {
        try {
            const rows = this.db.prepare('SELECT * FROM embed_sessions').all();
            const sessions = new Map();
            for (const row of rows) {
                try {
                    sessions.set(row.sessionId, { ...row, embedData: JSON.parse(row.embedData) });
                } catch (parseError) {
                     console.error(`[DB EmbedSession] Parse error for session ${row.sessionId} on load:`, parseError);
                     this.deleteEmbedSession(row.sessionId); 
                }
            }
            return sessions;
        } catch (error) { console.error('[DB EmbedSession] Load all error:', error); return new Map(); }
    }
}

module.exports = { LevelingSystem, LEVEL_ROLES };
