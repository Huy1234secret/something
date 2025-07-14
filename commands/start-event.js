const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { startBlossom } = require('../utils/weatherManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-event')
        .setDescription('Start a special event (Staff Only).')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Event ID')
                .setRequired(true)
                .addChoices(
                    { name: 'Cherry Blossom Breeze', value: 'blossom' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        const id = interaction.options.getString('id');
        let response;
        if (id === 'blossom') {
            const result = await startBlossom(interaction.client);
            if (!result.started) {
                const endTs = Math.floor((Date.now() + result.remaining) / 1000);
                response = { content: `The event Cherry Blossom Breeze is currently active, you can use again in <t:${endTs}:R>`, ephemeral: true };
            } else {
                response = { content: 'Cherry Blossom Breeze started.', ephemeral: true };
            }
        } else {
            response = { content: 'Unknown event ID.', ephemeral: true };
        }
        if (interaction.deferred || interaction.replied) return interaction.editReply(response);
        return interaction.reply(response);
    },
};
