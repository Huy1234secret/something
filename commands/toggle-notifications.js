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
    async execute(interaction, client) {
        const enabled = interaction.options.getBoolean('enabled');

        // Only administrators can run this command
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            const deniedMsg = { content: '❌ You do not have permission to use this command.', ephemeral: true };
            if (interaction.deferred || interaction.replied) return interaction.editReply(deniedMsg);
            return interaction.reply(deniedMsg);
        }

        // Update the client flag controlling notification behaviour
        (client || interaction.client).NON_DAILY_NOTIFICATIONS_ENABLED = enabled;

        const response = {
            content: `✅ All non-daily notifications have been **${enabled ? 'ENABLED' : 'DISABLED'}**.`,
            ephemeral: true
        };
        if (interaction.deferred || interaction.replied) return interaction.editReply(response);
        return interaction.reply(response);
    },
};
