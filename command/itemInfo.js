const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require('@discordjs/builders');
const { ITEMS, DIG_ITEMS } = require('../items');
const { ANIMALS } = require('../animals');
const { AREA_BY_KEY, HUNT_LURES } = require('../huntData');
const { getSkinsForItem } = require('../skins');
const { formatNumber, normalizeInventory } = require('../utils');
const { getContainerLootTable } = require('../containerLoot');

const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
const DIAMOND_EMOJI = '<:CRDiamond:1405595593069432912>';
const DELUXE_COIN_EMOJI = '<:CRDeluxeCoin:1405595587780280382>';
const SNOWFLAKE_EMOJI = '<:CRSnowflake:1425751780683153448>';
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
const RARITY_COLORS = {
  Common: 0xffffff,
  Uncommon: 0x99ff99,
  Rare: 0x00ffff,
  Epic: 0xff00ff,
  Legendary: 0xffff00,
  Mythical: 0xff4500,
  Godly: 0x800080,
  Prismatic: 0x00ff00,
  Secret: 0x000000,
};

const COIN_SHOP_OPTIONAL_ITEMS = [
  { id: 'XPSoda', chance: 0.35, min: 1, max: 3 },
  { id: 'AnimalDetector', chance: 0.15, min: 1, max: 2 },
  { id: 'MarshlightLures', chance: 0.25, min: 10, max: 25 },
  { id: 'SnowglassLures', chance: 0.25, min: 10, max: 25 },
  { id: 'SunprideLures', chance: 0.25, min: 10, max: 25 },
  { id: 'VerdantLures', chance: 0.25, min: 10, max: 25 },
];

const COIN_SHOP_SPECIAL_SEED_REPLACEMENTS = [
  { id: 'StarFruitSeed', chance: 0.2 },
  { id: 'MelonSeed', chance: 0.4 },
  { id: 'PumpkinSeed', chance: 0.55 },
  { id: 'WhiteCabbageSeed', chance: 0.75 },
];

const COIN_SHOP_OPTIONAL_LOOKUP = new Map(
  COIN_SHOP_OPTIONAL_ITEMS.map(entry => [entry.id, entry]),
);

const COIN_SHOP_SEED_LOOKUP = new Map(
  COIN_SHOP_SPECIAL_SEED_REPLACEMENTS.map(entry => [entry.id, entry]),
);

const ANIMAL_LOOKUP = new Map(ANIMALS.map(animal => [animal.id, animal]));

const HUNT_LURE_LOOKUP = new Map(
  Object.entries(HUNT_LURES).map(([areaKey, data]) => [data.itemId, areaKey]),
);

const AURORA_EVENT_KEY = 'AuroraTundra';
const AREA_EVENT_LABEL = {
  [AURORA_EVENT_KEY]: 'Christmas',
};

const FARM_PLANTS = [
  {
    plantName: 'Wheat',
    seedId: 'WheatSeed',
    cropId: 'Sheaf',
    cropLabel: 'Sheafs',
    produceRange: { min: 2, max: 5 },
    seedReturns: [
      { amount: 2, chance: 0.05 },
      { amount: 1, chance: 0.75 },
    ],
  },
  {
    plantName: 'Potato',
    seedId: 'PotatoSeed',
    cropId: 'Potato',
    cropLabel: 'Potatoes',
    produceRange: { min: 1, max: 3 },
    seedReturns: [
      { amount: 2, chance: 0.01 },
      { amount: 1, chance: 0.89 },
    ],
  },
  {
    plantName: 'White Cabbage',
    seedId: 'WhiteCabbageSeed',
    cropId: 'WhiteCabbage',
    cropLabel: 'White Cabbages',
    masteryLevel: 30,
    produceRange: { min: 1, max: 1 },
    seedReturns: [
      { amount: 2, chance: 0.05 },
      { amount: 1, chance: 0.75 },
    ],
  },
  {
    plantName: 'Pumpkin',
    seedId: 'PumpkinSeed',
    cropId: 'Pumpkin',
    cropLabel: 'Pumpkins',
    masteryLevel: 30,
    produceRange: { min: 1, max: 1 },
    seedReturns: [
      { amount: 2, chance: 0.04 },
      { amount: 1, chance: 0.7 },
    ],
  },
  {
    plantName: 'Melon',
    seedId: 'MelonSeed',
    cropId: 'Melon',
    cropLabel: 'Melons',
    masteryLevel: 60,
    produceRange: { min: 1, max: 1 },
    seedReturns: [
      { amount: 2, chance: 0.03 },
      { amount: 1, chance: 0.5 },
    ],
  },
  {
    plantName: 'Star Fruit',
    seedId: 'StarFruitSeed',
    cropId: 'StarFruit',
    cropLabel: 'Star Fruits',
    masteryLevel: 60,
    produceRange: { min: 1, max: 1 },
    seedReturns: [
      { amount: 2, chance: 0.02 },
      { amount: 1, chance: 0.45 },
    ],
  },
  {
    plantName: 'Ornament Berry',
    seedId: 'OrnamentBerrySeed',
    cropId: 'OrnamentBerry',
    cropLabel: 'Ornament Berries',
    event: 'Christmas',
    produceRange: { min: 5, max: 10 },
    seedReturns: [],
  },
];

const FARM_PLANT_BY_SEED = new Map(
  FARM_PLANTS.map(plant => [plant.seedId, plant]),
);
const FARM_PLANT_BY_CROP = new Map(
  FARM_PLANTS.map(plant => [plant.cropId, plant]),
);

