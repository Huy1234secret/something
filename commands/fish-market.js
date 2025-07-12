const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish-market')
        .setDescription('Open the fish market interface.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Opening fish market...', ephemeral: true });
    },
};
