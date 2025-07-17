const fs = require('node:fs/promises');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

const DATA_FILE = path.join(__dirname, '../data/fishSeason.json');
const CHANNEL_ID = '1393510353316479029';
const SEASON_TZ_OFFSET_HOURS = 7; // UTC+7

const SEASONS = [
  { name: 'SPRING', color: '#ff96ff', emoji: '🌸' },
  { name: 'SUMMER', color: '#fdff94', emoji: '🏖️' },
  { name: 'AUTUMN', color: '#ff9500', emoji: '🍂' },
  { name: 'WINTER', color: '#80fdff', emoji: '⛄' }
];

// Get the start of today at 00:00 UTC+7 in milliseconds
function getStartOfTodayUTC7() {
  const now = new Date();
  // Get current time in UTC+7
  const utc7Time = new Date(now.getTime() + (SEASON_TZ_OFFSET_HOURS * 60 * 60 * 1000));
  // Set to 00:00:00.000 in UTC+7
  utc7Time.setUTCHours(0, 0, 0, 0);
  // Convert back to UTC timestamp
  return utc7Time.getTime() - (SEASON_TZ_OFFSET_HOURS * 60 * 60 * 1000);
}

// Get the start of next day at 00:00 UTC+7 (which is 24:00 of current day)
function getStartOfNextDayUTC7() {
  const todayStart = getStartOfTodayUTC7();
  return todayStart + (24 * 60 * 60 * 1000); // Add exactly 24 hours
}

// Calculate which season index should be active based on days since epoch
function calculateSeasonIndex(timestamp) {
  // Get the start of the day for the given timestamp in UTC+7
  const date = new Date(timestamp + (SEASON_TZ_OFFSET_HOURS * 60 * 60 * 1000));
  // Calculate days since epoch (Jan 1, 1970)
  const daysSinceEpoch = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
  // Rotate through seasons daily
  return daysSinceEpoch % SEASONS.length;
}

async function loadData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { messageId: null };
  }
}

async function saveData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function getCurrentSeasonInfo() {
  const now = Date.now();
  const todayStart = getStartOfTodayUTC7();
  const nextDayStart = getStartOfNextDayUTC7();
  const currentIndex = calculateSeasonIndex(now);
  const nextIndex = (currentIndex + 1) % SEASONS.length;
  
  return {
    currentIndex,
    nextIndex,
    seasonStart: todayStart,
    nextChangeTime: nextDayStart,
    timeUntilChange: nextDayStart - now
  };
}

function buildEmbed() {
  const info = getCurrentSeasonInfo();
  const currentSeason = SEASONS[info.currentIndex];
  const nextSeason = SEASONS[info.nextIndex];
  
  const embed = new EmbedBuilder()
    .setColor(currentSeason.color)
    .setTitle(`TODAY SEASON: ${currentSeason.name} ${currentSeason.emoji}`)
    .setDescription(`next season: ${nextSeason.name} ${nextSeason.emoji}\nchange at 24:00 UTC+7: <t:${Math.floor(info.nextChangeTime/1000)}:R>`)
    .setAuthor({ name: 'HEY FISHER' })
    .setFooter({ text: `Season changes daily at midnight UTC+7` })
    .setTimestamp();
  
  return embed;
}

async function updateSeasonMessage(client, data) {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  
  const embed = buildEmbed();
  
  // Try to update existing message
  if (data.messageId) {
    const msg = await channel.messages.fetch(data.messageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [embed] }).catch(() => {});
      return;
    }
  }
  
  // Send new message if update failed
  const message = await channel.send({ embeds: [embed] }).catch(() => null);
  if (message) {
    data.messageId = message.id;
    await saveData(data);
  }
}

// Calculate milliseconds until next 24:00 UTC+7
function msUntilNextMidnightUTC7() {
  const now = Date.now();
  const nextMidnight = getStartOfNextDayUTC7();
  return nextMidnight - now;
}

async function initFishSeason(client) {
  const data = await loadData();
  
  // Update the message immediately
  await updateSeasonMessage(client, data);
  
  // Set up hourly updates (to keep the relative time fresh)
  setInterval(() => {
    updateSeasonMessage(client, data).catch(console.error);
  }, 60 * 60 * 1000); // Every hour
  
  // Set up daily season change at exactly 24:00 UTC+7
  const scheduleNextSeasonChange = () => {
    const msUntilChange = msUntilNextMidnightUTC7();
    
    setTimeout(() => {
      // Update the message when season changes
      updateSeasonMessage(client, data).catch(console.error);
      // Schedule the next season change
      scheduleNextSeasonChange();
    }, msUntilChange);
    
    console.log(`Next season change in ${Math.floor(msUntilChange / 1000)} seconds (at 24:00 UTC+7)`);
  };
  
  scheduleNextSeasonChange();
  
  // Expose function to get current season index
  client.getCurrentSeasonIndex = () => getCurrentSeasonInfo().currentIndex;
}

module.exports = { initFishSeason, SEASONS };
