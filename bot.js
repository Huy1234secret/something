const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const DATA_FILE = 'user_data.json';
let userStats = {};
let userCardSettings = {};
let timedRoles = [];
const defaultColor = [92,220,140];
const defaultBackground = 'https://i.ibb.co/9337ZnxF/wdwdwd.jpg';
const MAX_LEVEL = 9999;
const levelUpChannelId = 1373578620634665052;
const voiceSessions = new Map();

function loadData() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    userStats = data.user_stats || {};
    userCardSettings = data.user_card_settings || {};
    timedRoles = data.timed_roles || [];
  } catch (err) {
    userStats = {};
    userCardSettings = {};
    timedRoles = [];
  }
}

function saveData() {
  const data = {
    user_stats: userStats,
    user_card_settings: userCardSettings,
    timed_roles: timedRoles
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

function xpNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

async function addXp(user, amount, client) {
  const stats = userStats[user.id] || { level:1, xp:0, total_xp:0, coins:0, diamonds:0, deluxe_coins:0 };
  stats.xp += amount;
  stats.total_xp += amount;
  let prev = stats.level;
  while (stats.level < MAX_LEVEL && stats.xp >= xpNeeded(stats.level)) {
    stats.xp -= xpNeeded(stats.level);
    stats.level += 1;
  }
  if (stats.level >= MAX_LEVEL) stats.xp = 0;
  userStats[user.id] = stats;
  if (stats.level > prev) {
    const channel = client.channels.cache.get(levelUpChannelId);
    if (channel) {
      const embed = new EmbedBuilder().setColor(0xffffff).setTitle('Leveled up').setDescription(`${user} leveled from ${prev} to ${stats.level}`);
      channel.send({ embeds:[embed] });
    }
  }
  saveData();
}

function scheduleRole(userId, guildId, roleId, expiresAt, save=false) {
  const entry = { user_id:userId, guild_id:guildId, role_id:roleId, expires_at:expiresAt };
  if (save) {
    timedRoles.push(entry);
    saveData();
  }
  const delay = expiresAt * 1000 - Date.now();
  setTimeout(async () => {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;
      const member = await guild.members.fetch(userId);
      await member.roles.remove(roleId);
    } catch (err) {}
  }, Math.max(delay, 0));
}

loadData();

const client = new Client({
  intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  const resources = { userStats, userCardSettings, saveData, xpNeeded, defaultColor, defaultBackground, scheduleRole };
  require('./command/addRole').setup(client, resources);
  require('./command/level').setup(client, resources);
  require('./command/levelButton').setup(client, resources);
  require('./command/wallet').setup(client, resources);
  timedRoles.forEach(r => scheduleRole(r.user_id, r.guild_id, r.role_id, r.expires_at));
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  await addXp(message.author, Math.floor(Math.random()*10)+1, client);
  if (message.content === '!ping') {
    message.channel.send('Pong!');
  }
});

client.on('voiceStateUpdate', (before, after) => {
  if (!before.channel && after.channel) {
    voiceSessions.set(after.id, Date.now());
  } else if (before.channel && !after.channel) {
    const start = voiceSessions.get(before.id);
    if (start) {
      const duration = Date.now() - start;
      voiceSessions.delete(before.id);
      const minutes = Math.floor(duration / 60000);
      const user = after.member || before.member;
      if (user) addXp(user, Math.floor(minutes/5), client);
    }
  }
});

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN not set');
client.login(token);