const ITEM_USAGE_DETAILS = {
  Padlock: {
    summary: 'Locks your wallet so every /rob attempt automatically fails.',
    fields: [
      {
        label: 'Duration',
        value:
          '24 hours of protection. You must wait for the timer to end before using another padlock.',
      },
      {
        label: 'Stacking',
        value: 'Effect does not stack; additional padlocks cannot be activated while one is active.',
      },
    ],
    bullets: [
      'Landmines can still be armed alongside the padlock for extra deterrence.',
      'A DM reminder is sent when the padlock breaks, provided your DMs are open.',
    ],
  },
  Landmine: {
    summary: 'Arms an explosive trap on your wallet for would-be robbers.',
    fields: [
      { label: 'Duration', value: 'Up to 24 hours or until a robber triggers it.' },
      {
        label: 'Trigger',
        value:
          'When a /rob happens there is a 50% chance the robber instantly dies and the attempt ends.',
      },
    ],
    bullets: [
      'Only one landmine may be active at a time.',
      'If the robber survives the blast the robbery continues without the landmine.',
    ],
  },
  AnimalDetector: {
    summary: 'Adds guaranteed-success charges to /hunt.',
    fields: [
      {
        label: 'Effect',
        value: 'Each detector grants 20 guaranteed successful hunts.',
      },
      {
        label: 'Stacking',
        value: 'Charges stack with no cap and persist until they are spent.',
      },
      {
        label: 'Consumption',
        value: 'One charge is consumed before each hunt roll; unused charges survive restarts.',
      },
    ],
  },
  XPSoda: {
    summary: 'Doubles chat XP gains for a player.',
    fields: [
      {
        label: 'Duration',
        value: '3 hours per soda. Re-using before expiry extends the remaining time.',
      },
      { label: 'Targeting', value: 'Can be used on yourself or another player.' },
      {
        label: 'Stacking',
        value: 'Multiplier stays at ×2; additional sodas only extend the timer.',
      },
    ],
    bullets: ['Affects all chat XP sources, including Cookies, Candy Canes, and Gingerbread Men.'],
  },
  CoinPotion: {
    summary: 'Applies a +50% coin boost.',
    fields: [
      {
        label: 'Duration',
        value: '30 minutes per potion. Drinking another adds 30 minutes to the timer.',
      },
      {
        label: 'Scope',
        value: 'Impacts every command that awards coins, such as /hunt, /dig, /beg, and /rob.',
      },
      {
        label: 'Stacking',
        value: 'Boost amount stays at +50%; only the remaining duration increases.',
      },
    ],
  },
  LuckyPotion: {
    summary: 'Improves luck-driven outcomes like rare animals and drops.',
    fields: [
      {
        label: 'Effect',
        value: '+30% luck bonus for hunts, digs, begs, and other rolls.',
      },
      {
        label: 'Duration',
        value: '30 minutes per potion with additive duration when you chain them.',
      },
      {
        label: 'Stacking',
        value: 'The luck bonus stays at +30%; re-using extends the expiration time.',
      },
    ],
    bullets: ['Stacks with other luck sources such as Good List, cosmetics, and mastery bonuses.'],
  },
  UltraLuckyPotion: {
    summary: 'Supercharges your luck and forces success chances to their cap.',
    fields: [
      {
        label: 'Effect',
        value: '+100% luck bonus and all hunts/digs/begs ignore RNG failure (except death rolls).',
      },
      {
        label: 'Duration',
        value: '10 minutes per potion. Using another extends the forced-success window.',
      },
      {
        label: 'Stacking',
        value: 'Luck bonus remains +100%; additional potions only add time.',
      },
    ],
  },
  RobberBag: {
    summary: 'Prepares guaranteed payouts for upcoming /rob attempts.',
    fields: [
      { label: 'Charges', value: 'Each bag adds 10 charges; multiple bags add together.' },
      {
        label: 'Effect',
        value: 'While a charge is available, any successful /rob steals at least 25% of the target wallet.',
      },
      {
        label: 'Persistence',
        value: 'Charges have no time limit and are spent even on failed attempts.',
      },
    ],
  },
  BoltCutter: {
    summary: 'Cuts through an active padlock.',
    fields: [
      {
        label: 'Targeting',
        value: 'Use it on yourself to remove your padlock or specify another user to break theirs.',
      },
      {
        label: 'Restrictions',
        value: 'Cannot target bots or users without an active padlock.',
      },
      {
        label: 'Consumption',
        value: 'Consumes one cutter per use and must be used one at a time.',
      },
    ],
    bullets: ['Lets you rob protected players or free yourself to activate a new padlock sooner.'],
  },
  GingerbreadMan: {
    summary: 'Instantly grants chat levels.',
    fields: [
      { label: 'Base Effect', value: 'Each gingerbread gives 1 full chat level.' },
      {
        label: 'Bonus Chance',
        value: '5% sugar-rush chance per gingerbread to add +9 extra levels (for +10 total).',
      },
      { label: 'Targeting', value: 'Can be eaten yourself or gifted to another player.' },
    ],
    bullets: [
      'Respects the global chat level cap (9999).',
      'Temporarily pauses active XP boosts while levels are applied so they are not lost.',
    ],
  },
  CupOfMilk: {
    summary: 'Shortens command cooldowns.',
    fields: [
      {
        label: 'Effect',
        value: 'Reduces cooldowns by 10% per cup (additive).',
      },
      {
        label: 'Duration',
        value: 'Lasts 20 minutes; drinking more adds reduction and refreshes the expiration.',
      },
      {
        label: 'Limits',
        value: 'Cooldowns cannot drop below 10% of their normal value (max 90% reduction).',
      },
      { label: 'Targeting', value: 'Can be used on yourself or another player.' },
    ],
  },
  Cookie: {
    summary: 'A small burst of chat XP.',
    fields: [
      { label: 'Effect', value: 'Grants 100 chat XP immediately.' },
      { label: 'Targeting', value: 'Use on yourself or feed to another player.' },
      {
        label: 'Interactions',
        value: 'Benefits from active XP multipliers such as XP Soda.',
      },
    ],
  },
  CandyCane: {
    summary: 'Large chat XP gain with a chance to skip levels.',
    fields: [
      { label: 'Base Reward', value: '2,500 chat XP per cane.' },
      {
        label: 'Bonus Chance',
        value: '2% chance per cane to skip directly to the next chat level instead of XP.',
      },
      { label: 'Targeting', value: 'Can be given to other players.' },
    ],
    bullets: ['Instant level skips respect the level cap and preserve active XP boosts.'],
  },
  ChristmasBattlePassGift: {
    summary: 'Opens five weighted holiday rewards per gift.',
    fields: [
      {
        label: 'Rolls',
        value: 'Each gift performs 5 independent pulls from the festive loot table.',
      },
      {
        label: 'Delivery',
        value: 'Currencies are deposited immediately; items and lures go straight into your inventory.',
      },
    ],
  },
  SnowBall: {
    summary: 'Sabotages another player’s luck-based commands.',
    fields: [
      {
        label: 'Effect',
        value: 'Forces /hunt, /dig, and /beg to fail while active.',
      },
      {
        label: 'Duration',
        value: '30 seconds per snowball; additional throws extend the timer.',
      },
      { label: 'Restrictions', value: 'Must target another non-bot user.' },
    ],
  },
  GoodList: {
    summary: 'Blesses a player with hefty luck.',
    fields: [
      {
        label: 'Effect',
        value: '+69% luck bonus applied to the target for all luck-based rolls.',
      },
      {
        label: 'Duration',
        value: '24 hours. Re-using it on someone already blessed adds another 24 hours.',
      },
      {
        label: 'Cooldown',
        value: '30-hour personal cooldown before you can use another Good List.',
      },
      { label: 'Targeting', value: 'May be used on yourself or another player.' },
    ],
  },
  NaughtyList: {
    summary: 'Curses another player with brutal penalties.',
    fields: [
      {
        label: 'Effect',
        value:
          'Caps /hunt, /dig, and /beg success chance around 1% and halves coin income while active.',
      },
      {
        label: 'Farming',
        value: 'Doubles crop growth and decay timers on the target’s farm plots.',
      },
      {
        label: 'Duration',
        value: '24 hours. Applying another adds 24 more hours to the timer.',
      },
      {
        label: 'Cooldown',
        value: '30-hour personal cooldown before you can use another Naughty List.',
      },
      { label: 'Restrictions', value: 'Cannot target yourself or bots.' },
    ],
    bullets: [
      'Also suppresses most luck bonuses and makes coin boosts 90% weaker.',
    ],
  },
  DiamondBag: {
    summary: 'Cracks open into an immediate diamond payout.',
    fields: [
      { label: 'Reward', value: '10,000 Diamonds per bag.' },
      { label: 'Delivery', value: 'Diamonds are added straight to your balance.' },
      { label: 'Notes', value: 'Not affected by any multipliers.' },
    ],
  },
  DiamondCrate: {
    summary: 'A larger diamond stash.',
    fields: [
      { label: 'Reward', value: '135,000 Diamonds per crate.' },
      { label: 'Delivery', value: 'Deposited instantly into your diamond balance.' },
      { label: 'Notes', value: 'No multipliers apply.' },
    ],
  },
  DiamondChest: {
    summary: 'The biggest diamond container.',
    fields: [
      { label: 'Reward', value: '980,000 Diamonds per chest.' },
      { label: 'Delivery', value: 'Deposited instantly into your diamond balance.' },
      { label: 'Notes', value: 'No multipliers apply.' },
    ],
  },
  BanHammer: {
    summary: 'Administrative tool that locks someone out of the bot.',
    fields: [
      {
        label: 'Effect',
        value: 'Prevents the target from using any command for 24 hours.',
      },
      {
        label: 'Restrictions',
        value: 'Cannot target yourself and is intended for staff use only.',
      },
      { label: 'Consumption', value: 'Consumes one Ban Hammer on use.' },
    ],
  },
  BulletBox: {
    summary: 'Refills ammunition for hunting rifles.',
    fields: [
      { label: 'Reward', value: 'Adds 6 Bullets to your inventory per box.' },
      {
        label: 'Usage',
        value: 'Bullets are consumed by /hunt; stockpiles stack with multiple boxes.',
      },
      { label: 'Notes', value: 'The box is consumed immediately on use.' },
    ],
  },
  Shovel: {
    summary: 'Basic digging tool required for /dig.',
    fields: [
      {
        label: 'Usage',
        value: 'Equip it from the dig equipment menu; every dig attempt consumes 1 durability.',
      },
      { label: 'Durability', value: 'Starts with 50 durability (50 digs) before breaking.' },
      {
        label: 'Notes',
        value: 'When it breaks you must equip another shovel to continue digging.',
      },
    ],
  },
};

