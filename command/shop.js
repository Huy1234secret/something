const {
  SlashCommandBuilder,
  MessageFlags,
  ButtonStyle,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const {
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
} = require('@discordjs/builders');
const { renderShopMedia } = require('../shopMedia');
const { renderDeluxeMedia } = require('../shopMediaDeluxe');
const { ITEMS } = require('../items');
const { ANIMAL_ITEMS } = require('../animals');
const {
  normalizeInventory,
  getInventoryCount,
  MAX_ITEMS,
  alertInventoryFull,
  applyCoinBoost,
  applyComponentEmoji,
  resolveComponentEmoji,
} = require('../utils');

const DELUXE_ITEM_IDS = ['DiamondBag', 'DiamondCrate', 'DiamondChest'];

const BASE_COIN_ITEM_ORDER = [
  'Padlock',
  'Landmine',
  'SeraphicHeart',
  'WateringCan',
  'HarvestScythe',
  'BulletBox',
  'HuntingRifleT1',
  'Shovel',
];

const BASE_SEED_IDS = ['WheatSeed', 'PotatoSeed'];

const OPTIONAL_COIN_ITEMS = [
  { id: 'XPSoda', chance: 0.35, min: 1, max: 3 },
  { id: 'AnimalDetector', chance: 0.15, min: 1, max: 2 },
  { id: 'MarshlightLures', chance: 0.25, min: 10, max: 25 },
  { id: 'SnowglassLures', chance: 0.25, min: 10, max: 25 },
  { id: 'SunprideLures', chance: 0.25, min: 10, max: 25 },
  { id: 'VerdantLures', chance: 0.25, min: 10, max: 25 },
];

const FARM_CROP_IDS = new Set(['Sheaf', 'Potato', 'WhiteCabbage']);

const shopStates = new Map();

const STOCK_CONFIG = {
  WheatSeed: { min: 5, max: 15 },
  PotatoSeed: { min: 3, max: 10 },
  WhiteCabbageSeed: { min: 2, max: 6 },
  SeraphicHeart: { min: 1, max: 5 },
  Padlock: { min: 3, max: 7 },
  Landmine: { min: 1, max: 3 },
  WateringCan: { min: 1, max: 2 },
  HarvestScythe: { min: 1, max: 2 },
  BulletBox: { min: 1, max: 3 },
  HuntingRifleT1: { min: 1, max: 2 },
  Shovel: { min: 1, max: 2 },
  XPSoda: { min: 1, max: 3 },
  AnimalDetector: { min: 1, max: 2 },
  MarshlightLures: { min: 10, max: 25 },
  SnowglassLures: { min: 10, max: 25 },
  SunprideLures: { min: 10, max: 25 },
  VerdantLures: { min: 10, max: 25 },
};

const DEFAULT_COIN_ORDER = [
  ...BASE_COIN_ITEM_ORDER.slice(0, 3),
  ...BASE_SEED_IDS,
  ...BASE_COIN_ITEM_ORDER.slice(3),
];

const MAX_ACTION_ROWS_PER_CONTAINER = 3;

function distributeActionRows(baseContainer, rows, accentColor) {
  const containers = [baseContainer];
  let current = baseContainer;
  let count = 0;

  for (const row of rows) {
    if (!row || !Array.isArray(row.components) || row.components.length === 0)
      continue;

    if (count >= MAX_ACTION_ROWS_PER_CONTAINER) {
      current = new ContainerBuilder();
      if (accentColor !== undefined) current.setAccentColor(accentColor);
      containers.push(current);
      count = 0;
    }

    current.addActionRowComponents(row);
    count++;
  }

  return containers;
}

function getItemsByIds(ids) {
  return ids.map(id => ITEMS[id]).filter(Boolean);
}

function getCoinItemIds(resources) {
  const ids =
    resources.shop &&
    Array.isArray(resources.shop.activeCoinItemIds) &&
    resources.shop.activeCoinItemIds.length
      ? resources.shop.activeCoinItemIds
      : DEFAULT_COIN_ORDER;
  return ids;
}

function getShopItems(type, resources) {
  if (type === 'coin') return getItemsByIds(getCoinItemIds(resources));
  if (type === 'deluxe') return getItemsByIds(DELUXE_ITEM_IDS);
  return [];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDiscount() {
  const r = Math.random();
  if (r < 0.00075) return 0.5;
  if (r < 0.005) return 0.25;
  if (r < 0.1) return 0.1;
  return 0;
}

function nextRestockHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.getTime() + 60 * 60 * 1000;
}

function nextMonthStart() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.getTime();
}

