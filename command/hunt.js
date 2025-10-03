const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { ITEMS } = require('../items');
const { ANIMALS } = require('../animals');
const {
  normalizeInventory,
  getInventoryCount,
  MAX_ITEMS,
  alertInventoryFull,
  useDurableItem,
} = require('../utils');
const { handleDeath } = require('../death');

const ITEMS_BY_RARITY = {};
for (const item of Object.values(ITEMS)) {
  const rarity = String(item.rarity || 'Common').toLowerCase();
  if (!ITEMS_BY_RARITY[rarity]) ITEMS_BY_RARITY[rarity] = [];
  ITEMS_BY_RARITY[rarity].push(item);
}

const AREAS = [
  {
    name: 'Temperate Forest',
    key: 'TemperateForest',
    emoji: '<:SBTemperateForest:1410883390739054703>',
    image: 'https://i.ibb.co/PzN2mTKj/Temperate-Forest.png',
  },
  {
    name: 'Swamp',
    key: 'Swamp',
    emoji: '<:SBSwamp:1410883405087768587>',
    image: 'https://i.ibb.co/fGV7ftKn/Swamp.png',
  },
  {
    name: 'Savannah',
    key: 'Savannah',
    emoji: '<:SBSavannah:1410883416135569408>',
    image: 'https://i.ibb.co/s9y7mN4L/Savannah.png',
  },
  {
    name: 'Arctic Tundra',
    key: 'ArcticTundra',
    emoji: '<:SBArcticTundra:1410883429813452872>',
    image: 'https://i.ibb.co/21pKKfNN/Arctic-Tundra.png',
  },
];

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

function getArea(name) {
  return AREAS.find(a => a.name === name);
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
  const select = new StringSelectMenuBuilder()
    .setCustomId('hunt-area')
    .setPlaceholder('Area');
  for (const area of AREAS) {
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(area.name)
      .setValue(area.name)
      .setEmoji(area.emoji);
    if (stats.hunt_area === area.name) opt.setDefault(true);
    select.addOptions(opt);
  }
  const huntBtn = new ButtonBuilder()
    .setCustomId('hunt-action')
    .setLabel('hunt')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(ITEMS.HuntingRifleT1.emoji);
  const statBtn = new ButtonBuilder()
    .setCustomId('hunt-stat')
    .setLabel('Hunt Stat')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('<:SBHuntingstat:1410892320538230834>');
  const equipBtn = new ButtonBuilder()
    .setCustomId('hunt-equipment')
    .setLabel('Equipment')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('<:SBHuntingequipmentsetting:1410895836644376576>');
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
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(select))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(huntBtn, statBtn, equipBtn),
    );
}

function buildStatContainer(user, stats) {
  const backBtn = new ButtonBuilder()
    .setCustomId('hunt-back')
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  const statBtn = new ButtonBuilder()
    .setCustomId('hunt-stat')
    .setLabel('Hunt Stat')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true)
    .setEmoji('<:SBHuntingstat:1410892320538230834>');
  const equipBtn = new ButtonBuilder()
    .setCustomId('hunt-equipment')
    .setLabel('Equipment')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('<:SBHuntingequipmentsetting:1410895836644376576>');
  const discovered = (stats.hunt_discover || []).length;
  const totalAnimals = ANIMALS.length;
  const section = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL()))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## <:SBHuntingstat:1410892320538230834> Mastery Level: ${
          stats.hunt_mastery_level || 0
        }`,
      ),
      new TextDisplayBuilder().setContent(
        `Guaranteed hunts left: ${stats.hunt_detector_charges || 0}`,
      ),
      new TextDisplayBuilder().setContent(
        `Hunt amount: ${stats.hunt_total || 0}\n-# Success: ${
          stats.hunt_success || 0
        }\n-# failed: ${stats.hunt_fail || 0}\n-# died: ${
          stats.hunt_die || 0
        }`,
      ),
      new TextDisplayBuilder().setContent(
        `Item discovered: ${discovered} / ${totalAnimals}`,
      ),
    );
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(section)
    .addActionRowComponents(new ActionRowBuilder().addComponents(backBtn, statBtn, equipBtn));
}

function buildEquipmentContainer(user, stats) {
  const backBtn = new ButtonBuilder()
    .setCustomId('hunt-back')
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  const statBtn = new ButtonBuilder()
    .setCustomId('hunt-stat')
    .setLabel('Hunt Stat')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('<:SBHuntingstat:1410892320538230834>');
  const equipBtn = new ButtonBuilder()
    .setCustomId('hunt-equipment')
    .setLabel('Equipment')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true)
    .setEmoji('<:SBHuntingequipmentsetting:1410895836644376576>');

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
        .setEmoji(it.emoji)
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
        .setEmoji(it.emoji)
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

  const equippedGun = ITEMS[stats.hunt_gun] || { name: 'None', emoji: '' };
  const equippedBullet = ITEMS[stats.hunt_bullet] || { name: 'None', emoji: '' };
  const section = new SectionBuilder()
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(user.displayAvatarURL()),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(` ## ${user} Equipment`),
      new TextDisplayBuilder().setContent(
        `* Gun equiped: ${equippedGun.name} ${equippedGun.emoji}`,
      ),
      new TextDisplayBuilder().setContent(
        `* Bullet using: ${equippedBullet.name} ${equippedBullet.emoji}`,
      ),
    );
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(section)
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(gunSelect))
    .addActionRowComponents(new ActionRowBuilder().addComponents(bulletSelect))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(backBtn, statBtn, equipBtn));
}

