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

function getObtainmentDescription(item) {
  if (!item) return 'unknown';
  const digDescription = buildDigObtainment(item);
  if (digDescription) return digDescription;
  if (Number.isFinite(item.price) && item.price > 0) {
    return `Purchase this item from the rotating shop when it appears. It costs ${formatNumber(item.price)} Coins ${COIN_EMOJI} per unit.`;
  }
  return 'unknown';
}

function buildKnownInfo(item, totals) {
  const rarityEmoji = RARITY_EMOJIS[item.rarity] || '';
  const types = item.types && item.types.length ? item.types.join(', ') : 'Unknown';
  const value = Number.isFinite(item.value) ? formatNumber(item.value) : '0';
  const exists = formatNumber(totals.total || 0);
  const sellable = Number.isFinite(item.sellPrice) && item.sellPrice > 0;
  const sellPrice = sellable ? `${formatNumber(item.sellPrice)} ${COIN_EMOJI}` : 'N/A';
  return `## ${item.name}\n* **Rarity:** ${item.rarity} ${rarityEmoji}\n* **Type:** ${types}\n* **Value:** ${value}\n* **Exists:** ${exists}\n* **Sell-Price:** ${sellPrice}`;
}

function buildSecretInfo(item) {
  const rarityEmoji = RARITY_EMOJIS[item.rarity] || '';
  return `## ${item.name}\n* **Rarity:** ${item.rarity} ${rarityEmoji}\n* **Type:** ?\n* **Value:** ?\n* **Exists:** ?\n* **Sell-Price:** ?`;
}

function buildObtainmentSection(item, totals) {
  if (item.rarity === 'Secret' && !totals.discovered) return '## Obtainment: ?';
  const description = getObtainmentDescription(item);
  return `## Obtainment:\n${description}`;
}

function buildOthersSection(item, totals) {
  if (item.rarity === 'Secret' && !totals.discovered)
    return '## Others:\n* **Total Skins:** ?';
  const skinCount = getSkinsForItem(item.id).length;
  return `## Others:\n* **Total Skins:** ${skinCount}`;
}

async function sendItemInfo(interaction, item, resources) {
  const totals = computeInventoryTotals(item.id, resources.userStats || {});
  const accent = resolveAccentColor(item);
  const container = new ContainerBuilder().setAccentColor(accent);
  const thumbnailUrl = resolveThumbnailUrl(item);
  const section = new SectionBuilder();
  if (thumbnailUrl) section.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
  const headerContent =
    item.rarity === 'Secret' && !totals.discovered
      ? buildSecretInfo(item)
      : buildKnownInfo(item, totals);
  section.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerContent));
  container.addSectionComponents(section);
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(buildObtainmentSection(item, totals)),
  );
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
  const prefix = item.emoji ? `${item.emoji} ` : '';
  return {
    name: `${prefix}${item.name}`.slice(0, 100),
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
