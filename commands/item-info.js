// commands/item-info.js
const { SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('item-info')
        .setDescription('View detailed information about an item by searching or Browse.')
        .addStringOption(option =>
            option.setName('item_name')
                .setDescription('The name or ID of the item to search for (optional).')
                .setRequired(false)
                .setAutocomplete(true)), // Enable autocomplete for item name/ID
    async execute(interaction) {
        // This command's logic is primarily handled in index.js, especially for autocomplete and dynamic info display.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Fetching item information...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener and autocomplete handler.
    },
};