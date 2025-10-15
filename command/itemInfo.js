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
const { getSkinsForItem } = require('../skins');
const { formatNumber, normalizeInventory } = require('../utils');

const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
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
        value: 'Each detector grants 25 guaranteed successful hunts.',
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
        value: '6 hours per soda. Re-using before expiry extends the remaining time.',
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
    summary: 'Applies a +100% coin boost (double coins).',
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
        value: 'Boost amount stays at +100%; only the remaining duration increases.',
      },
    ],
  },
  LuckyPotion: {
    summary: 'Improves luck-driven outcomes like rare animals and drops.',
    fields: [
      {
        label: 'Effect',
        value: '+100% luck bonus (equivalent to +1 luck) for hunts, digs, begs, and other rolls.',
      },
      {
        label: 'Duration',
        value: '30 minutes per potion with additive duration when you chain them.',
      },
      {
        label: 'Stacking',
        value: 'The luck bonus stays at +100%; re-using extends the expiration time.',
      },
    ],
    bullets: ['Stacks with other luck sources such as Good List, cosmetics, and mastery bonuses.'],
  },
  UltraLuckyPotion: {
    summary: 'Supercharges your luck and forces success chances to their cap.',
    fields: [
      {
        label: 'Effect',
        value: '+300% luck bonus and all hunts/digs/begs ignore RNG failure (except death rolls).',
      },
      {
        label: 'Duration',
        value: '10 minutes per potion. Using another extends the forced-success window.',
      },
      {
        label: 'Stacking',
        value: 'Luck bonus remains +300%; additional potions only add time.',
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
        value: 'Lasts 30 minutes; drinking more adds reduction and refreshes the expiration.',
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
    sections: [
      {
        title: 'Reward ranges',
        items: [
          'Coins: 100,000–250,000',
          'Snowflakes: 100–10,000',
          'Diamonds: 1–100',
          'Deluxe Coins: 1–50',
          'XP Soda: 1–3',
          'Animal Detector: 1–2',
          'Good List: 1 (very rare)',
          'Candy Cane: 3–10',
          'Cookie: 5–15',
          'Cup of Milk: 1–5',
          'Gingerbread Man: 1–5',
          'Snow Ball: 10–25',
          'Hunting lures (Verdant/Sunpride/Marshlight/Snowglass): 5 of a random type',
          'Wheat Seeds: 1–5',
          'Potato Seeds: 1–5',
          'Pumpkin Seeds: 1–3',
          'White Cabbage Seeds: 1–3',
          'Melon Seeds: 1–2',
          'Star Fruit Seeds: 1–2',
        ],
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
    summary: 'Blesses a player with massive luck.',
    fields: [
      {
        label: 'Effect',
        value: '+100% luck bonus (+1 luck) applied to the target for all luck-based rolls.',
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
  CoinPotion: [{ percent: 100, search: /Doubles coin earnings/i }],
  LuckyPotion: [
    {
      percent: 100,
      search: /Increases luck/i,
      cleanup: /\s+by\s+100%/i,
    },
  ],
  UltraLuckyPotion: [{ percent: 300, search: /Massively boosts luck/i }],
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

function getObtainmentDetails(item) {
  if (!item) {
    return { description: 'unknown', limitedEvent: null };
  }
  const limitedEvent = getLimitedObtainmentEvent(item);
  const digDescription = buildDigObtainment(item);
  const parts = [];
  if (digDescription) {
    parts.push(digDescription);
  } else if (Number.isFinite(item.price) && item.price > 0) {
    parts.push(
      `Purchase this item from the rotating shop when it appears. It costs ${formatNumber(item.price)} Coins ${COIN_EMOJI} per unit.`,
    );
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
  if (!item || !item.useable) return null;
  if (item.rarity === 'Secret' && !totals.discovered) return '## Usage: ?';
  const description = formatUsageDescription(item);
  return `## Usage:\n${description}`;
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
