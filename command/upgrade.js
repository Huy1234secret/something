const {
  MessageFlags,
  ButtonStyle,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('@discordjs/builders');
const { ITEMS } = require('../items');
const { normalizeInventory, formatNumber } = require('../utils');

const UPGRADE_CHANNEL_ID = '1397591005091467395';
const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
const CRAFT_PLACEHOLDER = "Oops, we don't have any item currently craftable";
const UPGRADE_SELECT_ID = 'upgrade:select';
const UPGRADE_CONFIRM_PREFIX = 'upgrade:confirm:';

const UPGRADE_CONFIG = {
  HuntingRifleT1: {
    nextId: 'HuntingRifleT2',
    coinCost: 1_000_000,
    xpCost: 10_000,
  },
  HuntingRifleT2: {
    nextId: 'HuntingRifleT3',
    coinCost: 49_000_000,
    xpCost: 200_000,
  },
};

function buildMainContainer() {
  const craftButton = new ButtonBuilder()
    .setCustomId('upgrade:craft')
    .setLabel('Craft')
    .setStyle(ButtonStyle.Success);
  const upgradeButton = new ButtonBuilder()
    .setCustomId('upgrade:upgrade')
    .setLabel('Upgrade')
    .setStyle(ButtonStyle.Primary);

  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '## 🛠️ Crafting n Upgrading 🎨\n* Here you can either upgrade or craft a tool you like!',
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(craftButton, upgradeButton));
}

function buildCraftContainer() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('upgrade:craft-select')
    .setPlaceholder(CRAFT_PLACEHOLDER)
    .setDisabled(true);

  return [
    new ContainerBuilder()
      .setAccentColor(0xa5d6a7)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## 🛠️ What item you wanna CRAFT?'),
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(select)),
  ];
}

function countItem(stats, itemId) {
  return (stats.inventory || []).reduce((sum, entry) => {
    if (!entry || entry.id !== itemId) return sum;
    let amount = 0;
    if (Number.isFinite(entry.amount) && entry.amount > 0) amount = entry.amount;
    else if (typeof entry.durability === 'number') amount = 1;
    return sum + amount;
  }, 0);
}

function buildUpgradeSelect(stats) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(UPGRADE_SELECT_ID)
    .setPlaceholder('Item List 1');

  for (const itemId of Object.keys(UPGRADE_CONFIG)) {
    const item = ITEMS[itemId];
    if (!item) continue;
    const amount = countItem(stats, itemId);
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(item.name)
      .setValue(itemId)
      .setDescription(`You have ${formatNumber(amount)}`);
    if (item.emoji) option.setEmoji(item.emoji);
    select.addOptions(option);
  }

  return select;
}

function buildUpgradeInitialResponse(stats) {
  const select = buildUpgradeSelect(stats);
  return [
    new ContainerBuilder()
      .setAccentColor(0x90caf9)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## 🛠️ What item you wanna UPGRADE?'),
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(select)),
  ];
}

function formatUpgradeCost(coinCost, xpCost) {
  return `* Upgrade Cost: ${formatNumber(coinCost)} Coins ${COIN_EMOJI}, ${formatNumber(xpCost)} Chat XP`;
}

function applyChatXpLoss(stats, amount, xpNeeded) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  stats.level = Number.isFinite(stats.level) && stats.level > 0 ? Math.floor(stats.level) : 1;
  stats.xp = Number.isFinite(stats.xp) && stats.xp >= 0 ? Math.floor(stats.xp) : 0;
  stats.total_xp = Number.isFinite(stats.total_xp) && stats.total_xp >= 0 ? Math.floor(stats.total_xp) : 0;

  let remaining = Math.max(0, stats.total_xp - Math.floor(amount));
  stats.total_xp = remaining;
  let level = 1;
  let progress = remaining;
  while (level < 9999 && progress >= xpNeeded(level)) {
    progress -= xpNeeded(level);
    level += 1;
  }
  stats.level = Math.max(1, level);
  stats.xp = Math.max(0, progress);
}

function removeOneItem(stats, itemId) {
  const inventory = stats.inventory || [];
  const index = inventory.findIndex(entry => entry && entry.id === itemId);
  if (index === -1) return false;
  const entry = inventory[index];
  if (Number.isFinite(entry.amount) && entry.amount > 1 && typeof entry.durability !== 'number') {
    entry.amount -= 1;
  } else {
    inventory.splice(index, 1);
  }
  return true;
}

function addItem(stats, itemId) {
  const base = ITEMS[itemId];
  if (!base) return;
  stats.inventory = stats.inventory || [];
  if (typeof base.durability === 'number') {
    stats.inventory.push({ ...base, amount: 1 });
    return;
  }
  const existing = stats.inventory.find(entry => entry && entry.id === itemId);
  if (existing) existing.amount = (existing.amount || 0) + 1;
  else stats.inventory.push({ ...base, amount: 1 });
}

