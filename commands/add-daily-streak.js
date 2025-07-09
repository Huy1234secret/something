// commands/add-daily-streak.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-daily-streak')
        .setDescription('Increase a user\'s daily streak (Staff Only).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to modify streak for.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of days to add to their streak.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        // Command logic handled centrally in index.js
        await interaction.reply({ content: 'Processing add-daily-streak command...', ephemeral: true });
    },
};
