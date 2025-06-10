// commands/adminshop.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminshop')
        .setDescription('Manage the server shop (Admin/Staff Only).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('restock')
                .setDescription('Manually restocks all items in the shop immediately.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Sets the default channel for shop display and auto-updates.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The text channel to set for the shop.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for centralizing shop operations.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing admin shop command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};