const {
  SlashCommandBuilder,
  MessageFlags,
  ButtonStyle,
} = require('discord.js');
const {
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('@discordjs/builders');
const { ITEMS, DIG_ITEMS, DIG_ITEMS_BY_AREA } = require('../items');
const { handleDeath } = require('../death');
const { DIG_AREAS, DIG_AREA_BY_KEY, DIG_AREA_BY_NAME } = require('../digData');
const {
  normalizeInventory,
  getInventoryCount,
  MAX_ITEMS,
  alertInventoryFull,
  useDurableItem,
  applyCoinBoost,
  applyComponentEmoji,
  getCooldownMultiplier,
  computeActionSuccessChance,
  isSnowballed,
  scaleChanceWithLuck,
  getLuckAdjustedWeight,
  getDigCoinMultiplier,
  getDigLuckBonus,
  getDigCooldownReduction,
  getDigLevel,
  getDigCoinBonusPercent,
} = require('../utils');
const { getItemDisplay } = require('../skins');
const {
  getPerkOptionsForLevel,
  ensureDigPerkState,
  getSelectedDigPerkIds,
  hasDigPerk,
  selectDigPerk,
  getDigPerkSummaries,
  getDigPerkById,
} = require('../digPerks');

const THUMB_URL = 'https://i.ibb.co/G4cSsHHN/dig-symbol.png';
const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
const DIG_STAT_EMOJI = '<:SBDig:1412452052721995868>';
const XP_EMOJI = '<:SBXP:1432731173762760854>';
const FAIL_MESSAGES = [
  '🪨 Your shovel hits a BIG rock… and nothing else.',
  '🐛 You dig up a handful of worms. You stupidly think it is not exactly treasure.',
  '💧 Water seeps into the hole, and you give up before drowning your loot.',
  '🕳️ After digging for ages, the hole is empty. Just dirt.',
  '🦴 You unearth old animal bones… creepy, but worthless.',
  '🌱 A stubborn tree root blocks your shovel—you can’t dig any further.',
  '🪣 Your shovel handle snaps in half. Time to go home.',
  '🐀 A rat leaps out of the hole and you drop everything in panic.',
  '🪵 You just dug up a rotten log. Congratulations.',
  '🪦 You accidentally disturb a grave marker… you quickly rebury it in fear.',
  '🍄 You find mushrooms growing in the soil. They don’t look edible.',
  '🐜 An army of ants swarms out of the hole—you run off itching.',
  '💨 You dig for hours, but the dirt just keeps collapsing back in.',
  '🦆 You dug straight into a duck nest—the angry bird chases you away.',
  '🕷️ A giant spider crawls out of the hole. Nope. You’re done.',
  '🎋 You only uncover roots and weeds. Nothing useful.',
  '🦨 You disturb a skunk burrow… the smell makes you abandon everything.',
  '🔒 You actually find a rusty chest… but the lock is fused shut and won’t open.',
  '📜 You uncover scraps of paper too soggy to read.',
  '🧱 Your shovel clangs against buried bricks—you can’t break through.',
];

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

const RARITY_RANK = {
  Common: 0,
  Rare: 1,
  Epic: 2,
  Legendary: 3,
  Mythical: 4,
  Godly: 5,
  Prismatic: 6,
  Secret: 7,
};

const DIG_XP_MULTIPLIER = {
  Common: 2,
  Rare: 3,
  Epic: 5,
  Legendary: 10,
  Mythical: 25,
  Godly: 50,
};

const DEFAULT_DIG_COLOR = 0xffffff;
const DIG_DEATH_CHANCE = 0.05;
const DIG_SUCCESS_BASE = 0.425;
const DIG_ITEM_BASE_CHANCE = 0.45;

const DIG_GEAR_CONFIG = {
  Magnet: {
    id: 'Magnet',
    dropBonus: 0.15,
    luckBonus: 0,
    perk: 'Increase item drop by 15%',
    expireType: 'Success Digs',
  },
  ItemScanner: {
    id: 'ItemScanner',
    dropBonus: 0.65,
    luckBonus: 0.25,
    perk: 'Increase item drop by 65% and +25% dig luck',
    expireType: 'Success Digs',
  },
};

const DIG_GEAR_IDS = new Set(Object.keys(DIG_GEAR_CONFIG));

const digStates = new Map();

const DIG_LEVEL_MAX = 100;
const DIG_XP_STEP = 100;

function ensureValidDigArea(stats) {
  if (!stats) return;
  if (stats.dig_area && DIG_AREA_BY_NAME[stats.dig_area]) return;
  const firstArea = DIG_AREAS[0];
  if (firstArea) stats.dig_area = firstArea.name;
}

function getDigArea(name) {
  if (!name) return null;
  return DIG_AREA_BY_NAME[name] || DIG_AREA_BY_KEY[name] || null;
}

function pickAreaDeathMessage(area) {
  const pool = area?.deathMessages || [];
  if (!pool.length) {
    return {
      description: 'A fatal mishap ended your excavation.',
      cause: '-# You died from [Accident] 💀',
    };
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function formatAreaLabel(area) {
  if (!area) return '';
  return area.emoji ? `${area.emoji} ${area.name}` : area.name;
}

function applyGearLuck(stats, extraLuck) {
  if (!stats || !extraLuck) return stats;
  return {
    ...stats,
    luck_bonus: (stats.luck_bonus || 0) + extraLuck,
    luckBonus: (stats.luckBonus || 0) + extraLuck,
  };
}

function getEquippedGear(stats, { cleanup = false } = {}) {
  if (!stats || !stats.dig_gear) return null;
  const config = DIG_GEAR_CONFIG[stats.dig_gear];
  const item = ITEMS[stats.dig_gear];
  if (!config || !item) {
    if (cleanup) delete stats.dig_gear;
    return null;
  }
  const entry = (stats.inventory || []).find(i => i.id === stats.dig_gear);
  if (!entry) {
    if (cleanup) delete stats.dig_gear;
    return null;
  }
  return { ...config, item, entry };
}

function getRandomDigItem(areaKey, stats, luckSource = stats) {
  const source =
    (areaKey && Array.isArray(DIG_ITEMS_BY_AREA[areaKey])
      ? DIG_ITEMS_BY_AREA[areaKey]
      : DIG_ITEMS) || DIG_ITEMS;
  const weighted = source
    .map(it => ({
      item: it,
      chance: getLuckAdjustedWeight(it.chance || 0, it.rarity, luckSource),
    }))
    .filter(entry => entry.chance > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.chance, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const entry of weighted) {
    acc += entry.chance;
    if (r < acc) return { ...entry.item };
  }
  return weighted.length ? { ...weighted[weighted.length - 1].item } : null;
}

function normalizeSectionTexts(texts) {
  const normalized = [];
  for (const entry of texts) {
    if (!entry) continue;
    const str = String(entry);
    if (!str.trim()) continue;
    if (normalized.length < 3) {
      normalized.push(str);
    } else {
      normalized[normalized.length - 1] = `${normalized[normalized.length - 1]}\n${str}`;
    }
  }
  if (!normalized.length) normalized.push('');
  return normalized;
}

function ensureDigProgress(stats) {
  if (!stats) return;
  stats.dig_level = Number.isFinite(stats.dig_level)
    ? Math.min(DIG_LEVEL_MAX, Math.max(0, Math.floor(stats.dig_level)))
    : 0;
  stats.dig_xp = Number.isFinite(stats.dig_xp)
    ? Math.max(0, Math.floor(stats.dig_xp))
    : 0;
  stats.dig_total_xp = Number.isFinite(stats.dig_total_xp)
    ? Math.max(0, Math.floor(stats.dig_total_xp))
    : 0;
  stats.dig_last_perk_notice = Number.isFinite(stats.dig_last_perk_notice)
    ? Math.max(0, Math.floor(stats.dig_last_perk_notice))
    : 0;
  ensureDigPerkState(stats);
}

function getDigXpRequirement(level) {
  const clamped = Math.min(Math.max(Math.floor(level), 0), DIG_LEVEL_MAX - 1);
  return (clamped + 1) * DIG_XP_STEP;
}

function renderDigProgressBar(current, required, segments = 10) {
  if (required <= 0 || !Number.isFinite(required)) {
    return '▰'.repeat(segments);
  }
  const progress = Math.max(0, Math.min(1, current / required));
  const filled = Math.round(progress * segments);
  const clampedFilled = Math.min(segments, Math.max(0, filled));
  const empty = Math.max(0, segments - clampedFilled);
  return `${'▰'.repeat(clampedFilled)}${'▱'.repeat(empty)}`;
}

function applyDigXp(stats, amount) {
  ensureDigProgress(stats);
  if (!Number.isFinite(amount) || amount === 0) return { levelsGained: [] };
  const rounded = amount > 0 ? Math.floor(amount) : Math.ceil(amount);
  if (!rounded) return { levelsGained: [] };
  stats.dig_total_xp = Math.max(0, stats.dig_total_xp + rounded);
  if (rounded > 0) {
    stats.dig_xp += rounded;
    const levelsGained = [];
    while (stats.dig_level < DIG_LEVEL_MAX) {
      const required = getDigXpRequirement(stats.dig_level);
      if (stats.dig_xp < required) break;
      stats.dig_xp -= required;
      stats.dig_level += 1;
      levelsGained.push(stats.dig_level);
      if (stats.dig_level >= DIG_LEVEL_MAX) {
        stats.dig_level = DIG_LEVEL_MAX;
        stats.dig_xp = 0;
        break;
      }
    }
    return { levelsGained };
  }
  stats.dig_xp += rounded;
  if (stats.dig_xp < 0) stats.dig_xp = 0;
  return { levelsGained: [] };
}

function buildPerkSelectionContainer(user, level, stats) {
  const options = getPerkOptionsForLevel(level);
  if (!options.length) return null;
  const selectedId = stats?.dig_perk_choices?.[level];
  const selectedPerk = selectedId ? getDigPerkById(selectedId) : null;
  const intro = `## Hey ${user}, you reached Dig level ${level}. Choose one perk below:`;
  const lines = [intro];
  for (const option of options) {
    lines.push('', `${option.name}`, `-# ${option.description}`);
  }
  if (selectedPerk) {
    lines.push('', `-# You already picked **${selectedPerk.name}**.`);
  }
  const footer = selectedPerk ? '-# Perk locked in.' : '-# Choose wisely';
  const container = new ContainerBuilder()
    .setAccentColor(0x00ff00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join('\n')),
    );
  for (const option of options) {
    const isSelected = option.id === selectedId;
    const button = new ButtonBuilder()
      .setCustomId(`dig-perk-option-${level}-${option.id}`)
      .setLabel(isSelected ? 'Selected' : 'Choose')
      .setStyle(isSelected ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(Boolean(selectedId));
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(button),
    );
  }
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footer));
  return container;
}

