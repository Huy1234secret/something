const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('@discordjs/builders');
const { normalizeInventory, getInventoryCount, MAX_ITEMS } = require('../utils');
const { getItemDisplay } = require('../skins');

const ITEM_TYPES = [
  'Consumable',
  'Equipment',
  'Tool',
  'Container',
  'Sellable',
  'Material',
  'Collectible',
  'Cosmetic',
  'Quest',
  'ADMIN',
  'All',
];
const RARITY_EMOJIS = {
  Common: '<:SBRCommon:1409932856762826862>',
  Rare: '<:SBRRare:1409932954037387324>',
  Epic: '<:SBREpic:1409933003269996674>',
  Legendary: '<a:SBRLegendary:1409933036568449105>',
  Mythical: '<a:SBRMythical:1409933097176268902>',
  Godly: '<a:SBRGodly:1409933130793750548>',
  Prismatic: '<a:SBRPrismatic:1409933176276521010>',
  Secret: '<a:SBRSecret:1409933447220297791>',
};
const inventoryStates = new Map();

async function sendInventory(user, send, { userStats, saveData }, state = { page: 1, types: ['All'] }) {
  const stats = userStats[user.id] || { inventory: [] };
  normalizeInventory(stats);
  userStats[user.id] = stats;
  if (saveData) saveData();
  const items = stats.inventory || [];
  const totalValue = items.reduce((sum, item) => sum + (item.value || 0) * (item.amount || 0), 0);
  const count = getInventoryCount(stats);
  const types = state.types.includes('All') ? ['All'] : state.types;
  const filtered = types.includes('All')
    ? items
    : items.filter(i => i.types && i.types.some(t => types.includes(t)));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(Math.max(state.page, 1), pages);
  const start = (page - 1) * 10;
  const pageItems = filtered.slice(start, start + 10);

  let listContent;
  if (pageItems.length === 0) {
    listContent = '-# Nothing here';
  } else {
    listContent = pageItems
      .map(item => {
        const display = getItemDisplay(stats, item, item.name, item.emoji);
        const emoji = display.emoji || item.emoji;
        const name = display.name || item.name;
        return `**${emoji} ${name}** ═ ${item.amount}\n<:SBreply1:1403665779404050562>Type: ${
          (item.types || []).join(', ')
        }\n<:SBreply:1403665761825980456>Rarity: ${
          RARITY_EMOJIS[item.rarity] || ''
        } ${item.rarity}`;
      })
      .join('\n\n');
  }

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL()))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${user.username}'s Inventory\n* <:SBstars:1404723253200552009> Total Inventory Value: ${totalValue}\n* Capacity: ${count} / ${MAX_ITEMS}`,
      ),
    );

  const listText = new TextDisplayBuilder().setContent(listContent);

  const pageSelect = new StringSelectMenuBuilder()
    .setCustomId('inventory-page')
    .setPlaceholder('Page')
    .addOptions(
      Array.from({ length: pages }, (_, i) => ({
        label: `${i + 1}`,
        value: `${i + 1}`,
      })),
    );

  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('inventory-type')
    .setPlaceholder('Item Type')
    .setMinValues(1)
    .setMaxValues(ITEM_TYPES.length)
    .addOptions(
      ITEM_TYPES.map(t => ({
        label: t,
        value: t,
        default: types.includes(t),
      })),
    );

  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(headerSection)
    .addTextDisplayComponents(listText)
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(pageSelect),
      new ActionRowBuilder().addComponents(typeSelect),
    );

  const message = await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  inventoryStates.set(message.id, { userId: user.id, page, types });
  return message;
}

function setup(client, resources) {
  const command = new SlashCommandBuilder().setName('inventory').setDescription('Show your inventory');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'inventory') return;
    try {
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      await sendInventory(
        interaction.user,
        interaction.editReply.bind(interaction),
        resources,
      );
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    const state = inventoryStates.get(interaction.message.id);
    if (!state || interaction.user.id !== state.userId) return;
    try {
      if (interaction.customId === 'inventory-page') {
        state.page = parseInt(interaction.values[0], 10);
      } else if (interaction.customId === 'inventory-type') {
        state.types = interaction.values.includes('All') ? ['All'] : interaction.values;
        state.page = 1;
      } else {
        return;
      }
      await sendInventory(
        interaction.user,
        interaction.update.bind(interaction),
        resources,
        state,
      );
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, sendInventory };
