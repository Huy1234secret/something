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
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('@discordjs/builders');
const { ITEMS } = require('../items');
const { ANIMALS } = require('../animals');
const { AREAS, AREA_BY_NAME, AREA_BY_KEY, HUNT_LURES, RARE_RARITIES } = require('../huntData');
const { isChristmasEventActive } = require('../events');
const {
  getBadgeById,
  getBadgeProgress,
  formatBadgeRewardLines,
} = require('../badges');
const {
  normalizeInventory,
  getInventoryCount,
  MAX_ITEMS,
  alertInventoryFull,
  useDurableItem,
  applyComponentEmoji,
  resolveComponentEmoji,
  getCooldownMultiplier,
  computeActionSuccessChance,
  isSnowballed,
  scaleChanceWithLuck,
  getLuckAdjustedWeight,
  getLuckBonus,
} = require('../utils');
const { handleDeath } = require('../death');
const { useHuntLure } = require('./useItem');
const { getItemDisplay } = require('../skins');
const { isBossAnimal, startBossBattle } = require('../huntBossPvp');

const XP_EMOJI = '<:SBXP:1432731173762760854>';

const AURORA_TUNDRA_KEY = 'AuroraTundra';

const HUNT_LUCK_WEIGHTS = {
  Common: 0,
  Uncommon: 0.25,
  Rare: 0.35,
  Epic: 0.55,
  Legendary: 0.85,
  Mythical: 1.1,
  Godly: 1.35,
  Prismatic: 1.55,
  Secret: 1.8,
};

const FAIL_MESSAGES = [
  'The animals spotted you first and vanished into the trees',
  'You found fresh tracks, but they disappeared into the underbrush.',
  'You tripped over a root and scared off your target.',
  'The wind shifted—your scent gave you away.',
  'The sudden rain drowned out all sounds—you lost your trail.',
  'Just as you lined up your shot, a fox darted past and scared off your prey.',
  'The smell of bear nearby made you retreat, abandoning the hunt.',
  'A squirrel dropped acorns on your head, making you miss your shot.',
  'You stepped in a pile of worms, freaked out, and lost focus.',
  'You stopped to look at glowing mushrooms and forgot about hunting.',
  'You aimed carefully, but a rabbit darted across and spoiled the shot.',
];

