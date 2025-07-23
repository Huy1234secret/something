// commands/check-weather.js
const { SlashCommandBuilder } = require('discord.js');
const { buildWeatherEmbed, getActiveWeatherList, activeUntil, DISPLAY_NAMES } = require('../utils/weatherManager');

const MUTATION_BLOSSOM_EMOJI = '<:mutationblossom:1394379938748043374>';

const WEATHER_INFO = {
    rain: { boost: '+25% fish chance' },
    blossom: {
        boost: '+10% fish chance',
        mutation: `Chance for **Blossom Mutation ${MUTATION_BLOSSOM_EMOJI}**`
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-weather')
        .setDescription('Check the current fishing weather.'),
    async execute(interaction) {
        const embed = buildWeatherEmbed();
        const active = getActiveWeatherList();
        if (active.length) {
            const lines = active.map(w => {
                const ts = Math.floor(activeUntil[w] / 1000);
                const info = WEATHER_INFO[w] || {};
                const first = `- ${DISPLAY_NAMES[w] || w} <t:${ts}:R>`;
                const extras = [];
                if (info.boost) extras.push(`-# ${info.boost}`);
                if (info.mutation) extras.push(`-# ${info.mutation}`);
                return [first, ...extras].join('\n');
            });
            embed.setDescription(`### Weather:\n${lines.join('\n')}`);
        }

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: false });
        }
    },
};
