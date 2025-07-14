// commands/check-weather.js
const { SlashCommandBuilder } = require('discord.js');
const { buildWeatherEmbed, getActiveWeatherList, activeUntil } = require('../utils/weatherManager');

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-weather')
        .setDescription('Check the current fishing weather.'),
    async execute(interaction) {
        const embed = buildWeatherEmbed();
        const active = getActiveWeatherList();
        if (active.length) {
            const durations = active.map(w => `- **${w}** ends in ${formatDuration(activeUntil[w] - Date.now())}`);
            embed.addFields({ name: 'Time Remaining', value: durations.join('\n') });
        }

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: false });
        }
    },
};
