// commands/usersettings.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('usersettings')
        .setDescription('Manage your personal bot settings.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current bot settings.')
        )
        ,
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for fetching and updating user settings.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing user settings command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};