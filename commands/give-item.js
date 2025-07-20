// commands/give-item.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give-item')
        .setDescription('Give an item to a user (Staff Only).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to give the item to.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription('The ID or name of the item to give.')
                .setRequired(true)
                .setAutocomplete(true)) // Enable autocomplete for item ID/name
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of the item to give.')
                .setRequired(true)
                .setMinValue(1))
        .addBooleanOption(option =>
            option.setName('remove')
                .setDescription('Remove the item instead of giving.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js, especially for autocomplete and item handling.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing give-item command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener and autocomplete handler.
    },
};