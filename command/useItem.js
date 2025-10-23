const {
  SlashCommandBuilder,
  MessageFlags,
  ButtonStyle,
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
  ActionRowBuilder,
  ButtonBuilder,
} = require('@discordjs/builders');
const { ITEMS } = require('../items');
const { ANIMALS } = require('../animals');
const { HUNT_LURES, AREA_BY_KEY, RARE_RARITIES } = require('../huntData');
const {
  CHRISTMAS_GIFT_LURES,
  getContainerLootTable,
  pickWeightedEntry,
} = require('../containerLoot');
const {
  formatNumber,
  normalizeInventory,
  setSafeTimeout,
  applyComponentEmoji,
  addCooldownBuff,
  getCooldownMultiplier,
  hasGoodList,
  hasNaughtyList,
} = require('../utils');

const WARNING = '<:SBWarning:1404101025849147432>';
const DIAMOND_EMOJI = '<:CRDiamond:1405595593069432912>';
const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
const DELUXE_COIN_EMOJI = '<:CRDeluxeCoin:1405595587780280382>';
const SNOWFLAKE_EMOJI = '<:CRSnowflake:1425751780683153448>';
const CHRISTMAS_GIFT_THUMBNAIL = 'https://i.ibb.co/WvPthnND/Battle-Pass-Gift.png';
const CHRISTMAS_GIFT_COLOR = 0x0b6623;
const RARITY_COLORS = {
  Common: 0xffffff,
  Rare: 0x00ffff,
  Epic: 0xff00ff,
  Legendary: 0xffff00,
  Mythical: 0xff4500,
  Godly: 0x800080,
  Prismatic: 0x00ff00,
  Secret: 0x000000,
};

const MAX_LEVEL = 9999;

const AREA_BY_LURE = Object.fromEntries(
  Object.entries(HUNT_LURES).map(([areaKey, data]) => [data.itemId, areaKey]),
);

const RARITY_ORDER = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Mythical',
  'Godly',
  'Prismatic',
  'Secret',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const CHRISTMAS_GIFT_TABLE = getContainerLootTable('ChristmasBattlePassGift');

function pickChristmasGiftReward() {
  if (!CHRISTMAS_GIFT_TABLE || !Array.isArray(CHRISTMAS_GIFT_TABLE.entries)) return null;
  return pickWeightedEntry(CHRISTMAS_GIFT_TABLE.entries);
}

function addInventoryItem(stats, itemId, amount) {
  if (amount <= 0) return;
  stats.inventory = stats.inventory || [];
  const existing = stats.inventory.find(entry => entry.id === itemId);
  const base = ITEMS[itemId];
  if (existing) existing.amount = (existing.amount || 0) + amount;
  else if (base) stats.inventory.push({ ...base, amount });
}

async function resolveUserTarget(rawTarget, resources) {
  if (!rawTarget) return null;
  if (typeof rawTarget === 'object') {
    if (typeof rawTarget.bot === 'boolean' && typeof rawTarget.id === 'string') {
      return rawTarget;
    }
    if (rawTarget.user && typeof rawTarget.user.bot === 'boolean') {
      return rawTarget.user;
    }
    if (typeof rawTarget.id === 'string') {
      rawTarget = rawTarget.id;
    } else {
      return null;
    }
  }
  if (typeof rawTarget !== 'string') return null;
  const mentionMatch = rawTarget.match(/^<@!?([0-9]+)>$/);
  let userId = mentionMatch ? mentionMatch[1] : rawTarget.trim();
  if (userId.startsWith('@')) userId = userId.slice(1);
  if (!/^[0-9]+$/.test(userId)) return null;
  const client = resources.client;
  if (!client) return null;
  try {
    return await client.users.fetch(userId);
  } catch {
    return null;
  }
}

function updateSummary(summary, key, label, amount, emoji) {
  if (!summary.has(key)) summary.set(key, { label, amount: 0, emoji: emoji || '' });
  const entry = summary.get(key);
  entry.amount += amount;
  if (emoji && !entry.emoji) entry.emoji = emoji;
}

function ensureChatStats(stats) {
  stats.level = Number.isFinite(stats.level) && stats.level > 0 ? stats.level : 1;
  stats.xp = Number.isFinite(stats.xp) ? stats.xp : 0;
  stats.total_xp = Number.isFinite(stats.total_xp) ? stats.total_xp : 0;
  stats.chat_mastery_level = Number.isFinite(stats.chat_mastery_level)
    ? stats.chat_mastery_level
    : 0;
  stats.chat_mastery_xp = Number.isFinite(stats.chat_mastery_xp)
    ? stats.chat_mastery_xp
    : 0;
  stats.xp_boost_until = Number.isFinite(stats.xp_boost_until)
    ? stats.xp_boost_until
    : 0;
  if (stats.xp_boost_until && stats.xp_boost_until <= Date.now()) {
    stats.xp_boost_until = 0;
  }
}

function getRarityColor(item) {
  return RARITY_COLORS[item?.rarity] || 0xffffff;
}

function buildItemContainer(title, lines, accent) {
  return new ContainerBuilder()
    .setAccentColor(accent ?? 0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(title),
      new TextDisplayBuilder().setContent(lines.join('\n')),
    );
}

