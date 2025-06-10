// commands/export-guild-data.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('export-guild-data')
        .setDescription('Exports all user stats, inventory, and related data for this guild (Admin Only).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for security and direct file access.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing export-guild-data command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};