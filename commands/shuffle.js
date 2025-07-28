const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        const list = queue.list();
        if (list.length <= 1) {
            return interaction.reply({ content: 'Not enough songs in queue to shuffle.', ephemeral: true });
        }
        queue.shuffle();
        await interaction.reply({ content: 'Queue shuffled.' });
    }
};
