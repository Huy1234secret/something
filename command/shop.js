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
const { renderChristmasShop } = require('../shopMediaChristmas');
const { ITEMS, DIG_ITEMS } = require('../items');
const { getItemDisplay } = require('../skins');
const { isChristmasEventActive } = require('../events');
const {
  normalizeInventory,
  getInventoryCount,
  MAX_ITEMS,
  alertInventoryFull,
  applyCoinBoost,
  applyComponentEmoji,
  resolveComponentEmoji,
  getDigCoinMultiplier,
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

const SPECIAL_SEED_REPLACEMENTS = [
  { id: 'StarFruitSeed', chance: 0.2 },
  { id: 'MelonSeed', chance: 0.4 },
  { id: 'PumpkinSeed', chance: 0.55 },
  { id: 'WhiteCabbageSeed', chance: 0.75 },
];

const OPTIONAL_COIN_ITEMS = [
  { id: 'XPSoda', chance: 0.35, min: 1, max: 3 },
  { id: 'AnimalDetector', chance: 0.15, min: 1, max: 2 },
  { id: 'Magnet', chance: 0.5, min: 1, max: 3 },
  { id: 'ItemScanner', chance: 0.3, min: 1, max: 2 },
  { id: 'MarshlightLures', chance: 0.25, min: 10, max: 25 },
  { id: 'SnowglassLures', chance: 0.25, min: 10, max: 25 },
  { id: 'SunprideLures', chance: 0.25, min: 10, max: 25 },
  { id: 'VerdantLures', chance: 0.25, min: 10, max: 25 },
];

const CHRISTMAS_SHOP_SIZE = 3;
const DIG_ITEM_IDS = new Set(DIG_ITEMS.map(item => item.id));
const SNOWFLAKE_EMOJI = '<:CRSnowflake:1425751780683153448>';

const CHRISTMAS_SHOP_ITEM_POOL = [
  { id: 'SnowBall', min: 10, max: 25, price: 300, weight: 26.9 },
  { id: 'CupOfMilk', min: 5, max: 15, price: 800, weight: 15 },
  { id: 'Cookie', min: 10, max: 20, price: 1500, weight: 17 },
  { id: 'CandyCane', min: 5, max: 10, price: 10000, weight: 10 },
  { id: 'GingerbreadMan', min: 1, max: 5, price: 25000, weight: 6 },
  { id: 'GoodList', min: 1, max: 2, price: 6000, weight: 1 },
  {
    id: 'LuckyPotion',
    min: 1,
    max: 1,
    price: 50000,
    weight: 1,
    info: '+100% Luck for 30 minutes.',
  },
  {
    id: 'UltraLuckyPotion',
    min: 1,
    max: 1,
    price: 180000,
    weight: 0.1,
    info: '+300% Luck & max success for 10 minutes.',
  },
  {
    id: 'CoinPotion',
    min: 1,
    max: 1,
    price: 65000,
    weight: 4,
    info: '+100% coins for 30 minutes.',
  },
  {
    id: 'RobberBag',
    min: 1,
    max: 2,
    price: 55000,
    weight: 6,
    info: 'Guarantees 25% loot for 10 robs.',
  },
  {
    id: 'BoltCutter',
    min: 1,
    max: 2,
    price: 60000,
    weight: 3,
    info: 'Breaks any padlock instantly.',
  },
  {
    id: 'XPSoda',
    min: 1,
    max: 3,
    price: 40000,
    weight: 4,
    info: 'Grants 6h of +100% XP.',
  },
  {
    id: 'OrnamentBerrySeed',
    min: 1,
    max: 5,
    price: 5000,
    weight: 6,
    info: 'Seasonal crop seed; grows into Ornament Berries.',
  },
];

const CURRENCY_EMOJIS = {
  coins: '<:CRCoin:1405595571141480570>',
  deluxe_coins: '<:CRDeluxeCoin:1405595587780280382>',
  snowflakes: SNOWFLAKE_EMOJI,
};

const shopStates = new Map();

const STOCK_CONFIG = {
  WheatSeed: { min: 5, max: 15 },
  PotatoSeed: { min: 3, max: 10 },
  WhiteCabbageSeed: { min: 2, max: 6 },
  PumpkinSeed: { min: 1, max: 5 },
  MelonSeed: { min: 1, max: 3 },
  StarFruitSeed: { min: 1, max: 2 },
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
  Magnet: { min: 1, max: 3 },
  ItemScanner: { min: 1, max: 2 },
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

const MAX_COMPONENTS_PER_CONTAINER = 3;

function getContainerComponentCount(container) {
  if (!container || typeof container.toJSON !== 'function') return 0;
  try {
    const json = container.toJSON();
    if (json && Array.isArray(json.components)) return json.components.length;
  } catch (error) {
    // If the container cannot be serialized yet, assume it is empty.
  }
  return 0;
}

function distributeActionRows(baseContainer, rows, accentColor, initialCount) {
  const containers = [baseContainer];
  let current = baseContainer;
  let count =
    Number.isFinite(initialCount) && initialCount >= 0
      ? Math.floor(initialCount)
      : getContainerComponentCount(baseContainer);

  for (const row of rows) {
    if (!row || !Array.isArray(row.components) || row.components.length === 0)
      continue;

    if (count >= MAX_COMPONENTS_PER_CONTAINER) {
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

function findChristmasConfig(id) {
  return CHRISTMAS_SHOP_ITEM_POOL.find(item => item.id === id);
}

function getChristmasItems(resources) {
  const shop = resources.shop || {};
  const ids = Array.isArray(shop.activeChristmasItemIds)
    ? shop.activeChristmasItemIds
    : [];
  const stock = shop.christmasStock || {};
  return ids
    .map(id => {
      const base = ITEMS[id];
      if (!base) return null;
      const entry = stock[id] || {};
      const config = findChristmasConfig(id) || {};
      const info = config.info || base.note || '';
      return {
        ...base,
        price: entry.price ?? config.price ?? base.price ?? 0,
        originalPrice: null,
        stock: entry.amount ?? 0,
        maxStock: entry.max ?? entry.amount ?? 0,
        discount: 0,
        locked: false,
        lockedText: null,
        currency: 'snowflakes',
        info,
      };
    })
    .filter(Boolean);
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
  if (type === 'christmas') return getChristmasItems(resources);
  return [];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedSample(pool, size) {
  const available = pool.slice().filter(item => (item.weight || 0) > 0);
  const selected = [];
  while (available.length > 0 && selected.length < size) {
    const total = available.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (total <= 0) break;
    let roll = Math.random() * total;
    let index = 0;
    for (; index < available.length; index += 1) {
      roll -= available[index].weight || 0;
      if (roll <= 0) break;
    }
    const choice = available.splice(Math.min(index, available.length - 1), 1)[0];
    if (!choice) break;
    selected.push(choice);
  }
  return selected;
}

function normalizeSellPrice(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return { min: value, max: value, currency: 'coins' };
  if (Array.isArray(value) && value.length >= 2)
    return { min: Number(value[0]) || 0, max: Number(value[1]) || 0, currency: 'coins' };
  if (typeof value === 'object') {
    const currency = value.currency || 'coins';
    const base =
      Number.isFinite(value.amount)
        ? value.amount
        : Number.isFinite(value.value)
        ? value.value
        : null;
    const min = Number.isFinite(value.min) ? value.min : base ?? 0;
    const max = Number.isFinite(value.max) ? value.max : base ?? min;
    return { min, max, currency };
  }
  return null;
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
  const seedSlots = [...BASE_SEED_IDS];
  for (const replacement of SPECIAL_SEED_REPLACEMENTS) {
    if (Math.random() < replacement.chance) {
      const slotIndex = Math.floor(Math.random() * seedSlots.length);
      seedSlots[slotIndex] = replacement.id;
      break;
    }
  }

  const chosenSeeds = [];
  for (const seedId of seedSlots) {
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

function restockChristmasShop(resources) {
  resources.shop = resources.shop || {};
  if (!isChristmasEventActive()) {
    resources.shop.christmasStock = {};
    resources.shop.activeChristmasItemIds = [];
    resources.shop.nextChristmasRestock = 0;
    resources.saveData();
    return;
  }
  const chosen = weightedSample(CHRISTMAS_SHOP_ITEM_POOL, CHRISTMAS_SHOP_SIZE);
  const stock = {};
  const activeIds = [];
  for (const choice of chosen) {
    const amount = rand(choice.min, choice.max);
    stock[choice.id] = {
      amount,
      max: amount,
      price: choice.price,
      discount: 0,
      info: choice.info || '',
    };
    activeIds.push(choice.id);
  }
  resources.shop.christmasStock = stock;
  resources.shop.activeChristmasItemIds = activeIds;
  resources.shop.nextChristmasRestock = nextRestockHour();
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
  const christmasActive = isChristmasEventActive();
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
  ];
  if (christmasActive)
    marketTypeOptions.push({
      label: 'Christmas Shop',
      value: 'christmas',
      emoji: SNOWFLAKE_EMOJI,
    });
  marketTypeOptions.push({
    label: 'Market',
    value: 'market',
    emoji: '<:SBMarket:1408156436789461165>',
    default: true,
  });
  const mappedOptions = marketTypeOptions.map(option => ({
    ...option,
    emoji: resolveComponentEmoji(option.emoji),
  }));
  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-type')
    .setPlaceholder('Shop type')
    .addOptions(mappedOptions);
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
  resources.shop = resources.shop || {};
  const christmasActive = isChristmasEventActive();
  if (!christmasActive && state.type === 'christmas') state.type = 'coin';
  if (
    !christmasActive &&
    Array.isArray(resources.shop.activeChristmasItemIds) &&
    resources.shop.activeChristmasItemIds.length
  ) {
    restockChristmasShop(resources);
  }

  let stock = {};
  let restockTime = 0;
  const stats = resources.userStats[user.id] || {};
  const now = Date.now();
  const isDeluxe = state.type === 'deluxe';
  const isChristmas = state.type === 'christmas';

  if (isDeluxe) {
    if (!resources.shop.nextDeluxeRestock || now >= resources.shop.nextDeluxeRestock)
      restockDeluxeShop(resources);
    stock = resources.shop.deluxeStock || {};
    restockTime = resources.shop.nextDeluxeRestock || now;
  } else if (isChristmas) {
    const needsRestock =
      !christmasActive ||
      !resources.shop.nextChristmasRestock ||
      now >= resources.shop.nextChristmasRestock ||
      !(
        Array.isArray(resources.shop.activeChristmasItemIds) &&
        resources.shop.activeChristmasItemIds.length
      );
    if (needsRestock && christmasActive) restockChristmasShop(resources);
    stock = resources.shop.christmasStock || {};
    restockTime = resources.shop.nextChristmasRestock || now;
  } else {
    if (!resources.shop.nextRestock || now >= resources.shop.nextRestock)
      restockCoinShop(resources);
    stock = resources.shop.stock || {};
    restockTime = resources.shop.nextRestock || now;
  }

  const items = getShopItems(state.type, resources);
  const perPage = isChristmas ? CHRISTMAS_SHOP_SIZE : 6;
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
    const locked = false;
    const display = getItemDisplay(stats, it);
    return {
      ...it,
      displayName: display.name,
      displayEmoji: display.emoji,
      price,
      originalPrice,
      stock: s.amount ?? 0,
      maxStock: s.max ?? 0,
      discount: s.discount,
      locked,
      lockedText: null,
      info: it.info || s.info || '',
      currency: it.currency || (isDeluxe ? 'deluxe_coins' : 'coins'),
    };
  });

  let buffer;
  let attachmentName = 'shop.png';
  if (isDeluxe) buffer = await renderDeluxeMedia(pageItems);
  else if (isChristmas) {
    const renderItems = pageItems.map(item => ({
      name: item.displayName || item.name,
      price: item.price,
      info: item.info || '',
      stock: `${item.stock ?? 0}/${item.maxStock ?? 0}`,
      img: item.displayEmoji || item.emoji,
      currency: `${SNOWFLAKE_EMOJI} Snowflakes`,
    }));
    while (renderItems.length < CHRISTMAS_SHOP_SIZE) renderItems.push({});
    buffer = await renderChristmasShop(renderItems);
    attachmentName = 'christmas-shop.png';
  } else buffer = await renderShopMedia(pageItems);
  const attachment = new AttachmentBuilder(buffer, { name: attachmentName });

  const title = isDeluxe
    ? "## Mr Luxury's Deluxe Shop"
    : isChristmas
      ? '## ❄️ Christmas Shop'
      : "## Mr Someone's Shop";

  const tagline = isDeluxe
    ? '-# Want to buy something BETTER?'
    : isChristmas
      ? '-# Spend your Snowflakes wisely!'
      : '-# Welcome!';
  const restockTs = Math.floor(restockTime / 1000);

  const thumbURL = isDeluxe
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
    new MediaGalleryItemBuilder().setURL(`attachment://${attachmentName}`),
  );

  const pageSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-page')
    .setPlaceholder('Page')
    .addOptions(Array.from({ length: pages }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })));
  if (pages <= 1) pageSelect.setDisabled(true);

  const typeSelectOptions = [
    { label: 'Coin Shop', value: 'coin', emoji: CURRENCY_EMOJIS.coins },
    { label: 'Deluxe Shop', value: 'deluxe', emoji: CURRENCY_EMOJIS.deluxe_coins },
  ];
  if (christmasActive)
    typeSelectOptions.push({ label: 'Christmas Shop', value: 'christmas', emoji: SNOWFLAKE_EMOJI });
  typeSelectOptions.push({ label: 'Market', value: 'market', emoji: '<:SBMarket:1408156436789461165>' });
  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('shop-type')
    .setPlaceholder('Shop type')
    .addOptions(
      typeSelectOptions.map(option => ({
        ...option,
        emoji: resolveComponentEmoji(option.emoji),
      })),
    );

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

  const headerContainer = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(headerSection)
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(mediaGallery);

  const selectionRows = [
    new ActionRowBuilder().addComponents(pageSelect),
    new ActionRowBuilder().addComponents(typeSelect),
  ];

  const selectionBaseContainer = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSeparatorComponents(new SeparatorBuilder());
  const selectionContainers = distributeActionRows(
    selectionBaseContainer,
    selectionRows,
    0xffffff,
    getContainerComponentCount(selectionBaseContainer),
  );

  const containers = [headerContainer, ...selectionContainers];

  if (buttonRows.length) {
    const buttonContainers = distributeActionRows(
      new ContainerBuilder().setAccentColor(0xffffff),
      buttonRows,
      0xffffff,
    );
    containers.push(...buttonContainers);
  }

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
        const perPage =
          state.type === 'christmas' ? CHRISTMAS_SHOP_SIZE : 6;
        const start = (state.page - 1) * perPage;
        const item = items[start + index];
        if (!item) {
          await interaction.reply({ content: 'Item not available.' });
          return;
        }
        const viewerStats = resources.userStats[state.userId] || {};
        let store;
        if (state.type === 'deluxe') store = resources.shop.deluxeStock;
        else if (state.type === 'christmas') store = resources.shop.christmasStock;
        else store = resources.shop.stock;
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
        let currency = 'coins';
        let coinEmoji = CURRENCY_EMOJIS.coins;
        let store;
        if (state.type === 'deluxe') {
          currency = 'deluxe_coins';
          coinEmoji = CURRENCY_EMOJIS.deluxe_coins;
          store = resources.shop.deluxeStock;
        } else if (state.type === 'christmas') {
          currency = 'snowflakes';
          coinEmoji = SNOWFLAKE_EMOJI;
          store = resources.shop.christmasStock;
        } else {
          store = resources.shop.stock;
        }
        const item = ITEMS[itemId];
        const sInfo = (store || {})[itemId] || {};
          if (!item || !sInfo.amount || sInfo.amount < amount) {
            await interaction.update({
              components: [makeTextContainer('Item not available.')],
              flags: MessageFlags.IsComponentsV2,
            });
            return;
          }
        const stats =
          resources.userStats[interaction.user.id] || {
            coins: 0,
            deluxe_coins: 0,
            snowflakes: 0,
          };
        normalizeInventory(stats);
        const price = sInfo.discount
          ? Math.round(item.price * (1 - sInfo.discount))
          : item.price;
        const total = price * amount;
        const currencyName =
          currency === 'snowflakes'
            ? 'Snowflakes'
            : currency === 'deluxe_coins'
            ? 'Deluxe Coins'
            : 'coins';
          if ((stats[currency] || 0) < total) {
            const need = total - (stats[currency] || 0);
            await interaction.update({
              components: [
                makeTextContainer(
                  `You don't have enough ${currencyName}. You need ${need} ${coinEmoji} more to purchase.`,
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
        const parts = interaction.customId.split('-');
        const messageId = parts[2];
        const itemId = parts[3];
        const amount = parseInt(parts[4], 10);
        const total = parseInt(parts[5], 10);
        const currencyKey = parts[6] || 'coins';
        const currencyField =
          currencyKey === 'snowflakes'
            ? 'snowflakes'
            : currencyKey === 'deluxe_coins'
            ? 'deluxe_coins'
            : 'coins';
        const coinEmoji =
          currencyField === 'snowflakes'
            ? SNOWFLAKE_EMOJI
            : currencyField === 'deluxe_coins'
            ? CURRENCY_EMOJIS.deluxe_coins
            : CURRENCY_EMOJIS.coins;
        const stats = resources.userStats[interaction.user.id] || {
          coins: 0,
          deluxe_coins: 0,
          snowflakes: 0,
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
        let payout = total;
        if (currencyField === 'coins') payout = applyCoinBoost(stats, total);
        stats[currencyField] = (stats[currencyField] || 0) + payout;
        normalizeInventory(stats);
        resources.userStats[interaction.user.id] = stats;
        resources.saveData();
        const currencyName =
          currencyField === 'snowflakes'
            ? 'Snowflakes'
            : currencyField === 'deluxe_coins'
            ? 'Deluxe Coins'
            : 'coins';
        const container = new ContainerBuilder()
          .setAccentColor(0x00ff00)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Sold ×${amount} ${entry.name} ${entry.emoji} for ${payout} ${coinEmoji} (${currencyName}).`,
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
      const perPage =
        state.type === 'christmas' ? CHRISTMAS_SHOP_SIZE : 6;
      const start = (state.page - 1) * perPage;
      const baseItem = items[start + index];
        if (!baseItem) {
          await interaction.reply({
            components: [makeTextContainer('Item not available.')],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      const viewerStats = resources.userStats[state.userId] || {};
      let store;
      if (state.type === 'deluxe') store = resources.shop.deluxeStock;
      else if (state.type === 'christmas') store = resources.shop.christmasStock;
      else store = resources.shop.stock;
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
        resources.userStats[interaction.user.id] || {
          coins: 0,
          deluxe_coins: 0,
          snowflakes: 0,
        };
      const price = sInfo.discount
        ? Math.round(baseItem.price * (1 - sInfo.discount))
        : baseItem.price;
      const total = price * amount;
      let currencyField = 'coins';
      let coinEmoji = CURRENCY_EMOJIS.coins;
      if (state.type === 'deluxe') {
        currencyField = 'deluxe_coins';
        coinEmoji = CURRENCY_EMOJIS.deluxe_coins;
      } else if (state.type === 'christmas') {
        currencyField = 'snowflakes';
        coinEmoji = SNOWFLAKE_EMOJI;
      }
      const currencyName =
        currencyField === 'snowflakes'
          ? 'Snowflakes'
          : currencyField === 'deluxe_coins'
          ? 'Deluxe Coins'
          : 'coins';
        if ((stats[currencyField] || 0) < total) {
          const need = total - (stats[currencyField] || 0);
          await interaction.reply({
            components: [
              makeTextContainer(
                `You don't have enough ${currencyName}. You need ${need} ${coinEmoji} more to purchase.`,
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
      const sellInfo = normalizeSellPrice(item.sellPrice);
      if (!sellInfo) {
        await interaction.reply({
          components: [makeTextContainer('Item not available.')],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const min = Math.max(0, sellInfo.min);
      const max = Math.max(min, sellInfo.max);
      const price = Math.floor(Math.random() * (max - min + 1)) + min;
      let total = price * amount;
      if (DIG_ITEM_IDS.has(itemId)) {
        const digMultiplier = getDigCoinMultiplier(stats);
        total = Math.floor(total * digMultiplier);
      }
      const currencyField =
        sellInfo.currency === 'snowflakes'
          ? 'snowflakes'
          : sellInfo.currency === 'deluxe_coins'
          ? 'deluxe_coins'
          : 'coins';
      const coinEmoji =
        currencyField === 'snowflakes'
          ? SNOWFLAKE_EMOJI
          : currencyField === 'deluxe_coins'
          ? CURRENCY_EMOJIS.deluxe_coins
          : CURRENCY_EMOJIS.coins;
      const currencyName =
        currencyField === 'snowflakes'
          ? 'Snowflakes'
          : currencyField === 'deluxe_coins'
          ? 'Deluxe Coins'
          : 'coins';
      const sellBtn = new ButtonBuilder()
        .setCustomId(
          `market-confirm-${messageId}-${itemId}-${amount}-${total}-${currencyField}`,
        )
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
            `You are selling **×${amount} ${entry.name} ${entry.emoji}** for ${total} ${coinEmoji} (${currencyName})\n-# are you sure?`,
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
      const sellInfo = normalizeSellPrice(item.sellPrice);
      if (!sellInfo) {
        await interaction.reply({
          components: [makeTextContainer('Item not available.')],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const min = Math.max(0, sellInfo.min);
      const max = Math.max(min, sellInfo.max);
      const price = Math.floor(Math.random() * (max - min + 1)) + min;
      let total = price * amount;
      if (DIG_ITEM_IDS.has(itemId)) {
        const digMultiplier = getDigCoinMultiplier(stats);
        total = Math.floor(total * digMultiplier);
      }
      const currencyField =
        sellInfo.currency === 'snowflakes'
          ? 'snowflakes'
          : sellInfo.currency === 'deluxe_coins'
          ? 'deluxe_coins'
          : 'coins';
      const coinEmoji =
        currencyField === 'snowflakes'
          ? SNOWFLAKE_EMOJI
          : currencyField === 'deluxe_coins'
          ? CURRENCY_EMOJIS.deluxe_coins
          : CURRENCY_EMOJIS.coins;
      const currencyName =
        currencyField === 'snowflakes'
          ? 'Snowflakes'
          : currencyField === 'deluxe_coins'
          ? 'Deluxe Coins'
          : 'coins';
      const sellBtn = new ButtonBuilder()
        .setCustomId(
          `market-confirm-${messageId}-${itemId}-${amount}-${total}-${currencyField}`,
        )
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
            `You are selling **×${amount} ${entry.name} ${entry.emoji}** for ${total} ${coinEmoji} (${currencyName})\n-# are you sure?`,
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
