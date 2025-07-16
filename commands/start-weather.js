const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { startRain } = require('../utils/weatherManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-weather')
        .setDescription('Start a weather effect (Staff Only).')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Weather ID')
                .setRequired(true)
                .addChoices(
                    { name: 'Rain', value: 'rain' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        const id = interaction.options.getString('id');
        let response;
        if (id === 'rain') {
            const result = await startRain(interaction.client, { byAdmin: true });
            if (!result.started) {
                const endTs = Math.floor((Date.now() + result.remaining) / 1000);
                response = { content: `The weather Rain is already active, you can activate again in <t:${endTs}:R>`, ephemeral: true };
            } else {
                response = { content: 'Rain has started.', ephemeral: true };
            }
        } else {
            response = { content: 'Unknown weather ID.', ephemeral: true };
        }
        if (interaction.deferred || interaction.replied) return interaction.editReply(response);
        return interaction.reply(response);
    },
};
