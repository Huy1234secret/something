const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const ytdlp = require('yt-dlp-exec');
const serverQueue = require('../queueManager');

function createControlPanel(song, queue, playerState) {
    const isPaused = playerState.status === AudioPlayerStatus.Paused;
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎶 Now Playing')
        .setDescription(`**[${song.title}](${song.url})**`)
        .setThumbnail(song.thumbnail)
        .addFields(
            { name: 'Duration', value: `\`${song.duration}\``, inline: true },
            { name: 'Requested by', value: `${song.requester}`, inline: true },
            { name: 'Up Next', value: queue.songs[1] ? `\`${queue.songs[1].title}\`` : '`Nothing`', inline: true }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_pause_resume')
                .setLabel(isPaused ? 'Resume' : 'Pause')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji(isPaused ? '▶️' : '⏸️'),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('Skip')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⏭️'),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('Stop')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⏹️')
        );
    return { embed, row };
}

async function play(guild, song) {
    const queue = serverQueue.get(guild.id);
    if (!song) {
        if (queue.connection) queue.connection.destroy();
        serverQueue.delete(guild.id);
        return;
    }

    const stream = ytdlp.exec(song.url, { output: '-', format: 'bestaudio/best', preferFreeFormats: true }, { stdio: ['ignore', 'pipe', 'ignore'] });
    const resource = createAudioResource(stream.stdout);
    queue.player.play(resource);
    queue.connection.subscribe(queue.player);

    const { embed, row } = createControlPanel(song, queue, queue.player.state);
    if (queue.nowPlayingMessage) {
        await queue.nowPlayingMessage.edit({ embeds: [embed], components: [row] });
    }

    queue.player.off(AudioPlayerStatus.Idle);
    queue.player.on(AudioPlayerStatus.Idle, () => {
        queue.songs.shift();
        play(guild, queue.songs[0]);
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from YouTube.')
        .addStringOption(option => option.setName('song').setDescription('The name or URL of the song').setRequired(true)),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.reply({ content: 'You must be in a voice channel!', ephemeral: true });

        const songQuery = interaction.options.getString('song');
        await interaction.deferReply();

        let videoInfo;
        try {
            videoInfo = await ytdlp(songQuery, { dumpSingleJson: true, noWarnings: true });
        } catch (e) {
            return interaction.editReply('❌ Could not find the song.');
        }

        const song = {
            title: videoInfo.title,
            url: videoInfo.webpage_url,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration_string,
            requester: interaction.member,
        };

        let queue = serverQueue.get(interaction.guild.id);
        if (!queue) {
            const player = createAudioPlayer();
            const queueContruct = {
                textChannel: interaction.channel,
                voiceChannel,
                connection: null,
                songs: [song],
                player,
                nowPlayingMessage: null,
            };

            serverQueue.set(interaction.guild.id, queueContruct);
            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                queueContruct.connection = connection;
                const message = await interaction.editReply({ content: `⏱️ Loading song...` });
                queueContruct.nowPlayingMessage = message;
                play(interaction.guild, song);
            } catch (err) {
                console.error(err);
                serverQueue.delete(interaction.guild.id);
                return interaction.editReply('Could not join the voice channel.');
            }
        } else {
            queue.songs.push(song);
            return interaction.editReply(`✅ Added to queue: **${song.title}**`);
        }
    },

    async handleButton(interaction) {
        const queue = serverQueue.get(interaction.guild.id);
        if (!queue) return interaction.reply({ content: 'The bot is not playing anything.', ephemeral: true });
        if (interaction.member.voice.channel.id !== queue.voiceChannel.id) return interaction.reply({ content: 'You must be in the same voice channel!', ephemeral: true });

        await interaction.deferUpdate();

        switch (interaction.customId) {
            case 'music_pause_resume':
                queue.player.state.status === AudioPlayerStatus.Playing ? queue.player.pause() : queue.player.unpause();
                break;
            case 'music_skip':
                queue.player.stop();
                break;
            case 'music_stop':
                queue.songs = [];
                queue.player.stop();
                if(queue.connection) queue.connection.destroy();
                serverQueue.delete(interaction.guild.id);
                await queue.nowPlayingMessage.edit({ content: '⏹️ Music stopped and queue cleared.', embeds: [], components: [] });
                return;
        }

        const { embed, row } = createControlPanel(queue.songs[0], queue, queue.player.state);
        await queue.nowPlayingMessage.edit({ embeds: [embed], components: [row] });
    },
};