function padlockEmbed(user, amountLeft, expiresAt) {
  const btn = new ButtonBuilder()
    .setCustomId('padlock-left')
    .setLabel(`You have ×${amountLeft} Padlock left!`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  applyComponentEmoji(btn, ITEMS.Padlock.emoji);
  return new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[ITEMS.Padlock.rarity])
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(ITEMS.Padlock.image),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## WALLET LOCKED'),
          new TextDisplayBuilder().setContent(
            `Hey ${user}, you have used ×1 Padlock ${ITEMS.Padlock.emoji}, your wallet will be temporary protected from being robbed!`,
          ),
          new TextDisplayBuilder().setContent(
            `-# Padlock will expire in <t:${Math.floor(expiresAt / 1000)}:R>`,
          ),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function landmineEmbed(user, amountLeft, expiresAt) {
  const btn = new ButtonBuilder()
    .setCustomId('landmine-left')
    .setLabel(`You have ×${amountLeft} Landmine left!`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  applyComponentEmoji(btn, ITEMS.Landmine.emoji);
  return new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[ITEMS.Landmine.rarity])
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(ITEMS.Landmine.image))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## WALLET PROTECTED'),
          new TextDisplayBuilder().setContent(
            `Hey ${user}, you have placed down ×1 Landmine ${ITEMS.Landmine.emoji}, anyone who tries to rob your wallet has 50% chance to die.`,
          ),
          new TextDisplayBuilder().setContent(
            `-# Landmine will expire in <t:${Math.floor(expiresAt / 1000)}:R>`,
          ),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function banHammerEmbed(user, targetId) {
  return new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[ITEMS.BanHammer.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user.username} has used **${ITEMS.BanHammer.name} ${ITEMS.BanHammer.emoji}** onto <@${targetId}>\n-# they are now not be able to use any command within 24h`,
      ),
    );
}

function xpSodaEmbed(actor, target, used, amountLeft, expiresAt) {
  const btn = new ButtonBuilder()
    .setCustomId('xpsoda-left')
    .setLabel(`You have ×${amountLeft} XP Soda left!`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  applyComponentEmoji(btn, ITEMS.XPSoda.emoji);
  const description =
    target.id === actor.id
      ? `Hey ${target}, you have used **×${used} XP Soda ${ITEMS.XPSoda.emoji}**, your XP will be doubled for <t:${Math.floor(expiresAt / 1000)}:R>!`
      : `Hey ${target}, ${actor} used **×${used} XP Soda ${ITEMS.XPSoda.emoji}** on you! Your XP will be doubled for <t:${Math.floor(expiresAt / 1000)}:R>.`;
  return new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[ITEMS.XPSoda.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## XP BOOSTED'),
      new TextDisplayBuilder().setContent(description),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function expiredPadlockContainer(user, disable = false) {
  const btn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('padlock-use-again')
      .setStyle(ButtonStyle.Success)
      .setLabel('Use ×1 Padlock'),
    ITEMS.Padlock.emoji,
  );
  if (disable) btn.setDisabled(true);
  return new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Padlock broke\n* ${user}, your **Padlock ${ITEMS.Padlock.emoji}** is broken after 24h. Your wallet is no longer protected.`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function schedulePadlock(user, expiresAt, resources) {
  const delay = expiresAt - Date.now();
  setSafeTimeout(async () => {
    const stats = resources.userStats[user.id];
    if (stats && stats.padlock_until === expiresAt) {
      stats.padlock_until = 0;
      resources.saveData();
    }
    try {
      await user.send({ components: [expiredPadlockContainer(user)], flags: MessageFlags.IsComponentsV2 });
    } catch {}
  }, delay);
}

function scheduleLandmine(user, expiresAt, resources) {
  const delay = expiresAt - Date.now();
  setSafeTimeout(() => {
    const stats = resources.userStats[user.id];
    if (stats && stats.landmine_until === expiresAt) {
      stats.landmine_until = 0;
      resources.saveData();
    }
  }, delay);
}

async function restoreActiveItemTimers(client, resources) {
  const now = Date.now();
  for (const [userId, stats] of Object.entries(resources.userStats)) {
    let user;
    if (stats.padlock_until && stats.padlock_until > now) {
      try {
        user = user || await client.users.fetch(userId);
        schedulePadlock(user, stats.padlock_until, resources);
      } catch {}
    }
    if (stats.landmine_until && stats.landmine_until > now) {
      try {
        user = user || await client.users.fetch(userId);
        scheduleLandmine(user, stats.landmine_until, resources);
      } catch {}
    }
  }
}

function usePadlock(user, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'Padlock');
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 Padlock to use.` };
  }
  if (stats.padlock_until && stats.padlock_until > Date.now()) {
    return { error: `${WARNING} Padlock is already active.` };
  }
  entry.amount -= 1;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  stats.padlock_until = expires;
  resources.userStats[user.id] = stats;
  resources.saveData();
  schedulePadlock(user, expires, resources);
  return { component: padlockEmbed(user, remaining, expires) };
}