const HUNT_DEATH_MESSAGES = [
  `💀 {user} wandered into the forest and never came back…`,
  `🐻 A furious bear mauled {user} to pieces!`,
  `🕷️ {user} was bitten by a venomous spider and collapsed instantly.`,
  `🏹 An enemy hunter mistook {user} for prey…`,
  `🐍 A giant snake swallowed {user} whole!`,
  `🌲 A falling tree crushed {user} during the hunt.`,
  `⚡ Lightning struck {user} down in the middle of the forest.`,
  `🐗 A raging boar gored {user} to death.`,
  `❄️ {user} froze to death while chasing prey in the snow.`,
  `🔥 {user} set up campfire… and burned alive.`,
  `🦅 A giant eagle carried {user} away into the skies—never to be seen again.`,
  `🐺 A pack of wolves surrounded and devoured {user}.`,
  `🕳️ {user} fell into a hidden pit trap and broke their neck.`,
  `🍄 {user} ate the wrong mushroom and died instantly.`,
  `🦂 A deadly scorpion sting ended {user}’s hunt forever.`,
  `🌊 {user} slipped into a raging river and drowned.`,
  `🐊 A crocodile dragged {user} underwater… game over.`,
  `🪤 {user} tripped their own trap and got impaled.`,
  `🦌 A mighty deer rammed {user} so hard they didn’t get back up.`,
  `🌪️ A sudden storm ripped through the forest and killed {user}.`,
  `🩸 {user} bled out after a hunting accident.`,
  `🧟 Rumor has it zombies dragged {user} into the woods…`,
  `🕯️ {user} mysteriously vanished—only their gear was found.`,
  `🐉 A mythical beast roasted {user} with dragonfire!`,
  `👻 Hunters whispered that {user}’s spirit still haunts the forest after their death…`,
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

const HUNT_XP_MULTIPLIER = {
  Common: 1,
  Rare: 1.1,
  Epic: 1.4,
  Legendary: 2,
  Mythical: 3.5,
  Godly: 6,
  Secret: 10,
};

const huntStates = new Map();

const AREA_BY_LURE = Object.fromEntries(
  Object.entries(HUNT_LURES).map(([areaKey, data]) => [data.itemId, areaKey]),
);

const LURE_ITEM_IDS = new Set(Object.values(HUNT_LURES).map(data => data.itemId));

const MASTER_ZOOLOGIST_BADGE = getBadgeById('MasterZoologist');

function getAvailableAreas(now = new Date()) {
  if (isChristmasEventActive(now)) return AREAS;
  return AREAS.filter(area => area.key !== AURORA_TUNDRA_KEY);
}

function ensureValidHuntArea(stats, now = new Date()) {
  if (!stats) return;
  const availableAreas = getAvailableAreas(now);
  if (!availableAreas.length) {
    delete stats.hunt_area;
    return;
  }
  if (!availableAreas.some(area => area.name === stats.hunt_area)) {
    stats.hunt_area = availableAreas[0].name;
  }
}

function getArea(name, now = new Date()) {
  if (!name) return null;
  const area = AREA_BY_NAME[name];
  if (!area) return null;
  if (area.key === AURORA_TUNDRA_KEY && !isChristmasEventActive(now)) return null;
  return area;
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function buildMainContainer(
  user,
  stats,
  text,
  color,
  thumb,
  disableButtons = false,
) {
  const now = new Date();
  ensureValidHuntArea(stats, now);
  const areas = getAvailableAreas(now);
  const select = new StringSelectMenuBuilder()
    .setCustomId('hunt-area')
    .setPlaceholder('Area');
  for (const area of areas) {
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(area.name)
      .setValue(area.name);
    applyComponentEmoji(opt, area.emoji);
    if (stats.hunt_area === area.name) opt.setDefault(true);
    select.addOptions(opt);
  }
  const huntBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('hunt-action')
      .setLabel('hunt')
      .setStyle(ButtonStyle.Danger),
    ITEMS.HuntingRifleT1.emoji,
  );
  const statBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('hunt-stat')
      .setLabel('Hunt Stat')
      .setStyle(ButtonStyle.Secondary),
    '<:SBHuntingstat:1410892320538230834>',
  );
  const equipBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('hunt-equipment')
      .setLabel('Equipment')
      .setStyle(ButtonStyle.Secondary),
    '<:SBHuntingequipmentsetting:1410895836644376576>',
  );
  if (disableButtons) {
    huntBtn.setDisabled(true);
    statBtn.setDisabled(true);
    equipBtn.setDisabled(true);
  }
  const section = new SectionBuilder()
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(thumb || user.displayAvatarURL()),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return new ContainerBuilder()
    .setAccentColor(color)
    .addSectionComponents(section)
    .addActionRowComponents(new ActionRowBuilder().addComponents(select))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(huntBtn, statBtn, equipBtn),
    );
}

function buildStatContainer(user, stats) {
  const backBtn = new ButtonBuilder()
    .setCustomId('hunt-back')
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  const statBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('hunt-stat')
      .setLabel('Hunt Stat')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    '<:SBHuntingstat:1410892320538230834>',
  );
  const equipBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('hunt-equipment')
      .setLabel('Equipment')
      .setStyle(ButtonStyle.Secondary),
    '<:SBHuntingequipmentsetting:1410895836644376576>',
  );
  const discovered = (stats.hunt_discover || []).length;
  const totalAnimals = ANIMALS.length;
  const huntStatsText = new TextDisplayBuilder().setContent(
    `Guaranteed hunts left: ${stats.hunt_detector_charges || 0}\nHunt amount: ${
      stats.hunt_total || 0
    }\n-# Success: ${stats.hunt_success || 0}\n-# failed: ${
      stats.hunt_fail || 0
    }\n-# died: ${stats.hunt_die || 0}`,
  );
  const infoLines = [`Item discovered: ${discovered} / ${totalAnimals}`];
  const lureState = stats.hunt_lures || {};
  const activeLures = Object.entries(lureState)
    .filter(([, data]) => data && data.remaining > 0)
    .map(([areaKey, data]) => {
      const areaInfo = AREA_BY_KEY[areaKey];
      const item = ITEMS[data.itemId] || {};
      const areaName = areaInfo ? areaInfo.name : areaKey;
      const itemName = item.name || 'Lure';
      return `-# ${areaName}: ${itemName} (${data.remaining} hunts left)`;
    });
  if (activeLures.length) {
    infoLines.push(`Active lures:\n${activeLures.join('\n')}`);
  }
  const infoText = new TextDisplayBuilder().setContent(infoLines.join('\n\n'));
  const section = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL()))
    .addTextDisplayComponents(huntStatsText, infoText);
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(section)
    .addActionRowComponents(new ActionRowBuilder().addComponents(backBtn, statBtn, equipBtn));
}

