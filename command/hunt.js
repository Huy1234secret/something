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
const { normalizeInventory } = require('../utils');

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
  Secret: 0x000000,
};

const huntStates = new Map();

function getArea(name) {
  return AREAS.find(a => a.name === name);
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function buildMainContainer(user, stats, text, color, thumb) {
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
  if (!stats.hunt_area || (stats.hunt_cd_until || 0) > Date.now()) huntBtn.setDisabled(true);
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
  const section = new SectionBuilder();
  if (thumb) section.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb));
  section.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return new ContainerBuilder()
    .setAccentColor(color)
    .addSectionComponents(section)
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(select))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(huntBtn, statBtn, equipBtn));
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
  const section = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL()))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${user} Hunting Stats.`),
      new TextDisplayBuilder().setContent(
        `### <:SBHuntingstat:1410892320538230834> Mastery Level: ${stats.hunt_level || 0}`,
      ),
      new TextDisplayBuilder().setContent(`* Hunted ${stats.hunt_total || 0} times`),
      new TextDisplayBuilder().setContent(`* Succeed ${stats.hunt_success || 0} times`),
      new TextDisplayBuilder().setContent(`* Failed ${stats.hunt_fail || 0} times`),
      new TextDisplayBuilder().setContent(`* Died ${stats.hunt_die || 0} times`),
    );
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(section)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Hunting Mastery Perks:'))
    .addSeparatorComponents(new SeparatorBuilder())
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

  const guns = (stats.inventory || []).filter(
    i => (ITEMS[i.id] || {}).type === 'Gun',
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
    gunSelect.setDisabled(true).setPlaceholder('No guns');
  }

  const bullets = (stats.inventory || []).filter(i => {
    const it = ITEMS[i.id] || {};
    return it.type === 'Bullet' || it.id === 'Bullet';
  });
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
    bulletSelect.setDisabled(true).setPlaceholder('No bullets');
  }

  const equippedGun = ITEMS[stats.hunt_gun] || { name: 'None', emoji: '' };
  const equippedBullet = ITEMS[stats.hunt_bullet] || { name: 'None', emoji: '' };
  const section = new SectionBuilder()
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

function pickAnimal(areaKey, tier) {
  const candidates = ANIMALS.map(a => ({
    animal: a,
    chance: (a.chances[areaKey] || [0, 0, 0])[tier - 1] || 0,
  })).filter(c => c.chance > 0);
  const total = candidates.reduce((sum, c) => sum + c.chance, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const c of candidates) {
    acc += c.chance;
    if (r < acc) return c.animal;
  }
  return candidates[candidates.length - 1].animal;
}

async function sendHunt(user, send, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  resources.userStats[user.id] = stats;
  const areaObj = getArea(stats.hunt_area);
  const text = areaObj
    ? `### ${user}, You will be hunting in ${areaObj.name}!`
    : `### ${user}, select an area before hunting!`;
  const container = buildMainContainer(
    user,
    stats,
    text,
    0xffffff,
    areaObj && areaObj.image,
  );
  const message = await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  huntStates.set(message.id, { userId: user.id });
  return message;
}

async function handleHunt(interaction, resources, stats) {
  const areaObj = getArea(stats.hunt_area);
  if (!areaObj) return;
  normalizeInventory(stats);
  const inv = stats.inventory || [];
  const bulletId = stats.hunt_bullet || 'Bullet';
  const bullet = inv.find(i => i.id === bulletId);
  if (!bullet || bullet.amount <= 0) {
    await interaction.reply({
      content: '<:SBWarning:1404101025849147432> You need bullets to hunt.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  bullet.amount -= 1;
  if (bullet.amount <= 0) stats.inventory = inv.filter(i => i !== bullet);
  const success = Math.random() < 0.5;
  const cooldown = Date.now() + 30000;
  stats.hunt_cd_until = cooldown;
  stats.hunt_total = (stats.hunt_total || 0) + 1;
  let text;
  let color;
  if (success) {
    stats.hunt_success = (stats.hunt_success || 0) + 1;
    const tierMap = { HuntingRifleT1: 1, HuntingRifleT2: 2, HuntingRifleT3: 3 };
    const tier = tierMap[stats.hunt_gun] || 1;
    const animal = pickAnimal(areaObj.key, tier);
    const item = ITEMS[animal.id];
    const existing = (stats.inventory || []).find(i => i.id === item.id);
    if (existing) existing.amount += 1;
    else
      (stats.inventory = stats.inventory || []).push({
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        image: item.image,
        amount: 1,
      });
    normalizeInventory(stats);
    const art = articleFor(animal.name);
    color = RARITY_COLORS[animal.rarity] || 0xffffff;
    text = `${interaction.user}, you have hunted ${art} **${animal.name} ${animal.emoji}**!\n* Rarity: ${animal.rarity} ${
      RARITY_EMOJIS[animal.rarity] || ''
    }\n-# You can hunt again <t:${Math.floor(cooldown / 1000)}:R>`;
  } else {
    stats.hunt_fail = (stats.hunt_fail || 0) + 1;
    const fail = FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)];
    color = 0xff0000;
    text = `${interaction.user}, ${fail}\n-# You can hunt again <t:${Math.floor(
      cooldown / 1000,
    )}:R>`;
  }
  resources.userStats[interaction.user.id] = stats;
  resources.saveData();
  const container = buildMainContainer(
    interaction.user,
    stats,
    text,
    color,
    areaObj.image,
  );
  await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
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
        await handleHunt(interaction, resources, stats);
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