function useLandmine(user, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'Landmine');
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 Landmine to use.` };
  }
  if (stats.landmine_until && stats.landmine_until > Date.now()) {
    return { error: `${WARNING} Landmine is already placed.` };
  }
  entry.amount -= 1;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  stats.landmine_until = expires;
  resources.userStats[user.id] = stats;
  resources.saveData();
  scheduleLandmine(user, expires, resources);
  return { component: landmineEmbed(user, remaining, expires) };
}

function useXPSoda(user, amount, resources, options = {}) {
  const target = options.target || user;
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'XPSoda');
  const item = ITEMS.XPSoda;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const targetStats = resources.userStats[target.id] || {};
  const base = Math.max(Date.now(), targetStats.xp_boost_until || 0);
  const expires = base + 3 * 60 * 60 * 1000 * amount;
  targetStats.xp_boost_until = expires;
  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;
  resources.saveData();
  return { component: xpSodaEmbed(user, target, amount, remaining, expires) };
}

function useCoinPotion(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'CoinPotion');
  const item = ITEMS.CoinPotion;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const now = Date.now();
  const base = Math.max(now, stats.coin_boost_until || 0);
  const duration = 30 * 60 * 1000;
  stats.coin_boost_until = base + duration * amount;
  stats.coin_boost_multiplier = 1.5;
  stats.coin_boost_percent = 50;
  resources.userStats[user.id] = stats;
  resources.saveData();
  const expiresTs = Math.floor(stats.coin_boost_until / 1000);
  const lines = [
    `${user} drank ×${formatNumber(amount)} ${item.name} ${item.emoji}!`,
    `-# Coin earnings boosted by 50% until <t:${expiresTs}:R>.`,
    `-# Remaining: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

function useLuckyPotion(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'LuckyPotion');
  const item = ITEMS.LuckyPotion;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const now = Date.now();
  const duration = 30 * 60 * 1000;
  const base = Math.max(now, (stats.luck_bonuses || [])
    .filter(entry => entry && entry.source === 'LuckyPotion' && entry.expiresAt > now)
    .reduce((max, entry) => Math.max(max, entry.expiresAt), 0));
  const expires = base + duration * amount;
  if (!Array.isArray(stats.luck_bonuses)) stats.luck_bonuses = [];
  stats.luck_bonuses = stats.luck_bonuses.filter(
    entry => entry && entry.source !== 'LuckyPotion',
  );
  stats.luck_bonuses.push({ amount: 0.3, expiresAt: expires, source: 'LuckyPotion' });
  resources.userStats[user.id] = stats;
  resources.saveData();
  const expiresTs = Math.floor(expires / 1000);
  const lines = [
    `${user} used ×${formatNumber(amount)} ${item.name} ${item.emoji}!`,
    `-# Luck increased by 30% until <t:${expiresTs}:R>.`,
    `-# Remaining: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

function useUltraLuckyPotion(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'UltraLuckyPotion');
  const item = ITEMS.UltraLuckyPotion;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const now = Date.now();
  const duration = 10 * 60 * 1000;
  const base = Math.max(now, stats.force_success_until || 0);
  const expires = base + duration * amount;
  stats.force_success_until = expires;
  if (!Array.isArray(stats.luck_bonuses)) stats.luck_bonuses = [];
  stats.luck_bonuses = stats.luck_bonuses.filter(
    entry => entry && entry.source !== 'UltraLuckyPotion',
  );
  stats.luck_bonuses.push({ amount: 1, expiresAt: expires, source: 'UltraLuckyPotion' });
  resources.userStats[user.id] = stats;
  resources.saveData();
  const expiresTs = Math.floor(expires / 1000);
  const lines = [
    `${user} unleashed the power of ×${formatNumber(amount)} ${item.name} ${item.emoji}!`,
    `-# Luck increased by 100% and success chances are maxed until <t:${expiresTs}:R>.`,
    `-# Remaining: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

function useRobberBag(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'RobberBag');
  const item = ITEMS.RobberBag;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const charges = (stats.robber_bag_charges || 0) + amount * 10;
  stats.robber_bag_charges = charges;
  resources.userStats[user.id] = stats;
  resources.saveData();
  const lines = [
    `${user} equipped a ${item.name} ${item.emoji}!`,
    `-# Your next ${formatNumber(amount * 10)} /rob attempts will steal at least 25% on success.`,
    `-# Charges remaining: ${formatNumber(charges)}`,
    `-# Remaining bags: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

async function useBoltCutter(user, amount, resources, options = {}) {
  if (amount !== 1) {
    return { error: `${WARNING} You can only use one ${ITEMS.BoltCutter.name} at a time.` };
  }
  const target = options.target || user;
  if (target.bot) {
    return { error: `${WARNING} You cannot use the ${ITEMS.BoltCutter.name} on a bot.` };
  }
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'BoltCutter');
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 ${ITEMS.BoltCutter.name} to use.` };
  }
  const targetStats = resources.userStats[target.id] || {};
  const now = Date.now();
  if (!targetStats.padlock_until || targetStats.padlock_until <= now) {
    return {
      error: `${WARNING} ${target.id === user.id ? 'You do not' : `${target} does not`} have an active padlock to cut.`,
    };
  }
  entry.amount -= 1;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  targetStats.padlock_until = 0;
  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;
  resources.saveData();
  const subject = target.id === user.id ? 'your padlock' : `${target}'s padlock`;
  const lines = [
    `${user} sliced through ${subject} with a ${ITEMS.BoltCutter.name} ${ITEMS.BoltCutter.emoji}!`,
    `-# Remaining cutters: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${ITEMS.BoltCutter.emoji} ${ITEMS.BoltCutter.name}`,
    lines,
    getRarityColor(ITEMS.BoltCutter),
  );
  return { component: container };
}
function useChristmasBattlePassGift(user, amount, resources) {
  const stats =
    resources.userStats[user.id] || {
      inventory: [],
      coins: 0,
      diamonds: 0,
      deluxe_coins: 0,
      snowflakes: 0,
    };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'ChristmasBattlePassGift');
  const item = ITEMS.ChristmasBattlePassGift;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }

  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);

  stats.coins = Number.isFinite(stats.coins) ? stats.coins : 0;
  stats.diamonds = Number.isFinite(stats.diamonds) ? stats.diamonds : 0;
  stats.deluxe_coins = Number.isFinite(stats.deluxe_coins)
    ? stats.deluxe_coins
    : 0;
  stats.snowflakes = Number.isFinite(stats.snowflakes) ? stats.snowflakes : 0;

  const summary = new Map();

  const pullsPerGift = (CHRISTMAS_GIFT_TABLE && Number(CHRISTMAS_GIFT_TABLE.rolls)) || 5;

  for (let gift = 0; gift < amount; gift += 1) {
    for (let pull = 0; pull < pullsPerGift; pull += 1) {
      const reward = pickChristmasGiftReward();
      if (!reward) continue;
      const qty = randomInt(reward.min, reward.max);
      if (qty <= 0) continue;
      switch (reward.type) {
        case 'coins':
          stats.coins += qty;
          updateSummary(summary, 'coins', 'Coin', qty, COIN_EMOJI);
          break;
        case 'diamonds':
          stats.diamonds += qty;
          updateSummary(summary, 'diamonds', 'Diamond', qty, DIAMOND_EMOJI);
          break;
        case 'snowflakes':
          stats.snowflakes += qty;
          updateSummary(summary, 'snowflakes', 'Snowflake', qty, SNOWFLAKE_EMOJI);
          break;
        case 'deluxeCoins':
          stats.deluxe_coins += qty;
          updateSummary(summary, 'deluxe_coins', 'Deluxe Coin', qty, DELUXE_COIN_EMOJI);
          break;
        case 'item': {
          addInventoryItem(stats, reward.id, qty);
          const base = ITEMS[reward.id];
          const label = base?.name || reward.id;
          updateSummary(summary, `item:${reward.id}`, label, qty, base?.emoji);
          break;
        }
        case 'lure': {
          const pool =
            Array.isArray(reward.pool) && reward.pool.length
              ? reward.pool
              : CHRISTMAS_GIFT_LURES;
          if (!Array.isArray(pool) || pool.length === 0) break;
          const lureId = pool[randomInt(0, pool.length - 1)];
          addInventoryItem(stats, lureId, qty);
          const base = ITEMS[lureId];
          const label = base?.name || lureId;
          updateSummary(summary, `item:${lureId}`, label, qty, base?.emoji);
          break;
        }
        default:
          break;
      }
    }
  }

  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();

  const summaryLines = Array.from(summary.values()).map(entry => {
    const emoji = entry.emoji ? ` ${entry.emoji}` : '';
    return `- ${formatNumber(entry.amount)} ${entry.label}${emoji}`;
  });
  const listText = summaryLines.length
    ? summaryLines.join('\n')
    : '- Nothing? The gift was empty!';

  const content = `${user} You have unboxed ${formatNumber(amount)} Christmas BP Gift${
    amount > 1 ? 's' : ''
  } and got:\n${listText}`;

  const container = new ContainerBuilder()
    .setAccentColor(CHRISTMAS_GIFT_COLOR)
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(CHRISTMAS_GIFT_THUMBNAIL))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content)),
    );

  return { component: container };
}

