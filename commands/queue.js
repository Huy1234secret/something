const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        const list = queue.list();
        const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
        if (!list.length) {
            return interaction[method]({ content: 'The queue is empty.', ephemeral: true });
        }
        const embed = new EmbedBuilder()
            .setTitle('Music Queue')
            .setDescription(list.map((item, idx) => `${idx + 1}. ${item.url}`).join('\n'));
        await interaction[method]({ embeds: [embed] });
    }
};
