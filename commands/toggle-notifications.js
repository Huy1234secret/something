// commands/toggle-notifications.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle-notifications')
        .setDescription('Enable or disable all non-daily notifications for this bot instance.')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Set to true to enable non-daily notifications.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        await interaction.reply({ content: 'Processing notification toggle...', ephemeral: true });
    },
};
