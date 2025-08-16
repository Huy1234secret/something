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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { renderShopMedia } = require('../shopMedia');
const { renderDeluxeMedia } = require('../shopMediaDeluxe');
const { ITEMS } = require('../items');
const { normalizeInventory } = require('../utils');

// Currently coin and deluxe shops with no items
const SHOP_ITEMS = {
  coin: [ITEMS.Padlock, ITEMS.Landmine, ITEMS.TotemOfUndying],
  deluxe: [],
};

const shopStates = new Map();

async function sendShop(user, send, resources, state = { page: 1, type: 'coin' }) {
  const items = SHOP_ITEMS[state.type] || [];
  const perPage = 6;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.min(Math.max(state.page, 1), pages);
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  const buffer =
    state.type === 'deluxe'
      ? await renderDeluxeMedia(pageItems)
      : await renderShopMedia(pageItems);
  const attachment = new AttachmentBuilder(buffer, { name: 'shop.png' });

  const title =
    state.type === 'deluxe' ? "## Mr Luxury's Deluxe Shop" : "## Mr Someone's Shop";

  const tagline =
    state.type === 'deluxe' ? '-# Want to buy something BETTER?' : '-# Welcome!';

  const thumbURL =
    state.type === 'deluxe'
      ? 'https://i.ibb.co/jkZ2mwfw/Luxury-idle.gif'
      : 'https://i.ibb.co/KcX5DGwz/Someone-idle.gif';

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbURL))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(title),
      new TextDisplayBuilder().setContent(
        `${tagline}\n<:SBComingstock:1405083859254771802> Shop will have new stock in 0s\n* Page ${page}/${pages}`,
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
    .addOptions([
      { label: 'Coin Shop', value: 'coin', emoji: '<:CRCoin:1405595571141480570>' },
      { label: 'Deluxe Shop', value: 'deluxe', emoji: '<:CRDeluxeCoin:1405595587780280382>' },
    ]);

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
      await interaction.deferUpdate({ flags: MessageFlags.IsComponentsV2 });
      await sendShop(
        interaction.user,
        interaction.editReply.bind(interaction),
        resources,
        state,
      );
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('shop-buy-')) {
        const state = shopStates.get(interaction.message.id);
        if (!state || interaction.user.id !== state.userId) return;
        const index = parseInt(interaction.customId.split('-')[2], 10);
        const items = SHOP_ITEMS[state.type] || [];
        const start = (state.page - 1) * 6;
          const item = items[start + index];
          if (!item) {
            await interaction.reply({ content: 'Item not available.' });
            return;
          }
        const modal = new ModalBuilder()
          .setCustomId(`shop-buy-modal-${interaction.message.id}-${index}`)
          .setTitle('Buy Item');
        const input = new TextInputBuilder()
          .setCustomId('amount')
          .setLabel('How much you want to buy?')
          .setStyle(TextInputStyle.Short);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
      } else if (interaction.customId.startsWith('shop-confirm-')) {
        const [, , itemId, amountStr] = interaction.customId.split('-');
        const amount = parseInt(amountStr, 10);
        const coinEmoji = '<:CRCoin:1405595571141480570>';
        const item =
          Object.values(SHOP_ITEMS).flat().find(i => i.id === itemId) || ITEMS[itemId];
        if (!item) {
          await interaction.update({
            components: [new TextDisplayBuilder().setContent('Item not available.')],
          });
          return;
        }
        const stats = resources.userStats[interaction.user.id] || { coins: 0 };
        normalizeInventory(stats);
        const total = item.price * amount;
        if ((stats.coins || 0) < total) {
          const need = total - (stats.coins || 0);
          await interaction.update({
            components: [
              new TextDisplayBuilder().setContent(
                `You don't have enough coins. You need ${need} ${coinEmoji} more to purchase.`,
              ),
            ],
          });
          return;
        }
        stats.coins -= total;
        stats.inventory = stats.inventory || [];
        const base = ITEMS[item.id] || item;
        const existing = stats.inventory.find(i => i.id === item.id);
        if (existing) existing.amount = (existing.amount || 0) + amount;
        else stats.inventory.push({ ...base, amount });
        normalizeInventory(stats);
        resources.userStats[interaction.user.id] = stats;
        resources.saveData();
        const pending = resources.pendingRequests.get(interaction.user.id);
        if (pending) clearTimeout(pending.timer);
        resources.pendingRequests.delete(interaction.user.id);
        const container = new ContainerBuilder()
          .setAccentColor(0x00ff00)
          .addSectionComponents(
            new SectionBuilder()
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(
                  'https://i.ibb.co/wFRXx0gK/Someone-happy.gif',
                ),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Purchase Successfully'),
                new TextDisplayBuilder().setContent(
                  `Thanks for purchasing **×${amount} ${item.name} ${item.emoji}**`,
                ),
              ),
          );
        await interaction.update({ components: [container] });
      } else if (interaction.customId === 'shop-cancel') {
        const pending = resources.pendingRequests.get(interaction.user.id);
        if (pending) clearTimeout(pending.timer);
        resources.pendingRequests.delete(interaction.user.id);
        await interaction.deferUpdate();
        await interaction.deleteReply().catch(() => {});
      }
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('shop-buy-modal-')) {
      const parts = interaction.customId.split('-');
      const messageId = parts[3];
      const index = parseInt(parts[4], 10);
      const state = shopStates.get(messageId);
        if (!state || interaction.user.id !== state.userId) {
          await interaction.reply({
            components: [new TextDisplayBuilder().setContent('Purchase expired.')],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const items = SHOP_ITEMS[state.type] || [];
      const start = (state.page - 1) * 6;
      const item = items[start + index];
        if (!item) {
          await interaction.reply({
            components: [new TextDisplayBuilder().setContent('Item not available.')],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const amount = parseInt(interaction.fields.getTextInputValue('amount'), 10);
        if (isNaN(amount) || amount <= 0) {
          await interaction.reply({
            components: [new TextDisplayBuilder().setContent('Invalid amount.')],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const stats = resources.userStats[interaction.user.id] || { coins: 0 };
      const total = item.price * amount;
      const coinEmoji = '<:CRCoin:1405595571141480570>';
        if ((stats.coins || 0) < total) {
          const need = total - (stats.coins || 0);
          await interaction.reply({
            components: [
              new TextDisplayBuilder().setContent(
                `You don't have enough coins. You need ${need} ${coinEmoji} more to purchase.`,
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const buyBtn = new ButtonBuilder()
        .setCustomId(`shop-confirm-${item.id}-${amount}`)
        .setLabel('Buy')
        .setStyle(ButtonStyle.Success);
      const cancelBtn = new ButtonBuilder()
        .setCustomId('shop-cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Purchase Alert'),
          new TextDisplayBuilder().setContent(
            `* Hey ${interaction.user} you are purchasing **×${amount} ${item.name} ${item.emoji}** with ${total} ${coinEmoji}`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(buyBtn, cancelBtn));
        const reply = await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      const timer = setTimeout(async () => {
        const current = resources.pendingRequests.get(interaction.user.id);
        if (current && current.timer === timer) {
          resources.pendingRequests.delete(interaction.user.id);
          try {
            await interaction.editReply({
              components: [new TextDisplayBuilder().setContent('Purchase expired.')],
            });
          } catch {}
        }
      }, 30000);
      resources.pendingRequests.set(interaction.user.id, { timer, message: reply });
    }
  });
}

module.exports = { setup, sendShop };