function buildEquipmentContainer(user, stats) {
  const now = new Date();
  ensureValidHuntArea(stats, now);
  const backBtn = new ButtonBuilder()
    .setCustomId('hunt-back')
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  const statBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('hunt-stat')
      .setLabel('Hunt Stat')
      .setStyle(ButtonStyle.Secondary),
    '<:SBHuntingstat:1410892320538230834>',
  );
  const equipBtn = applyComponentEmoji(
    new ButtonBuilder()
      .setCustomId('hunt-equipment')
      .setLabel('Equipment')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    '<:SBHuntingequipmentsetting:1410895836644376576>',
  );

  const guns = (stats.inventory || []).filter(i =>
    i.id.startsWith('HuntingRifle'),
  );
  const gunSelect = new StringSelectMenuBuilder()
    .setCustomId('hunt-equip-select')
    .setPlaceholder('Gun');
  if (guns.length) {
    for (const g of guns) {
      const it = ITEMS[g.id];
      const opt = new StringSelectMenuOptionBuilder()
        .setLabel(it.name)
        .setValue(it.id)
        .setEmoji(resolveComponentEmoji(it.emoji))
        .setDescription(`You have ${g.amount} ${it.name}`);
      if (stats.hunt_gun === it.id) opt.setDefault(true);
      gunSelect.addOptions(opt);
    }
  } else {
    gunSelect
      .setDisabled(true)
      .setPlaceholder('No guns')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('No guns')
          .setValue('none'),
      );
  }

  const bullets = (stats.inventory || []).filter(i => i.id === 'Bullet');
  const bulletSelect = new StringSelectMenuBuilder()
    .setCustomId('hunt-bullet-select')
    .setPlaceholder('Bullet');
  if (bullets.length) {
    for (const b of bullets) {
      const it = ITEMS[b.id];
      const opt = new StringSelectMenuOptionBuilder()
        .setLabel(it.name)
        .setValue(it.id)
        .setEmoji(resolveComponentEmoji(it.emoji))
        .setDescription(`You have ${b.amount} ${it.name}`);
      if (stats.hunt_bullet === it.id) opt.setDefault(true);
      bulletSelect.addOptions(opt);
    }
  } else {
    bulletSelect
      .setDisabled(true)
      .setPlaceholder('No bullets')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('No bullets')
          .setValue('none'),
      );
  }

  const equippedGunItem = ITEMS[stats.hunt_gun] || {
    id: stats.hunt_gun,
    name: 'None',
    emoji: '',
  };
  const equippedGun =
    stats.hunt_gun && equippedGunItem
      ? getItemDisplay(stats, equippedGunItem, equippedGunItem.name, equippedGunItem.emoji)
      : { name: 'None', emoji: '' };
  const equippedBullet = ITEMS[stats.hunt_bullet] || { name: 'None', emoji: '' };
  const areaInfo = getArea(stats.hunt_area, now);
  const areaKey = areaInfo ? areaInfo.key : null;
  const activeLureState = areaKey && stats.hunt_lures ? stats.hunt_lures[areaKey] : null;
  const activeLureItem = activeLureState ? ITEMS[activeLureState.itemId] : null;
  const activeLureText = activeLureItem
    ? `* Lure using: ${activeLureItem.name} ${activeLureItem.emoji}\n-# ${activeLureItem.name} left: ${
        activeLureState.remaining || 0
      }`
    : '* Lure using: None';

  const lureSelect = new StringSelectMenuBuilder()
    .setCustomId('hunt-lure-select')
    .setPlaceholder('Activate a lure');
  const lureEntries = (stats.inventory || []).filter(entry => LURE_ITEM_IDS.has(entry.id));
  if (lureEntries.length) {
    for (const entry of lureEntries) {
      const item = ITEMS[entry.id];
      if (!item) continue;
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(item.name)
        .setValue(item.id)
        .setDescription(`You have: ${entry.amount}`);
      if (item.emoji) option.setEmoji(resolveComponentEmoji(item.emoji));
      lureSelect.addOptions(option);
    }
  } else {
    lureSelect
      .setDisabled(true)
      .setPlaceholder('No lures available')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('No lures')
          .setValue('none'),
      );
  }

  const equipmentSection = new SectionBuilder()
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(user.displayAvatarURL()),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(` ## ${user} Equipment`),
      new TextDisplayBuilder().setContent(
        `* Gun equiped: ${equippedGun.name} ${equippedGun.emoji}\n* Bullet using: ${
          equippedBullet.name
        } ${equippedBullet.emoji}`,
      ),
      new TextDisplayBuilder().setContent(activeLureText),
    );

  const containers = [];

  containers.push(
    new ContainerBuilder()
      .setAccentColor(0xffffff)
      .addSectionComponents(equipmentSection)
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(backBtn, statBtn, equipBtn),
      ),
  );

  const selects = [gunSelect, bulletSelect, lureSelect];
  for (const selectComponent of selects) {
    containers.push(
      new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(selectComponent),
        ),
    );
  }

  return containers;
}

