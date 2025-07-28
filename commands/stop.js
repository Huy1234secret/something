const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop audio playback and leave the voice channel.'),
    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
            connection.destroy();
            await interaction.reply('⏹️ Stopped playback and left the voice channel.');
        } else {
            await interaction.reply('⚠️ I am not in a voice channel.');
        }
    },
};
