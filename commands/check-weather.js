// commands/check-weather.js
const { SlashCommandBuilder } = require('discord.js');
const { buildWeatherEmbed, getActiveWeatherList, activeUntil, DISPLAY_NAMES } = require('../utils/weatherManager');

const MUTATION_EMOJIS = {
    Blossom: '<:mutBlossom:1397487879281971200>',
    Gold: '<:mutGold:1397489488040558602>',
    Rainbow: '<:mutRainbow:1397489477815107605>',
    Darkmatter: '<:mutDarkmatter:1397490928473870447>',
    Radiant: '<:mutRadiant:1397515991076049007>',
    Frosty: '<:mutFrosty:1397516059937865860>',
    Aurora: '<:Aurora:1402301875268882462>'
};

const WEATHER_INFO = {
    rain: {
        boost: '+25% fish chance',
        mutation: `Chance for **Gold Mutation ${MUTATION_EMOJIS.Gold}**`
    },
    goldenRain: {
        boost: '+25% fish chance',
        mutation: `20% chance for **Gold Mutation ${MUTATION_EMOJIS.Gold}**`
    },
    snowRain: {
        boost: '+25% fish chance',
        mutation: `10% chance for **Frosty Mutation ${MUTATION_EMOJIS.Frosty}**`
    },
    blossom: {
        boost: '+10% fish chance',
        mutation: `Chance for **Blossom Mutation ${MUTATION_EMOJIS.Blossom}**`
    },
    prismatic: {
        mutation: `1% chance for **Rainbow Mutation ${MUTATION_EMOJIS.Rainbow}**`
    },
    eclipse: {
        mutation: `0.1% chance for **Darkmatter Mutation ${MUTATION_EMOJIS.Darkmatter}**`
    },
    solarFlare: {
        mutation: `10% chance for **Radiant Mutation ${MUTATION_EMOJIS.Radiant}**`
    },
    aurora: {
        mutation: `5% chance for **Aurora Mutation ${MUTATION_EMOJIS.Aurora}**`
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
