const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback and clear the queue'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        queue.stop();
        await interaction.reply({ content: 'Stopped playback and cleared queue.' });
    }
};
