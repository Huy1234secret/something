// commands/inventory.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Access your inventory, balance, charms, and perks.'),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for dynamic embed building and interaction.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Opening your inventory...', ephemeral: false });
        // The actual logic is in index.js under interactionCreate listener.
    },
};