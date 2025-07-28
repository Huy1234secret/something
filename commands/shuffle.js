const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        const list = queue.list();
        const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
        if (list.length <= 1) {
            return interaction[method]({ content: 'Not enough songs in queue to shuffle.', ephemeral: true });
        }
        queue.shuffle();
        await interaction[method]({ content: 'Queue shuffled.' });
    }
};
