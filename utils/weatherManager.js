const { EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1393510093060046848';
const DAY_COLOR = '#fff799';
const NIGHT_COLOR = '#001b44';
const RAIN_COLOR = '#a0ffff';
const BLOSSOM_COLOR = '#ffb6c1';
const GOLDEN_COLOR = '#ffd700';
const PRISMATIC_COLOR = '#00ffff';
const ECLIPSE_COLOR = '#111111';
const SOLAR_COLOR = '#ffa500';
const SNOW_COLOR = '#ccffff';
const AURORA_COLOR = '#aaffff';

const RAIN_EMOJI = '<:Rain:1402301767189921792>';
const BLOSSOM_EMOJI = '<:CherryBlossomBreeze:1402301812131893278>';
const GOLDEN_RAIN_EMOJI = '<:GoldenRain:1402301790686548088>';
const PRISMATIC_TIDE_EMOJI = '<:PrismaticTide:1402301838631633027>';
const ECLIPSE_EMOJI = '<:Eclipse:1402301900485038190>';
const SOLAR_FLARE_EMOJI = '<:SolarFlareSurge:1402301913436913826>';
const SNOW_RAIN_EMOJI = '<:SnowRain:1402302045716877432>';
const AURORA_EMOJI = '<:Aurora:1402301875268882462>';

// Display names for weather/events
const DISPLAY_NAMES = {
    rain: `${RAIN_EMOJI} Rain`,
    goldenRain: `${GOLDEN_RAIN_EMOJI} Golden Rain`,
    snowRain: `${SNOW_RAIN_EMOJI} Snow Rain`,
    blossom: `${BLOSSOM_EMOJI}Cherry Blossom Breeze`,
    prismatic: `${PRISMATIC_TIDE_EMOJI} Prismatic Tide`,
    eclipse: `${ECLIPSE_EMOJI} Eclipse`,
    solarFlare: `${SOLAR_FLARE_EMOJI} Solar Flare Surge`,
    aurora: `${AURORA_EMOJI} Aurora`
};

// Alert messages used when weather or events start/end
const RAIN_START_ALERT = `\`[WEATHER]\` ${RAIN_EMOJI} **Rain** has started!`;
const RAIN_END_ALERT = `\`[WEATHER]\` ${RAIN_EMOJI} **Rain** has ended!`;
const GOLDEN_RAIN_START_ALERT = `\`[WEATHER]\` ${GOLDEN_RAIN_EMOJI} **Golden Rain** has started!`;
const GOLDEN_RAIN_END_ALERT = `\`[WEATHER]\` ${GOLDEN_RAIN_EMOJI} **Golden Rain** has ended!`;
const SNOW_RAIN_START_ALERT = `\`[WEATHER]\` ${SNOW_RAIN_EMOJI} **Snow Rain** has started!`;
const SNOW_RAIN_END_ALERT = `\`[WEATHER]\` ${SNOW_RAIN_EMOJI} **Snow Rain** has ended!`;
const BLOSSOM_START_ALERT = `\`[EVENT]\` ${BLOSSOM_EMOJI}**Cherry Blossom Breeze** has started!!`;
const BLOSSOM_END_ALERT = `\`[EVENT]\` ${BLOSSOM_EMOJI}**Cherry Blossom Breeze** has ended!`;
const PRISMATIC_START_ALERT = `\`[EVENT]\` ${PRISMATIC_TIDE_EMOJI} **Prismatic Tide** has started!!`;
const PRISMATIC_END_ALERT = `\`[EVENT]\` ${PRISMATIC_TIDE_EMOJI} **Prismatic Tide** has ended!`;
const ECLIPSE_START_ALERT = `\`[EVENT]\` ${ECLIPSE_EMOJI} **Eclipse** has started!!`;
const ECLIPSE_END_ALERT = `\`[EVENT]\` ${ECLIPSE_EMOJI} **Eclipse** has ended!`;
const SOLARFLARE_START_ALERT = `\`[WEATHER]\` ${SOLAR_FLARE_EMOJI} **Solar Flare Surge** has started!`;
const SOLARFLARE_END_ALERT = `\`[WEATHER]\` ${SOLAR_FLARE_EMOJI} **Solar Flare Surge** has ended!`;
const AURORA_START_ALERT = `\`[EVENT]\` ${AURORA_EMOJI} **Aurora** has started!!`;
const AURORA_END_ALERT = `\`[EVENT]\` ${AURORA_EMOJI} **Aurora** has ended!`;

let currentTime = null; // 'day' or 'night'
const active = {
    rain: false,
    goldenRain: false,
    snowRain: false,
    blossom: false,
    prismatic: false,
    eclipse: false,
    solarFlare: false,
    aurora: false
};
const activeUntil = {
    rain: 0,
    goldenRain: 0,
    snowRain: 0,
    blossom: 0,
    prismatic: 0,
    eclipse: 0,
    solarFlare: 0,
    aurora: 0
};

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
    if (active.rain || active.goldenRain || active.snowRain) mult *= 1.25;
    if (active.blossom) mult *= 1.10;
    return mult;
}