async function sendDigPerkDm(user, level, stats) {
  if (!user) return;
  const container = buildPerkSelectionContainer(user, level, stats);
  if (!container) return;
  try {
    await user.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (error) {
    if (error.code !== 50007) console.warn('Failed to send dig perk DM:', error);
  }
}

function buildMainContainer(user, stats, content, color = DEFAULT_DIG_COLOR, disable = false) {
  ensureValidDigArea(stats);
  ensureDigProgress(stats);
  const area = getDigArea(stats.dig_area);
  const areaSelect = new StringSelectMenuBuilder()
    .setCustomId('dig-area')
    .setPlaceholder('Excavation Site');
  if (DIG_AREAS.length) {
    for (const entry of DIG_AREAS) {
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(entry.name)
        .setValue(entry.name);
      applyComponentEmoji(option, entry.emoji);
      if (area && entry.name === area.name) option.setDefault(true);
      areaSelect.addOptions(option);
    }
  } else {
    areaSelect
      .setDisabled(true)
      .setPlaceholder('No dig areas available')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Unavailable')
          .setValue('none'),
      );
  }
  const digBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('dig-action')
      .setLabel('Dig')
      .setStyle(ButtonStyle.Danger),
    ITEMS.Shovel.emoji,
  );
  const statBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('dig-stat')
      .setLabel('Dig Stat')
      .setStyle(ButtonStyle.Secondary),
    DIG_STAT_EMOJI,
  );
  const equipBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('dig-equipment')
      .setLabel('Equipment')
      .setStyle(ButtonStyle.Secondary),
    DIG_STAT_EMOJI,
  );
  if (disable) {
    digBtn.setDisabled(true);
    statBtn.setDisabled(true);
    equipBtn.setDisabled(true);
    areaSelect.setDisabled(true);
  }
  let sectionTexts = [];
  let bodyTexts = [];
  let includeSeparator = false;
  if (typeof content === 'string') {
    sectionTexts = [content];
  } else if (Array.isArray(content)) {
    sectionTexts = content.map(String);
  } else if (content && typeof content === 'object') {
    if (content.sectionTexts) {
      sectionTexts = Array.isArray(content.sectionTexts)
        ? content.sectionTexts.map(String)
        : [String(content.sectionTexts)];
    }
    if (content.bodyTexts) {
      bodyTexts = Array.isArray(content.bodyTexts)
        ? content.bodyTexts.map(String)
        : [String(content.bodyTexts)];
    }
    includeSeparator = Boolean(content.includeSeparator);
  }
  if (!sectionTexts.length) sectionTexts = [''];
  const section = new SectionBuilder().setThumbnailAccessory(
    new ThumbnailBuilder().setURL(area?.image || THUMB_URL),
  );
  for (const textDisplay of normalizeSectionTexts(sectionTexts)) {
    section.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(textDisplay),
    );
  }
  const container = new ContainerBuilder()
    .setAccentColor(color)
    .addSectionComponents(section);
  if (includeSeparator) container.addSeparatorComponents(new SeparatorBuilder());
  for (const body of bodyTexts) {
    if (!body?.trim()) continue;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(body),
    );
  }
  return container
    .addActionRowComponents(new ActionRowBuilder().addComponents(areaSelect))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(digBtn, statBtn, equipBtn),
    );
}

