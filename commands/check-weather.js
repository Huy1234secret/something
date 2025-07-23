// commands/check-weather.js
const { SlashCommandBuilder } = require('discord.js');
const { buildWeatherEmbed, getActiveWeatherList, activeUntil } = require('../utils/weatherManager');

const BOOSTS = {
    rain: '+25% fish chance',
    blossom: '+10% fish chance'
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
                const boost = BOOSTS[w];
                const first = `- ${w} <t:${ts}:R>`;
                return boost ? `${first}\n-# ${boost}` : first;
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
