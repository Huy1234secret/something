const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { startRain, startGoldenRain, startSnowRain, startSolarFlare } = require('../utils/weatherManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-weather')
        .setDescription('Start a weather effect (Staff Only).')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Weather ID')
                .setRequired(true)
                .addChoices(
                    { name: 'Rain', value: 'rain' },
                    { name: 'Golden Rain', value: 'goldenRain' },
                    { name: 'Snow Rain', value: 'snowRain' },
                    { name: 'Solar Flare Surge', value: 'solarFlare' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        const id = interaction.options.getString('id');
        let response;
        let result;
        if (id === 'rain') {
            result = await startRain(interaction.client, { byAdmin: true });
        } else if (id === 'goldenRain') {
            result = await startGoldenRain(interaction.client, { byAdmin: true });
        } else if (id === 'snowRain') {
            result = await startSnowRain(interaction.client, { byAdmin: true });
        } else if (id === 'solarFlare') {
            result = await startSolarFlare(interaction.client, { byAdmin: true });
        } else {
            response = { content: 'Unknown weather ID.', ephemeral: true };
        }

        if (!response) {
            if (!result.started) {
                const endTs = Math.floor((Date.now() + result.remaining) / 1000);
                const nameMap = {
                    rain: 'Rain',
                    goldenRain: 'Golden Rain',
                    snowRain: 'Snow Rain',
                    solarFlare: 'Solar Flare Surge'
                };
                response = { content: `The weather ${nameMap[id]} is already active, you can activate again in <t:${endTs}:R>`, ephemeral: true };
            } else {
                const nameMap = {
                    rain: 'Rain',
                    goldenRain: 'Golden Rain',
                    snowRain: 'Snow Rain',
                    solarFlare: 'Solar Flare Surge'
                };
                response = { content: `${nameMap[id]} has started.`, ephemeral: true };
            }
        }

        if (interaction.deferred || interaction.replied) return interaction.editReply(response);
        return interaction.reply(response);
    },
};