function pickAnimal(areaKey, tier, stats, { luckBoost = false } = {}) {
  const allowSecret = (stats && stats.hunt_mastery_level >= 100) || false;
  const candidates = ANIMALS.map(a => {
    let chance = (a.chances[areaKey] || [0, 0, 0])[tier - 1] || 0;
    if (!allowSecret && a.rarity === 'Secret') chance = 0;
    if (luckBoost && a.rarity !== 'Common') chance *= 2;
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
  const areaObj = getArea(stats.hunt_area);
  const text = areaObj
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
  const areaObj = getArea(stats.hunt_area);
  if (!areaObj) return;
  normalizeInventory(stats);
  const initialFull = alertInventoryFull(interaction, user, stats);
  const inv = stats.inventory || [];
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

  stats.hunt_mastery_level = Number.isFinite(stats.hunt_mastery_level)
    ? stats.hunt_mastery_level
    : 0;
  stats.hunt_mastery_xp = Number.isFinite(stats.hunt_mastery_xp)
    ? stats.hunt_mastery_xp
    : 0;
  stats.hunt_detector_charges = Number.isFinite(stats.hunt_detector_charges)
    ? stats.hunt_detector_charges
    : 0;
  stats.hunt_luck_counter = Number.isFinite(stats.hunt_luck_counter)
    ? stats.hunt_luck_counter
    : 0;

  const masteryLevel = stats.hunt_mastery_level || 0;

  bullet.amount -= 1;
  let bulletRefunded = false;
  if (masteryLevel >= 20 && Math.random() < 0.25) {
    bullet.amount += 1;
    bulletRefunded = true;
  }
  if (bullet.amount <= 0) stats.inventory = inv.filter(i => i !== bullet);

  const slots = stats.cosmeticSlots || [];
  const hasArc = slots.includes('ArcsOfResurgence');

  let successChance = 0.45;
  let deathChance = 0.1;
  let failChance = 1 - successChance - deathChance;

  if (masteryLevel >= 10) successChance += 0.05;
  if (masteryLevel >= 60) successChance += 0.15;
  failChance = Math.max(0, 1 - successChance - deathChance);

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

  let luckBoost = false;
  if (masteryLevel >= 80) {
    stats.hunt_luck_counter += 1;
    if (stats.hunt_luck_counter >= 10) {
      luckBoost = true;
      stats.hunt_luck_counter = 0;
    }
  } else {
    stats.hunt_luck_counter = 0;
  }

  const cooldownDuration =
    masteryLevel >= 90 ? 10000 : masteryLevel >= 40 ? 20000 : 30000;
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
    stats.hunt_success = (stats.hunt_success || 0) + 1;
    const tierMap = { HuntingRifleT1: 1, HuntingRifleT2: 2, HuntingRifleT3: 3 };
    const tier = tierMap[stats.hunt_gun] || 1;
    const animal = pickAnimal(areaObj.key, tier, stats, { luckBoost });
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
    if (addedEntry && masteryLevel >= 70 && Math.random() < 0.1) {
      addedEntry.amount += 1;
      duplicated = true;
    }

    let bonusItemText = '';
    if (masteryLevel >= 50 && Math.random() < 0.1) {
      const rarityRoll = Math.random() * 100;
      let rarityKey;
      if (rarityRoll < 60) rarityKey = 'common';
      else if (rarityRoll < 90) rarityKey = 'rare';
      else if (rarityRoll < 97) rarityKey = 'epic';
      else if (rarityRoll < 99.5) rarityKey = 'legendary';
      else if (rarityRoll < 99.95) rarityKey = 'mythical';
      else rarityKey = 'godly';
      const pool = ITEMS_BY_RARITY[rarityKey] || [];
      if (pool.length) {
        const reward = pool[Math.floor(Math.random() * pool.length)];
        const invList = stats.inventory || [];
        const existingReward = invList.find(i => i.id === reward.id);
        const needsSlot = !existingReward;
        const willExceedBonus =
          needsSlot && getInventoryCount(stats) + 1 > MAX_ITEMS;
        if (!initialFull && !willExceedBonus) {
          if (existingReward) existingReward.amount += 1;
          else invList.push({ ...reward, amount: 1 });
          bonusItemText = `-# Bonus drop: ${reward.emoji || ''} ${reward.name}`;
        } else if (!initialFull) {
          alertInventoryFull(interaction, user, stats, 1);
        }
      }
    }

    const art = articleFor(animal.name);
    color = RARITY_COLORS[animal.rarity] || 0xffffff;
    xp = Math.floor(100 * (HUNT_XP_MULTIPLIER[animal.rarity] || 1));
    text = `${user}, you have hunted ${art} **${animal.name} ${animal.emoji}**!\n* Rarity: ${
      animal.rarity
    } ${RARITY_EMOJIS[animal.rarity] || ''}\n-# You gained **${xp} XP**\n-# You can hunt again <t:${Math.floor(
      cooldown / 1000,
    )}:R>`;

    if (luckBoost) {
      extraLines.push('-# Hunting luck surged, rarer animals were easier to find!');
    }
    if (duplicated) {
      extraLines.push(`-# Duplicate bonus: another ${animal.name} ${animal.emoji} was added!`);
    }
    if (bonusItemText) extraLines.push(bonusItemText);
  } else if (roll < successChance + failChance) {
    stats.hunt_fail = (stats.hunt_fail || 0) + 1;
    const fail = FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)];
    color = 0xff0000;
    xp = 25;
    text = `${user}, ${fail}\n-# You gained **${xp} XP**\n-# You can hunt again <t:${Math.floor(
      cooldown / 1000,
    )}:R>`;
  } else {
    stats.hunt_die = (stats.hunt_die || 0) + 1;
    const death =
      HUNT_DEATH_MESSAGES[Math.floor(Math.random() * HUNT_DEATH_MESSAGES.length)];
    color = 0x000000;
    xp = -1000;
    died = true;
    text = `${death.replace('{user}', user)}\n-# You lost **${Math.abs(xp)} XP**`;
  }

  if (bulletRefunded) extraLines.push('-# Bullet refunded!');
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
  await resources.addHuntMasteryXp(user, xp, resources.client);
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
        const stats = resources.userStats[state.userId] || { inventory: [] };
        stats.hunt_area = area;
        resources.userStats[state.userId] = stats;
        resources.saveData();
        const areaObj = getArea(area);
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
        const areaObj = getArea(stats.hunt_area);
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
        const container = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: [container],
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
        const container = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: [container],
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
        const container = buildEquipmentContainer(interaction.user, stats);
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (interaction.isButton() && interaction.customId === 'hunt-back') {
        const state = huntStates.get(interaction.message.id);
        if (!state || state.userId !== interaction.user.id) return;
        const stats = resources.userStats[state.userId] || {};
        const areaObj = getArea(stats.hunt_area);
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

