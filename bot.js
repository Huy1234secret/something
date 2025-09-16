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
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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
const huntCommand = require('./command/hunt');
const digCommand = require('./command/dig');
const begCommand = require('./command/beg');
const myCosmeticCommand = require('./command/myCosmetic');
const masteryCommand = require('./command/mastery');
const { ITEMS } = require('./items');
const { setSafeTimeout, applyCoinBoost } = require('./utils');
const { setupErrorHandling } = require('./errorHandler');

const DATA_FILE = 'user_data.json';
let userStats = {};
let userCardSettings = {};
let timedRoles = [];
let commandBans = {};
let cshMessageId = null;
const defaultColor = [0,255,255];
const defaultBackground = 'https://i.ibb.co/9337ZnxF/wdwdwd.jpg';
const MAX_LEVEL = 9999;
const levelUpChannelId = '1373578620634665052';
const voiceSessions = new Map();
const pendingRequests = new Map();
let shop = { stock: {}, nextRestock: 0 };

const ITEMS_BY_RARITY = {};
for (const item of Object.values(ITEMS)) {
  const r = String(item.rarity || 'common').toLowerCase();
  if (!ITEMS_BY_RARITY[r]) ITEMS_BY_RARITY[r] = [];
  ITEMS_BY_RARITY[r].push(item);
}

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
    commandBans = data.command_bans || {};
    cshMessageId = data.csh_message_id || null;
    shop = data.shop || { stock: {}, nextRestock: 0 };
  } catch (err) {
    userStats = {};
    userCardSettings = {};
    timedRoles = [];
    commandBans = {};
    cshMessageId = null;
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
    timed_roles: timedRoles,
    command_bans: commandBans,
    csh_message_id: cshMessageId,
    shop,
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

function xpNeeded(level) {
  const lvl = Number(level);
  const n = Number.isFinite(lvl) && lvl > 0 ? lvl : 1;
  return Math.floor(100 * Math.pow(n, 1.5));
}

function chatMasteryXpNeeded(level) {
  const L = Number(level);
  const n = Number.isFinite(L) && L > 0 ? L : 1;
  return Math.floor(100 * Math.pow(1000, (n - 1) / 99) + 0.5);
}

function grantRandomItem(user, stats, channel) {
  const roll = Math.random();
  let rarity;
  if (roll < 0.5) rarity = 'common';
  else if (roll < 0.9) rarity = 'rare';
  else if (roll < 0.99) rarity = 'epic';
  else if (roll < 0.999) rarity = 'legendary';
  else if (roll < 0.9998) rarity = 'mythical';
  else rarity = 'godly';
  const pool = ITEMS_BY_RARITY[rarity] || [];
  if (pool.length === 0) return;
  const item = pool[Math.floor(Math.random() * pool.length)];
  stats.inventory = stats.inventory || [];
  stats.inventory.push({
    id: item.id,
    amount: 1,
    emoji: item.emoji,
    name: item.name,
    image: item.image,
  });
  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${user} found ${item.emoji || ''} ${item.name}!`)
    );
  channel
    .send({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 })
    .catch(() => {});
}

async function addXp(user, amount, client, chatMasteryAmount = 0) {
  const stats = userStats[user.id] || {};
  stats.level = Number.isFinite(stats.level) && stats.level > 0 ? stats.level : 1;
  stats.xp = Number.isFinite(stats.xp) ? stats.xp : 0;
  stats.total_xp = Number.isFinite(stats.total_xp) ? stats.total_xp : 0;
  stats.coins = Number.isFinite(stats.coins) ? stats.coins : 0;
  stats.diamonds = Number.isFinite(stats.diamonds) ? stats.diamonds : 0;
  stats.deluxe_coins = Number.isFinite(stats.deluxe_coins) ? stats.deluxe_coins : 0;
  stats.chat_mastery_level = Number.isFinite(stats.chat_mastery_level)
    ? stats.chat_mastery_level
    : 0;
  stats.chat_mastery_xp = Number.isFinite(stats.chat_mastery_xp)
    ? stats.chat_mastery_xp
    : 0;
  stats.inventory = Array.isArray(stats.inventory) ? stats.inventory : [];
  stats.xp_boost_until = Number.isFinite(stats.xp_boost_until)
    ? stats.xp_boost_until
    : 0;
  if (stats.xp_boost_until && stats.xp_boost_until <= Date.now()) {
    stats.xp_boost_until = 0;
  }

  let xpGain = amount;
  if (stats.xp_boost_until && stats.xp_boost_until > Date.now()) {
    xpGain *= 2;
  }
  xpGain = Math.floor(xpGain);
  stats.xp += xpGain;
  stats.total_xp += xpGain;
  const chatXpGain = Math.max(0, Math.floor(chatMasteryAmount));
  stats.chat_mastery_xp += chatXpGain;
  let prev = stats.level;
  const prevMastery = stats.chat_mastery_level;
  while (stats.level < MAX_LEVEL && stats.xp >= xpNeeded(stats.level)) {
    stats.xp -= xpNeeded(stats.level);
    stats.level += 1;
  }
  while (
    stats.chat_mastery_level < 100 &&
    stats.chat_mastery_xp >= chatMasteryXpNeeded(stats.chat_mastery_level + 1)
  ) {
    stats.chat_mastery_xp -= chatMasteryXpNeeded(
      stats.chat_mastery_level + 1,
    );
    stats.chat_mastery_level += 1;
  }
  if (stats.chat_mastery_level >= 100) stats.chat_mastery_xp = 0;
  if (prevMastery < 100 && stats.chat_mastery_level >= 100) {
    stats.deluxe_coins = (stats.deluxe_coins || 0) + 1000;
    stats.diamonds = (stats.diamonds || 0) + 1000;
    stats.coins = (stats.coins || 0) + 1000000;
    const xpSoda = ITEMS.XPSoda;
    const entry = stats.inventory.find(i => i.id === 'XPSoda');
    if (entry) entry.amount += 10;
    else
      stats.inventory.push({
        id: xpSoda.id,
        name: xpSoda.name,
        emoji: xpSoda.emoji,
        image: xpSoda.image,
        amount: 10,
      });
    try {
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Chat Mastery Maxed!\nYou reached level 100 chat mastery and received:\n-# 1000 Deluxe Coins <:CRDeluxeCoin:1405595587780280382>\n-# 1000 Diamonds <:CRDiamond:1405595593069432912>\n-# 1M Coins <:CRCoin:1405595571141480570>\n-# 10 XP Soda ${xpSoda.emoji}`,
          ),
        );
      await user.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch {}
  }
  if (stats.level >= MAX_LEVEL) stats.xp = 0;
  userStats[user.id] = stats;
  if (stats.level > prev) {
    if (stats.chat_mastery_level >= 90) {
      for (let lvl = prev + 1; lvl <= stats.level; lvl++) {
        stats.diamonds += lvl;
      }
    }
    const channel = client.channels.cache.get(levelUpChannelId);
    if (channel) {
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Leveled up**\n${user} leveled from ${prev} to ${stats.level}`,
          ),
        );
      channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
  saveData();
}

function addCoins(user, amount) {
  const stats = userStats[user.id] || { level:1, xp:0, total_xp:0, coins:0, diamonds:0, deluxe_coins:0 };
  amount = applyCoinBoost(stats, amount);
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
  setSafeTimeout(async () => {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;
      const member = await guild.members.fetch(userId);
      await member.roles.remove(roleId);
    } catch (err) {}
  }, delay);
}

loadData();

const resources = {
  userStats,
  userCardSettings,
  commandBans,
  shop,
  saveData,
  xpNeeded,
  addXp,
  defaultColor,
  defaultBackground,
  scheduleRole,
  pendingRequests,
  chatMasteryXpNeeded,
};

const client = new Client({
  intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});
resources.client = client;
client.setMaxListeners(50);
setupErrorHandling(client, '1383481711651721307');

// Wrap interactionCreate listeners so banned interactions don't trigger other handlers
const originalOn = client.on.bind(client);
client.on = function(event, listener) {
  if (event === 'interactionCreate') {
    return originalOn(event, async interaction => {
      if (interaction.banned) return;
      return listener(interaction);
    });
  }
  return originalOn(event, listener);
};

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await useItemCommand.restoreActiveItemTimers(client, resources);

    client.on('interactionCreate', async interaction => {
      try {
        const banUntil = commandBans[interaction.user.id];
        if (banUntil) {
          if (banUntil > Date.now()) {
            interaction.banned = true;
            if (interaction.isRepliable()) {
              const container = new ContainerBuilder()
                .setAccentColor(0xff0000)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `${interaction.user} you are currently being banned, you will be unbanned <t:${Math.floor(banUntil / 1000)}:R>!`,
                  ),
                );
              await interaction.reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
              });
            }
            return;
          }
          delete commandBans[interaction.user.id];
          saveData();
        }
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
        } catch (error) {
          if (error.code !== 10062) {
            console.error(error);
            client.emit('error', error);
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
    huntCommand.setup(client, resources);
    digCommand.setup(client, resources);
    begCommand.setup(client, resources);
    myCosmeticCommand.setup(client, resources);
    masteryCommand.setup(client, resources);
    timedRoles.forEach(r => scheduleRole(r.user_id, r.guild_id, r.role_id, r.expires_at));

      const cshChannelId = '1413532331972497509';
      const cshTimestamp = Math.floor(Date.UTC(2025, 10, 1) / 1000);
      try {
        const channel = await client.channels.fetch(cshChannelId);
        if (channel) {
          const message1 = [
            '## Holly Jolly Hunt 2025',
            "Something’s afoot at the North Pole… 🐾❄️ **On December 1st 2025** 📅, report to Ć̵̘R̴̞͌E̶̞͉͛A̷̘̅̌T̸̺̔O̶̤͌̕R̴̨̯̓͑ for a trail of riddles 🧩, secret codes 🔐, and festive red herrings🎄. Crack the case🕵️‍♂️, outsmart rival teams 🧠, and **uncover Santa’s missing cargo 🛷 before the clock strikes tinsel.**",
          ].join('\n');
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('CSH')
              .setPlaceholder('Team registration time not yet')
              .setDisabled(true)
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('placeholder')
                  .setValue('placeholder'),
              ),
          );
          let existing = null;
          if (cshMessageId) {
            existing = await channel.messages
              .fetch(cshMessageId)
              .catch(() => null);
          }
          if (!existing) {
            const headerSection = new SectionBuilder()
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL('https://i.ibb.co/rfLBNZJC/45da76a2-9fe3-4b98-96cb-614185f87d41.png'),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(message1),
                new TextDisplayBuilder().setContent('-# This is bot scavenger hunt, so all puzzle will be inside bot features and it will not be held outside.'),
              );
            const container = new ContainerBuilder()
              .setAccentColor(0x00ffff)
              .addSectionComponents(headerSection)
              .addSeparatorComponents(new SeparatorBuilder())
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('You will participate in a team, max 2 per team. If not enough you will be disqualified!'),
                new TextDisplayBuilder().setContent(`-# Team registration start <t:${cshTimestamp}:R>`),
              )
              .addActionRowComponents(row);
            const sent = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            cshMessageId = sent.id;
            saveData();
          }
        }
      } catch (error) {
        console.error('Failed to send CSH countdown message', error);
      }

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
  try {
  if (message.author.bot) return;
  const content = message.content.trim();
  const lowerContent = content.toLowerCase();
  const isPrefixCommand = lowerContent.startsWith('a.');
  const isPingCommand = message.content === '!ping';
  const isCommand = isPrefixCommand || isPingCommand;

  if (isCommand) {
    const banUntil = commandBans[message.author.id];
    if (banUntil) {
      if (banUntil > Date.now()) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${message.author} you are currently being banned, you will be unbanned <t:${Math.floor(banUntil / 1000)}:R>!`,
            ),
          );
        await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        return;
      }
      delete commandBans[message.author.id];
      saveData();
    }
  }
  const stats = userStats[message.author.id] || {
    level: 1,
    xp: 0,
    total_xp: 0,
    coins: 0,
    diamonds: 0,
    deluxe_coins: 0,
  };
  stats.chat_messages = (stats.chat_messages || 0) + 1;
  userStats[message.author.id] = stats;

  const messageXp = Math.floor(Math.random() * 10) + 1;
  await addXp(message.author, messageXp, client, messageXp);
  addCoins(message.author, Math.floor(Math.random() * 100) + 1);

  const updated = userStats[message.author.id];
  if (
    updated.chat_mastery_level >= 40 &&
    updated.chat_messages % 100 === 0
  ) {
    const d = Math.floor(Math.random() * 10) + 1;
    updated.diamonds = (updated.diamonds || 0) + d;
    const container = new ContainerBuilder()
      .setAccentColor(0xffffff)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${message.author} earned ${d} diamonds!`,
        ),
      );
    message.channel
      .send({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 })
      .catch(() => {});
  }
  if (updated.chat_mastery_level >= 60 && Math.random() < 0.01) {
    grantRandomItem(message.author, updated, message.channel);
  }
  saveData();

  if (!isCommand) return;

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
    await message.delete().catch(() => {});
    return;
  }

  if (isPrefixCommand) {
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
    } else if (lowerAfter === 'hunt') {
      await huntCommand.sendHunt(
        message.author,
        message.channel.send.bind(message.channel),
        resources,
      );
    } else if (lowerAfter === 'dig') {
      await digCommand.sendDig(
        message.author,
        message.channel.send.bind(message.channel),
        resources,
      );
    } else if (lowerAfter === 'beg') {
      await begCommand.sendBeg(
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
    if (isPingCommand) {
      message.channel.send({
        components: [
          new ActionRowBuilder().addComponents(
            new TextDisplayBuilder().setContent('Pong!'),
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  } catch (error) {
    client.emit('error', error);
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
      if (user) {
        const xpGain = minutes * 10;
        if (xpGain > 0) addXp(user, xpGain, client, xpGain);
        const stats = userStats[user.id] || {};
        if (stats.chat_mastery_level >= 20) {
          const hours = Math.floor(duration / 3600000);
          for (let i = 0; i < hours; i++) {
            stats.diamonds = (stats.diamonds || 0) + Math.floor(Math.random() * 91) + 10;
          }
        }
        if (stats.chat_mastery_level >= 60 && Math.random() < 0.01) {
          const channel = client.channels.cache.get(levelUpChannelId);
          if (channel) grantRandomItem(user.user || user, stats, channel);
        }
        userStats[user.id] = stats;
        saveData();
      }
    }
  }
});

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN not set');
client.login(token);