function buildStatContainer(user, stats) {
  ensureDigProgress(stats);
  const backBtn = new ButtonBuilder()
    .setCustomId('dig-back')
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  const statBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('dig-stat')
      .setLabel('Dig Stat')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    DIG_STAT_EMOJI,
  );
  const equipBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('dig-equipment')
      .setLabel('Equipment')
      .setStyle(ButtonStyle.Secondary),
    DIG_STAT_EMOJI,
  );
  const discovered = (stats.dig_discover || []).length;
  const totalItems = DIG_ITEMS.length;
  const level = getDigLevel(stats);
  const requiredXp = level >= DIG_LEVEL_MAX ? 0 : getDigXpRequirement(level);
  const sellBonus = Math.round(getDigCoinBonusPercent(stats) * 100);
  const cooldownNerf = getDigCooldownReduction(stats);
  const luckBonus = Math.round(getDigLuckBonus(stats) * 100);
  const perks = getDigPerkSummaries(stats);
  const header = `${DIG_STAT_EMOJI} Dig Level: ${level}`;
  const progressBar = renderDigProgressBar(stats.dig_xp, requiredXp);
  const progressLine =
    level >= DIG_LEVEL_MAX
      ? `-# ${progressBar} \`Max level\``
      : `-# ${progressBar} \`${stats.dig_xp} / ${requiredXp}\``;
  const headerWithProgress = `${header}\n${progressLine}`;
  const statsText = `Dig amount: ${stats.dig_total || 0}\n-# Success: ${
    stats.dig_success || 0
  }\n-# failed: ${stats.dig_fail || 0}\n-# died: ${stats.dig_die || 0}`;
  const discoveryText = `Item discovered: ${discovered} / ${totalItems}`;
  const perkLines = [
    "### Dig's Level perks:",
    `-# * Sell price bonus: +${sellBonus}%`,
    `-# * Dig cooldown nerf: -${cooldownNerf}s`,
    `-# * Dig luck bonus: +${luckBonus}%`,
  ];
  for (const perk of perks) {
    if (perk && String(perk).trim()) {
      perkLines.push(`-# * ${perk}`);
    }
  }
  const overviewSection = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerWithProgress),
      new TextDisplayBuilder().setContent(statsText),
      new TextDisplayBuilder().setContent(discoveryText),
    );
  // Build the perks section. Each Section must include either a thumbnail or a
  // button. Without one of these, the Discord components API will throw
  // validation errors complaining that the Section is missing a ButtonBuilder
  // or ThumbnailBuilder instance. To satisfy this requirement, attach a
  // thumbnail accessory to the perks section using a generic image.
  const perkSection = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(THUMB_URL))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(perkLines.join('\n')),
    );
  // Filter out any falsy values instead of using instanceof to avoid undefined imports
  const buttons = [backBtn, statBtn, equipBtn].filter(Boolean);
  const actionRows = buttons.length
    ? [new ActionRowBuilder().addComponents(...buttons)]
    : [];

  const avatarUrl =
    typeof user?.displayAvatarURL === 'function'
      ? user.displayAvatarURL()
      : THUMB_URL;
  const thumbnailUrl =
    typeof avatarUrl === 'string' && avatarUrl.trim()
      ? avatarUrl
      : THUMB_URL;

  overviewSection.setThumbnailAccessory(
    new ThumbnailBuilder().setURL(thumbnailUrl),
  );

  const container = new ContainerBuilder()
    .setAccentColor(DEFAULT_DIG_COLOR)
    .addSectionComponents(overviewSection)
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(perkSection);

  if (actionRows.length) {
    container.addActionRowComponents(...actionRows);
  }

  return container;
}