function useBanHammer(user, targetId, resources) {
  if (targetId === user.id) {
    return {
      error: `${WARNING} You cannot use the ${ITEMS.BanHammer.name} on yourself.`,
    };
  }
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'BanHammer');
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 Ban Hammer to use.` };
  }
  entry.amount -= 1;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  resources.commandBans[targetId] = expires;
  resources.saveData();
  return { component: banHammerEmbed(user, targetId) };
}

async function useCandyCane(user, amount, resources, options = {}) {
  const target = options.target || user;
  const item = ITEMS.CandyCane;
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === item.id);
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const targetStats = resources.userStats[target.id] || { inventory: [] };
  ensureChatStats(targetStats);
  const prevLevel = targetStats.level;
  const prevTotalXp = targetStats.total_xp;
  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;

  const INSTANT_LEVEL_CHANCE = 0.02;
  let instantLevels = 0;
  let xpConsumptions = 0;
  for (let i = 0; i < amount; i += 1) {
    if (Math.random() < INSTANT_LEVEL_CHANCE) instantLevels += 1;
    else xpConsumptions += 1;
  }

  const xpGain = 2500 * xpConsumptions;
  if (xpGain > 0) {
    await resources.addXp(target, xpGain, resources.client);
  }

  let bonusLevels = 0;
  let boostRestored = false;
  let activeStats = resources.userStats[target.id] || targetStats;
  ensureChatStats(activeStats);
  for (let i = 0; i < instantLevels; i += 1) {
    if (activeStats.level >= MAX_LEVEL) break;
    const needed = Math.max(1, resources.xpNeeded(activeStats.level) - activeStats.xp);
    const originalBoost = activeStats.xp_boost_until;
    const boostActive = originalBoost && originalBoost > Date.now();
    if (boostActive) activeStats.xp_boost_until = 0;
    await resources.addXp(target, needed, resources.client);
    activeStats = resources.userStats[target.id] || activeStats;
    if (boostActive) {
      activeStats.xp_boost_until = originalBoost;
      boostRestored = true;
    }
    ensureChatStats(activeStats);
    bonusLevels += 1;
  }
  if (boostRestored) resources.saveData();

  const updated = resources.userStats[target.id] || activeStats;
  const totalXpGained = (updated.total_xp || 0) - prevTotalXp;
  const levelsGained = (updated.level || 0) - prevLevel;
  const actionLine =
    target.id === user.id
      ? `${user} munched ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''}.`
      : `${user} used ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''} on ${target}.`;
  const lines = [
    actionLine,
    `-# XP gained: ${formatNumber(totalXpGained)}`,
    `-# Levels gained: ${levelsGained}`,
  ];
  if (bonusLevels > 0) {
    lines.push(`-# ${bonusLevels} instant level skip${bonusLevels > 1 ? 's' : ''} triggered!`);
  }
  lines.push(`-# Remaining: ${formatNumber(Math.max(remaining, 0))}`);
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

