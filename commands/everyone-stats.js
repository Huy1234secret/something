// commands/everyone-stats.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('everyone-stats')
        .setDescription('List stats for all server members.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Gathering stats...', ephemeral: false });
    },
};
