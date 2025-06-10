// commands/bank.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Access your bank to deposit, withdraw, or upgrade.'),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for interaction handling.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Opening your bank...', ephemeral: false });
        // The actual logic is in index.js under interactionCreate listener.
    },
};