const ITEM_USAGE_BOOST_RULES = {
  XPSoda: [{ percent: 100, search: /Doubles XP gains/i }],
  CoinPotion: [{ percent: 50, search: /coin earnings/i }],
  LuckyPotion: [
    {
      percent: 30,
      search: /Increases luck/i,
      cleanup: /\s+by\s+\d+%/i,
    },
  ],
  UltraLuckyPotion: [{ percent: 100, search: /Boosts luck/i }],
};

const ADDITIONAL_USAGE_GENERATORS = {
  HarvestScythe: item => {
    const durability = Number.isFinite(item?.durability)
      ? formatNumber(item.durability)
      : '25';
    return [
      {
        command: '/farm-view',
        summary: 'Required tool for harvesting grown crops.',
        fields: [
          {
            label: 'How to use',
            value:
              'Open `/farm-view`, select the ripe plots, and press **Harvest**. A scythe must be in your inventory to finish the action.',
          },
          {
            label: 'Durability',
            value: `${durability} harvests before it breaks (1 durability per harvested plot).`,
          },
        ],
        bullets: ['Also clears dead crops so you can replant immediately.'],
      },
    ];
  },
  WateringCan: item => {
    const durability = Number.isFinite(item?.durability)
      ? formatNumber(item.durability)
      : '10';
    return [
      {
        command: '/farm-view',
        summary: 'Keeps planted crops hydrated.',
        fields: [
          {
            label: 'How to use',
            value:
              'Choose **Water** in `/farm-view`, pick the plots you want, and confirm to hydrate them.',
          },
          {
            label: 'Effect',
            value:
              'Prevents planted crops from drying out; empty plots stay watered for about an hour.',
          },
          {
            label: 'Durability',
            value: `${durability} watering actions before the can breaks (1 durability per watering).`,
          },
        ],
      },
    ];
  },
  HuntingRifleT1: item => {
    const durability = Number.isFinite(item?.durability)
      ? formatNumber(item.durability)
      : '50';
    return [
      {
        command: '/hunt',
        summary: 'Starter rifle that lets you go hunting.',
        fields: [
          {
            label: 'Equip',
            value: 'Open `/hunt`, head to **Equipment**, and select this rifle in the gun dropdown.',
          },
          {
            label: 'Targets',
            value: 'Supports Common and many Rare animals. Upgrade to higher tiers for rarer finds.',
          },
          {
            label: 'Durability',
            value: `${durability} hunts before the rifle breaks (1 durability per hunt).`,
          },
        ],
      },
    ];
  },
  HuntingRifleT2: item => {
    const durability = Number.isFinite(item?.durability)
      ? formatNumber(item.durability)
      : '75';
    return [
      {
        command: '/hunt',
        summary: 'Advanced rifle for rarer animals.',
        fields: [
          {
            label: 'Equip',
            value: 'Select it from the rifle dropdown in `/hunt` → Equipment.',
          },
          {
            label: 'Unlocks',
            value: 'Allows Epic and Legendary animals to appear in addition to lower rarities.',
          },
          {
            label: 'Bonuses',
            value: 'Reduces the `/hunt` cooldown by 10% while equipped.',
          },
          {
            label: 'Durability',
            value: `${durability} hunts before the rifle breaks (1 durability per hunt).`,
          },
        ],
      },
    ];
  },
  HuntingRifleT3: item => {
    const durability = Number.isFinite(item?.durability)
      ? formatNumber(item.durability)
      : '100';
    return [
      {
        command: '/hunt',
        summary: 'Top-tier rifle for mythical hunts.',
        fields: [
          {
            label: 'Equip',
            value: 'Pick it in the rifle dropdown from `/hunt` → Equipment.',
          },
          {
            label: 'Unlocks',
            value:
              'Lets Mythical and Godly animals spawn. Secret animals appear once you reach Hunt Mastery 100.',
          },
          {
            label: 'Bonuses',
            value: 'Cuts the `/hunt` cooldown by 25% while equipped.',
          },
          {
            label: 'Durability',
            value: `${durability} hunts before the rifle breaks (1 durability per hunt).`,
          },
        ],
      },
    ];
  },
  Bullet: () => [
    {
      command: '/hunt',
      summary: 'Standard ammunition for hunts.',
      fields: [
        {
          label: 'Consumption',
          value:
            'Each `/hunt` attempt consumes 1 bullet before the result roll. Hunt Mastery Lv.20 adds a 25% refund chance.',
        },
        {
          label: 'Equip',
          value: 'Switch bullet types from `/hunt` → Equipment → Bullet.',
        },
        {
          label: 'Restocking',
          value: 'Open Bullet Boxes or purchase more from the rotating shop when they appear.',
        },
      ],
    },
  ],
};