function isBlossomActive() { return !!active.blossom; }
function isGoldenRainActive() { return !!active.goldenRain; }
function isPrismaticTideActive() { return !!active.prismatic; }
function isEclipseActive() { return !!active.eclipse; }
function isSolarFlareActive() { return !!active.solarFlare; }
function isSnowRainActive() { return !!active.snowRain; }
function isAuroraActive() { return !!active.aurora; }

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
            if (active.aurora) await endWeather(client, 'aurora');
            if (!active.eclipse && Math.random() < 0.01) await startEclipse(client);
        } else {
            await send(channel, '🌙 **Night has fallen!**', NIGHT_COLOR);
            if (active.eclipse) await endWeather(client, 'eclipse');
            if (active.solarFlare) await endWeather(client, 'solarFlare');
        }
    }
}

async function endWeather(client, name) {
    active[name] = false;
    activeUntil[name] = 0;
    const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const alerts = {
        rain: RAIN_END_ALERT,
        goldenRain: GOLDEN_RAIN_END_ALERT,
        snowRain: SNOW_RAIN_END_ALERT,
        blossom: BLOSSOM_END_ALERT,
        prismatic: PRISMATIC_END_ALERT,
        eclipse: ECLIPSE_END_ALERT,
        solarFlare: SOLARFLARE_END_ALERT,
        aurora: AURORA_END_ALERT
    };
    const colors = {
        rain: RAIN_COLOR,
        goldenRain: GOLDEN_COLOR,
        snowRain: SNOW_COLOR,
        blossom: BLOSSOM_COLOR,
        prismatic: PRISMATIC_COLOR,
        eclipse: ECLIPSE_COLOR,
        solarFlare: SOLAR_COLOR,
        aurora: AURORA_COLOR
    };
    const alert = alerts[name];
    if (alert) await send(ch, alert, colors[name]);
}

async function startRain(client, opts = {}) {
    if (active.rain || active.goldenRain || active.snowRain) {
        const rem = Math.max(activeUntil.rain, activeUntil.goldenRain, activeUntil.snowRain) - Date.now();
        return { started: false, remaining: Math.max(0, rem) };
    }
    const seasonIndex = typeof client.getCurrentSeasonIndex === 'function' ? client.getCurrentSeasonIndex() : 0;
    if (seasonIndex === 3) return startSnowRain(client, opts);
    if (Math.random() < 0.05) return startGoldenRain(client, opts);
    active.rain = true;
    const duration = (30 + Math.floor(Math.random() * 31)) * 60 * 1000;
    activeUntil.rain = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.rain / 1000);
    await send(channel, `${RAIN_START_ALERT} <t:${ts}:R>`, RAIN_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(() => endWeather(client, 'rain'), duration);
    return { started: true, duration };
}

async function startGoldenRain(client, opts = {}) {
    if (active.rain || active.goldenRain || active.snowRain) {
        const rem = Math.max(activeUntil.rain, activeUntil.goldenRain, activeUntil.snowRain) - Date.now();
        return { started: false, remaining: Math.max(0, rem) };
    }
    active.goldenRain = true;
    const duration = (10 + Math.floor(Math.random() * 51)) * 60 * 1000;
    activeUntil.goldenRain = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.goldenRain / 1000);
    await send(channel, `${GOLDEN_RAIN_START_ALERT} <t:${ts}:R>`, GOLDEN_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(() => endWeather(client, 'goldenRain'), duration);
    return { started: true, duration };
}

