const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const { renderShopMedia } = require('../shopMedia');

// Currently only a coin shop with no items
const SHOP_ITEMS = {
  coin: [],
};

const shopStates = new Map();

async function sendShop(user, send, resources, state = { page: 1, type: 'coin' }) {
  const items = SHOP_ITEMS[state.type] || [];
  const perPage = 6;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.min(Math.max(state.page, 1), pages);
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  const buffer = await renderShopMedia(pageItems);
  const attachment = new AttachmentBuilder(buffer, { name: 'shop.png' });

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL('https://i.ibb.co/KcX5DGwz/Someone-idle.gif'),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## Mr Someone's Shop"),
      new TextDisplayBuilder().setContent(
        "-# Welcome!\n<:Comingstock:1405083859254771802> Shop will have new stock in 0s\n* Page " +
          page +
          '/' +
          pages,
      ),
    );

  const mediaGallery = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL('attachment://shop.png'),
  );

  const pageSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-page')
    .setPlaceholder('Page')
    .addOptions(Array.from({ length: pages }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })));

  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-type')
    .setPlaceholder('Shop type')
    .addOptions([{ label: 'Coin Shop', value: 'coin', emoji: '<:Coin:1404348210146967612>' }]);

  const buttons = [];
  for (let i = 0; i < perPage; i++) {
    const item = pageItems[i];
    const btn = new ButtonBuilder()
      .setCustomId(`shop-buy-${i}`)
      .setLabel(item ? item.name : '???')
      .setEmoji(item ? item.emoji : '❓')
      .setStyle(ButtonStyle.Secondary);
    if (!item) btn.setDisabled(true);
    buttons.push(btn);
  }

  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(headerSection)
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(mediaGallery)
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(pageSelect),
      new ActionRowBuilder().addComponents(typeSelect),
      new ActionRowBuilder().addComponents(...buttons.slice(0, 3)),
      new ActionRowBuilder().addComponents(...buttons.slice(3)),
    );

  const message = await send({
    files: [attachment],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  shopStates.set(message.id, { userId: user.id, page, type: state.type });
  return message;
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Shop commands')
    .addSubcommand(sc => sc.setName('view').setDescription('View the shop'));
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'shop') return;
    if (interaction.options.getSubcommand() !== 'view') return;
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
    await sendShop(interaction.user, interaction.editReply.bind(interaction), resources);
  });

  client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu()) {
      const state = shopStates.get(interaction.message.id);
      if (!state || interaction.user.id !== state.userId) return;
      if (interaction.customId === 'shop-page') {
        state.page = parseInt(interaction.values[0], 10);
      } else if (interaction.customId === 'shop-type') {
        state.type = interaction.values[0];
        state.page = 1;
      } else {
        return;
      }
      await sendShop(interaction.user, interaction.update.bind(interaction), resources, state);
    } else if (interaction.isButton() && interaction.customId.startsWith('shop-buy-')) {
      const state = shopStates.get(interaction.message.id);
      if (!state || interaction.user.id !== state.userId) return;
      const index = parseInt(interaction.customId.split('-')[2], 10);
      const items = SHOP_ITEMS[state.type] || [];
      const start = (state.page - 1) * 6;
      const item = items[start + index];
      if (!item) {
        await interaction.reply({ content: 'Item not available.', ephemeral: true });
        return;
      }
      const stats = resources.userStats[interaction.user.id] || { coins: 0 };
      if ((stats.coins || 0) < item.price) {
        await interaction.reply({ content: 'Not enough coins.', ephemeral: true });
        return;
      }
      stats.coins -= item.price;
      resources.userStats[interaction.user.id] = stats;
      resources.saveData();
      await interaction.reply({
        content: `You bought ${item.name} for ${item.price} coins.`,
        ephemeral: true,
      });
    }
  });
}

module.exports = { setup, sendShop };