function restockCoinShop(resources) {
  resources.shop = resources.shop || {};
  const stock = {};
  const activeIds = [];

  // Base equipment and tools (non seeds)
  for (const id of BASE_COIN_ITEM_ORDER) {
    const cfg = STOCK_CONFIG[id];
    if (!cfg) continue;
    const amount = rand(cfg.min, cfg.max);
    stock[id] = { amount, max: amount, discount: getDiscount() };
    activeIds.push(id);
  }

  // Seed slots with potential White Cabbage replacement
  const chosenSeeds = [];
  let replaced = false;
  for (const baseSeed of BASE_SEED_IDS) {
    let seedId = baseSeed;
    if (!replaced && Math.random() < 0.75) {
      seedId = 'WhiteCabbageSeed';
      replaced = true;
    }
    const cfg = STOCK_CONFIG[seedId];
    if (!cfg) continue;
    const amount = rand(cfg.min, cfg.max);
    stock[seedId] = { amount, max: amount, discount: getDiscount() };
    chosenSeeds.push(seedId);
  }

  // Insert seeds after SeraphicHeart (third position)
  const seedInsertIndex = 3;
  activeIds.splice(seedInsertIndex, 0, ...chosenSeeds);

  // Optional items with appearance chance
  for (const optional of OPTIONAL_COIN_ITEMS) {
    if (Math.random() < optional.chance) {
      const cfg = STOCK_CONFIG[optional.id];
      if (!cfg) continue;
      const amount = rand(cfg.min, cfg.max);
      stock[optional.id] = { amount, max: amount, discount: getDiscount() };
      activeIds.push(optional.id);
    }
  }

  resources.shop.stock = stock;
  resources.shop.activeCoinItemIds = activeIds;
  resources.shop.nextRestock = nextRestockHour();
  resources.saveData();
}

function restockDeluxeShop(resources) {
  resources.shop = resources.shop || {};
  resources.shop.deluxeStock = resources.shop.deluxeStock || {};
  for (const id of DELUXE_ITEM_IDS) {
    resources.shop.deluxeStock[id] = { amount: 1, max: 1, discount: 0 };
  }
  resources.shop.nextDeluxeRestock = nextMonthStart();
  resources.saveData();
}

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

