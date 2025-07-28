const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume playback'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        queue.resume();
        await interaction.reply({ content: 'Resumed playback.' });
    }
};
