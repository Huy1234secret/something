const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        queue.pause();
        const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
        await interaction[method]({ content: 'Paused playback.' });
    }
};
