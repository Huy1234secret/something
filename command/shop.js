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
  StringSelectMenuOptionBuilder,
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
const {
  normalizeInventory,
  getInventoryCount,
  MAX_ITEMS,
  alertInventoryFull,
} = require('../utils');

// Currently coin and deluxe shops with no items
const SHOP_ITEMS = {
  coin: [
    ITEMS.Padlock,
    ITEMS.Landmine,
    ITEMS.SeraphicHeart,
    ITEMS.WheatSeed,
    ITEMS.WateringCan,
    ITEMS.HarvestScythe,
    ITEMS.BulletBox,
    ITEMS.HuntingRifleT1,
    ITEMS.Shovel,
  ],
  deluxe: [ITEMS.DiamondBag, ITEMS.DiamondCrate, ITEMS.DiamondChest],
};

const shopStates = new Map();

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1,
        );
    }
  }
  return matrix[a.length][b.length];
}

function findClosestItemId(query) {
  let closest = null;
  let min = Infinity;
  const lower = query.toLowerCase();
  for (const id of Object.keys(ITEMS)) {
    const dist = levenshtein(lower, id.toLowerCase());
    if (dist < min) {
      min = dist;
      closest = id;
    }
  }
  return closest;
}

async function sendMarket(user, send, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  normalizeInventory(stats);
  const sellable = (stats.inventory || []).filter(
    i => (ITEMS[i.id] || {}).sellPrice,
  );
  const select = new StringSelectMenuBuilder()
    .setCustomId('market-sell-select')
    .setPlaceholder('Item to sell');
  let showOther = false;
  if (sellable.length) {
    let options = sellable.map(item => {
      const match = /<(a?):(\w+):(\d+)>/.exec(item.emoji);
      return {
        label: `${item.name} - ${item.amount}`,
        value: item.id,
        emoji: match
          ? { id: match[3], name: match[2], animated: Boolean(match[1]) }
          : undefined,
      };
    });
    if (options.length >= 24) {
      options = options.slice(0, 24);
      options.push(
        new StringSelectMenuOptionBuilder().setLabel('Other').setValue('other'),
      );
      showOther = true;
    }
    select.addOptions(options);
  } else {
    select
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Nothing to sell')
          .setValue('none'),
      )
      .setPlaceholder('Nothing to sell')
      .setDisabled(true);
  }
  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-type')
    .setPlaceholder('Shop type')
    .addOptions([
      { label: 'Coin Shop', value: 'coin', emoji: '<:CRCoin:1405595571141480570>' },
      { label: 'Deluxe Shop', value: 'deluxe', emoji: '<:CRDeluxeCoin:1405595587780280382>' },
      {
        label: 'Market',
        value: 'market',
        emoji: '<:SBMarket:1408156436789461165>',
        default: true,
      },
    ]);
  const container = new ContainerBuilder()
    .setAccentColor(0x006400)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Market'),
      new TextDisplayBuilder().setContent('* Here you can sell your sellable items!'),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(select));
  if (showOther) {
    const otherBtn = new ButtonBuilder()
      .setCustomId('market-sell-other')
      .setLabel('Other')
      .setStyle(ButtonStyle.Secondary);
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(otherBtn),
    );
  }
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(typeSelect));
  const message = await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  shopStates.set(message.id, { userId: user.id, type: 'market' });
  return message;
}

