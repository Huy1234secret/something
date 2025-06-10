// commands/leaderboard.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Manages and views the server leaderboard.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the current server leaderboard.')
        )
        .addSubcommandGroup(subcommandGroup =>
            subcommandGroup
                .setName('config')
                .setDescription('Configure leaderboard settings (Admin Only).')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('channel')
                        .setDescription('Sets the channel for leaderboard updates.')
                        .addChannelOption(option =>
                            option.setName('set') // Changed from 'channel' to 'set' to match deployCommands.js and index.js
                                .setDescription('The text channel to set for the leaderboard.')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('postnow')
                .setDescription('Manually posts or updates the leaderboard now (Admin Only).')
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild), // Added permission for config/postnow access
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for centralized interaction handling.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing leaderboard command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};