function buildEquipmentContainer(user, stats) {
  ensureValidDigArea(stats);
  ensureDigProgress(stats);
  const backBtn = new ButtonBuilder()
    .setCustomId('dig-back')
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  const statBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('dig-stat')
      .setLabel('Dig Stat')
      .setStyle(ButtonStyle.Secondary),
    DIG_STAT_EMOJI,
  );
  const equipBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('dig-equipment')
      .setLabel('Equipment')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    DIG_STAT_EMOJI,
  );

  const tools = (stats.inventory || []).filter(i => {
    const it = ITEMS[i.id];
    return (
      it &&
      it.types &&
      it.types.includes('Tool') &&
      it.id.includes('Shovel')
    );
  });
  const toolSelect = new StringSelectMenuBuilder()
    .setCustomId('dig-tool-select')
    .setPlaceholder('Shovel');
  if (tools.length) {
    for (const t of tools) {
      const it = ITEMS[t.id];
      const opt = new StringSelectMenuOptionBuilder()
        .setLabel(it.name)
        .setValue(it.id)
        .setDescription(`You have ${t.amount} ${it.name}`);
      applyComponentEmoji(opt, it.emoji);
      if (stats.dig_tool === it.id) opt.setDefault(true);
      toolSelect.addOptions(opt);
    }
  } else {
    toolSelect
      .setDisabled(true)
      .setPlaceholder('No shovels')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('No shovels')
          .setValue('none'),
      );
  }

  const equippedGear = getEquippedGear(stats, { cleanup: true });
  const equippedToolItem = ITEMS[stats.dig_tool] || {
    id: stats.dig_tool,
    name: 'None',
    emoji: '',
  };
  const equippedToolDisplay =
    stats.dig_tool && equippedToolItem
      ? getItemDisplay(stats, equippedToolItem, equippedToolItem.name, equippedToolItem.emoji)
      : { name: 'None', emoji: '' };
  const gearCounts = {};
  for (const entry of stats.inventory || []) {
    if (DIG_GEAR_IDS.has(entry.id)) {
      gearCounts[entry.id] = (gearCounts[entry.id] || 0) + 1;
    }
  }
  const gearSelect = new StringSelectMenuBuilder()
    .setCustomId('dig-gear-select')
    .setPlaceholder('Gear');
  const gearIds = Object.keys(gearCounts);
  if (gearIds.length) {
    const noneOption = new StringSelectMenuOptionBuilder()
      .setLabel('None')
      .setValue('none')
      .setDescription('Unequip your gear');
    if (!stats.dig_gear) noneOption.setDefault(true);
    gearSelect.addOptions(noneOption);
    for (const id of gearIds) {
      const gearItem = ITEMS[id];
      if (!gearItem) continue;
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(gearItem.name)
        .setValue(gearItem.id)
        .setDescription(`Owned: ${gearCounts[id]}`);
      applyComponentEmoji(option, gearItem.emoji);
      if (stats.dig_gear === gearItem.id) option.setDefault(true);
      gearSelect.addOptions(option);
    }
  } else {
    gearSelect
      .setDisabled(true)
      .setPlaceholder('No gear')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('No gear')
          .setValue('none'),
      );
  }
  const equippedGearDisplay = equippedGear
    ? { name: equippedGear.item.name, emoji: equippedGear.item.emoji || '' }
    : { name: 'None', emoji: '' };
  const section = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(THUMB_URL))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(` ## ${user} Equipment`),
      new TextDisplayBuilder().setContent(
        `* Tool equipped: ${equippedToolDisplay.name} ${equippedToolDisplay.emoji}\n* Gear equipped: ${equippedGearDisplay.name} ${equippedGearDisplay.emoji}`,
      ),
    );
  if (equippedGear) {
    section.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${equippedGear.perk}`),
    );
  }
  return new ContainerBuilder()
    .setAccentColor(DEFAULT_DIG_COLOR)
    .addSectionComponents(section)
    .addActionRowComponents(new ActionRowBuilder().addComponents(toolSelect))
    .addActionRowComponents(new ActionRowBuilder().addComponents(gearSelect))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(backBtn, statBtn, equipBtn),
    );
}

function useDigDurableItem(
  interaction,
  user,
  stats,
  itemId,
  entry,
  { bonusUses = 0, consumableLog } = {},
) {
  const inventory = stats.inventory || [];
  let targetEntry = entry || null;
  let index = targetEntry ? inventory.indexOf(targetEntry) : -1;
  if (index === -1) {
    index = inventory.findIndex(
      i => i && i.id === itemId && typeof i.durability === 'number',
    );
    targetEntry = index !== -1 ? inventory[index] : null;
  }
  if (index === -1 || !targetEntry) {
    return {
      broken: false,
      remaining: inventory.filter(i => i.id === itemId).length,
      consumed: false,
      currentDurability: null,
    };
  }

  if (bonusUses > 0) {
    if (!Number.isFinite(targetEntry.dig_reinforced_bonus)) {
      targetEntry.dig_reinforced_bonus = bonusUses;
    }
    if (targetEntry.dig_reinforced_bonus > 0) {
      targetEntry.dig_reinforced_bonus -= 1;
      return {
        broken: false,
        remaining: inventory.filter(i => i.id === itemId).length,
        consumed: false,
        currentDurability:
          typeof targetEntry.durability === 'number'
            ? targetEntry.durability
            : null,
      };
    }
  }

  const snapshot = { ...targetEntry };
  const result = useDurableItem(interaction, user, stats, itemId);
  const currentEntry = result.broken ? null : targetEntry;
  const currentDurability = currentEntry && typeof currentEntry.durability === 'number'
    ? currentEntry.durability
    : null;
  const types = (ITEMS[itemId]?.types || []).map(String);
  if (
    consumableLog &&
    types.some(type => type.toLowerCase() === 'consumable') &&
    (result.broken || snapshot.durability !== currentDurability)
  ) {
    consumableLog.push({
      itemId,
      snapshot,
      entryRef: currentEntry,
      broken: result.broken,
    });
  }
  return {
    ...result,
    consumed: true,
    currentDurability,
    snapshot,
    entryRef: currentEntry,
  };
}

async function sendDig(user, send, resources, fetchReply) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  normalizeInventory(stats);
  ensureDigProgress(stats);
  resources.userStats[user.id] = stats;
  ensureValidDigArea(stats);
  const area = getDigArea(stats.dig_area);
  const areaLabel = formatAreaLabel(area);
  const intro = areaLabel
    ? `### ${user}, you will be digging in ${areaLabel}!`
    : `### ${user}, select an excavation site before digging!`;
  const container = buildMainContainer(user, stats, intro, DEFAULT_DIG_COLOR);
  let message = await send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  if (fetchReply) {
    message = await fetchReply();
  }
  digStates.set(message.id, { userId: user.id });
  return message;
}

