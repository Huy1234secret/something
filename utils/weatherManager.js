const { EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1393510093060046848';
const DAY_COLOR = '#fff799';
const NIGHT_COLOR = '#001b44';
const RAIN_COLOR = '#a0ffff';
const BLOSSOM_COLOR = '#ffb6c1';

let currentTime = null; // 'day' or 'night'
const active = { rain: false, blossom: false };

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

async function send(channel, description, color) {
    if (!channel) return;
    const embed = new EmbedBuilder().setColor(color).setDescription(description);
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

async function startRain(client) {
    active.rain = true;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    await send(channel, '[WEATHER]:🌧️ **Rain** has started!', RAIN_COLOR);
    const duration = (30 + Math.floor(Math.random() * 31)) * 60 * 1000;
    setTimeout(async () => {
        active.rain = false;
        const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        await send(ch, '[WEATHER]:🌧️ **Rain** has ended!', RAIN_COLOR);
    }, duration);
}

async function startBlossom(client) {
    active.blossom = true;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    await send(channel, '[EVENT]:🌸**Cherry Blossom Breeze** has started!!', BLOSSOM_COLOR);
    const duration = (30 + Math.floor(Math.random() * 91)) * 60 * 1000;
    setTimeout(async () => {
        active.blossom = false;
        const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        await send(ch, '[EVENT]:🌸**Cherry Blossom Breeze** has ended!', BLOSSOM_COLOR);
    }, duration);
}

async function rollWeather(client) {
    if (!active.rain && Math.random() < 0.1) await startRain(client);
    const seasonIndex = typeof client.getCurrentSeasonIndex === 'function' ? client.getCurrentSeasonIndex() : 0;
    if (seasonIndex === 0 && !active.blossom && Math.random() < 0.1) await startBlossom(client);
}

function buildWeatherEmbed() {
    const title = currentTime ? 'Day ☀️' : 'Night 🌙';
    const list = getActiveWeatherList();
    const desc = list.length ? list.map(w => `- ${w}`).join('\n') : '- normal';
    const embed = new EmbedBuilder().setColor(currentTime ? DAY_COLOR : NIGHT_COLOR).setTitle(`# ${title}`).setDescription(`### Weather:\n${desc}`);
    return embed;
}

async function initWeather(client) {
    await updateDayNight(client);
    setInterval(() => updateDayNight(client).catch(() => {}), 60 * 1000);
    setInterval(() => rollWeather(client).catch(() => {}), 60 * 60 * 1000);
}

module.exports = {
    initWeather,
    buildWeatherEmbed,
    getCatchMultiplier,
    isBlossomActive,
    getActiveWeatherList,
    startRain,
    startBlossom
};
