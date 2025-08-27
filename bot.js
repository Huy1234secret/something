const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
require('dotenv').config();
const levelCommand = require('./command/level');
const walletCommand = require('./command/wallet');
const addRoleCommand = require('./command/addRole');
const inventoryCommand = require('./command/inventory');
const shopCommand = require('./command/shop');
const useItemCommand = require('./command/useItem');
const robCommand = require('./command/rob');
const addCurrencyCommand = require('./command/addCurrency');
const addItemCommand = require('./command/addItem');
const farmViewCommand = require('./command/farmView');
const { ITEMS } = require('./items');

const DATA_FILE = 'user_data.json';
let userStats = {};
let userCardSettings = {};
let timedRoles = [];
const defaultColor = [0,255,255];
const defaultBackground = 'https://i.ibb.co/9337ZnxF/wdwdwd.jpg';
const MAX_LEVEL = 9999;
const levelUpChannelId = 1373578620634665052;
const voiceSessions = new Map();
const pendingRequests = new Map();

function fixItemEntries(statsMap) {
  const itemsById = Object.fromEntries(
    Object.values(ITEMS).map(i => [i.id, i])
  );
  const itemsByName = Object.fromEntries(
    Object.values(ITEMS).map(i => [i.name.toLowerCase(), i])
  );
  let fixed = 0;
  for (const stats of Object.values(statsMap)) {
    if (!Array.isArray(stats.inventory)) continue;
    stats.inventory = stats.inventory.map(item => {
      let base = itemsById[item.id] ||
        (item.name && itemsByName[item.name.toLowerCase()]);
      if (!base) return item;
      let changed = false;
      const updated = { ...item };
      if (item.id !== base.id) {
        updated.id = base.id;
        changed = true;
      }
      if (item.emoji !== base.emoji) {
        updated.emoji = base.emoji;
        changed = true;
      }
      if (item.name !== base.name) {
        updated.name = base.name;
        changed = true;
      }
      if (item.image !== base.image) {
        updated.image = base.image;
        changed = true;
      }
      if (changed) fixed++;
      return changed ? updated : item;
    });
  }
  return fixed;
}

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
  const fixed = fixItemEntries(userStats);
  if (fixed > 0) {
    saveData();
    console.log(`Fixed ${fixed} inventory entries.`);
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
      const components = [
        new TextDisplayBuilder().setContent(`**Leveled up**\n${user} leveled from ${prev} to ${stats.level}`),
      ];
      channel.send({ components, flags: MessageFlags.IsComponentsV2 });
    }
  }
  saveData();
}

