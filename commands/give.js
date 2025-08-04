// commands/give.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give items such as roles to users (Staff Only).')
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Give a role to a user optionally for a limited time.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to give.')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to receive the role.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Duration to keep the role (e.g., 7d). Leave empty for permanent.')
                        .setRequired(false))
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles),
    async execute(interaction) {
        // Logic handled centrally in index.js
        await interaction.reply({ content: 'Processing give role command...', ephemeral: true });
    },
};
