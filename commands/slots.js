const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slots machine game.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Starting slots...', ephemeral: false });
        // Actual logic handled in index.js
    },
};
