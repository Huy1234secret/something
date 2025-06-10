// commands/createembed.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createembed')
        .setDescription('Start building an embed message to send (Staff Only).')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the final embed to.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('mention_role')
                .setDescription('A role to mention with the embed (optional).')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js to manage the embed building session.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Initiating embed builder...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};