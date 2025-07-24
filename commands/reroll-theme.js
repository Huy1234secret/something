const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reroll-theme')
        .setDescription('Reroll your build battle theme.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Rerolling your theme...', ephemeral: true });
    },
};
