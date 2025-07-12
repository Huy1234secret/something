const fs = require('node:fs/promises');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

const DATA_FILE = path.join(__dirname, '../data/fishSeason.json');
const CHANNEL_ID = '1393510353316479029';
const SEASON_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const SEASONS = [
  { name: 'SPRING', color: '#ff96ff', emoji: '🌸' },
  { name: 'SUMMER', color: '#fdff94', emoji: '🏖️' },
  { name: 'AUTUMN', color: '#ff9500', emoji: '🍂' },
  { name: 'WINTER', color: '#80fdff', emoji: '⛄' }
];

async function loadData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { seasonIndex: 0, seasonStart: Date.now(), messageId: null };
  }
}

async function saveData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function applySeasonProgress(data) {
  const now = Date.now();
  const elapsed = now - (data.seasonStart || now);
  if (elapsed >= SEASON_DURATION_MS) {
    const steps = Math.floor(elapsed / SEASON_DURATION_MS);
    data.seasonIndex = (data.seasonIndex || 0) + steps;
    data.seasonIndex %= SEASONS.length;
    data.seasonStart = (data.seasonStart || now) + steps * SEASON_DURATION_MS;
  }
  return { index: data.seasonIndex || 0, start: data.seasonStart || now };
}

function buildEmbed(index, start) {
  const season = SEASONS[index];
  const nextIndex = (index + 1) % SEASONS.length;
  const next = SEASONS[nextIndex];
  const nextTime = start + SEASON_DURATION_MS;
  const embed = new EmbedBuilder()
    .setColor(season.color)
    .setTitle(`TODAY SEASON: ${season.name} ${season.emoji}`)
    .setDescription(`next season: ${next.name} ${next.emoji}\nchange in: <t:${Math.floor(nextTime/1000)}:R>`)
    .setAuthor({ name: 'HEY FISHER' });
  return embed;
}

async function announceSeason(client, data) {
  const { index, start } = applySeasonProgress(data);
  await saveData(data);
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  const embed = buildEmbed(index, start);
  if (data.messageId) {
    const msg = await channel.messages.fetch(data.messageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [embed] }).catch(() => {});
      return;
    }
  }
  const message = await channel.send({ embeds: [embed] }).catch(() => null);
  if (message) {
    data.messageId = message.id;
    await saveData(data);
  }
}

async function initFishSeason(client) {
  const data = await loadData();
  await announceSeason(client, data);
  setInterval(() => announceSeason(client, data).catch(() => {}), 60 * 60 * 1000);
  client.getCurrentSeasonIndex = () => applySeasonProgress(data).index;
}

module.exports = { initFishSeason, SEASONS };