function pickAnimal(areaKey, tier, stats, { luckBoost = false } = {}) {
  const allowSecret = false;
  const lureInfo = HUNT_LURES[areaKey];
  const lureState = stats && stats.hunt_lures ? stats.hunt_lures[areaKey] : null;
  const lureActive = Boolean(lureInfo && lureState && lureState.remaining > 0);
  const candidates = ANIMALS.map(a => {
    let chance = (a.chances[areaKey] || [0, 0, 0])[tier - 1] || 0;
    if (!allowSecret && a.rarity === 'Secret') chance = 0;
    chance = getLuckAdjustedWeight(chance, a.rarity, stats, HUNT_LUCK_WEIGHTS);
    if (luckBoost && a.rarity !== 'Common') chance *= 2;
    if (lureActive && RARE_RARITIES.has(a.rarity)) chance *= 2;
    return { animal: a, chance };
  }).filter(c => c.chance > 0);
  if (candidates.length === 0) {
    const fallback = ANIMALS.find(a => allowSecret || a.rarity !== 'Secret');
    return fallback || ANIMALS[0];
  }
  const total = candidates.reduce((sum, c) => sum + c.chance, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const c of candidates) {
    acc += c.chance;
    if (r < acc) return c.animal;
  }
  return candidates[candidates.length - 1].animal;
}

async function sendHunt(user, send, resources, fetchReply) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  resources.userStats[user.id] = stats;
  const now = new Date();
  ensureValidHuntArea(stats, now);
  const areaObj = getArea(stats.hunt_area, now);
  let text = areaObj
    ? `### ${user}, You will be hunting in ${areaObj.name}!`
    : `### ${user}, select an area before hunting!`;
  if ((stats.hunt_detector_charges || 0) > 0) {
    text += `\n-# Animal Detector charges left: ${stats.hunt_detector_charges}`;
  }
  const container = buildMainContainer(
    user,
    stats,
    text,
    0xffffff,
    areaObj && areaObj.image,
  );
  let message = await send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  if (fetchReply) {
    message = await fetchReply();
  }
  huntStates.set(message.id, { userId: user.id });
  return message;
}