function renderUsageDetails(detail) {
  if (!detail) return null;
  if (typeof detail === 'string') return detail.trim();
  const parts = [];
  if (detail.summary) parts.push(String(detail.summary).trim());
  if (Array.isArray(detail.fields)) {
    for (const field of detail.fields) {
      if (!field || !field.value) continue;
      const label = field.label ? String(field.label).trim() : '';
      const value = String(field.value).trim();
      parts.push(label ? `- **${label}:** ${value}` : `- ${value}`);
    }
  }
  if (Array.isArray(detail.bullets)) {
    for (const bullet of detail.bullets) {
      if (!bullet) continue;
      parts.push(`- ${String(bullet).trim()}`);
    }
  }
  if (Array.isArray(detail.sections)) {
    for (const section of detail.sections) {
      if (!section) continue;
      const title = section.title ? `**${String(section.title).trim()}:**` : '';
      const items = Array.isArray(section.items)
        ? section.items.map(item => (item ? `  - ${String(item).trim()}` : '')).filter(Boolean)
        : [];
      if (title) parts.push(title);
      if (items.length) parts.push(...items);
    }
  }
  if (detail.footer) parts.push(String(detail.footer).trim());
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function formatDisplayEmoji(rawEmoji) {
  if (!rawEmoji || typeof rawEmoji !== 'string') return '';
  const trimmed = rawEmoji.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^<(a?):([^:>]+):(\d+)>$/);
  if (match) {
    const [, animated, name, id] = match;
    const prefix = animated === 'a' ? 'a' : '';
    return `<${prefix}:${name}:${id}>`;
  }
  return trimmed;
}

function applyItemHeadingEmoji(item) {
  const emoji = formatDisplayEmoji(item?.emoji);
  return emoji ? `${emoji} ${item.name}` : item.name;
}

const ALL_ITEMS = new Map();
for (const item of Object.values(ITEMS)) {
  if (!item || !item.id) continue;
  const normalized = {
    ...item,
    name: item.name || item.id,
    types: Array.isArray(item.types) ? item.types : [],
  };
  ALL_ITEMS.set(item.id, normalized);
}
const DIG_ITEM_LOOKUP = new Map();
for (const item of DIG_ITEMS) {
  if (!item || !item.id) continue;
  DIG_ITEM_LOOKUP.set(item.id, item);
  if (!ALL_ITEMS.has(item.id)) {
    ALL_ITEMS.set(item.id, {
      ...item,
      types: Array.isArray(item.types) ? item.types : [],
    });
  }
}
const AUTOCOMPLETE_ITEMS = Array.from(ALL_ITEMS.values()).sort((a, b) =>
  a.name.localeCompare(b.name),
);

function findItem(query) {
  if (!query) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;
  const direct = ALL_ITEMS.get(trimmed);
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  for (const item of ALL_ITEMS.values()) {
    if (item.id.toLowerCase() === lower) return item;
  }
  for (const item of ALL_ITEMS.values()) {
    if (item.name && item.name.toLowerCase() === lower) return item;
  }
  for (const item of ALL_ITEMS.values()) {
    if (item.name && item.name.toLowerCase().includes(lower)) return item;
  }
  return null;
}

function resolveAccentColor(item) {
  if (!item) return 0xffffff;
  return RARITY_COLORS[item.rarity] || 0xffffff;
}

function resolveThumbnailUrl(item) {
  if (!item) return null;
  if (item.image) return item.image;
  if (!item.emoji) return null;
  const match = item.emoji.match(/^<(?<animated>a?):[^:>]+:(?<id>\d+)>$/);
  if (match && match.groups && match.groups.id) {
    const animated = match.groups.animated === 'a';
    const ext = animated ? 'gif' : 'png';
    return `https://cdn.discordapp.com/emojis/${match.groups.id}.${ext}?size=96&quality=lossless`;
  }
  return null;
}

function computeInventoryTotals(itemId, userStats) {
  let total = 0;
  let discovered = false;
  for (const stats of Object.values(userStats || {})) {
    if (!stats) continue;
    if (stats.inventory) normalizeInventory(stats);
    const inventory = Array.isArray(stats.inventory) ? stats.inventory : [];
    const owned = inventory.find(entry => entry && entry.id === itemId);
    if (owned && owned.amount) {
      total += owned.amount;
      if (owned.amount > 0) discovered = true;
    }
    if (discovered) continue;
    if (Array.isArray(stats.dig_discover) && stats.dig_discover.includes(itemId)) {
      discovered = true;
      continue;
    }
    if (Array.isArray(stats.hunt_discover) && stats.hunt_discover.includes(itemId)) {
      discovered = true;
    }
  }
  return { total, discovered };
}

