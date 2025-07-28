const { ensureOpus } = require('./utils/opusInstaller');
ensureOpus();

const { joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

class MusicQueue {
    constructor() {
        this.queue = [];
        this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
        this.connection = null;
        this.volume = 0.5; // default volume
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.queue.shift();
            this.playNext();
        });
    }

    async connect(voiceChannel) {
        if (this.connection) return;
        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false
        });
        this.connection.subscribe(this.player);
    }

    async add(url, user) {
        this.queue.push({ url, user });
        if (this.player.state.status === AudioPlayerStatus.Idle) {
            await this.playNext();
        }
    }

    async playNext() {
        if (!this.queue.length) {
            if (this.connection) {
                this.connection.destroy();
                this.connection = null;
            }
            return;
        }
        const { url } = this.queue[0];
        try {
            const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });
            stream.on('error', (streamErr) => {
                console.error('Stream error:', streamErr);
                this.queue.shift();
                this.playNext();
            });
            const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
            resource.volume.setVolume(this.volume);
            this.player.play(resource);
        } catch (err) {
            console.error('Music play error:', err);
            if (err && err.statusCode === 410) {
                console.warn('Audio resource unavailable (410). Skipping.');
            }
            this.queue.shift();
            await this.playNext();
        }
    }

    skip() {
        if (this.player.state.status !== AudioPlayerStatus.Idle) {
            this.player.stop(true);
        }
    }

    stop() {
        this.queue = [];
        this.player.stop(true);
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
    }

    pause() {
        this.player.pause();
    }

    resume() {
        this.player.unpause();
    }

    shuffle() {
        if (this.queue.length <= 1) return;
        for (let i = this.queue.length - 1; i > 1; i--) {
            const j = 1 + Math.floor(Math.random() * i);
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
    }

    setVolume(vol) {
        this.volume = vol;
        if (this.player.state.status !== AudioPlayerStatus.Idle && this.player.state.resource) {
            this.player.state.resource.volume.setVolume(vol);
        }
    }

    current() {
        return this.queue.length ? this.queue[0] : null;
    }

    list() {
        return this.queue.slice();
    }
}

const queues = new Map();

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, new MusicQueue());
    }
    return queues.get(guildId);
}

module.exports = {
    getQueue
};
