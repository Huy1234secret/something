const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { config } = require('dotenv');
const { xpNeeded } = require('./util');
const { sendLevelCard } = require('./command/level');
const { sendWalletCard } = require('./command/wallet');
const { addRoleCommand } = require('./command/addRole');

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const DATA_FILE = 'user_data.json';
let data = { user_stats: {}, user_card_settings: {}, timed_roles: [] };

function loadData() {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    data = { user_stats: {}, user_card_settings: {}, timed_roles: [] };
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

loadData();

async function addXp(user, amount, channel) {
  const stats =
    data.user_stats[user.id] ||
    (data.user_stats[user.id] = {
      level: 1,
      xp: 0,
      total_xp: 0,
      coins: 0,
      diamonds: 0,
      deluxe_coins: 0,
    });
  stats.xp += amount;
  stats.total_xp += amount;
  const prevLevel = stats.level;
  while (stats.xp >= xpNeeded(stats.level)) {
    stats.xp -= xpNeeded(stats.level);
    stats.level += 1;
  }
  if (stats.level > prevLevel && channel) {
    channel.send(`${user} leveled up to ${stats.level}!`);
  }
  saveData();
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  await addXp(
    message.author,
    1 + Math.floor(Math.random() * 10),
    message.guild?.channels.cache.get('1373578620634665052')
  );
  const content = message.content.trim();
  const lower = content.toLowerCase();
  if (content === '!ping') {
    await message.channel.send('Pong!');
  } else if (lower === 'a.level') {
    await sendLevelCard(message.author, (msg) => message.channel.send(msg), data);
  } else if (lower === 'a.wallet') {
    await sendWalletCard(message.author, (msg) => message.channel.send(msg), data);
  } else if (lower.startsWith('!add-role')) {
    const args = content.split(' ').slice(1);
    await addRoleCommand(message, args);
  }
});

client.login(process.env.BOT_TOKEN);