async function useCookie(user, amount, resources, options = {}) {
  const target = options.target || user;
  const item = ITEMS.Cookie;
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === item.id);
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const targetStats = resources.userStats[target.id] || { inventory: [] };
  ensureChatStats(targetStats);
  const prevLevel = targetStats.level;
  const prevTotalXp = targetStats.total_xp;
  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;

  const xpGain = 100 * amount;
  await resources.addXp(target, xpGain, resources.client);

  const updated = resources.userStats[target.id] || targetStats;
  const totalXpGained = (updated.total_xp || 0) - prevTotalXp;
  const levelsGained = (updated.level || 0) - prevLevel;
  const actionLine =
    target.id === user.id
      ? `${user} enjoyed ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''}.`
      : `${user} used ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''} on ${target}.`;
  const lines = [
    actionLine,
    `-# XP gained: ${formatNumber(totalXpGained)}`,
    `-# Levels gained: ${levelsGained}`,
    `-# Remaining: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

function useCupOfMilk(user, amount, resources, options = {}) {
  const target = options.target || user;
  const item = ITEMS.CupOfMilk;
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === item.id);
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);

  const durationMs = 20 * 60 * 1000;
  const targetStats = resources.userStats[target.id] || {};
  addCooldownBuff(targetStats, 0.1 * amount, durationMs);
  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;
  resources.saveData();

  const reduction = Math.max(0, 1 - getCooldownMultiplier(targetStats));
  const expiresAt = Date.now() + durationMs;
  const actionLine =
    target.id === user.id
      ? `${user} drank ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''}.`
      : `${user} used ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''} on ${target}.`;
  const lines = [
    actionLine,
    `-# Cooldown reduction now: ${(reduction * 100).toFixed(1)}%`,
    `-# Buff expires <t:${Math.floor(expiresAt / 1000)}:R>`,
    `-# Remaining: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

async function useGingerbreadMan(user, amount, resources, options = {}) {
  const target = options.target || user;
  const item = ITEMS.GingerbreadMan;
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === item.id);
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const targetStats = resources.userStats[target.id] || { inventory: [] };
  ensureChatStats(targetStats);
  const prevLevel = targetStats.level;
  const prevTotalXp = targetStats.total_xp;
  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;

  let totalLevels = 0;
  let surgeActivations = 0;
  for (let i = 0; i < amount; i += 1) {
    totalLevels += 1;
    if (Math.random() < 0.05) {
      totalLevels += 9;
      surgeActivations += 1;
    }
  }

  let boostRestored = false;
  let activeStats = resources.userStats[target.id] || targetStats;
  ensureChatStats(activeStats);
  for (let i = 0; i < totalLevels; i += 1) {
    if (activeStats.level >= MAX_LEVEL) break;
    const needed = Math.max(1, resources.xpNeeded(activeStats.level) - activeStats.xp);
    const originalBoost = activeStats.xp_boost_until;
    const boostActive = originalBoost && originalBoost > Date.now();
    if (boostActive) activeStats.xp_boost_until = 0;
    await resources.addXp(target, needed, resources.client);
    activeStats = resources.userStats[target.id] || activeStats;
    if (boostActive) {
      activeStats.xp_boost_until = originalBoost;
      boostRestored = true;
    }
    ensureChatStats(activeStats);
  }
  if (boostRestored) resources.saveData();

  const updated = resources.userStats[target.id] || activeStats;
  const totalXpGained = (updated.total_xp || 0) - prevTotalXp;
  const levelsGained = (updated.level || 0) - prevLevel;
  const actionLine =
    target.id === user.id
      ? `${user} devoured ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''}.`
      : `${user} used ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''} on ${target}.`;
  const lines = [
    actionLine,
    `-# XP gained: ${formatNumber(totalXpGained)}`,
    `-# Levels gained: ${levelsGained}`,
  ];
  if (surgeActivations > 0) {
    lines.push(`-# Sugar rush triggered ${surgeActivations} time${surgeActivations > 1 ? 's' : ''}!`);
  }
  lines.push(`-# Remaining: ${formatNumber(Math.max(remaining, 0))}`);
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