function formatChance(chance) {
  if (!Number.isFinite(chance) || chance <= 0) return null;
  let percent = chance;
  if (percent <= 1) percent *= 100;
  if (percent > 100) return { percent: null, ratio: null, raw: chance };
  const ratio = percent > 0 ? Math.max(1, Math.round(100 / percent)) : null;
  const precision = percent < 1 ? 2 : percent < 10 ? 1 : 0;
  const formatted = percent
    .toFixed(precision)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*[1-9])0+$/, '$1');
  return {
    percent: formatted,
    ratio,
    raw: chance,
  };
}

function getLimitedObtainmentEvent(item) {
  if (!item) return null;
  const direct = typeof item.limitedEvent === 'string' ? item.limitedEvent.trim() : '';
  if (direct) return direct;
  const nested =
    item.obtainment && typeof item.obtainment.limitedEvent === 'string'
      ? item.obtainment.limitedEvent.trim()
      : '';
  if (nested) return nested;
  return null;
}

function buildDigObtainment(item) {
  const digInfo = DIG_ITEM_LOOKUP.get(item.id);
  if (!digInfo) return null;
  const chanceInfo = formatChance(digInfo.chance);
  if (!chanceInfo) {
    return 'Unearth this item by successfully using `/dig`. Its base drop chance is currently unspecified and scales with your luck bonuses.';
  }
  if (chanceInfo.percent) {
    const ratioText = chanceInfo.ratio ? ` (roughly 1 in ${chanceInfo.ratio})` : '';
    const intro = 'Unearth this item through successful runs of `/dig`.';
    return `${intro} Each victory roll has a base ${chanceInfo.percent}% chance${ratioText} to reveal it before luck adjustments.`;
  }
  return 'Unearth this item by successfully using `/dig`. It uses a weighted loot roll, and higher luck increases the odds.';
}

function buildCoinShopOptionalDetail(item) {
  const optional = COIN_SHOP_OPTIONAL_LOOKUP.get(item.id);
  if (!optional) return null;
  const chanceInfo = formatChance(optional.chance);
  let chanceLine;
  if (chanceInfo && chanceInfo.percent) {
    const ratioText = chanceInfo.ratio ? ` (~1 in ${chanceInfo.ratio})` : '';
    chanceLine = `Each hourly coin shop rotation has a base ${chanceInfo.percent}% chance${ratioText} to stock this item.`;
  } else {
    chanceLine = 'Each hourly coin shop rotation uses weighted odds to decide if this item appears.';
  }
  const min = Number.isFinite(optional.min) ? optional.min : null;
  const max = Number.isFinite(optional.max) ? optional.max : min;
  let stackLine = '';
  if (min && max) {
    if (min === max) {
      const unitLabel = min === 1 ? 'item' : 'items';
      stackLine = ` It appears in stacks of ${formatNumber(min)} ${unitLabel}.`;
    } else {
      stackLine = ` It appears in stacks of ${formatNumber(min)}-${formatNumber(max)} items.`;
    }
  }
  return `${chanceLine}${stackLine}`.trim();
}

function buildSeedReplacementDetail(item) {
  const replacement = COIN_SHOP_SEED_LOOKUP.get(item.id);
  if (!replacement) return null;
  const chanceInfo = formatChance(replacement.chance);
  if (chanceInfo && chanceInfo.percent) {
    const ratioText = chanceInfo.ratio ? ` (~1 in ${chanceInfo.ratio})` : '';
    return `Each hourly coin shop restock rolls a base ${chanceInfo.percent}% chance${ratioText} for a basic seed slot to upgrade into ${item.name}.`;
  }
  return 'Each hourly coin shop restock uses weighted odds to upgrade a seed slot into this item.';
}

function buildAdditionalChanceDetails(item) {
  const details = [];
  const optionalDetail = buildCoinShopOptionalDetail(item);
  if (optionalDetail) details.push(optionalDetail);
  const seedDetail = buildSeedReplacementDetail(item);
  if (seedDetail) details.push(seedDetail);
  return details;
}

function appendEmoji(text, emoji) {
  const formatted = formatDisplayEmoji(emoji);
  return formatted ? `${text} ${formatted}` : text;
}

function formatCurrencyRange(min, max, singular, plural, emoji) {
  if (!Number.isFinite(min) && !Number.isFinite(max)) return appendEmoji(plural, emoji);
  const first = Number.isFinite(min) ? min : max;
  const second = Number.isFinite(max) ? max : min;
  if (!Number.isFinite(first) || !Number.isFinite(second)) return appendEmoji(plural, emoji);
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  if (low === high) {
    const unit = low === 1 ? singular : plural;
    return appendEmoji(`${formatNumber(low)} ${unit}`, emoji);
  }
  return appendEmoji(`${formatNumber(low)}–${formatNumber(high)} ${plural}`, emoji);
}

function formatItemRange(min, max, name, emoji) {
  if (!Number.isFinite(min) && !Number.isFinite(max)) return appendEmoji(name, emoji);
  const first = Number.isFinite(min) ? min : max;
  const second = Number.isFinite(max) ? max : min;
  if (!Number.isFinite(first) || !Number.isFinite(second)) return appendEmoji(name, emoji);
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  if (low === high) {
    return appendEmoji(`${formatNumber(low)} × ${name}`, emoji);
  }
  return appendEmoji(`${formatNumber(low)}–${formatNumber(high)} × ${name}`, emoji);
}

function resolveContainerEntryChance(entry, totalWeight) {
  if (!entry) return null;
  const explicit = Number(entry.chance);
  if (Number.isFinite(explicit) && explicit > 0) return formatChance(explicit);
  const weight = Number(entry.weight);
  if (Number.isFinite(weight) && weight > 0 && Number.isFinite(totalWeight) && totalWeight > 0) {
    return formatChance(weight / totalWeight);
  }
  return null;
}

function formatContainerEntryLabel(entry) {
  if (!entry) return 'Reward';
  if (entry.label) return String(entry.label).trim();
  switch (entry.type) {
    case 'coins':
      return 'Coins';
    case 'diamonds':
      return 'Diamonds';
    case 'snowflakes':
      return 'Snowflakes';
    case 'deluxeCoins':
      return 'Deluxe Coins';
    case 'item': {
      const base = ITEMS[entry.id];
      return base?.name || entry.id || 'Item';
    }
    case 'lure':
      return 'Hunting Lures';
    default:
      return 'Reward';
  }
}

