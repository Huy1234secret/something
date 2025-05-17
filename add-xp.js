const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-xp')
        .setDescription('Add or remove XP from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to modify XP for')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of XP to add (negative to remove)')
                .setRequired(true)),
    async addXPManually(userId, guildId, xpAmount, member = null) {
        // ... (fetches or creates user)
        let user = this.db.prepare('SELECT * FROM userStats WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!user) {
            this.db.prepare('INSERT INTO userStats (userId, guildId, xp, level) VALUES (?, ?, ?, ?)').run(userId, guildId, 0, 0);
            user = { userId, guildId, xp: 0, level: 0 };
        }

        let newTotalXP = user.xp + xpAmount; // XP is being added here
        let newCalculatedLevel = 0;
        let remainingXP = 0;

        if (newTotalXP <= 0) {
            newTotalXP = 0; newCalculatedLevel = 0; remainingXP = 0;
        } else {
            let tempXP = newTotalXP;
            while (newCalculatedLevel < this.maxLevel) {
                const xpNeeded = this.calculateXpNeeded(newCalculatedLevel);
                if (tempXP >= xpNeeded) {
                    tempXP -= xpNeeded; newCalculatedLevel++;
                } else { break; }
            }
            remainingXP = tempXP;
            if (newCalculatedLevel >= this.maxLevel) { newCalculatedLevel = this.maxLevel; remainingXP = 0; }
        }
        
        this.db.prepare('UPDATE userStats SET xp = ?, level = ? WHERE userId = ? AND guildId = ?').run(remainingXP, newCalculatedLevel, userId, guildId);
        if (member) await this.checkAndAwardRoles(member, newCalculatedLevel);
        return { oldXP: user.xp, oldLevel: user.level, newXP: remainingXP, level: newCalculatedLevel };
    }
}