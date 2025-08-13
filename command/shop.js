const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

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

  const itemSections = [];
  for (let i = 0; i < perPage; i++) {
    const item = pageItems[i];
    const name = item ? item.name : '???';
    const price = item ? item.price : '???';
    const note = item ? item.note || '' : '';

    const section = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${name}**`),
      new TextDisplayBuilder().setContent(`Price: ${price}`),
      ...(note ? [new TextDisplayBuilder().setContent(note)] : []),
    );

    if (item && item.image) {
      section.setThumbnailAccessory(new ThumbnailBuilder().setURL(item.image));
    }

    itemSections.push(section);
  }

  const pageSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-page')
    .setPlaceholder('Page')
    .addOptions(
      Array.from({ length: pages }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
    );

  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-type')
    .setPlaceholder('Shop type')
    .addOptions([{ label: 'Coin Shop', value: 'coin', emoji: '<:Coin:1404348210146967612>' }]);

  const buttons = [];
  for (let i = 0; i < perPage; i++) {
    const item = pageItems[i];
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`shop-buy-${i}`)
        .setLabel(item ? item.name : '???')
        .setEmoji(item ? item.emoji : '❓')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## Mr Someone's Shop\n-# Welcome!"),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '<:Comingstock:1405083859254771802> Shop will have new stock in 0s',
      ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`* Page ${page}/${pages}`),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(...itemSections)
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(pageSelect),
      new ActionRowBuilder().addComponents(typeSelect),
      new ActionRowBuilder().addComponents(buttons[0], buttons[1], buttons[2]),
      new ActionRowBuilder().addComponents(buttons[3], buttons[4], buttons[5]),
    );

  const message = await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
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
        await interaction.reply({
          components: [new TextDisplayBuilder().setContent('Item not available.')],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }
      const stats = resources.userStats[interaction.user.id] || { coins: 0 };
      if ((stats.coins || 0) < item.price) {
        await interaction.reply({
          components: [new TextDisplayBuilder().setContent('Not enough coins.')],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }
      stats.coins -= item.price;
      resources.userStats[interaction.user.id] = stats;
      resources.saveData();
      await interaction.reply({
        components: [
          new TextDisplayBuilder().setContent(
            `You bought ${item.name} for ${item.price} coins.`,
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }
  });
}

module.exports = { setup, sendShop };