function formatContainerEntryAmount(entry) {
  if (!entry) return 'Unknown amount';
  const { min, max } = entry;
  switch (entry.type) {
    case 'coins':
      return formatCurrencyRange(min, max, 'Coin', 'Coins', COIN_EMOJI);
    case 'diamonds':
      return formatCurrencyRange(min, max, 'Diamond', 'Diamonds', DIAMOND_EMOJI);
    case 'snowflakes':
      return formatCurrencyRange(min, max, 'Snowflake', 'Snowflakes', SNOWFLAKE_EMOJI);
    case 'deluxeCoins':
      return formatCurrencyRange(min, max, 'Deluxe Coin', 'Deluxe Coins', DELUXE_COIN_EMOJI);
    case 'item': {
      const base = ITEMS[entry.id];
      const name = base?.name || entry.id || 'Item';
      return formatItemRange(min, max, name, base?.emoji);
    }
    case 'lure': {
      const label = entry.label || 'Hunting lure';
      return formatItemRange(min, max, label, null);
    }
    default: {
      const label = entry.label || 'Reward';
      return formatItemRange(min, max, label, null);
    }
  }
}

function buildContainerLootSection(item, totals) {
  if (!item || !Array.isArray(item.types) || !item.types.includes('Container')) return null;
  if (item.rarity === 'Secret' && !totals?.discovered) return '## Container Rewards: ?';
  const table = getContainerLootTable(item.id);
  if (!table) return null;
  const entries = Array.isArray(table.entries) ? table.entries.filter(Boolean) : [];
  if (!entries.length) return null;
  const totalWeight = entries.reduce((sum, entry) => {
    const weight = Number(entry?.weight);
    return weight > 0 ? sum + weight : sum;
  }, 0);
  const headerParts = [];
  if (Number.isFinite(table.rolls) && table.rolls > 1) {
    headerParts.push(`Each use performs ${formatNumber(table.rolls)} independent rolls.`);
    headerParts.push('Chances listed are per roll.');
  }
  const lines = entries.map(entry => {
    const chanceInfo = resolveContainerEntryChance(entry, totalWeight);
    let chanceText = 'Weighted odds';
    if (chanceInfo && chanceInfo.percent) {
      const ratioText = chanceInfo.ratio && chanceInfo.ratio > 1 ? ` (~1 in ${chanceInfo.ratio})` : '';
      chanceText = `${chanceInfo.percent}%${ratioText}`;
    }
    const label = formatContainerEntryLabel(entry);
    const amount = formatContainerEntryAmount(entry);
    const notes = [];
    if (Array.isArray(entry.pool) && entry.pool.length) {
      const poolNames = entry.pool
        .map(id => ITEMS[id]?.name || id)
        .filter(Boolean);
      if (poolNames.length) notes.push(`Random type: ${poolNames.join(', ')}`);
    }
    if (entry.note) notes.push(String(entry.note));
    const noteText = notes.length ? ` (${notes.join('; ')})` : '';
    return `* **${label}:** ${chanceText} chance for ${amount}${noteText}.`;
  });
  const header = headerParts.length ? `${headerParts.join(' ')}\n` : '';
  return `## Container Rewards:\n${header}${lines.join('\n')}`;
}

function formatChanceTextValue(chance) {
  const info = formatChance(chance);
  if (!info || !info.percent) return null;
  const ratioText = info.ratio && info.ratio > 1 ? ` (~1 in ${info.ratio})` : '';
  return `${info.percent}%${ratioText}`;
}

function formatProduceRangeText(plant) {
  if (!plant || !plant.produceRange) return null;
  const { min, max } = plant.produceRange;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min === max) {
    const unit = plant.cropLabel || 'crops';
    const amount = formatNumber(min);
    return `${amount} ${unit}`;
  }
  const unit = plant.cropLabel || 'crops';
  return `${formatNumber(min)}–${formatNumber(max)} ${unit}`;
}

function formatSeedReturnDetails(plant) {
  if (!plant) return '';
  const returns = Array.isArray(plant.seedReturns) ? plant.seedReturns : [];
  if (returns.length === 0) return '';
  const fragments = returns
    .map(entry => {
      if (!entry || !Number.isFinite(entry.amount)) return null;
      const text = formatChanceTextValue(entry.chance);
      if (!text) return null;
      const suffix = entry.amount === 1 ? 'seed' : 'seeds';
      return `${text} for ${entry.amount} extra ${suffix}`;
    })
    .filter(Boolean);
  const totalChance = returns.reduce((sum, entry) => sum + (entry.chance || 0), 0);
  const noneChance = Math.max(0, 1 - totalChance);
  if (noneChance > 0.0001) {
    const text = formatChanceTextValue(noneChance);
    if (text) fragments.push(`${text} for no seeds returned`);
  }
  return fragments.join('; ');
}

function buildFarmObtainment(item) {
  if (!item) return null;
  const plant = FARM_PLANT_BY_SEED.get(item.id);
  const produce = FARM_PLANT_BY_CROP.get(item.id);
  if (!plant && !produce) return null;
  const lines = [];
  let limitedEvent = null;
  if (plant) {
    const cropRange = formatProduceRangeText(plant);
    const seedDetails = formatSeedReturnDetails(plant);
    lines.push(
      `Plant these seeds on your farm using \`/farm-view\`. Each seed fills one empty plot and grows into ${plant.plantName}.`,
    );
    if (cropRange) {
      lines.push(
        `Fully grown ${plant.plantName} yield ${cropRange} per harvest. These values are before any inventory or mastery bonuses.`,
      );
    }
    if (seedDetails) {
      lines.push(`Harvesting has ${seedDetails}.`);
    }
    if (plant.masteryLevel) {
      lines.push(`Requires Farm Mastery Lv.${plant.masteryLevel} or higher to plant.`);
    }
    if (Number.isFinite(item.price) && item.price > 0) {
      lines.push(
        `Shop rotations sometimes sell these for ${formatNumber(item.price)} Coins ${COIN_EMOJI} per package.`,
      );
    }
    if (plant.event) limitedEvent = plant.event;
  } else if (produce) {
    const cropRange = formatProduceRangeText(produce);
    const seedDetails = formatSeedReturnDetails(produce);
    lines.push(
      `Harvest fully grown ${produce.plantName} via \`/farm-view\` to collect this crop.`,
    );
    if (cropRange) {
      lines.push(`Each harvested plot awards ${cropRange}.`);
    }
    if (seedDetails) {
      const seedItem = ITEMS[produce.seedId];
      const seedName = seedItem ? seedItem.name : 'its seeds';
      lines.push(`Harvests also roll seed returns (${seedDetails}) to keep ${seedName} stocked.`);
    }
    if (produce.event) limitedEvent = produce.event;
  }
  return {
    description: lines.join('\n\n'),
    limitedEvent,
  };
}

