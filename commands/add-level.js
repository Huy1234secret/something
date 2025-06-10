// commands/add-level.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-level')
        .setDescription('Add or remove levels from a user (Staff Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to modify levels for')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of levels to add (negative to remove)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for centralizing user stat modifications.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing add-level command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};