async function sendShop(user, send, resources, state = { page: 1, type: 'coin' }) {
  if (state.type === 'market') {
    return sendMarket(user, send, resources);
  }
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
      { label: 'Market', value: 'market', emoji: '<:SBMarket:1408156436789461165>' },
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
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'shop') return;
      if (interaction.options.getSubcommand() !== 'view') return;
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      await sendShop(interaction.user, interaction.editReply.bind(interaction), resources);
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isStringSelectMenu()) {
      const state = shopStates.get(interaction.message.id);
      if (!state || interaction.user.id !== state.userId) return;
      if (interaction.customId === 'shop-page') {
        state.page = parseInt(interaction.values[0], 10);
        await interaction.deferUpdate({ flags: MessageFlags.IsComponentsV2 });
        await sendShop(
          interaction.user,
          interaction.editReply.bind(interaction),
          resources,
          state,
        );
      } else if (interaction.customId === 'shop-type') {
        state.type = interaction.values[0];
        state.page = 1;
        await interaction.deferUpdate({ flags: MessageFlags.IsComponentsV2 });
        await sendShop(
          interaction.user,
          interaction.editReply.bind(interaction),
          resources,
          state,
        );
      } else if (interaction.customId === 'market-sell-select') {
        const choice = interaction.values[0];
        if (choice === 'other') {
          const modal = new ModalBuilder()
            .setCustomId(`market-sell-other-modal-${interaction.message.id}`)
            .setTitle('Sell Item');
          const itemInput = new TextInputBuilder()
            .setCustomId('item')
            .setLabel('Item ID')
            .setStyle(TextInputStyle.Short);
          const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Amount')
            .setStyle(TextInputStyle.Short);
          modal.addComponents(
            new ActionRowBuilder().addComponents(itemInput),
            new ActionRowBuilder().addComponents(amountInput),
          );
          await interaction.showModal(modal);
        } else {
          const stats = resources.userStats[state.userId] || { inventory: [] };
          const item = (stats.inventory || []).find(i => i.id === choice) || ITEMS[choice];
          const modal = new ModalBuilder()
            .setCustomId(`market-sell-modal-${interaction.message.id}-${choice}`)
            .setTitle('Sell Item');
          const input = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('How many?')
            .setPlaceholder(`You currently have ${item ? item.amount || 0 : 0}`)
            .setStyle(TextInputStyle.Short);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
        }
      } else {
        return;
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === 'market-sell-other') {
        const state = shopStates.get(interaction.message.id);
        if (!state || interaction.user.id !== state.userId) return;
        const modal = new ModalBuilder()
          .setCustomId(`market-sell-other-modal-${interaction.message.id}`)
          .setTitle('Sell Item');
        const itemInput = new TextInputBuilder()
          .setCustomId('item')
          .setLabel('Item ID')
          .setStyle(TextInputStyle.Short);
        const amountInput = new TextInputBuilder()
          .setCustomId('amount')
          .setLabel('Amount')
          .setStyle(TextInputStyle.Short);
        modal.addComponents(
          new ActionRowBuilder().addComponents(itemInput),
          new ActionRowBuilder().addComponents(amountInput),
        );
        await interaction.showModal(modal);
      } else if (interaction.customId.startsWith('shop-buy-')) {
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
        const state = shopStates.get(interaction.message.id);
        if (!state || interaction.user.id !== state.userId) return;
        const coinEmoji =
          state.type === 'deluxe'
            ? '<:CRDeluxeCoin:1405595587780280382>'
            : '<:CRCoin:1405595571141480570>';
        const currency = state.type === 'deluxe' ? 'deluxe_coins' : 'coins';
        const item =
          Object.values(SHOP_ITEMS).flat().find(i => i.id === itemId) || ITEMS[itemId];
        if (!item) {
          await interaction.update({
            components: [
              new ActionRowBuilder().addComponents(
                new TextDisplayBuilder().setContent('Item not available.'),
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
        const stats =
          resources.userStats[interaction.user.id] || { coins: 0, deluxe_coins: 0 };
        normalizeInventory(stats);
        const total = item.price * amount;
        if ((stats[currency] || 0) < total) {
          const need = total - (stats[currency] || 0);
          await interaction.update({
            components: [
              new ActionRowBuilder().addComponents(
                new TextDisplayBuilder().setContent(
                  `You don't have enough coins. You need ${need} ${coinEmoji} more to purchase.`,
                ),
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
        if (getInventoryCount(stats) + amount > MAX_ITEMS) {
          await interaction
            .deferUpdate({ flags: MessageFlags.IsComponentsV2 })
            .catch(() => {});
          alertInventoryFull(interaction, interaction.user, stats, amount);
          return;
        }
        stats[currency] = (stats[currency] || 0) - total;
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
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else if (interaction.customId === 'shop-cancel') {
        const pending = resources.pendingRequests.get(interaction.user.id);
        if (pending) clearTimeout(pending.timer);
        resources.pendingRequests.delete(interaction.user.id);
        await interaction.deferUpdate();
        await interaction.deleteReply().catch(() => {});
      } else if (interaction.customId.startsWith('market-confirm-')) {
        const [, , messageId, itemId, amountStr, totalStr] = interaction.customId.split('-');
        const amount = parseInt(amountStr, 10);
        const total = parseInt(totalStr, 10);
        const coinEmoji = '<:CRCoin:1405595571141480570>';
        const stats = resources.userStats[interaction.user.id] || {
          coins: 0,
          inventory: [],
        };
        normalizeInventory(stats);
        const entry = (stats.inventory || []).find(i => i.id === itemId);
        if (!entry || entry.amount < amount) {
          await interaction.update({
            components: [
              new ActionRowBuilder().addComponents(
                new TextDisplayBuilder().setContent('Sale failed.'),
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
        entry.amount -= amount;
        if (entry.amount <= 0)
          stats.inventory = stats.inventory.filter(i => i.id !== itemId);
        stats.coins = (stats.coins || 0) + total;
        normalizeInventory(stats);
        resources.userStats[interaction.user.id] = stats;
        resources.saveData();
        const container = new ContainerBuilder()
          .setAccentColor(0x00ff00)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Sold ×${amount} ${entry.name} ${entry.emoji} for ${total} ${coinEmoji}.`,
            ),
          );
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        try {
          const message = await interaction.channel.messages.fetch(messageId);
          await sendMarket(interaction.user, message.edit.bind(message), resources);
        } catch {}
      } else if (interaction.customId === 'market-cancel') {
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
            components: [
              new ActionRowBuilder().addComponents(
                new TextDisplayBuilder().setContent('Purchase expired.'),
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const items = SHOP_ITEMS[state.type] || [];
      const start = (state.page - 1) * 6;
      const item = items[start + index];
        if (!item) {
          await interaction.reply({
            components: [
              new ActionRowBuilder().addComponents(
                new TextDisplayBuilder().setContent('Item not available.'),
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const amount = parseInt(interaction.fields.getTextInputValue('amount'), 10);
        if (isNaN(amount) || amount <= 0) {
          await interaction.reply({
            components: [
              new ActionRowBuilder().addComponents(
                new TextDisplayBuilder().setContent('Invalid amount.'),
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const stats =
        resources.userStats[interaction.user.id] || { coins: 0, deluxe_coins: 0 };
      const total = item.price * amount;
      const currencyField = state.type === 'deluxe' ? 'deluxe_coins' : 'coins';
      const coinEmoji =
        state.type === 'deluxe'
          ? '<:CRDeluxeCoin:1405595587780280382>'
          : '<:CRCoin:1405595571141480570>';
      if ((stats[currencyField] || 0) < total) {
        const need = total - (stats[currencyField] || 0);
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
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
        const reply = await interaction.fetchReply();
        shopStates.set(reply.id, { userId: interaction.user.id, type: state.type });
      const timer = setTimeout(async () => {
        const current = resources.pendingRequests.get(interaction.user.id);
        if (current && current.timer === timer) {
          resources.pendingRequests.delete(interaction.user.id);
          try {
            await interaction.editReply({
              components: [
                new ActionRowBuilder().addComponents(
                  new TextDisplayBuilder().setContent('Purchase expired.'),
                ),
              ],
            });
          } catch {}
        }
      }, 30000);
      resources.pendingRequests.set(interaction.user.id, { timer, message: reply });
    } else if (
      interaction.isModalSubmit() && interaction.customId.startsWith('market-sell-other-modal-')
    ) {
      const messageId = interaction.customId.split('-').slice(-1)[0];
      const state = shopStates.get(messageId);
      if (!state || interaction.user.id !== state.userId) {
        await interaction.reply({
          components: [
            new ActionRowBuilder().addComponents(
              new TextDisplayBuilder().setContent('Sell expired.'),
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const stats = resources.userStats[state.userId] || { inventory: [] };
      normalizeInventory(stats);
      const rawId = interaction.fields.getTextInputValue('item');
      const itemId = findClosestItemId(rawId);
      const entry = (stats.inventory || []).find(i => i.id === itemId);
      if (!entry || !(ITEMS[itemId] || {}).sellPrice) {
        await interaction.reply({
          components: [
            new ActionRowBuilder().addComponents(
              new TextDisplayBuilder().setContent('Item not available.'),
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const raw = interaction.fields.getTextInputValue('amount');
      let amount;
      if (/^all$/i.test(raw)) amount = entry.amount;
      else amount = parseInt(raw, 10);
      if (isNaN(amount) || amount <= 0 || amount > entry.amount) {
        await interaction.reply({
          components: [
            new ActionRowBuilder().addComponents(
              new TextDisplayBuilder().setContent('Invalid amount.'),
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const item = ITEMS[itemId];
      const sellPrice = item.sellPrice;
      const [min, max] = Array.isArray(sellPrice)
        ? sellPrice
        : [sellPrice, sellPrice];
      const price = Math.floor(Math.random() * (max - min + 1)) + min;
      const total = price * amount;
      const coinEmoji = '<:CRCoin:1405595571141480570>';
      const sellBtn = new ButtonBuilder()
        .setCustomId(`market-confirm-${messageId}-${itemId}-${amount}-${total}`)
        .setLabel('Sell')
        .setStyle(ButtonStyle.Danger);
      const cancelBtn = new ButtonBuilder()
        .setCustomId('market-cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `You are selling **×${amount} ${entry.name} ${entry.emoji}** for ${total} ${coinEmoji}\n-# are you sure?`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(sellBtn, cancelBtn));
      await interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      try {
        const message = await interaction.channel.messages.fetch(messageId);
        await sendMarket(interaction.user, message.edit.bind(message), resources);
      } catch {}
    } else if (
      interaction.isModalSubmit() && interaction.customId.startsWith('market-sell-modal-')
    ) {
      const parts = interaction.customId.split('-');
      const messageId = parts[3];
      const itemId = parts[4];
      const state = shopStates.get(messageId);
      if (!state || interaction.user.id !== state.userId) {
        await interaction.reply({
          components: [
            new ActionRowBuilder().addComponents(
              new TextDisplayBuilder().setContent('Sell expired.'),
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const stats = resources.userStats[state.userId] || { inventory: [] };
      normalizeInventory(stats);
      const entry = (stats.inventory || []).find(i => i.id === itemId);
      if (!entry) {
        await interaction.reply({
          components: [
            new ActionRowBuilder().addComponents(
              new TextDisplayBuilder().setContent('Item not available.'),
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const raw = interaction.fields.getTextInputValue('amount');
      let amount;
      if (/^all$/i.test(raw)) amount = entry.amount;
      else amount = parseInt(raw, 10);
      if (isNaN(amount) || amount <= 0 || amount > entry.amount) {
        await interaction.reply({
          components: [
            new ActionRowBuilder().addComponents(
              new TextDisplayBuilder().setContent('Invalid amount.'),
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const item = ITEMS[itemId];
      const sellPrice = item.sellPrice;
      const [min, max] = Array.isArray(sellPrice)
        ? sellPrice
        : [sellPrice, sellPrice];
      const price = Math.floor(Math.random() * (max - min + 1)) + min;
      const total = price * amount;
      const coinEmoji = '<:CRCoin:1405595571141480570>';
      const sellBtn = new ButtonBuilder()
        .setCustomId(`market-confirm-${messageId}-${itemId}-${amount}-${total}`)
        .setLabel('Sell')
        .setStyle(ButtonStyle.Danger);
      const cancelBtn = new ButtonBuilder()
        .setCustomId('market-cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `You are selling **×${amount} ${entry.name} ${entry.emoji}** for ${total} ${coinEmoji}\n-# are you sure?`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(sellBtn, cancelBtn));
      await interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      try {
        const message = await interaction.channel.messages.fetch(messageId);
        await sendMarket(interaction.user, message.edit.bind(message), resources);
      } catch {}
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, sendShop };