async function handleHunt(interaction, resources, stats) {
  const { message, user } = interaction;
  const now = new Date();
  ensureValidHuntArea(stats, now);
  const areaObj = getArea(stats.hunt_area, now);
  if (!areaObj) return;
  normalizeInventory(stats);
  const initialFull = alertInventoryFull(interaction, user, stats);
  const inv = stats.inventory || [];
  stats.hunt_lures = stats.hunt_lures || {};
  const bulletId = stats.hunt_bullet || 'Bullet';
  const bullet = inv.find(i => i.id === bulletId);
  if (!bullet || bullet.amount <= 0) {
    const container = buildMainContainer(
      user,
      stats,
      '<:SBWarning:1404101025849147432> You need bullets to hunt.',
      0xff0000,
      areaObj.image,
    );
    await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    return;
  }

  stats.hunt_detector_charges = Number.isFinite(stats.hunt_detector_charges)
    ? stats.hunt_detector_charges
    : 0;
  bullet.amount -= 1;
  if (bullet.amount <= 0) stats.inventory = inv.filter(i => i !== bullet);

  const slots = stats.cosmeticSlots || [];
  const hasArc = slots.includes('ArcsOfResurgence');

  let successChance = 0.45;
  let deathChance = 0.1;
  let failChance = 1 - successChance - deathChance;

  if (hasArc) {
    failChance *= 1.25;
    const remain = 1 - failChance;
    successChance = remain - deathChance;
  }

  const detectorActive = stats.hunt_detector_charges > 0;
  if (detectorActive) {
    successChance = 1;
    failChance = 0;
    deathChance = 0;
  }

  if (!detectorActive) {
    if (successChance > 0.9) {
      successChance = 0.9;
      failChance = 0.09;
      deathChance = 0.01;
    } else if (successChance < 0.001) {
      successChance = 0.001;
      failChance = 0.99;
      deathChance = 0.009;
    }
  }

  const snowballed = isSnowballed(stats);
  const { chance: adjustedChance, forcedFail } = computeActionSuccessChance(successChance, stats, {
    deathChance,
    min: detectorActive ? 0.01 : 0.01,
    max: detectorActive ? 1 : 0.95,
  });
  const forcedFailure = forcedFail;
  successChance = forcedFailure ? 0 : adjustedChance;
  failChance = Math.max(0, 1 - successChance - deathChance);

  const luckBoost = false;

  const baseCooldown = 30000;
  let cooldownMultiplier = getCooldownMultiplier(stats);
  if (stats.hunt_gun === 'HuntingRifleT2') cooldownMultiplier *= 0.9;
  else if (stats.hunt_gun === 'HuntingRifleT3') cooldownMultiplier *= 0.75;
  const cooldownDuration = Math.round(baseCooldown * cooldownMultiplier);
  const cooldown = Date.now() + cooldownDuration;
  stats.hunt_cd_until = cooldown;
  stats.hunt_total = (stats.hunt_total || 0) + 1;

  const roll = Math.random();
  let text;
  let color;
  let xp;
  let died = false;
  const extraLines = [];

  if (roll < successChance) {
    const tierMap = { HuntingRifleT1: 1, HuntingRifleT2: 2, HuntingRifleT3: 3 };
    const tier = tierMap[stats.hunt_gun] || 1;
    const lureConfig = HUNT_LURES[areaObj.key];
    const lureState = lureConfig ? stats.hunt_lures[areaObj.key] : null;
    const lureActive = Boolean(lureConfig && lureState && lureState.remaining > 0);
    const animal = pickAnimal(areaObj.key, tier, stats, { luckBoost });
    if (isBossAnimal(animal.id)) {
      huntStates.delete(message.id);
      await startBossBattle({
        interaction: {
          message,
          update: options => message.edit(options),
        },
        user,
        stats,
        animal,
        resources,
      });
      return;
    }
    stats.hunt_success = (stats.hunt_success || 0) + 1;
    const item = ITEMS[animal.id];
    if (!stats.hunt_discover) stats.hunt_discover = [];
    if (!stats.hunt_discover.includes(item.id)) stats.hunt_discover.push(item.id);

    let addedEntry = null;
    if (!initialFull) {
      const willExceed = getInventoryCount(stats) + 1 > MAX_ITEMS;
      if (!willExceed) {
        const existing = (stats.inventory || []).find(i => i.id === item.id);
        if (existing) {
          existing.amount += 1;
          addedEntry = existing;
        } else {
          addedEntry = { ...item, amount: 1 };
          (stats.inventory = stats.inventory || []).push(addedEntry);
        }
        alertInventoryFull(interaction, user, stats);
      } else {
        alertInventoryFull(interaction, user, stats, 1);
      }
    } else {
      alertInventoryFull(interaction, user, stats, 1);
    }

    let duplicated = false;

    let bonusItemText = '';

    const art = articleFor(animal.name);
    color = RARITY_COLORS[animal.rarity] || 0xffffff;
    xp = Math.floor(100 * (HUNT_XP_MULTIPLIER[animal.rarity] || 1));
    text = `${user}, you have hunted ${art} **${animal.name} ${animal.emoji}**!\n* Rarity: ${
      animal.rarity
    } ${RARITY_EMOJIS[animal.rarity] || ''}\n-# You gained **${xp} XP ${XP_EMOJI}**\n-# You can hunt again <t:${Math.floor(
      cooldown / 1000,
    )}:R>`;

    if (luckBoost) {
      extraLines.push('-# Hunting luck surged, rarer animals were easier to find!');
    }
    if (lureActive) {
      const lureItem = ITEMS[lureConfig.itemId] || { name: 'Lure', emoji: '' };
      lureState.remaining = Math.max(0, lureState.remaining - 1);
      const remainingText = `-# ${lureItem.name} left: ${lureState.remaining}`;
      extraLines.push('-# Rarer animals were drawn in by your lure!');
      extraLines.push(remainingText);
      if (lureState.remaining <= 0) delete stats.hunt_lures[areaObj.key];
    }
    if (duplicated) {
      extraLines.push(`-# Duplicate bonus: another ${animal.name} ${animal.emoji} was added!`);
    }
    if (bonusItemText) extraLines.push(bonusItemText);

    await checkMasterZoologistBadge(user, stats, resources, extraLines);
  } else if (roll < successChance + failChance) {
    stats.hunt_fail = (stats.hunt_fail || 0) + 1;
    let fail = FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)];
    if (forcedFailure && snowballed) {
      fail += '\\n-# A frosty snowball curse makes every hunt fail!';
    }
    color = 0xff0000;
    xp = 25;
    text = `${user}, ${fail}\n-# You gained **${xp} XP ${XP_EMOJI}**\n-# You can hunt again <t:${Math.floor(
      cooldown / 1000,
    )}:R>`;
  } else {
    stats.hunt_die = (stats.hunt_die || 0) + 1;
    const death =
      HUNT_DEATH_MESSAGES[Math.floor(Math.random() * HUNT_DEATH_MESSAGES.length)];
    color = 0x000000;
    xp = -1000;
    died = true;
    text = `${death.replace('{user}', user)}\n-# You lost **${Math.abs(xp)} XP ${XP_EMOJI}**`;
  }

  if (detectorActive) {
    stats.hunt_detector_charges = Math.max(
      0,
      stats.hunt_detector_charges - 1,
    );
    extraLines.push(
      `-# Animal Detector charges left: ${stats.hunt_detector_charges}`,
    );
  }
  if (extraLines.length) {
    text += `\n${extraLines.join('\n')}`;
  }

  await resources.addXp(user, xp, resources.client);
  const gun = stats.hunt_gun;
  const res = useDurableItem(interaction, user, stats, gun);
  if (res.broken && res.remaining === 0 && stats.hunt_gun === gun) delete stats.hunt_gun;
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();
  const container = buildMainContainer(
    user,
    stats,
    text,
    color,
    areaObj.image,
  );
  await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
  if (died) {
    await handleDeath(user, 'hunting', resources);
  }
}