async function handleDig(interaction, resources, stats) {
  const { user } = interaction;
  ensureValidDigArea(stats);
  ensureDigProgress(stats);
  const area = getDigArea(stats.dig_area);
  const initialFull = alertInventoryFull(interaction, user, stats);
  const snowballed = isSnowballed(stats);
  const gearInfo = getEquippedGear(stats, { cleanup: true });
  const activePerkIds = new Set(getSelectedDigPerkIds(stats));
  const hasPerkId = perkId => activePerkIds.has(perkId);
  const nextDigCount = (stats.dig_total || 0) + 1;
  const isLuckyMilestone = hasPerkId('lucky-milestone') && nextDigCount % 10 === 0;
  const baseDigLuck = getDigLuckBonus(stats);
  const extraLuck =
    (gearInfo?.luckBonus || 0) +
    baseDigLuck +
    (isLuckyMilestone ? baseDigLuck : 0);
  const lootStats = applyGearLuck(stats, extraLuck);
  const usedConsumables = [];
  const hasReinforcedGear = hasPerkId('reinforced-gear');
  const hasFortuneLoop = hasPerkId('fortune-loop');
  const hasMirrorTreasure = hasPerkId('mirror-treasure');
  const hasResourceful = hasPerkId('resourceful-scavenger');
  const hasProspectorInstinct = hasPerkId('prospectors-instinct');
  const hasRapidExcavator = hasPerkId('rapid-excavator');
  const hasLastChance = hasPerkId('last-chance-dig');
  const hasTimelessTools = hasPerkId('timeless-tools');
  const gearDurabilityBefore =
    gearInfo && typeof gearInfo.entry?.durability === 'number'
      ? gearInfo.entry.durability
      : null;
  let gearUsesRemaining = gearDurabilityBefore;
  const { chance: adjustedChance, forcedFail } = computeActionSuccessChance(
    DIG_SUCCESS_BASE,
    stats,
    {
      deathChance: DIG_DEATH_CHANCE,
      min: 0.01,
      max: 0.95,
    },
  );
  const successChance = forcedFail ? 0 : adjustedChance;
  const failChance = Math.max(0, 1 - successChance - DIG_DEATH_CHANCE);
  let roll = Math.random();
  let died = roll >= successChance + failChance;
  let success = !died && roll < successChance;
  let lastChanceTriggered = false;
  if (died && hasLastChance) {
    lastChanceTriggered = true;
    roll = Math.random();
    died = roll >= successChance + failChance;
    success = !died && roll < successChance;
  }
  const baseCooldownDuration = Math.round(
    30000 * getCooldownMultiplier(stats) * (hasRapidExcavator ? 0.5 : 1),
  );
  const cooldownReductionMs = Math.min(
    baseCooldownDuration,
    Math.max(0, getDigCooldownReduction(stats) * 1000),
  );
  const cooldownDuration = Math.max(0, baseCooldownDuration - cooldownReductionMs);
  const cooldown = Date.now() + cooldownDuration;
  stats.dig_cd_until = cooldown;
  stats.dig_total = nextDigCount;
  let color;
  let xp;
  let successHeader = '';
  let successXpLine = '';
  let successBodyLines = [];
  let sectionTexts = null;
  let bodyLines = null;
  let includeSeparator = false;
  let resourcefulRestored = false;
  const areaLabel = formatAreaLabel(area);
  const locationLine = areaLabel ? `-# Dig site: ${areaLabel}` : '';
  if (success) {
    let amount = Math.floor(Math.random() * 4001) + 1000;
    amount = Math.floor(amount * getDigCoinMultiplier(stats));
    amount = applyCoinBoost(stats, amount);
    stats.coins = (stats.coins || 0) + amount;
    stats.dig_success = (stats.dig_success || 0) + 1;
    let itemDropChance = scaleChanceWithLuck(
      DIG_ITEM_BASE_CHANCE + (hasProspectorInstinct ? 0.15 : 0),
      lootStats,
      {
        max: 0.95,
      },
    );
    if (gearInfo?.dropBonus) {
      itemDropChance = Math.min(1, itemDropChance + gearInfo.dropBonus);
    }
    const foundItemMap = new Map();
    let mirrorTriggered = false;
    if (itemDropChance > 0) {
      const initialChance = Math.min(1, itemDropChance);
      if (Math.random() < initialChance) {
        const loopChance = hasFortuneLoop ? Math.min(itemDropChance, 0.99) : itemDropChance;
        let loopGuard = 0;
        do {
          const item = getRandomDigItem(area?.key, stats, lootStats);
          if (!item) break;
          const duplicateCount =
            hasMirrorTreasure && Math.random() < 0.25 ? 1 : 0;
          if (duplicateCount > 0) mirrorTriggered = true;
          const totalCount = 1 + duplicateCount;
          const existing = foundItemMap.get(item.id);
          if (existing) existing.count += totalCount;
          else foundItemMap.set(item.id, { item: { ...item }, count: totalCount });
          if (!hasFortuneLoop) break;
          loopGuard += 1;
          if (loopGuard >= 50) break;
        } while (Math.random() < loopChance);
      }
    }
    const foundRecords = Array.from(foundItemMap.values());
    if (foundRecords.length) {
      if (!stats.dig_discover) stats.dig_discover = [];
      for (const record of foundRecords) {
        if (!stats.dig_discover.includes(record.item.id)) {
          stats.dig_discover.push(record.item.id);
        }
      }
      if (!initialFull) {
        for (const record of foundRecords) {
          const pending = record.count;
          const willExceed = getInventoryCount(stats) + pending > MAX_ITEMS;
          if (!willExceed) {
            stats.inventory = stats.inventory || [];
            const entry = stats.inventory.find(i => i.id === record.item.id);
            if (entry) entry.amount += pending;
            else stats.inventory.push({ ...record.item, amount: pending });
            alertInventoryFull(interaction, user, stats);
          } else {
            alertInventoryFull(interaction, user, stats, pending);
          }
        }
      }
    }
    const totalFinds = foundRecords.reduce((sum, record) => sum + record.count, 0);
    xp = foundRecords.length
      ? Math.max(
          100,
          foundRecords.reduce(
            (sum, record) =>
              sum +
              record.count *
                Math.floor(100 * (DIG_XP_MULTIPLIER[record.item.rarity] || 1)),
            0,
          ),
        )
      : 100;
    const topRecord = foundRecords.reduce((best, record) => {
      if (!best) return record;
      const rank = RARITY_RANK[record.item.rarity] ?? -1;
      const bestRank = RARITY_RANK[best.item.rarity] ?? -1;
      return rank > bestRank ? record : best;
    }, null);
    const rarityEmoji = topRecord ? RARITY_EMOJIS[topRecord.item.rarity] || '' : '';
    const foundSummary = foundRecords
      .map(record => {
        const quantity = record.count > 1 ? `×${record.count} ` : '';
        const emoji = record.item.emoji ? ` ${record.item.emoji}` : '';
        return `${quantity}${record.item.name}${emoji}`;
      })
      .join(', ');
    successHeader = foundRecords.length
      ? `## ${user}, you have digged up ${amount} ${COIN_EMOJI} and also found ${foundSummary}!${
          rarityEmoji ? ` ${rarityEmoji}` : ''
        }`
      : `## ${user}, you have digged up ${amount} ${COIN_EMOJI}!`;
    successXpLine = `-# Earned ${xp} ${XP_EMOJI}`;
    const countdownLine = `You can dig again <t:${Math.floor(cooldown / 1000)}:R>`;
    successBodyLines = [countdownLine];
    if (isLuckyMilestone) {
      successBodyLines.push('-# Lucky Milestone doubled your dig luck this dig!');
    }
    if (mirrorTriggered) {
      successBodyLines.push('-# Mirror Treasure duplicated one of your finds!');
    }
    if (hasFortuneLoop && totalFinds > 1) {
      successBodyLines.push(
        `-# Fortune Loop extended your streak to ${totalFinds} finds!`,
      );
    }
    if (lastChanceTriggered) {
      successBodyLines.push('-# Last Chance Dig saved you from a fatal mishap!');
    }
    color = 0x00ff00;
    if (gearInfo && Number.isFinite(gearDurabilityBefore)) {
      const result = useDigDurableItem(
        interaction,
        user,
        stats,
        gearInfo.id,
        gearInfo.entry,
        {
          bonusUses: hasReinforcedGear ? 10 : 0,
          consumableLog: usedConsumables,
        },
      );
      if (result.consumed && Number.isFinite(gearDurabilityBefore)) {
        gearUsesRemaining = Math.max(
          0,
          result.currentDurability ?? gearDurabilityBefore - 1,
        );
      } else {
        gearUsesRemaining = gearDurabilityBefore;
      }
      if (result.broken && result.remaining === 0) delete stats.dig_gear;
    }
    sectionTexts = [`${successHeader}\n${successXpLine}`];
    bodyLines = successBodyLines;
    includeSeparator = true;
  } else if (died) {
    stats.dig_die = (stats.dig_die || 0) + 1;
    xp = -1000;
    const deathMessage = pickAreaDeathMessage(area);
    const header = `## ${user}, ${deathMessage.description}`;
    color = 0x000000;
    const countdownLine = `You can dig again <t:${Math.floor(cooldown / 1000)}:R>`;
    const deathBodyLines = [countdownLine];
    if (lastChanceTriggered) {
      deathBodyLines.push('-# Last Chance Dig could not save you twice.');
    }
    if (locationLine) deathBodyLines.push(locationLine);
    sectionTexts = [
      `${header}\n${deathMessage.cause}\n-# Earned ${xp} ${XP_EMOJI}`,
    ];
    bodyLines = deathBodyLines;
    includeSeparator = true;
  } else {
    stats.dig_fail = (stats.dig_fail || 0) + 1;
    xp = 25;
    let failLine = FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)];
    if (forcedFail && snowballed) {
      failLine += '\\n-# A frosty snowball curse makes every attempt fail!';
    }
    color = 0xff0000;
    const [failMessage, ...extraFailLines] = failLine.split('\n');
    const countdownLine = `You can dig again <t:${Math.floor(cooldown / 1000)}:R>`;
    const failBodyLines = [countdownLine];
    if (lastChanceTriggered) {
      failBodyLines.push('-# Last Chance Dig kept you alive through a fatal roll!');
    }
    for (const extra of extraFailLines) {
      if (extra && extra.trim()) failBodyLines.push(extra);
    }
    if (locationLine) failBodyLines.push(locationLine);
    const safeFailMessage = failMessage?.trim()
      ? failMessage.trim()
      : 'Your dig failed.';
    sectionTexts = [`## ${user}, ${safeFailMessage}\n-# Earned ${xp} ${XP_EMOJI}`];
    bodyLines = failBodyLines;
    includeSeparator = true;
  }
  if (gearInfo && Number.isFinite(gearDurabilityBefore)) {
    const gearEmoji = gearInfo.item.emoji ? ` ${gearInfo.item.emoji}` : '';
    const usesDisplay =
      gearUsesRemaining != null && Number.isFinite(gearUsesRemaining)
        ? Math.max(0, gearUsesRemaining)
        : Math.max(0, gearDurabilityBefore);
    const gearLine = `-# ${gearInfo.item.name}${gearEmoji} expires after ${usesDisplay} ${gearInfo.expireType}`;
    if (gearLine && gearLine.trim()) {
      if (bodyLines) bodyLines.push(gearLine);
    }
  }
  const { levelsGained } = applyDigXp(stats, xp);
  if (levelsGained.length) {
    const milestones = levelsGained.filter(
      lvl => lvl % 20 === 0 && lvl <= DIG_LEVEL_MAX,
    );
    for (const milestone of milestones) {
      if (milestone > (stats.dig_last_perk_notice || 0)) {
        await sendDigPerkDm(user, milestone, stats);
        stats.dig_last_perk_notice = milestone;
      }
    }
  }
  await resources.addXp(user, xp, resources.client);
  const toolId = stats.dig_tool || 'Shovel';
  const skipToolDurability = success && hasTimelessTools;
  if (!skipToolDurability) {
    const result = useDigDurableItem(interaction, user, stats, toolId, null, {
      bonusUses: hasReinforcedGear ? 10 : 0,
      consumableLog: usedConsumables,
    });
    if (result.broken && result.remaining === 0 && stats.dig_tool === toolId)
      delete stats.dig_tool;
  }
  if (
    success &&
    hasResourceful &&
    usedConsumables.length &&
    Math.random() < 0.2
  ) {
    stats.inventory = stats.inventory || [];
    for (const record of usedConsumables) {
      if (record.broken) {
        stats.inventory.push({ ...record.snapshot });
      } else if (record.entryRef) {
        record.entryRef.durability = record.snapshot.durability;
        if (record.snapshot.dig_reinforced_bonus != null) {
          record.entryRef.dig_reinforced_bonus = record.snapshot.dig_reinforced_bonus;
        }
      }
    }
    resourcefulRestored = true;
  }
  normalizeInventory(stats);
  if (resourcefulRestored) {
    if (Array.isArray(successBodyLines)) {
      successBodyLines.push(
        '-# Resourceful Scavenger returned your consumables intact!',
      );
    } else if (Array.isArray(bodyLines)) {
      bodyLines.push('-# Resourceful Scavenger returned your consumables intact!');
    }
  }
  if (success && locationLine) {
    successBodyLines.push(locationLine);
  }
  resources.userStats[user.id] = stats;
  resources.saveData();
  let content;
  if (sectionTexts) {
    const bodyText = bodyLines && bodyLines.length ? bodyLines.join('\n') : '';
    content = {
      sectionTexts,
      bodyTexts: bodyText ? [bodyText] : [],
      includeSeparator,
    };
  }
  if (!content) {
    content = success
      ? {
          sectionTexts: [`${successHeader}\n${successXpLine}`],
          bodyTexts: [successBodyLines.join('\n')],
          includeSeparator: true,
        }
      : '';
  }
  const container = buildMainContainer(user, stats, content, color, false);
  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  if (died) {
    await handleDeath(user, 'digging', resources);
  }
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('dig')
    .setDescription('Dig for coins and items');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'dig')
        return;
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      await sendDig(
        interaction.user,
        interaction.editReply.bind(interaction),
        resources,
        interaction.fetchReply.bind(interaction),
      );
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (
        interaction.isButton() &&
        interaction.customId.startsWith('dig-perk-option-')
      ) {
        const match = interaction.customId.match(/^dig-perk-option-(\d+)-(.+)$/);
        if (!match) {
          await interaction.reply({
            content: 'Unable to parse perk selection.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const level = parseInt(match[1], 10);
        const perkId = match[2];
        const options = getPerkOptionsForLevel(level);
        if (!options.length) {
          await interaction.reply({
            content: 'This perk choice is no longer available.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const stats = resources.userStats[interaction.user.id] || { inventory: [] };
        normalizeInventory(stats);
        ensureDigProgress(stats);
        if (stats.dig_level < level) {
          await interaction.reply({
            content: `You need Dig level ${level} to choose this perk.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (stats.dig_perk_choices[level]) {
          const container = buildPerkSelectionContainer(
            interaction.user,
            level,
            stats,
          );
          await interaction.update({
            components: container ? [container] : [],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
        const selected = selectDigPerk(stats, level, perkId);
        if (!selected) {
          await interaction.reply({
            content: 'Invalid perk selection.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        resources.userStats[interaction.user.id] = stats;
        resources.saveData();
        const container = buildPerkSelectionContainer(
          interaction.user,
          level,
          stats,
        );
        await interaction.update({
          components: container ? [container] : [],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const state = digStates.get(interaction.message?.id);
      if (!state || interaction.user.id !== state.userId) return;
      if (interaction.isButton() && interaction.customId === 'dig-action') {
        const stats = resources.userStats[state.userId] || { inventory: [] };
        if ((stats.dig_cd_until || 0) > Date.now()) {
          await interaction.reply({
            content: `You can dig again <t:${Math.floor(
              stats.dig_cd_until / 1000,
            )}:R>`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        ensureValidDigArea(stats);
        const area = getDigArea(stats.dig_area);
        if (!area) {
          await interaction.reply({
            content: 'Select an excavation site before digging.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        normalizeInventory(stats);
        ensureDigProgress(stats);
        const inv = stats.inventory || [];
        if (!stats.dig_tool) {
          const shovels = inv.filter(i => {
            const it = ITEMS[i.id];
            return (
              it &&
              it.types &&
              it.types.includes('Tool') &&
              it.id.includes('Shovel')
            );
          });
          if (shovels.length === 1) {
            stats.dig_tool = shovels[0].id;
            resources.userStats[state.userId] = stats;
            resources.saveData();
          }
        }
        const toolId = stats.dig_tool || 'Shovel';
        const tool = inv.find(i => i.id === toolId && toolId.includes('Shovel'));
        if (!tool || tool.amount <= 0) {
          await interaction.reply({
            content:
              '<:SBWarning:1404101025849147432> You need a tool to dig.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const loading = buildMainContainer(
          interaction.user,
          stats,
          'You are going for a dig... <a:Digani:1412451477309620316>',
          0x000000,
          true,
        );
        await interaction.update({
          components: [loading],
          flags: MessageFlags.IsComponentsV2,
        });
        setTimeout(() => {
          handleDig(interaction, resources, stats);
        }, 3000);
      } else if (interaction.isButton() && interaction.customId === 'dig-stat') {
        const stats = resources.userStats[state.userId] || {};
        const container = buildStatContainer(interaction.user, stats);
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (interaction.isButton() && interaction.customId === 'dig-equipment') {
        const stats = resources.userStats[state.userId] || {};
        const container = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'dig-tool-select'
      ) {
        const stats = resources.userStats[state.userId] || {};
        stats.dig_tool = interaction.values[0];
        resources.userStats[state.userId] = stats;
        resources.saveData();
        const container = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'dig-gear-select'
      ) {
        const stats = resources.userStats[state.userId] || { inventory: [] };
        normalizeInventory(stats);
        const selected = interaction.values[0];
        if (selected === 'none') {
          delete stats.dig_gear;
        } else if (!DIG_GEAR_IDS.has(selected)) {
          await interaction.reply({
            content: '<:SBWarning:1404101025849147432> Invalid gear selection.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        } else {
          const hasGear = (stats.inventory || []).some(i => i.id === selected);
          if (!hasGear) {
            await interaction.reply({
              content: '<:SBWarning:1404101025849147432> You do not own that gear.',
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          stats.dig_gear = selected;
        }
        resources.userStats[state.userId] = stats;
        resources.saveData();
        const container = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'dig-area'
      ) {
        const stats = resources.userStats[state.userId] || {};
        const selection = interaction.values[0];
        const area = DIG_AREA_BY_NAME[selection];
        if (!area) {
          await interaction.reply({
            content: '<:SBWarning:1404101025849147432> Invalid excavation site.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        stats.dig_area = area.name;
        resources.userStats[state.userId] = stats;
        resources.saveData();
        const areaLabel = formatAreaLabel(area);
        const intro = areaLabel
          ? `### ${interaction.user}, you will be digging in ${areaLabel}!`
          : `### ${interaction.user}, select an excavation site before digging!`;
        const container = buildMainContainer(
          interaction.user,
          stats,
          intro,
          DEFAULT_DIG_COLOR,
        );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (interaction.isButton() && interaction.customId === 'dig-back') {
        const stats = resources.userStats[state.userId] || {};
        ensureValidDigArea(stats);
        const area = getDigArea(stats.dig_area);
        const areaLabel = formatAreaLabel(area);
        const intro = areaLabel
          ? `### ${interaction.user}, you will be digging in ${areaLabel}!`
          : `### ${interaction.user}, select an excavation site before digging!`;
        const container = buildMainContainer(
          interaction.user,
          stats,
          intro,
          DEFAULT_DIG_COLOR,
        );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, sendDig };

