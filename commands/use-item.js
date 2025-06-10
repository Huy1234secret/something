// commands/use-item.js
const { SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('use-item')
        .setDescription('Use an item from your inventory.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to use from your inventory (ID or name).')
                .setRequired(true)
                .setAutocomplete(true)) // Enable autocomplete for item ID/name
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('How many to use (default: 1).')
                .setRequired(false)
                .setMinValue(1)),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js, especially for autocomplete and item usage.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing item usage...', ephemeral: false });
        // The actual logic is in index.js under interactionCreate listener and autocomplete handler.
    },
};