async function checkMasterZoologistBadge(user, stats, resources, extraLines) {
  if (!MASTER_ZOOLOGIST_BADGE) return;
  stats.badges = stats.badges || {};
  if (stats.badges[MASTER_ZOOLOGIST_BADGE.id]) return;
  const progress = getBadgeProgress(MASTER_ZOOLOGIST_BADGE, stats);
  if (!progress.max || progress.current < progress.max) return;

  stats.badges[MASTER_ZOOLOGIST_BADGE.id] = true;

  for (const prize of MASTER_ZOOLOGIST_BADGE.prizes) {
    if (prize.type === 'currency') {
      const key = prize.currency;
      stats[key] = Number.isFinite(stats[key]) ? stats[key] : 0;
      stats[key] += prize.amount;
    } else if (prize.type === 'item') {
      const base = ITEMS[prize.itemId] || {
        id: prize.itemId,
        name: prize.itemId,
        emoji: '',
        image: '',
      };
      const inv = stats.inventory || [];
      let entry = inv.find(i => i.id === base.id);
      if (entry) entry.amount += prize.amount;
      else
        inv.push({
          id: base.id,
          name: base.name,
          emoji: base.emoji,
          image: base.image,
          amount: prize.amount,
        });
    }
  }

  const rewardLines = formatBadgeRewardLines(MASTER_ZOOLOGIST_BADGE);
  const introSection = new SectionBuilder()
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(
        MASTER_ZOOLOGIST_BADGE.thumbnail || user.displayAvatarURL(),
      ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Congratulation ${user}!\n### You have earned Master Zoologist badge!\n-# For discovering every single animals in hunting`,
      ),
    );

  const badgeContainer = new ContainerBuilder()
    .setAccentColor(0xffff00)
    .addSectionComponents(introSection)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `You have earned:\n${rewardLines.join('\n')}`,
      ),
    );
  try {
    await user.send({ components: [badgeContainer], flags: MessageFlags.IsComponentsV2 });
  } catch {}
  extraLines.push(
    `-# ${MASTER_ZOOLOGIST_BADGE.name} badge earned! Check your DMs for rewards.`,
  );
  resources.userStats[user.id] = stats;
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('hunt')
    .setDescription('Go hunting');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'hunt') {
        await sendHunt(
          interaction.user,
          interaction.reply.bind(interaction),
          resources,
          interaction.fetchReply.bind(interaction),
        );
      } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'hunt-area'
      ) {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const area = interaction.values[0];
        const now = new Date();
        const areaObj = getArea(area, now);
        if (!areaObj) {
          await interaction.reply({
            content: '<:SBWarning:1404101025849147432> That area is not available right now.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const stats = resources.userStats[state.userId] || { inventory: [] };
        stats.hunt_area = areaObj.name;
        ensureValidHuntArea(stats, now);
        resources.userStats[state.userId] = stats;
        resources.saveData();
        const text = `### ${interaction.user}, You will be hunting in ${areaObj.name}!`;
        const container = buildMainContainer(
          interaction.user,
          stats,
          text,
          0xffffff,
          areaObj.image,
        );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (interaction.isButton() && interaction.customId === 'hunt-action') {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const stats = resources.userStats[state.userId] || { inventory: [] };
        if ((stats.hunt_cd_until || 0) > Date.now()) {
          await interaction.reply({
            content: `You can hunt again <t:${Math.floor(
              stats.hunt_cd_until / 1000,
            )}:R>`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const now = new Date();
        ensureValidHuntArea(stats, now);
        const areaObj = getArea(stats.hunt_area, now);
        if (!areaObj) {
          await interaction.reply({
            content: 'Select an area before hunting.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        normalizeInventory(stats);
        const inv = stats.inventory || [];
        const bulletId = stats.hunt_bullet || 'Bullet';
        const bullet = inv.find(i => i.id === bulletId);
        if (!bullet || bullet.amount <= 0) {
          await interaction.reply({
            content:
              '<:SBWarning:1404101025849147432> You need bullets to hunt.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const loadingContainer = buildMainContainer(
          interaction.user,
          stats,
          'You are going for a hunt... <a:SBLoadinghunting:1410900357479010365>',
          0x000000,
          areaObj.image,
          true,
        );
        await interaction.update({
          components: [loadingContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        setTimeout(() => {
          handleHunt(interaction, resources, stats);
        }, 3000);
      } else if (
        interaction.isButton() &&
        interaction.customId === 'hunt-stat'
      ) {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const stats = resources.userStats[state.userId] || {};
        const container = buildStatContainer(interaction.user, stats);
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (
        interaction.isButton() &&
        interaction.customId === 'hunt-equipment'
      ) {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const stats = resources.userStats[state.userId] || {};
        const containers = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: containers,
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'hunt-equip-select'
      ) {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const gun = interaction.values[0];
        const stats = resources.userStats[state.userId] || {};
        stats.hunt_gun = gun;
        resources.userStats[state.userId] = stats;
        resources.saveData();
        const containers = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: containers,
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'hunt-bullet-select'
      ) {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const bullet = interaction.values[0];
        const stats = resources.userStats[state.userId] || {};
        stats.hunt_bullet = bullet;
        resources.userStats[state.userId] = stats;
        resources.saveData();
        const containers = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: containers,
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'hunt-lure-select'
      ) {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const itemId = interaction.values[0];
        if (!LURE_ITEM_IDS.has(itemId)) {
          await interaction.reply({
            content: '<:SBWarning:1404101025849147432> Invalid lure.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const result = useHuntLure(interaction.user, itemId, 1, resources);
        if (result.error) {
          await interaction.reply({ content: result.error, flags: MessageFlags.Ephemeral });
          return;
        }
        const stats = resources.userStats[state.userId] || {};
        const containers = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: containers,
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (interaction.isButton() && interaction.customId === 'hunt-back') {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const stats = resources.userStats[state.userId] || {};
        const now = new Date();
        ensureValidHuntArea(stats, now);
        const areaObj = getArea(stats.hunt_area, now);
        const text = areaObj
          ? `### ${interaction.user}, You will be hunting in ${areaObj.name}!`
          : `### ${interaction.user}, select an area before hunting!`;
        const container = buildMainContainer(
          interaction.user,
          stats,
          text,
          0xffffff,
          areaObj && areaObj.image,
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

module.exports = { setup, sendHunt };

