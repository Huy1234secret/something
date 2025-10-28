const {
  SlashCommandBuilder,
  MessageFlags,
  ButtonStyle,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require('@discordjs/builders');
const {
  listSkinnableItems,
  getSkinsForItem,
  equipSkin,
  unequipSkin,
  ownsSkin,
  getOwnedSkinCount,
  getItemDisplay,
  SKIN_RARITY_EMOJIS,
} = require('../skins');

const skinMessageState = new Map();

function resolveEmoji(raw, guild) {
  if (!raw || typeof raw !== 'string' || !guild) return raw || '';
  const match = raw.match(/^<a?:([\w~]+):(\d+)>$/);
  if (!match) return raw;
  const [, name, id] = match;
  const byId = guild.emojis.resolve(id);
  if (byId) return byId.toString();
  const byName = guild.emojis.cache.find(emoji =>
    emoji.name && emoji.name.toLowerCase() === name.toLowerCase(),
  );
  if (byName) return byName.toString();
  return raw;
}

function getSkinState(stats, itemId) {
  const store = stats.item_skins && typeof stats.item_skins === 'object'
    ? stats.item_skins
    : {};
  if (!store[itemId] || typeof store[itemId] !== 'object') store[itemId] = { owned: [], equipped: null };
  return store[itemId];
}

function buildSkinContainer(user, stats, itemId, guild) {
  const itemDefs = listSkinnableItems();
  const baseDef = itemDefs.find(def => def.id === itemId);
  const skins = getSkinsForItem(itemId);
  const ownedCount = getOwnedSkinCount(stats, itemId);
  const state = getSkinState(stats, itemId);
  const baseName = baseDef ? baseDef.name : itemId;
  const baseEmoji = baseDef ? resolveEmoji(baseDef.emoji, guild) : '';
  const display = getItemDisplay(
    stats,
    { id: itemId, name: baseName, emoji: baseEmoji },
    baseName,
    baseEmoji,
  );
  const displayEmoji = resolveEmoji(display.emoji, guild);

  const header = `${user}’s Skins\n* You owned ${ownedCount} / ${skins.length} skin for ${display.name} ${displayEmoji}`;

  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header))
    .addSeparatorComponents(new SeparatorBuilder());

  const ownedSkins = skins.filter(skin => ownsSkin(stats, itemId, skin.id));
  if (ownedSkins.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("You don't have any skin"),
    );
    return container;
  }

  ownedSkins.forEach(skin => {
    const rarityEmoji = resolveEmoji(SKIN_RARITY_EMOJIS[skin.rarity] || '', guild);
    const skinEmoji = resolveEmoji(skin.emoji, guild);
    const equipped = state.equipped === skin.id;
    const button = new ButtonBuilder()
      .setCustomId(`skin-toggle:${itemId}:${skin.id}`)
      .setLabel(equipped ? 'Unequip skin' : 'Equip skin')
      .setStyle(equipped ? ButtonStyle.Danger : ButtonStyle.Success);

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${skinEmoji} ${skin.name} ${rarityEmoji}`,
        ),
        new TextDisplayBuilder().setContent(`-# ${skin.description}`),
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(button))
      .addSeparatorComponents(new SeparatorBuilder());
  });

  return container;
}

async function sendSkinView(interaction, itemId, resources) {
  const stats = resources.userStats[interaction.user.id] || { inventory: [] };
  resources.userStats[interaction.user.id] = stats;
  const container = buildSkinContainer(interaction.user, stats, itemId, interaction.guild);
  const message = await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  skinMessageState.set(message.id, { userId: interaction.user.id, itemId });
}

async function sendSkinViewMessage(user, guild, send, resources, itemId) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  resources.userStats[user.id] = stats;
  const container = buildSkinContainer(user, stats, itemId, guild);
  const message = await send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  skinMessageState.set(message.id, { userId: user.id, itemId });
  return message;
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('my-skin')
    .setDescription('View and manage your item skins')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item to view skins for')
        .setAutocomplete(true)
        .setRequired(true),
    );

  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isAutocomplete() || interaction.commandName !== 'my-skin') return;
      const focused = interaction.options.getFocused().toLowerCase();
      const options = listSkinnableItems()
        .filter(def => def.name.toLowerCase().includes(focused))
        .map(def => {
          const emoji = resolveEmoji(def.emoji || '', interaction.guild);
          const name = [emoji, def.name].filter(Boolean).join(' ').trim();
          return { name: name || def.name, value: def.id };
        });
      await interaction.respond(options.slice(0, 25));
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'my-skin') return;
    try {
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      const itemId = interaction.options.getString('item');
      const available = listSkinnableItems();
      if (!available.some(def => def.id === itemId)) {
        await interaction.editReply({
          content: 'Unknown skinnable item.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await sendSkinView(interaction, itemId, resources);
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith('skin-toggle:')) return;
    try {
      const state = skinMessageState.get(interaction.message.id);
      if (!state || state.userId !== interaction.user.id) return;
      const [, itemId, skinId] = interaction.customId.split(':');
      const stats = resources.userStats[interaction.user.id] || { inventory: [] };
      resources.userStats[interaction.user.id] = stats;
      if (!ownsSkin(stats, itemId, skinId)) {
        await interaction.reply({
          content: 'You do not own this skin.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const skinState = getSkinState(stats, itemId);
      if (skinState.equipped === skinId) unequipSkin(stats, itemId);
      else equipSkin(stats, itemId, skinId);
      resources.saveData();
      const container = buildSkinContainer(interaction.user, stats, itemId, interaction.guild);
      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, sendSkinViewMessage, listSkinnableItems };

