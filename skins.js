const { ITEMS } = require('./items');

const DEFAULT_FARM_BACKGROUND_URL = 'https://i.ibb.co/1YMjDJbT/Flower-Garden-s.png';

const SKIN_RARITY_EMOJIS = {
  Common: '<:SBRCommon:1409932856762826862>',
  Rare: '<:SBRRare:1409932954037387324>',
  Epic: '<:SBREpic:1409933003269996674>',
  Legendary: '<a:SBRLegendary:1409933036568449105>',
  Mythical: '<a:SBRMythical:1409933097176268902>',
  Godly: '<a:SBRGodly:1409933130793750548>',
  Secret: '<a:SBRSecret:1409933447220297791>',
};

function baseInfo(id, fallbackName, fallbackEmoji = '') {
  const item = ITEMS[id];
  if (item) {
    return { name: item.name, emoji: item.emoji };
  }
  return { name: fallbackName, emoji: fallbackEmoji };
}

const SKIN_DEFINITIONS = {
  Shovel: {
    itemId: 'Shovel',
    base: baseInfo('Shovel', 'Shovel'),
    skins: [
      {
        id: 'HollyJollyShovel',
        name: 'Holly Jolly Shovel',
        emoji: '<:SKHollyJollyShovel:1425339068413116447>',
        rarity: 'Mythical',
        description:
          'Candy-cane grip, jingling bell, frostbite edge—dig up holiday loot with style.',
      },
    ],
  },
  HuntingRifleT1: {
    itemId: 'HuntingRifleT1',
    base: baseInfo('HuntingRifleT1', 'Hunting Rifle'),
    skins: [
      {
        id: 'HollyJollyRifleT1',
        name: 'Holly Jolly Rifle Tier 1',
        emoji: '<:SKHollyJollyRifleTier1:1425339099119747183>',
        rarity: 'Legendary',
        description: 'Wrapped in holly, dusted in snow: one shot, one silent night.',
      },
    ],
  },
  WateringCan: {
    itemId: 'WateringCan',
    base: baseInfo('WateringCan', 'Watering Can'),
    skins: [
      {
        id: 'HollyJollyWateringCan',
        name: 'Holly Jolly Watering Can',
        emoji: '<:SKHollyJollyWateringCan:1425340137084030986>',
        rarity: 'Mythical',
        description: 'Sprinkle cheer like snowfall on seedlings.',
      },
    ],
  },
  Farm: {
    itemId: 'Farm',
    base: { name: 'Farm', emoji: '🌾' },
    skins: [
      {
        id: 'SnowyFarm',
        name: 'Snowy Farm',
        emoji: '<:SKFrostlightGarden:1425344951994159124>',
        rarity: 'Godly',
        description:
          'Snow-dusted hedges and twinkling bulbs frame a warm plot—winter’s glow for year-round growth.',
        image: 'https://i.ibb.co/BFmhjPh/Frostlight-Garden.png',
      },
    ],
  },
};

const SKIN_LOOKUP = new Map();
for (const def of Object.values(SKIN_DEFINITIONS)) {
  for (const skin of def.skins) {
    SKIN_LOOKUP.set(`${def.itemId}:${skin.id}`, skin);
  }
}

function ensureSkinStore(stats) {
  if (!stats.item_skins || typeof stats.item_skins !== 'object') {
    stats.item_skins = {};
  }
  return stats.item_skins;
}

function ensureSkinState(stats, itemId) {
  const store = ensureSkinStore(stats);
  if (!store[itemId] || typeof store[itemId] !== 'object') {
    store[itemId] = { owned: [], equipped: null };
  }
  const state = store[itemId];
  if (!Array.isArray(state.owned)) state.owned = [];
  if (state.equipped && typeof state.equipped !== 'string') state.equipped = null;
  return state;
}

function listSkinnableItems() {
  return Object.values(SKIN_DEFINITIONS).map(def => ({
    id: def.itemId,
    name: def.base.name,
    emoji: def.base.emoji,
  }));
}

function getSkinsForItem(itemId) {
  const def = SKIN_DEFINITIONS[itemId];
  return def ? def.skins.slice() : [];
}

function getSkinDefinition(itemId, skinId) {
  return SKIN_LOOKUP.get(`${itemId}:${skinId}`) || null;
}

function ownsSkin(stats, itemId, skinId) {
  if (!stats) return false;
  const state = ensureSkinState(stats, itemId);
  return state.owned.includes(skinId);
}

function addSkin(stats, itemId, skinId) {
  const state = ensureSkinState(stats, itemId);
  if (!state.owned.includes(skinId)) state.owned.push(skinId);
}

function equipSkin(stats, itemId, skinId) {
  const state = ensureSkinState(stats, itemId);
  if (skinId && !state.owned.includes(skinId)) {
    return false;
  }
  state.equipped = skinId || null;
  return true;
}

function unequipSkin(stats, itemId) {
  const state = ensureSkinState(stats, itemId);
  state.equipped = null;
}

function getItemDisplay(stats, item, fallbackName, fallbackEmoji) {
  const itemId = typeof item === 'string' ? item : item?.id;
  const def = SKIN_DEFINITIONS[itemId];
  const base = def
    ? def.base
    : {
        name: fallbackName ?? (typeof item === 'string' ? item : item?.name ?? 'Unknown Item'),
        emoji: fallbackEmoji ?? (typeof item === 'string' ? '' : item?.emoji ?? ''),
      };

  if (!stats || !def) {
    return { name: base.name, emoji: base.emoji, skin: null };
  }

  const state = ensureSkinState(stats, itemId);
  const equipped = state.equipped;
  if (equipped && state.owned.includes(equipped)) {
    const skin = getSkinDefinition(itemId, equipped);
    if (skin) {
      return { name: skin.name, emoji: skin.emoji, skin };
    }
  }
  return { name: base.name, emoji: base.emoji, skin: null };
}

function getOwnedSkinCount(stats, itemId) {
  if (!stats) return 0;
  const state = ensureSkinState(stats, itemId);
  return state.owned.length;
}

function getFarmBackgroundUrl(stats) {
  const display = getItemDisplay(stats, 'Farm');
  if (display.skin && display.skin.image) return display.skin.image;
  return DEFAULT_FARM_BACKGROUND_URL;
}

module.exports = {
  DEFAULT_FARM_BACKGROUND_URL,
  SKIN_RARITY_EMOJIS,
  listSkinnableItems,
  getSkinsForItem,
  getSkinDefinition,
  ownsSkin,
  addSkin,
  equipSkin,
  unequipSkin,
  getItemDisplay,
  getOwnedSkinCount,
  getFarmBackgroundUrl,
};