function buildUpgradeSelectedResponse(stats, selectedId, { notice } = {}) {
  const container = new ContainerBuilder().setAccentColor(0x90caf9);
  const config = UPGRADE_CONFIG[selectedId];
  const item = ITEMS[selectedId];
  const nextItem = config ? ITEMS[config.nextId] : null;
  const lines = [];
  if (item) {
    lines.push(`## ${item.emoji ? `${item.emoji} ` : ''}${item.name}`.trim());
  } else {
    lines.push('## Unknown Item');
  }
  if (config) {
    lines.push(formatUpgradeCost(config.coinCost, config.xpCost));
  } else {
    lines.push('* Upgrade Cost: N/A');
  }

  const coins = Number.isFinite(stats.coins) ? stats.coins : 0;
  const xp = Number.isFinite(stats.total_xp) ? stats.total_xp : 0;
  const owned = countItem(stats, selectedId);
  const meetsRequirements = Boolean(
    config && owned > 0 && coins >= config.coinCost && xp >= config.xpCost && nextItem,
  );
  if (!config) {
    lines.push('-# No further upgrades available.');
  } else if (!meetsRequirements) {
    lines.push("-# You didn't meet the UPGRADE requirement!");
  }
  if (notice) {
    lines.push(notice);
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
  container.addSeparatorComponents(new SeparatorBuilder());
  if (nextItem) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Next tier: ${nextItem.emoji ? `${nextItem.emoji} ` : ''}${nextItem.name}`.trim(),
      ),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Next tier: Not available'),
    );
  }

  const upgradeButton = new ButtonBuilder()
    .setCustomId(`${UPGRADE_CONFIRM_PREFIX}${selectedId}`)
    .setLabel('Upgrade!')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!meetsRequirements);

  const select = buildUpgradeSelect(stats);
  container
    .addActionRowComponents(new ActionRowBuilder().addComponents(upgradeButton))
    .addActionRowComponents(new ActionRowBuilder().addComponents(select));

  return [container];
}

function performUpgrade(stats, itemId, resources) {
  const config = UPGRADE_CONFIG[itemId];
  const nextId = config?.nextId;
  if (!config || !nextId) return { success: false, notice: null, nextSelection: itemId };
  const coins = Number.isFinite(stats.coins) ? stats.coins : 0;
  const xp = Number.isFinite(stats.total_xp) ? stats.total_xp : 0;
  const owned = countItem(stats, itemId);
  if (owned <= 0 || coins < config.coinCost || xp < config.xpCost) {
    return { success: false, notice: null, nextSelection: itemId };
  }
  const removed = removeOneItem(stats, itemId);
  if (!removed) {
    return { success: false, notice: null, nextSelection: itemId };
  }
  stats.coins = coins - config.coinCost;
  applyChatXpLoss(stats, config.xpCost, resources.xpNeeded);
  addItem(stats, nextId);
  if (stats.hunt_gun === itemId) {
    stats.hunt_gun = nextId;
  }
  normalizeInventory(stats);
  return { success: true, notice: '-# Upgrade successful!', nextSelection: nextId };
}

async function ensureUpgradeMessage(client, resources) {
  try {
    const channel = await client.channels.fetch(UPGRADE_CHANNEL_ID);
    if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) return;
    const messageId = resources.getUpgradeMessageId ? resources.getUpgradeMessageId() : null;
    if (messageId) {
      try {
        const message = await channel.messages.fetch(messageId);
        if (message && message.author.id === client.user.id) {
          await message.edit({ components: [buildMainContainer()] });
          return;
        }
      } catch (error) {
        if (error.code !== 10008) throw error;
      }
    }
    const sent = await channel.send({
      components: [buildMainContainer()],
      flags: MessageFlags.IsComponentsV2,
    });
    if (resources.setUpgradeMessageId) resources.setUpgradeMessageId(sent.id);
    if (resources.saveData) resources.saveData();
  } catch (error) {
    console.warn('Failed to ensure upgrade message:', error.message);
  }
}

function setup(client, resources) {
  if (!client || !resources) return;

  client.once('ready', () => {
    ensureUpgradeMessage(client, resources);
  });

  client.on('messageDelete', message => {
    try {
      const storedId = resources.getUpgradeMessageId ? resources.getUpgradeMessageId() : null;
      if (!storedId || !message) return;
      if (message.id !== storedId) return;
      ensureUpgradeMessage(client, resources);
    } catch (error) {
      console.warn('Failed to process upgrade message deletion:', error.message);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'upgrade:craft') {
          await interaction.reply({
            components: buildCraftContainer(),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return;
        }
        if (interaction.customId === 'upgrade:upgrade') {
          const stats = resources.userStats[interaction.user.id] || { inventory: [] };
          normalizeInventory(stats);
          resources.userStats[interaction.user.id] = stats;
          await interaction.reply({
            components: buildUpgradeInitialResponse(stats),
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return;
        }
        if (interaction.customId.startsWith(UPGRADE_CONFIRM_PREFIX)) {
          const itemId = interaction.customId.slice(UPGRADE_CONFIRM_PREFIX.length);
          const stats = resources.userStats[interaction.user.id] || { inventory: [] };
          normalizeInventory(stats);
          resources.userStats[interaction.user.id] = stats;
          const result = performUpgrade(stats, itemId, resources);
          resources.userStats[interaction.user.id] = stats;
          if (result.success && resources.saveData) resources.saveData();
          const nextSelection = result.success ? result.nextSelection : itemId;
          await interaction.update({
            components: buildUpgradeSelectedResponse(stats, nextSelection, {
              notice: result.notice,
            }),
          });
          return;
        }
      } else if (interaction.isStringSelectMenu() && interaction.customId === UPGRADE_SELECT_ID) {
        const selectedId = interaction.values[0];
        const stats = resources.userStats[interaction.user.id] || { inventory: [] };
        normalizeInventory(stats);
        resources.userStats[interaction.user.id] = stats;
        await interaction.update({
          components: buildUpgradeSelectedResponse(stats, selectedId),
        });
        return;
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, ensureUpgradeMessage };
