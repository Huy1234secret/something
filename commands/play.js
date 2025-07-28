const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const playdl = require('play-dl');

// Use a YouTube cookie for authenticated streaming
playdl.setToken({
    youtube: {
        cookie: 'SID=g.a000zQj5D7Z0Z9x037QE_AGNEDAdp1OnrypLt_nPpCMegw9mi92hbcaNrPINuN6Opp2zcF4MbQACgYKAYwSARASFQHGX2MiE9BUhbiTBZigYlJStP-C_BoVAUF8yKr0807F-t93GI11s9qSd_Ig0076; HSID=Axzqy65PdufuUx4vv; SSID=AYH3ihpBSNN9fIhya; SAPISID=Toi2BQEtoKzsPKsb/A3VXYHQ8523zxcZ6y;'
    },
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play YouTube audio in your voice channel.')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('YouTube URL')
                .setRequired(true)),
    async execute(interaction) {
        const url = interaction.options.getString('url');
        // The parent handler already deferred the interaction if needed.

        if (!playdl.yt_validate(url)) {
            return interaction.editReply('❌ Please provide a valid YouTube URL.');
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('🔊 You must be in a voice channel to use this command.');
        }

        try {
            const stream = await playdl.stream(url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator
            });

            const player = createAudioPlayer();
            connection.subscribe(player);
            player.play(resource);

            await interaction.editReply(`▶️ Now playing: ${url}`);

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

            player.on('error', error => {
                console.error(`Error: ${error.message}`);
                connection.destroy();
            });
        } catch (err) {
            console.error('Error while playing audio:', err);
            await interaction.editReply('❌ Failed to play the audio.');
        }
    },
};
