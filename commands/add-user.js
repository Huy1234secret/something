// commands/add-user.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-user')
        .setDescription("Manage a user's items, roles, and currencies (Staff Only).")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to manage.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild), // Staff Only permission

    async execute(interaction) {
        // This command's logic is primarily handled in index.js
        // to manage the interactive session and processing.
        // It's defined here for command deployment.
        // The actual logic (creating the panel and handling buttons/modals)
        // will be in the interactionCreate listener in index.js.
        await interaction.reply({ content: 'Initializing user management panel...', ephemeral: true });
    },
};