function addCoins(user, amount) {
  const stats = userStats[user.id] || { level:1, xp:0, total_xp:0, coins:0, diamonds:0, deluxe_coins:0 };
  stats.coins = (stats.coins || 0) + amount;
  userStats[user.id] = stats;
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

const resources = { userStats, userCardSettings, saveData, xpNeeded, defaultColor, defaultBackground, scheduleRole, pendingRequests };

const client = new Client({
  intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});
client.setMaxListeners(20);

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await useItemCommand.restoreActiveItemTimers(client, resources);

    client.on('interactionCreate', async interaction => {
      if (interaction.isChatInputCommand()) {
        if (pendingRequests.has(interaction.user.id)) {
          const pending = pendingRequests.get(interaction.user.id);
          const container = new ContainerBuilder()
            .setAccentColor(0xff0000)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `${interaction.user}, you still have a request action needed to be done`,
              ),
            )
            .addSeparatorComponents(new SeparatorBuilder());
          if (pending.message) {
            container.addActionRowComponents(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setLabel('View Request')
                  .setStyle(ButtonStyle.Link)
                  .setURL(pending.message.url),
              ),
            );
          }
            await interaction.reply({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
            });
          return;
        }
      }
    });

    addRoleCommand.setup(client, resources);
    levelCommand.setup(client, resources);
    walletCommand.setup(client, resources);
    inventoryCommand.setup(client, resources);
    shopCommand.setup(client, resources);
    useItemCommand.setup(client, resources);
    robCommand.setup(client, resources);
    addCurrencyCommand.setup(client, resources);
    addItemCommand.setup(client, resources);
    farmViewCommand.setup(client, resources);
    timedRoles.forEach(r => scheduleRole(r.user_id, r.guild_id, r.role_id, r.expires_at));

    // Remove deprecated /level-button command if it exists
    try {
      const commands = await client.application.commands.fetch();
      const legacy = commands.find(cmd => cmd.name === 'level-button');
      if (legacy) {
        await client.application.commands.delete(legacy.id);
      }
    } catch (err) {
      console.warn('Failed to remove legacy /level-button command', err);
    }
  });

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  await addXp(message.author, Math.floor(Math.random()*10)+1, client);
  addCoins(message.author, Math.floor(Math.random()*100)+1);
  const content = message.content.trim();
  if (pendingRequests.has(message.author.id) && (content.toLowerCase().startsWith('a.') || message.content === '!ping')) {
    const pending = pendingRequests.get(message.author.id);
    const container = new ContainerBuilder()
      .setAccentColor(0xff0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${message.author}, you still have a request action needed to be done`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder());
    if (pending.message) {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('View Request')
            .setStyle(ButtonStyle.Link)
            .setURL(pending.message.url),
        ),
      );
    }
      await message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      await message.delete().catch(() => {});
      return;
    }
  if (content.toLowerCase().startsWith('a.')) {
    const afterPrefix = content.slice(2).trim();
    const lowerAfter = afterPrefix.toLowerCase();
    if (lowerAfter === 'level') {
      await levelCommand.sendLevelCard(
        message.author,
        message.channel.send.bind(message.channel),
        resources
      );
    } else if (lowerAfter === 'wallet') {
      await walletCommand.sendWallet(
        message.author,
        message.channel.send.bind(message.channel),
        resources
      );
    } else if (lowerAfter === 'inventory') {
      await inventoryCommand.sendInventory(
        message.author,
        message.channel.send.bind(message.channel),
        resources
      );
    } else if (lowerAfter === 'farm view') {
      await farmViewCommand.sendFarmView(
        message.author,
        message.channel.send.bind(message.channel),
        resources,
      );
    } else if (lowerAfter === 'shop view') {
      await shopCommand.sendShop(
        message.author,
        message.channel.send.bind(message.channel),
        resources,
      );
    } else if (lowerAfter.startsWith('use ')) {
      const args = afterPrefix.split(/\s+/).slice(1);
      const itemId = args[0];
      const amount = parseInt(args[1], 10) || 1;
      await useItemCommand.handleUseItem(
        message.author,
        itemId,
        amount,
        message.channel.send.bind(message.channel),
        resources,
      );
    } else if (lowerAfter.startsWith('rob')) {
      const args = afterPrefix.split(/\s+/).slice(1);
      let target = message.mentions.users.first();
      if (!target && args[0]) {
        try {
          target = await message.client.users.fetch(args[0]);
        } catch {}
      }
      if (target) {
        await robCommand.executeRob(
          message.author,
          target,
          message.channel.send.bind(message.channel),
          resources,
        );
      } else {
          await message.channel.send({
            content: '<:SBWarning:1404101025849147432> Please provide a user ID to rob.',
          });
      }
    } else if (lowerAfter.startsWith('add role')) {
      const args = afterPrefix.split(/\s+/).slice(2);
      await addRoleCommand.handleTextCommand(message, args, resources);
    }
    await message.delete().catch(() => {});
    return;
  }
  if (message.content === '!ping') {
    if (pendingRequests.has(message.author.id)) {
      const pending = pendingRequests.get(message.author.id);
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${message.author}, you still have a request action needed to be done`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder());
      if (pending.message) {
        container.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('View Request')
              .setStyle(ButtonStyle.Link)
              .setURL(pending.message.url),
          ),
        );
      }
      await message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }
    message.channel.send({
      components: [new TextDisplayBuilder().setContent('Pong!')],
      flags: MessageFlags.IsComponentsV2,
    });
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
