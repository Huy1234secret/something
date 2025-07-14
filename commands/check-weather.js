const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-weather')
        .setDescription('Check the current fishing weather.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Fetching weather...', ephemeral: false });
    },
};
