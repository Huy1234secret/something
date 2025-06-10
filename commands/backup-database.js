// commands/backup-database.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup-database')
        .setDescription('Creates and sends a backup of the level system database (Staff Only).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for security and direct file access.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing backup-database command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};