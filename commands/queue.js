const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        const list = queue.list();
        if (!list.length) {
            return interaction.reply({ content: 'The queue is empty.', ephemeral: true });
        }
        const embed = new EmbedBuilder()
            .setTitle('Music Queue')
            .setDescription(list.map((item, idx) => `${idx + 1}. ${item.url}`).join('\n'));
        await interaction.reply({ embeds: [embed] });
    }
};
