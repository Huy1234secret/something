const { EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1393510093060046848';
const DAY_COLOR = '#fff799';
const NIGHT_COLOR = '#001b44';
const RAIN_COLOR = '#a0ffff';
const BLOSSOM_COLOR = '#ffb6c1';

// Display names for weather/events
const DISPLAY_NAMES = {
    rain: '🌧️ Rain',
    blossom: '🌸Cherry Blossom Breeze'
};

// Alert messages used when weather or events start/end
const RAIN_START_ALERT = '`[WEATHER]` 🌧️ **Rain** has started!';
const RAIN_END_ALERT = '`[WEATHER]` 🌧️ **Rain** has ended!';
const BLOSSOM_START_ALERT = '`[EVENT]` 🌸**Cherry Blossom Breeze** has started!!';
const BLOSSOM_END_ALERT = '`[EVENT]` 🌸**Cherry Blossom Breeze** has ended!';

let currentTime = null; // 'day' or 'night'
const active = { rain: false, blossom: false };
const activeUntil = { rain: 0, blossom: 0 };

function isDay(timestamp = Date.now()) {
    const utc7 = timestamp + 7 * 60 * 60 * 1000;
    const hours = new Date(utc7).getUTCHours();
    return (hours >= 0 && hours < 6) || (hours >= 12 && hours < 18);
}

function getActiveWeatherList() {
    return Object.keys(active).filter(k => active[k]);
}

function getCatchMultiplier() {
    let mult = 1;
    if (active.rain) mult *= 1.25;
    if (active.blossom) mult *= 1.10;
    return mult;
}

function isBlossomActive() {
    return !!active.blossom;
}

async function send(channel, description, color, footer) {
    if (!channel) return;
    const embed = new EmbedBuilder().setColor(color).setDescription(description);
    if (footer) embed.setFooter({ text: footer });
    await channel.send({ embeds: [embed] }).catch(() => {});
}

async function updateDayNight(client) {
    const nowDay = isDay();
    const first = currentTime === null;
    if (currentTime === null) currentTime = nowDay;
    if (nowDay !== currentTime || first) {
        currentTime = nowDay;
        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (nowDay) {
            await send(channel, '☀️ **Day has begun!**', DAY_COLOR);
        } else {
            await send(channel, '🌙 **Night has fallen!**', NIGHT_COLOR);
        }
    }
}

async function startRain(client, opts = {}) {
    if (active.rain) {
        return { started: false, remaining: Math.max(0, activeUntil.rain - Date.now()) };
    }
    active.rain = true;
    const duration = (30 + Math.floor(Math.random() * 31)) * 60 * 1000;
    activeUntil.rain = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.rain / 1000);
    await send(channel, `${RAIN_START_ALERT} <t:${ts}:R>`, RAIN_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(async () => {
        active.rain = false;
        activeUntil.rain = 0;
        const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        await send(ch, RAIN_END_ALERT, RAIN_COLOR);
    }, duration);
    return { started: true, duration };
}

async function startBlossom(client, opts = {}) {
    if (active.blossom) {
        return { started: false, remaining: Math.max(0, activeUntil.blossom - Date.now()) };
    }
    active.blossom = true;
    const duration = (30 + Math.floor(Math.random() * 91)) * 60 * 1000;
    activeUntil.blossom = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.blossom / 1000);
    await send(channel, `${BLOSSOM_START_ALERT} <t:${ts}:R>`, BLOSSOM_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(async () => {
        active.blossom = false;
        activeUntil.blossom = 0;
        const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        await send(ch, BLOSSOM_END_ALERT, BLOSSOM_COLOR);
    }, duration);
    return { started: true, duration };
}

async function rollWeather(client) {
    if (!active.rain && Math.random() < 0.1) await startRain(client);
    const seasonIndex = typeof client.getCurrentSeasonIndex === 'function' ? client.getCurrentSeasonIndex() : 0;
    if (seasonIndex === 0 && !active.blossom && Math.random() < 0.1) await startBlossom(client);
}

function buildWeatherEmbed() {
    const title = currentTime ? 'Day ☀️' : 'Night 🌙';
    const list = getActiveWeatherList();
    const desc = list.length ? list.map(w => `- ${DISPLAY_NAMES[w] || w}`).join('\n') : '- normal';
    const embed = new EmbedBuilder().setColor(currentTime ? DAY_COLOR : NIGHT_COLOR).setTitle(`# ${title}`).setDescription(`### Weather:\n${desc}`);
    return embed;
}

async function initWeather(client) {
    await updateDayNight(client);
    setInterval(() => updateDayNight(client).catch(() => {}), 60 * 1000);
    rollWeather(client).catch(() => {});
    setInterval(() => rollWeather(client).catch(() => {}), 60 * 60 * 1000);
}

module.exports = {
    initWeather,
    buildWeatherEmbed,
    getCatchMultiplier,
    isBlossomActive,
    getActiveWeatherList,
    startRain,
    startBlossom,
    activeUntil,
    RAIN_START_ALERT,
    RAIN_END_ALERT,
    BLOSSOM_START_ALERT,
    BLOSSOM_END_ALERT,
    DISPLAY_NAMES
};
