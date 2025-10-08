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

function getSkinState(stats, itemId) {
  const store = stats.item_skins && typeof stats.item_skins === 'object'
    ? stats.item_skins
    : {};
  if (!store[itemId] || typeof store[itemId] !== 'object') store[itemId] = { owned: [], equipped: null };
  return store[itemId];
}

function buildSkinContainer(user, stats, itemId) {
  const itemDefs = listSkinnableItems();
  const baseDef = itemDefs.find(def => def.id === itemId);
  const skins = getSkinsForItem(itemId);
  const ownedCount = getOwnedSkinCount(stats, itemId);
  const state = getSkinState(stats, itemId);
  const baseName = baseDef ? baseDef.name : itemId;
  const baseEmoji = baseDef ? baseDef.emoji : '';
  const display = getItemDisplay(stats, { id: itemId, name: baseName, emoji: baseEmoji }, baseName, baseEmoji);

  const header = `${user}’s Skins\n* You owned ${ownedCount} / ${skins.length} skin for ${display.name} ${display.emoji}`;

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
    const rarityEmoji = SKIN_RARITY_EMOJIS[skin.rarity] || '';
    const equipped = state.equipped === skin.id;
    const button = new ButtonBuilder()
      .setCustomId(`skin-toggle:${itemId}:${skin.id}`)
      .setLabel(equipped ? 'Unequip skin' : 'Equip skin')
      .setStyle(equipped ? ButtonStyle.Danger : ButtonStyle.Success);

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${skin.emoji} ${skin.name} ${rarityEmoji}`,
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
  const container = buildSkinContainer(interaction.user, stats, itemId);
  const message = await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  skinMessageState.set(message.id, { userId: interaction.user.id, itemId });
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
        .map(def => ({ name: `${def.emoji || ''} ${def.name}`.trim(), value: def.id }));
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
      const container = buildSkinContainer(interaction.user, stats, itemId);
      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };

