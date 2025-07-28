const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        const current = queue.current();
        if (!current) {
            return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
        }
        await interaction.reply({ content: `Now playing: ${current.url}` });
    }
};