function buildHuntObtainment(item) {
  const animal = ANIMAL_LOOKUP.get(item?.id);
  if (!animal) return null;
  const areaEntries = Object.entries(animal.chances || {});
  const lines = [];
  const activeAreas = new Set();
  for (const [areaKey, chanceList] of areaEntries) {
    if (!Array.isArray(chanceList)) continue;
    const filtered = chanceList
      .map((value, index) => ({ value: Number(value) || 0, index }))
      .filter(entry => entry.value > 0);
    if (!filtered.length) continue;
    const areaInfo = AREA_BY_KEY[areaKey] || { name: areaKey };
    activeAreas.add(areaKey);
    const tierChunks = filtered.map(entry => {
      const chanceText = formatChanceTextValue(entry.value);
      const tierLabel = `Tier ${entry.index + 1}`;
      return chanceText ? `${tierLabel}: ${chanceText}` : `${tierLabel}: weighted`;
    });
    if (tierChunks.length) {
      lines.push(`- ${areaInfo.name}: ${tierChunks.join('; ')}`);
    }
  }
  if (!lines.length) {
    return {
      description:
        'Track this animal through `/hunt`. Its base appearance rate is tied to rifle tier and luck but exact chances are currently unknown.',
      limitedEvent: null,
    };
  }
  let limitedEvent = null;
  if (activeAreas.size === 1) {
    const [onlyArea] = activeAreas;
    if (AREA_EVENT_LABEL[onlyArea]) limitedEvent = AREA_EVENT_LABEL[onlyArea];
  }
  const intro =
    'Track this animal through `/hunt`. Successful hunts roll the following base odds before luck, detectors, or lure bonuses:';
  return {
    description: `${intro}\n${lines.join('\n')}`,
    limitedEvent,
  };
}

function buildFarmUsageContexts(item) {
  const plant = FARM_PLANT_BY_SEED.get(item?.id);
  if (!plant) return [];
  const contexts = [];
  const cropRange = formatProduceRangeText(plant);
  const seedDetails = formatSeedReturnDetails(plant);
  const fields = [
    {
      label: 'Planting',
      value: 'Open `/farm-view`, choose **Plant**, select empty plots, and pick these seeds.',
    },
    {
      label: 'Watering',
      value: 'Keep the plots watered so the crop does not dry out before harvest.',
    },
  ];
  if (cropRange) {
    fields.push({
      label: 'Harvest',
      value: `Fully grown ${plant.plantName} yield ${cropRange} per plot.`,
    });
  }
  if (seedDetails) {
    fields.push({
      label: 'Seed return',
      value: `Harvests have ${seedDetails}.`,
    });
  }
  const bullets = [];
  if (plant.masteryLevel) {
    bullets.push(`Requires Farm Mastery Lv.${plant.masteryLevel} or higher to plant.`);
  }
  if (plant.event) {
    bullets.push(`Only available during the ${plant.event} event.`);
  }
  contexts.push({
    command: '/farm-view',
    summary: `Plant to grow ${plant.plantName}.`,
    fields,
    bullets,
  });
  return contexts;
}

function buildHuntLureUsageContexts(item) {
  const areaKey = HUNT_LURE_LOOKUP.get(item?.id);
  if (!areaKey) return [];
  const areaInfo = AREA_BY_KEY[areaKey] || { name: areaKey };
  return [
    {
      command: '/hunt',
      summary: `Doubles rare-animal weights while hunting in ${areaInfo.name}.`,
      fields: [
        {
          label: 'Equip',
          value: 'Open `/hunt`, go to **Equipment**, and activate the lure slot with this item.',
        },
        {
          label: 'Effect',
          value: 'Rare and above animals in that area roll at double weight for each successful hunt.',
        },
        {
          label: 'Charges',
          value: 'Each lure grants 20 successful hunts; using more lures stacks the remaining charges.',
        },
      ],
      bullets: ['Charges are tracked per area and only one lure can be active per location at a time.'],
    },
  ];
}

function getAdditionalUsageContexts(item) {
  const contexts = [];
  const generator = ADDITIONAL_USAGE_GENERATORS[item?.id];
  if (typeof generator === 'function') {
    const generated = generator(item) || [];
    if (Array.isArray(generated)) {
      contexts.push(...generated.filter(Boolean));
    } else if (generated) {
      contexts.push(generated);
    }
  }
  contexts.push(...buildFarmUsageContexts(item));
  contexts.push(...buildHuntLureUsageContexts(item));
  return contexts;
}

function getObtainmentDetails(item) {
  if (!item) {
    return { description: 'unknown', limitedEvent: null };
  }
  let limitedEvent = getLimitedObtainmentEvent(item);
  const parts = [];
  const farmInfo = buildFarmObtainment(item);
  if (farmInfo) {
    if (farmInfo.description) parts.push(farmInfo.description);
    if (!limitedEvent && farmInfo.limitedEvent) limitedEvent = farmInfo.limitedEvent;
  } else {
    const huntInfo = buildHuntObtainment(item);
    if (huntInfo) {
      if (huntInfo.description) parts.push(huntInfo.description);
      if (!limitedEvent && huntInfo.limitedEvent) limitedEvent = huntInfo.limitedEvent;
    }
    const digDescription = buildDigObtainment(item);
    if (digDescription) {
      parts.push(digDescription);
    } else if (Number.isFinite(item.price) && item.price > 0) {
      parts.push(
        `Purchase this item from the rotating shop when it appears. It costs ${formatNumber(item.price)} Coins ${COIN_EMOJI} per unit.`,
      );
    }
  }
  parts.push(...buildAdditionalChanceDetails(item));
  if (parts.length === 0) parts.push('unknown');
  return { description: parts.join('\n\n'), limitedEvent };
}