async function useSnowBall(user, amount, resources, options = {}) {
  const { target } = options;
  const item = ITEMS.SnowBall;
  if (!target) {
    return { error: `${WARNING} You must select a target to throw a ${item.name}.` };
  }
  if (target.bot) {
    return { error: `${WARNING} You cannot throw a ${item.name} at a bot.` };
  }
  if (target.id === user.id) {
    return { error: `${WARNING} You cannot throw a ${item.name} at yourself.` };
  }
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === item.id);
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);

  const targetStats = resources.userStats[target.id] || { inventory: [] };
  const now = Date.now();
  const base = Math.max(targetStats.snowball_fail_until || 0, now);
  targetStats.snowball_fail_until = base + amount * 30 * 1000;

  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;
  resources.saveData();

  const expiresTs = Math.floor(targetStats.snowball_fail_until / 1000);
  const lines = [
    `${user} pelted ${target} with ×${formatNumber(amount)} ${item.name}${amount > 1 ? 's' : ''}!`,
    `-# Their hunts, digs, and begs will fail until <t:${expiresTs}:R>.`,
    `-# Remaining: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

async function useGoodList(user, amount, resources, options = {}) {
  const target = options.target || user;
  const item = ITEMS.GoodList;
  if (amount !== 1) {
    return { error: `${WARNING} You can only use one ${item.name} at a time.` };
  }
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === item.id);
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 ${item.name} to use.` };
  }
  const now = Date.now();
  if (stats.good_list_cd_until && stats.good_list_cd_until > now) {
    return {
      error: `${WARNING} You can use another ${item.name} <t:${Math.floor(
        stats.good_list_cd_until / 1000,
      )}:R>.`,
    };
  }
  entry.amount -= 1;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);

  const targetStats = resources.userStats[target.id] || { inventory: [] };
  const base = hasGoodList(targetStats) ? targetStats.good_list_until : now;
  targetStats.good_list_until = base + 24 * 60 * 60 * 1000;
  stats.good_list_cd_until = now + 30 * 60 * 60 * 1000;

  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;
  resources.saveData();

  const expiresTs = Math.floor(targetStats.good_list_until / 1000);
  const cdTs = Math.floor(stats.good_list_cd_until / 1000);
  const lines = [
    `${user} blessed ${target} with the ${item.name}!`,
    `-# Luck boost (+69%) active until <t:${expiresTs}:R>.`,
    `-# You can use another ${item.name} <t:${cdTs}:R>.`,
    `-# Remaining: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

async function useNaughtyList(user, amount, resources, options = {}) {
  const { target } = options;
  const item = ITEMS.NaughtyList;
  if (amount !== 1) {
    return { error: `${WARNING} You can only use one ${item.name} at a time.` };
  }
  if (!target) {
    return { error: `${WARNING} You must select a target to use the ${item.name}.` };
  }
  if (target.bot) {
    return { error: `${WARNING} You cannot use the ${item.name} on a bot.` };
  }
  if (target.id === user.id) {
    return { error: `${WARNING} You cannot put yourself on the ${item.name}.` };
  }
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === item.id);
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 ${item.name} to use.` };
  }
  const now = Date.now();
  if (stats.naughty_list_cd_until && stats.naughty_list_cd_until > now) {
    return {
      error: `${WARNING} You can use another ${item.name} <t:${Math.floor(
        stats.naughty_list_cd_until / 1000,
      )}:R>.`,
    };
  }
  entry.amount -= 1;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);

  const targetStats = resources.userStats[target.id] || { inventory: [] };
  const base = hasNaughtyList(targetStats) ? targetStats.naughty_list_until : now;
  targetStats.naughty_list_until = base + 24 * 60 * 60 * 1000;
  stats.naughty_list_cd_until = now + 30 * 60 * 60 * 1000;

  resources.userStats[user.id] = stats;
  resources.userStats[target.id] = targetStats;
  resources.saveData();

  const expiresTs = Math.floor(targetStats.naughty_list_until / 1000);
  const cdTs = Math.floor(stats.naughty_list_cd_until / 1000);
  const lines = [
    `${user} condemned ${target} to the ${item.name}!`,
    `-# Their boosts, luck, and harvest speed are crushed until <t:${expiresTs}:R>.`,
    `-# You can use another ${item.name} <t:${cdTs}:R>.`,
    `-# Remaining: ${formatNumber(Math.max(remaining, 0))}`,
  ];
  const container = buildItemContainer(
    `### ${item.emoji} ${item.name}`,
    lines,
    getRarityColor(item),
  );
  return { component: container };
}

