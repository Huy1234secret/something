const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const ITEM_TYPES = ['Consumable', 'Material', 'Misc', 'Tool', 'Accessory', 'Upgrade', 'Weapon', 'Chest', 'All'];
const inventoryStates = new Map();

async function sendInventory(user, send, { userStats }, state = { page: 1, types: ['All'] }) {
  const stats = userStats[user.id] || { inventory: [] };
  const items = stats.inventory || [];
  const totalValue = items.reduce((sum, item) => sum + (item.value || 0) * (item.amount || 0), 0);
  const types = state.types.includes('All') ? ['All'] : state.types;
  const filtered = types.includes('All') ? items : items.filter(i => types.includes(i.type));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(Math.max(state.page, 1), pages);
  const start = (page - 1) * 10;
  const pageItems = filtered.slice(start, start + 10);

  let listContent;
  if (pageItems.length === 0) {
    listContent = '-# Nothing here';
  } else {
    listContent = pageItems
      .map(
        item =>
          `**${item.emoji} ${item.name}** ═ ${item.amount}\n<:reply1:1403665779404050562>Type: ${item.type}\n<:reply:1403665761825980456>Rarity: ${item.rarity}`,
      )
      .join('\n\n');
  }

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL()))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${user.username}'s Inventory\n* <:stars:1404723253200552009> Total Inventory Value: ${totalValue}`,
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
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(listText)
    .addSeparatorComponents(new SeparatorBuilder())
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
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
    await sendInventory(interaction.user, interaction.editReply.bind(interaction), resources);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    const state = inventoryStates.get(interaction.message.id);
    if (!state || interaction.user.id !== state.userId) return;
    if (interaction.customId === 'inventory-page') {
      state.page = parseInt(interaction.values[0], 10);
    } else if (interaction.customId === 'inventory-type') {
      state.types = interaction.values.includes('All') ? ['All'] : interaction.values;
      state.page = 1;
    } else {
      return;
    }
    await sendInventory(interaction.user, interaction.update.bind(interaction), resources, state);
  });
}

module.exports = { setup, sendInventory };
