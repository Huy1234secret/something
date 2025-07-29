const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const serverQueue = require('../queueManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the current song queue.'),
    async execute(interaction) {
        const queue = serverQueue.get(interaction.guild.id);
        if (!queue || queue.songs.length === 0) {
            return interaction.reply({ content: 'The queue is currently empty.', ephemeral: true });
        }
        const nowPlaying = queue.songs[0];
        const queueList = queue.songs.slice(1).map((song, index) => {
            return `${index + 1}. **${song.title}** - \`${song.duration}\``;
        }).join('\n');

        const queueEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎶 Music Queue')
            .setDescription(`**Now Playing:**\n[${nowPlaying.title}](${nowPlaying.url})\n\n**Up Next:**`)
            .addFields({ name: '\u200B', value: queueList.length > 0 ? queueList : 'No other songs in queue' })
            .setTimestamp();

        await interaction.reply({ embeds: [queueEmbed] });
    },
};