const ITEM_USE_HANDLERS = {
  Padlock: (user, amount, resources) => usePadlock(user, resources),
  Landmine: (user, amount, resources) => useLandmine(user, resources),
  XPSoda: (user, amount, resources, options) =>
    useXPSoda(user, amount, resources, options),
  DiamondBag: (user, amount, resources) =>
    useDiamondItem(user, 'DiamondBag', amount, 10000, resources),
  DiamondCrate: (user, amount, resources) =>
    useDiamondItem(user, 'DiamondCrate', amount, 135000, resources),
  DiamondChest: (user, amount, resources) =>
    useDiamondItem(user, 'DiamondChest', amount, 980000, resources),
  BulletBox: (user, amount, resources) => useBulletBox(user, amount, resources),
  AnimalDetector: (user, amount, resources) =>
    useAnimalDetector(user, amount, resources),
  ChristmasBattlePassGift: (user, amount, resources) =>
    useChristmasBattlePassGift(user, amount, resources),
  CoinPotion: (user, amount, resources) => useCoinPotion(user, amount, resources),
  LuckyPotion: (user, amount, resources) => useLuckyPotion(user, amount, resources),
  UltraLuckyPotion: (user, amount, resources) =>
    useUltraLuckyPotion(user, amount, resources),
  RobberBag: (user, amount, resources) => useRobberBag(user, amount, resources),
  BoltCutter: (user, amount, resources, options) =>
    useBoltCutter(user, amount, resources, options),
  CandyCane: (user, amount, resources, options) =>
    useCandyCane(user, amount, resources, options),
  Cookie: (user, amount, resources, options) =>
    useCookie(user, amount, resources, options),
  CupOfMilk: (user, amount, resources, options) =>
    useCupOfMilk(user, amount, resources, options),
  GingerbreadMan: (user, amount, resources, options) =>
    useGingerbreadMan(user, amount, resources, options),
  SnowBall: (user, amount, resources, options) =>
    useSnowBall(user, amount, resources, options),
  GoodList: (user, amount, resources, options) =>
    useGoodList(user, amount, resources, options),
  NaughtyList: (user, amount, resources, options) =>
    useNaughtyList(user, amount, resources, options),
};

const USEABLE_ITEM_IDS = new Set([...Object.keys(ITEM_USE_HANDLERS), 'BanHammer']);

async function handleUseItem(user, itemId, amount, send, resources, options = {}) {
  const normalizedOptions = { ...options };
  if (Object.prototype.hasOwnProperty.call(normalizedOptions, 'target')) {
    normalizedOptions.target = await resolveUserTarget(normalizedOptions.target, resources);
  }
  let result;
  const handler = ITEM_USE_HANDLERS[itemId];
  if (handler) {
    result = await handler(user, amount, resources, normalizedOptions);
  } else if (AREA_BY_LURE[itemId]) {
    result = {
      error: `${WARNING} You can now activate hunting lures from the hunt equipment menu.`,
    };
  } else {
    result = { error: `${WARNING} Cannot use this item.` };
  }
  if (result.error) {
    await send({ content: result.error });
  } else {
    await send({ components: [result.component], flags: MessageFlags.IsComponentsV2 });
  }
}

function buildLureSummary(areaKey) {
  const baseTotals = [{}, {}, {}];
  const boostedTotals = [{}, {}, {}];
  for (const animal of ANIMALS) {
    const chances = animal.chances[areaKey];
    if (!chances) continue;
    for (let tier = 0; tier < chances.length; tier++) {
      const chance = Number(chances[tier]) || 0;
      if (chance <= 0) continue;
      const rarity = animal.rarity;
      baseTotals[tier][rarity] = (baseTotals[tier][rarity] || 0) + chance;
      const multiplier = RARE_RARITIES.has(rarity) ? 2 : 1;
      boostedTotals[tier][rarity] =
        (boostedTotals[tier][rarity] || 0) + chance * multiplier;
    }
  }
  const summaries = [];
  for (let tier = 0; tier < baseTotals.length; tier++) {
    const base = baseTotals[tier];
    const boosted = boostedTotals[tier];
    const baseSum = Object.values(base).reduce((sum, value) => sum + value, 0);
    const boostedSum = Object.values(boosted).reduce(
      (sum, value) => sum + value,
      0,
    );
    if (baseSum <= 0 || boostedSum <= 0) continue;
    const rarities = Array.from(
      new Set([...Object.keys(base), ...Object.keys(boosted)]),
    ).sort((a, b) => {
      const aIndex = RARITY_ORDER.indexOf(a);
      const bIndex = RARITY_ORDER.indexOf(b);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
    const lines = rarities
      .map(rarity => {
        const baseValue = base[rarity] || 0;
        const boostedValue = boosted[rarity] || 0;
        const basePct = (baseValue / baseSum) * 100;
        const boostedPct = (boostedValue / boostedSum) * 100;
        const delta = boostedPct - basePct;
        const sign = delta >= 0 ? '+' : '';
        return `-# ${rarity}: ${basePct.toFixed(2)}% → ${boostedPct.toFixed(
          2,
        )}% (${sign}${delta.toFixed(2)}%)`;
      })
      .filter(Boolean);
    if (lines.length === 0) continue;
    summaries.push(`### Tier ${tier + 1} rarity shifts\n${lines.join('\n')}`);
  }
  return summaries;
}

function useHuntLure(user, itemId, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === itemId);
  const item = ITEMS[itemId];
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  const areaKey = AREA_BY_LURE[itemId];
  const areaInfo = AREA_BY_KEY[areaKey] || { name: areaKey };
  stats.hunt_lures = stats.hunt_lures || {};
  const state = stats.hunt_lures[areaKey] || { itemId, remaining: 0 };
  state.itemId = itemId;
  state.remaining = (state.remaining || 0) + 20 * amount;
  stats.hunt_lures[areaKey] = state;
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();

  const summary = buildLureSummary(areaKey);
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[item.rarity] || 0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${item.name} activated!`),
      new TextDisplayBuilder().setContent(
        `Hey ${user}, you have used ×${amount} ${item.name} ${item.emoji}!`,
      ),
      new TextDisplayBuilder().setContent(
        `-# Area boosted: ${areaInfo.name}`,
      ),
      new TextDisplayBuilder().setContent(
        `-# Successful hunts remaining: ${state.remaining}`,
      ),
      new TextDisplayBuilder().setContent(
        '-# Rare animal chances are doubled while this lure is active.',
      ),
    );
  if (summary.length) {
    container.addSeparatorComponents(new SeparatorBuilder());
    summary.forEach(block =>
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block)),
    );
  }
  return { component: container };
}