async function startSnowRain(client, opts = {}) {
    if (active.rain || active.goldenRain || active.snowRain) {
        const rem = Math.max(activeUntil.rain, activeUntil.goldenRain, activeUntil.snowRain) - Date.now();
        return { started: false, remaining: Math.max(0, rem) };
    }
    active.snowRain = true;
    const duration = (30 + Math.floor(Math.random() * 31)) * 60 * 1000;
    activeUntil.snowRain = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.snowRain / 1000);
    await send(channel, `${SNOW_RAIN_START_ALERT} <t:${ts}:R>`, SNOW_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(() => endWeather(client, 'snowRain'), duration);
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
    setTimeout(() => endWeather(client, 'blossom'), duration);
    return { started: true, duration };
}

async function startPrismaticTide(client, opts = {}) {
    if (active.prismatic) {
        return { started: false, remaining: Math.max(0, activeUntil.prismatic - Date.now()) };
    }
    active.prismatic = true;
    const duration = (10 + Math.floor(Math.random() * 51)) * 60 * 1000;
    activeUntil.prismatic = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.prismatic / 1000);
    await send(channel, `${PRISMATIC_START_ALERT} <t:${ts}:R>`, PRISMATIC_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(() => endWeather(client, 'prismatic'), duration);
    return { started: true, duration };
}

async function startEclipse(client, opts = {}) {
    if (active.eclipse) {
        return { started: false, remaining: Math.max(0, activeUntil.eclipse - Date.now()) };
    }
    active.eclipse = true;
    const duration = (10 + Math.floor(Math.random() * 291)) * 60 * 1000;
    activeUntil.eclipse = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.eclipse / 1000);
    await send(channel, `${ECLIPSE_START_ALERT} <t:${ts}:R>`, ECLIPSE_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(() => endWeather(client, 'eclipse'), duration);
    return { started: true, duration };
}

async function startSolarFlare(client, opts = {}) {
    if (active.solarFlare) {
        return { started: false, remaining: Math.max(0, activeUntil.solarFlare - Date.now()) };
    }
    active.solarFlare = true;
    const duration = (30 + Math.floor(Math.random() * 371)) * 60 * 1000;
    activeUntil.solarFlare = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.solarFlare / 1000);
    await send(channel, `${SOLARFLARE_START_ALERT} <t:${ts}:R>`, SOLAR_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(() => endWeather(client, 'solarFlare'), duration);
    return { started: true, duration };
}

async function startAurora(client, opts = {}) {
    if (active.aurora) {
        return { started: false, remaining: Math.max(0, activeUntil.aurora - Date.now()) };
    }
    active.aurora = true;
    const duration = (10 + Math.floor(Math.random() * 51)) * 60 * 1000;
    activeUntil.aurora = Date.now() + duration;
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    const ts = Math.floor(activeUntil.aurora / 1000);
    await send(channel, `${AURORA_START_ALERT} <t:${ts}:R>`, AURORA_COLOR, opts.byAdmin ? 'Started by admin' : undefined);
    setTimeout(() => endWeather(client, 'aurora'), duration);
    return { started: true, duration };
}

async function rollWeather(client) {
    if (!active.rain && !active.goldenRain && !active.snowRain && Math.random() < 0.1) await startRain(client);
    const seasonIndex = typeof client.getCurrentSeasonIndex === 'function' ? client.getCurrentSeasonIndex() : 0;
    if (seasonIndex === 0 && !active.blossom && Math.random() < 0.1) await startBlossom(client);
    if (!active.prismatic && Math.random() < 0.01) await startPrismaticTide(client);
    if (seasonIndex === 1 && isDay() && !active.solarFlare && Math.random() < 0.35) await startSolarFlare(client);
    if (seasonIndex === 3 && !isDay() && !active.aurora && Math.random() < 0.01) await startAurora(client);
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
    isGoldenRainActive,
    isPrismaticTideActive,
    isEclipseActive,
    isSolarFlareActive,
    isSnowRainActive,
    isAuroraActive,
    getActiveWeatherList,
    startRain,
    startBlossom,
    startGoldenRain,
    startSnowRain,
    startPrismaticTide,
    startEclipse,
    startSolarFlare,
    startAurora,
    activeUntil,
    RAIN_START_ALERT,
    RAIN_END_ALERT,
    BLOSSOM_START_ALERT,
    BLOSSOM_END_ALERT,
    DISPLAY_NAMES
};
