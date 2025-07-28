const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from a YouTube link')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('YouTube URL')
                .setRequired(true)),
    async execute(interaction) {
        const url = interaction.options.getString('url');
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: 'You need to join a voice channel first!', ephemeral: true });
        }
        const queue = getQueue(interaction.guild.id);
        await queue.connect(voiceChannel);
        await queue.add(url, interaction.user);
        const position = queue.list().length;
        await interaction.reply({ content: `Added to queue at position ${position}: ${url}` });
    },
};