function useDiamondItem(user, itemId, amount, perDiamond, resources) {
  const stats = resources.userStats[user.id] || { inventory: [], diamonds: 0 };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === itemId);
  const item = ITEMS[itemId];
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  stats.diamonds = (stats.diamonds || 0) + perDiamond * amount;
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();
  const total = perDiamond * amount;
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[item.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user}, you have used **×${amount} ${item.name} ${item.emoji}** and got:\n### ${total} Diamonds ${DIAMOND_EMOJI}`,
      ),
    );
  return { component: container };
}

function useBulletBox(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'BulletBox');
  const item = ITEMS.BulletBox;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  const bullet = stats.inventory.find(i => i.id === 'Bullet');
  const bulletItem = ITEMS.Bullet;
  const gained = 6 * amount;
  if (bullet) bullet.amount += gained;
  else stats.inventory.push({ ...bulletItem, amount: gained });
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[item.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user}, you have used **×${amount} ${item.name} ${item.emoji}** and got:\n### ×${gained} ${bulletItem.name} ${bulletItem.emoji}`,
      ),
    );
  return { component: container };
}

function useAnimalDetector(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'AnimalDetector');
  const item = ITEMS.AnimalDetector;
  if (!entry || entry.amount < amount) {
    return {
      error: `${WARNING} You need at least ${amount} ${item.name} to use.`,
    };
  }
  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  const gained = 20 * amount;
  stats.hunt_detector_charges = Number.isFinite(stats.hunt_detector_charges)
    ? stats.hunt_detector_charges
    : 0;
  stats.hunt_detector_charges += gained;
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[item.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user}, you activated **×${amount} ${item.name} ${item.emoji}**!`,
      ),
      new TextDisplayBuilder().setContent(
        `-# Guaranteed hunts remaining: ${stats.hunt_detector_charges}`,
      ),
      new TextDisplayBuilder().setContent(
        '-# Each detector grants 20 guaranteed hunts.',
      ),
    );
  return { component: container };
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('use-item')
    .setDescription('Use an item')
    .addStringOption(opt =>
      opt
        .setName('item')
        .setDescription('Item ID')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setMinValue(1))
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('User to apply the item to (defaults to yourself)'),
    );
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isAutocomplete() || interaction.commandName !== 'use-item') return;
      const stats = resources.userStats[interaction.user.id] || { inventory: [] };
      stats.inventory = stats.inventory || [];
      normalizeInventory(stats);
      const focused = interaction.options.getFocused().toLowerCase();
      const choices = stats.inventory
        .filter(entry => entry.amount > 0 && USEABLE_ITEM_IDS.has(entry.id))
        .map(entry => ITEMS[entry.id])
        .filter(item => {
          if (!item || !USEABLE_ITEM_IDS.has(item.id)) return false;
          if (!focused) return true;
          const name = item.name ? item.name.toLowerCase() : '';
          const id = item.id ? item.id.toLowerCase() : '';
          return name.includes(focused) || id.includes(focused);
        })
        .sort((a, b) => {
          const aName = a.name || a.id || '';
          const bName = b.name || b.id || '';
          return aName.localeCompare(bName);
        })
        .map(item => ({ name: item.name, value: item.id }));
      await interaction.respond(choices.slice(0, 25));
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'use-item') return;
      const itemId = interaction.options.getString('item');
      const amount = interaction.options.getInteger('amount') || 1;
      const target = interaction.options.getUser('user') || null;
      if (itemId === 'BanHammer') {
        const modal = new ModalBuilder()
          .setCustomId(`banhammer-modal-${interaction.user.id}`)
          .setTitle('Ban Hammer');
        const input = new TextInputBuilder()
          .setCustomId('user')
          .setLabel('User ID')
          .setStyle(TextInputStyle.Short);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }
      await handleUseItem(
        interaction.user,
        itemId,
        amount,
        interaction.reply.bind(interaction),
        resources,
        { target },
      );
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isButton() || interaction.customId !== 'padlock-use-again') return;
      const res = usePadlock(interaction.user, resources);
      if (res.error) {
        await interaction.reply({ content: res.error });
      } else {
        await interaction.update({ components: [expiredPadlockContainer(interaction.user, true)], flags: MessageFlags.IsComponentsV2 });
        await interaction.followUp({ components: [res.component], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isModalSubmit() || !interaction.customId.startsWith('banhammer-modal-')) return;
      const userId = interaction.customId.split('-')[2];
      if (interaction.user.id !== userId) return;
      const targetId = interaction.fields.getTextInputValue('user');
      let target;
      try {
        target = await interaction.client.users.fetch(targetId);
      } catch {
        await interaction.reply({ content: `${WARNING} Invalid user ID.`, flags: MessageFlags.Ephemeral });
        return;
      }
      const res = useBanHammer(interaction.user, target.id, resources);
      if (res.error) {
        await interaction.reply({ content: res.error, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ components: [res.component], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, handleUseItem, restoreActiveItemTimers, useHuntLure };