function buildKnownInfo(item, totals) {
  const rarityEmoji = formatDisplayEmoji(RARITY_EMOJIS[item.rarity]) || '';
  const heading = applyItemHeadingEmoji(item);
  const types = item.types && item.types.length ? item.types.join(', ') : 'Unknown';
  const value = Number.isFinite(item.value) ? formatNumber(item.value) : '0';
  const exists = formatNumber(totals.total || 0);
  const sellable = Number.isFinite(item.sellPrice) && item.sellPrice > 0;
  const sellPrice = sellable ? `${formatNumber(item.sellPrice)} ${COIN_EMOJI}` : 'N/A';
  return `## ${heading}\n* **Rarity:** ${item.rarity} ${rarityEmoji}\n* **Type:** ${types}\n* **Value:** ${value}\n* **Exists:** ${exists}\n* **Sell-Price:** ${sellPrice}`;
}

function buildSecretInfo(item) {
  const rarityEmoji = formatDisplayEmoji(RARITY_EMOJIS[item.rarity]) || '';
  const heading = applyItemHeadingEmoji(item);
  return `## ${heading}\n* **Rarity:** ${item.rarity} ${rarityEmoji}\n* **Type:** ?\n* **Value:** ?\n* **Exists:** ?\n* **Sell-Price:** ?`;
}

function buildObtainmentSection(item, totals) {
  if (item.rarity === 'Secret' && !totals.discovered) return '## Obtainment: ?';
  const { description, limitedEvent } = getObtainmentDetails(item);
  const suffix = limitedEvent ? ` **[LIMITED - ${limitedEvent}]**` : '';
  return `## Obtainment:\n${description}${suffix}`;
}

function buildOthersSection(item, totals) {
  if (item.rarity === 'Secret' && !totals.discovered)
    return '## Others:\n* **Total Skins:** ?';
  const skinCount = getSkinsForItem(item.id).length;
  return `## Others:\n* **Total Skins:** ${skinCount}`;
}

function applyUsageBoostRule(description, rule) {
  if (!description || typeof description !== 'string') return description;
  const percent = Number(rule?.percent);
  if (!Number.isFinite(percent) || percent <= 0) return description;
  if (description.includes(`[+${percent}%]`)) return description;
  let updated = description;
  const cleanup = rule.cleanup;
  if (cleanup instanceof RegExp) {
    updated = updated.replace(cleanup, '');
  } else if (Array.isArray(cleanup)) {
    for (const entry of cleanup) {
      if (entry instanceof RegExp) updated = updated.replace(entry, '');
    }
  }
  const search = rule.search;
  if (!(search instanceof RegExp)) return updated.trim();
  const match = updated.match(search);
  if (!match || typeof match.index !== 'number') return updated.trim();
  const insertionIndex = match.index + match[0].length;
  const before = updated.slice(0, insertionIndex);
  const after = updated.slice(insertionIndex);
  const result = `${before} [+${percent}%]${after}`;
  return result.replace(/ {2,}/g, ' ').replace(/ \n/g, '\n').trim();
}

function formatUsageDescription(item) {
  const detail = ITEM_USAGE_DETAILS[item.id];
  if (detail) {
    const rendered = renderUsageDetails(detail);
    if (rendered) return rendered;
  }
  const note = typeof item.note === 'string' ? item.note.trim() : '';
  const description = note || 'Usage details unavailable.';
  const rules = ITEM_USAGE_BOOST_RULES[item.id];
  if (!rules) return description;
  const ruleList = Array.isArray(rules) ? rules : [rules];
  return ruleList.reduce((text, rule) => applyUsageBoostRule(text, rule), description);
}

function buildUsageSection(item, totals) {
  if (!item) return null;
  if (item.rarity === 'Secret' && !totals.discovered) return '## Usage: ?';
  const sections = [];
  if (item.useable) {
    const description = formatUsageDescription(item);
    if (description) sections.push(`## Usage:\n${description}`);
  }
  const contexts = getAdditionalUsageContexts(item);
  for (const context of contexts) {
    if (!context) continue;
    const rendered = renderUsageDetails(context);
    if (!rendered) continue;
    const heading = context.command ? `## Usage in ${context.command}` : '## Usage';
    sections.push(`${heading}\n${rendered}`);
  }
  if (!sections.length) return null;
  return sections.join('\n\n');
}

async function sendItemInfo(interaction, item, resources) {
  const totals = computeInventoryTotals(item.id, resources.userStats || {});
  const accent = resolveAccentColor(item);
  const container = new ContainerBuilder().setAccentColor(accent);
  const thumbnailUrl = resolveThumbnailUrl(item);
  const headerContent =
    item.rarity === 'Secret' && !totals.discovered
      ? buildSecretInfo(item)
      : buildKnownInfo(item, totals);
  if (thumbnailUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(headerContent),
        ),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerContent),
    );
  }
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(buildObtainmentSection(item, totals)),
  );
  const containerSection = buildContainerLootSection(item, totals);
  if (containerSection) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(containerSection),
    );
  }
  const usageSection = buildUsageSection(item, totals);
  if (usageSection) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(usageSection),
    );
  }
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(buildOthersSection(item, totals)),
  );
  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

function createAutocompleteOption(item) {
  const labelSource = item.name || item.id || 'Unknown Item';
  const label = String(labelSource).slice(0, 100);
  return {
    name: label,
    value: item.id,
  };
}

function getAutocompleteResults(query) {
  if (!query) return AUTOCOMPLETE_ITEMS.slice(0, 25).map(createAutocompleteOption);
  const lower = query.toLowerCase();
  const filtered = AUTOCOMPLETE_ITEMS.filter(item =>
    item.name.toLowerCase().includes(lower) || item.id.toLowerCase().includes(lower),
  );
  return filtered.slice(0, 25).map(createAutocompleteOption);
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('item-info')
    .setDescription('Look up detailed information about an item')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item to inspect')
        .setRequired(true)
        .setAutocomplete(true),
    );
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isAutocomplete() || interaction.commandName !== 'item-info') return;
      const focused = interaction.options.getFocused(true);
      const results = getAutocompleteResults(focused.value);
      await interaction.respond(results);
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'item-info') return;
      const query = interaction.options.getString('item', true);
      const item = findItem(query);
      if (!item) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Unable to find an item matching \`${query}\`. Try typing part of the name and pick from the list.`,
            ),
          );
        await interaction.reply({
          components: [container],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      await sendItemInfo(interaction, item, resources);
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };
