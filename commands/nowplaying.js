const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        const current = queue.current();
        const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
        if (!current) {
            return interaction[method]({ content: 'Nothing is playing.', ephemeral: true });
        }
        await interaction[method]({ content: `Now playing: ${current.url}` });
    }
};