function makeTextContainer(content, color = 0xffffff) {
  return new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
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
      const emoji = resolveComponentEmoji(item.emoji);
      const option = {
        label: `${item.name} - ${item.amount}`,
        value: item.id,
      };
      if (emoji) option.emoji = emoji;
      return option;
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
  const marketTypeOptions = [
    { label: 'Coin Shop', value: 'coin', emoji: '<:CRCoin:1405595571141480570>' },
    { label: 'Deluxe Shop', value: 'deluxe', emoji: '<:CRDeluxeCoin:1405595587780280382>' },
    {
      label: 'Market',
      value: 'market',
      emoji: '<:SBMarket:1408156436789461165>',
      default: true,
    },
  ].map(option => ({
    ...option,
    emoji: resolveComponentEmoji(option.emoji),
  }));
  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-type')
    .setPlaceholder('Shop type')
    .addOptions(marketTypeOptions);
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
  let stock = {};
  let restockTime = 0;
  const stats = resources.userStats[user.id] || {};
  const farmLevel = Number.isFinite(stats.farm_mastery_level)
    ? stats.farm_mastery_level
    : 0;
  if (state.type === 'deluxe') {
    if (
      !resources.shop.nextDeluxeRestock ||
      Date.now() >= resources.shop.nextDeluxeRestock
    )
      restockDeluxeShop(resources);
    stock = resources.shop.deluxeStock || {};
    restockTime = resources.shop.nextDeluxeRestock || Date.now();
  } else {
    if (!resources.shop.nextRestock || Date.now() >= resources.shop.nextRestock)
      restockCoinShop(resources);
    stock = resources.shop.stock || {};
    restockTime = resources.shop.nextRestock || Date.now();
  }
  const items = getShopItems(state.type, resources);
  const perPage = 6;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.min(Math.max(state.page, 1), pages);
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage).map(it => {
    const s = stock[it.id] || {};
    let price = it.price;
    let originalPrice = null;
    if (s.discount) {
      originalPrice = price;
      price = Math.round(price * (1 - s.discount));
    }
    return {
      ...it,
      price,
      originalPrice,
      stock: s.amount ?? 0,
      maxStock: s.max ?? 0,
      discount: s.discount,
      locked: it.id === 'WhiteCabbageSeed' && farmLevel < 30,
      lockedText: it.id === 'WhiteCabbageSeed' && farmLevel < 30 ? 'Farm Mastery Lv.30' : null,
    };
  });

  const buffer =
    state.type === 'deluxe'
      ? await renderDeluxeMedia(pageItems)
      : await renderShopMedia(pageItems);
  const attachment = new AttachmentBuilder(buffer, { name: 'shop.png' });

  const title =
    state.type === 'deluxe' ? "## Mr Luxury's Deluxe Shop" : "## Mr Someone's Shop";

  const tagline =
    state.type === 'deluxe' ? '-# Want to buy something BETTER?' : '-# Welcome!';
  const restockTs = Math.floor(restockTime / 1000);

  const thumbURL =
    state.type === 'deluxe'
      ? 'https://i.ibb.co/jkZ2mwfw/Luxury-idle.gif'
      : 'https://i.ibb.co/KcX5DGwz/Someone-idle.gif';

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbURL))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(title),
      new TextDisplayBuilder().setContent(
        `${tagline}\n<:SBComingstock:1405083859254771802> Shop will have new stock <t:${restockTs}:R>\n* Page ${page}/${pages}`,
      ),
    );

  const mediaGallery = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL('attachment://shop.png'),
  );

  const pageSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-page')
    .setPlaceholder('Page')
    .addOptions(Array.from({ length: pages }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })));

  const typeSelectOptions = [
    { label: 'Coin Shop', value: 'coin', emoji: '<:CRCoin:1405595571141480570>' },
    { label: 'Deluxe Shop', value: 'deluxe', emoji: '<:CRDeluxeCoin:1405595587780280382>' },
    { label: 'Market', value: 'market', emoji: '<:SBMarket:1408156436789461165>' },
  ].map(option => ({
    ...option,
    emoji: resolveComponentEmoji(option.emoji),
  }));
  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-type')
    .setPlaceholder('Shop type')
    .addOptions(typeSelectOptions);

  const buttons = [];
  for (let i = 0; i < perPage; i++) {
    const item = pageItems[i];
    const btn = new ButtonBuilder().setCustomId(`shop-buy-${i}`);
    if (item) {
      const label = `[${item.stock ?? 0}/${item.maxStock ?? 0}] ${item.name}`;
      btn.setLabel(label);
      applyComponentEmoji(btn, item.emoji);
      if (item.discount) btn.setStyle(ButtonStyle.Success);
      else btn.setStyle(ButtonStyle.Secondary);
      if (!item.stock) btn.setDisabled(true);
      if (item.locked) {
        btn.setDisabled(true);
        if (!item.discount) btn.setStyle(ButtonStyle.Secondary);
      }
    } else {
      btn.setLabel('???');
      applyComponentEmoji(btn, '❓');
      btn.setStyle(ButtonStyle.Secondary).setDisabled(true);
    }
    buttons.push(btn);
  }

  const buttonRows = [];
  for (let i = 0; i < buttons.length; i += 3) {
    const rowButtons = buttons.slice(i, i + 3);
    if (rowButtons.length)
      buttonRows.push(new ActionRowBuilder().addComponents(...rowButtons));
  }

  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(headerSection)
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(mediaGallery)
    .addSeparatorComponents(new SeparatorBuilder());

  const actionRows = [
    new ActionRowBuilder().addComponents(pageSelect),
    new ActionRowBuilder().addComponents(typeSelect),
    ...buttonRows,
  ];

  const containers = distributeActionRows(container, actionRows, 0xffffff);

  const message = await send({
    files: [attachment],
    components: containers,
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
        const items = getShopItems(state.type, resources);
        const start = (state.page - 1) * 6;
        const item = items[start + index];
        if (!item) {
          await interaction.reply({ content: 'Item not available.' });
          return;
        }
        const viewerStats = resources.userStats[state.userId] || {};
        const viewerFarmLevel = Number.isFinite(viewerStats.farm_mastery_level)
          ? viewerStats.farm_mastery_level
          : 0;
        if (item.id === 'WhiteCabbageSeed' && viewerFarmLevel < 30) {
          await interaction.reply({
            content: 'You need Farm Mastery Lv.30 to purchase this seed package.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const store =
          state.type === 'deluxe'
            ? resources.shop.deluxeStock
            : resources.shop.stock;
        const sInfo = (store || {})[item.id] || {};
        if (!sInfo.amount) {
          await interaction.reply({ content: 'Out of stock.', flags: MessageFlags.Ephemeral });
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
        const item = ITEMS[itemId];
        const store =
          state.type === 'deluxe'
            ? resources.shop.deluxeStock
            : resources.shop.stock;
        const sInfo = (store || {})[itemId] || {};
          if (!item || !sInfo.amount || sInfo.amount < amount) {
            await interaction.update({
              components: [makeTextContainer('Item not available.')],
              flags: MessageFlags.IsComponentsV2,
            });
            return;
          }
        const stats =
          resources.userStats[interaction.user.id] || { coins: 0, deluxe_coins: 0 };
        normalizeInventory(stats);
        const farmMasteryLevel = Number.isFinite(stats.farm_mastery_level)
          ? stats.farm_mastery_level
          : 0;
        if (itemId === 'WhiteCabbageSeed' && farmMasteryLevel < 30) {
          await interaction.update({
            components: [
              makeTextContainer('You need Farm Mastery Lv.30 to purchase this seed package.'),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
        const price = sInfo.discount
          ? Math.round(item.price * (1 - sInfo.discount))
          : item.price;
        const total = price * amount;
          if ((stats[currency] || 0) < total) {
            const need = total - (stats[currency] || 0);
            await interaction.update({
              components: [
                makeTextContainer(
                  `You don't have enough coins. You need ${need} ${coinEmoji} more to purchase.`,
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
        if (base.durability !== undefined) {
          for (let i = 0; i < amount; i++)
            (stats.inventory = stats.inventory || []).push({
              ...base,
              amount: 1,
              durability: base.durability,
            });
        } else {
          const existing = stats.inventory.find(i => i.id === item.id);
          if (existing) existing.amount = (existing.amount || 0) + amount;
          else stats.inventory.push({ ...base, amount });
        }
        normalizeInventory(stats);
        resources.userStats[interaction.user.id] = stats;
        sInfo.amount -= amount;
        store[item.id] = sInfo;
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
        const mainState = shopStates.get(state.shopMessageId);
        if (mainState) {
          try {
            const msg = await interaction.channel.messages.fetch(state.shopMessageId);
            await sendShop(interaction.user, msg.edit.bind(msg), resources, mainState);
          } catch {}
        }
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
              components: [makeTextContainer('Sale failed.')],
              flags: MessageFlags.IsComponentsV2,
            });
            return;
          }
        entry.amount -= amount;
        if (entry.amount <= 0)
          stats.inventory = stats.inventory.filter(i => i.id !== itemId);
        const boosted = applyCoinBoost(stats, total);
        stats.coins = (stats.coins || 0) + boosted;
        normalizeInventory(stats);
        resources.userStats[interaction.user.id] = stats;
        resources.saveData();
        const container = new ContainerBuilder()
          .setAccentColor(0x00ff00)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Sold ×${amount} ${entry.name} ${entry.emoji} for ${boosted} ${coinEmoji}.`,
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
              components: [makeTextContainer('Purchase expired.')],
              flags: MessageFlags.IsComponentsV2,
            });
            return;
          }
      const items = getShopItems(state.type, resources);
      const start = (state.page - 1) * 6;
      const baseItem = items[start + index];
        if (!baseItem) {
          await interaction.reply({
            components: [makeTextContainer('Item not available.')],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const viewerStats = resources.userStats[state.userId] || {};
      const viewerFarmLevel = Number.isFinite(viewerStats.farm_mastery_level)
        ? viewerStats.farm_mastery_level
        : 0;
      if (baseItem.id === 'WhiteCabbageSeed' && viewerFarmLevel < 30) {
        await interaction.reply({
          components: [makeTextContainer('You need Farm Mastery Lv.30 to purchase this seed package.')],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const store =
        state.type === 'deluxe'
          ? resources.shop.deluxeStock
          : resources.shop.stock;
      const sInfo = (store || {})[baseItem.id] || {};
        if (!sInfo.amount) {
          await interaction.reply({
            components: [makeTextContainer('Out of stock.')],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const amount = parseInt(interaction.fields.getTextInputValue('amount'), 10);
        if (isNaN(amount) || amount <= 0) {
          await interaction.reply({
            components: [makeTextContainer('Invalid amount.')],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
        if (amount > sInfo.amount) {
          await interaction.reply({
            components: [makeTextContainer(`Only ${sInfo.amount} left in stock.`)],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const stats =
        resources.userStats[interaction.user.id] || { coins: 0, deluxe_coins: 0 };
      const price = sInfo.discount
        ? Math.round(baseItem.price * (1 - sInfo.discount))
        : baseItem.price;
      const total = price * amount;
      const currencyField = state.type === 'deluxe' ? 'deluxe_coins' : 'coins';
      const coinEmoji =
        state.type === 'deluxe'
          ? '<:CRDeluxeCoin:1405595587780280382>'
          : '<:CRCoin:1405595571141480570>';
        if ((stats[currencyField] || 0) < total) {
          const need = total - (stats[currencyField] || 0);
          await interaction.reply({
            components: [
              makeTextContainer(
                `You don't have enough coins. You need ${need} ${coinEmoji} more to purchase.`,
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const buyBtn = new ButtonBuilder()
        .setCustomId(`shop-confirm-${baseItem.id}-${amount}`)
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
            `* Hey ${interaction.user} you are purchasing **×${amount} ${baseItem.name} ${baseItem.emoji}** with ${total} ${coinEmoji}`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(buyBtn, cancelBtn));
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
        const reply = await interaction.fetchReply();
        shopStates.set(reply.id, {
          userId: interaction.user.id,
          type: state.type,
          shopMessageId: messageId,
        });
      const timer = setTimeout(async () => {
        const current = resources.pendingRequests.get(interaction.user.id);
        if (current && current.timer === timer) {
          resources.pendingRequests.delete(interaction.user.id);
          try {
              await interaction.editReply({
                components: [makeTextContainer('Purchase expired.')],
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
            components: [makeTextContainer('Sell expired.')],
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
            components: [makeTextContainer('Item not available.')],
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
            components: [makeTextContainer('Invalid amount.')],
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
      const statsLevel = Number.isFinite(stats.hunt_mastery_level)
        ? stats.hunt_mastery_level
        : 0;
      let total = price * amount;
      if (statsLevel >= 30 && ANIMAL_ITEMS[itemId]) {
        total = Math.floor(total * 1.25);
      }
      const farmLevel = Number.isFinite(stats.farm_mastery_level)
        ? stats.farm_mastery_level
        : 0;
      if (FARM_CROP_IDS.has(itemId)) {
        let bonus = 0;
        if (farmLevel >= 20) bonus += 0.3;
        if (farmLevel >= 80) bonus += 1.0;
        total = Math.floor(total * (1 + bonus));
      }
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
            components: [makeTextContainer('Sell expired.')],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const stats = resources.userStats[state.userId] || { inventory: [] };
      normalizeInventory(stats);
      const entry = (stats.inventory || []).find(i => i.id === itemId);
        if (!entry) {
          await interaction.reply({
            components: [makeTextContainer('Item not available.')],
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
            components: [makeTextContainer('Invalid amount.')],
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
      const statsLevel = Number.isFinite(stats.hunt_mastery_level)
        ? stats.hunt_mastery_level
        : 0;
      let total = price * amount;
      if (statsLevel >= 30 && ANIMAL_ITEMS[itemId]) {
        total = Math.floor(total * 1.25);
      }
      const farmLevel = Number.isFinite(stats.farm_mastery_level)
        ? stats.farm_mastery_level
        : 0;
      if (FARM_CROP_IDS.has(itemId)) {
        let bonus = 0;
        if (farmLevel >= 20) bonus += 0.3;
        if (farmLevel >= 80) bonus += 1.0;
        total = Math.floor(total * (1 + bonus));
      }
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
