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
const { ITEMS, DIG_ITEMS } = require('../items');
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
} = require('../utils');
const { getItemDisplay } = require('../skins');

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

const DIG_XP_MULTIPLIER = {
  Common: 2,
  Rare: 2.2,
  Epic: 2.8,
  Legendary: 4,
  Mythical: 7,
  Godly: 12,
  Secret: 20,
};

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

function getRandomDigItem(stats, luckSource = stats) {
  const weighted = DIG_ITEMS.map(it => ({
    item: it,
    chance: getLuckAdjustedWeight(it.chance || 0, it.rarity, luckSource),
  })).filter(entry => entry.chance > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.chance, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const entry of weighted) {
    acc += entry.chance;
    if (r < acc) return entry.item;
  }
  return null;
}

function buildMainContainer(user, text, color, disable = false) {
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
  }
  const section = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(THUMB_URL))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return new ContainerBuilder()
    .setAccentColor(color)
    .addSectionComponents(section)
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(digBtn, statBtn, equipBtn),
    );
}

function buildStatContainer(user, stats) {
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
  const section = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL()))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${DIG_STAT_EMOJI} Mastery Level: ${stats.dig_level || 0}`,
      ),
      new TextDisplayBuilder().setContent(
        `Dig amount: ${stats.dig_total || 0}\n-# Success: ${
          stats.dig_success || 0
        }\n-# failed: ${stats.dig_fail || 0}\n-# died: ${
          stats.dig_die || 0
        }`,
      ),
      new TextDisplayBuilder().setContent(
        `Item discovered: ${discovered} / ${totalItems}`,
      ),
    );
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(section)
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(backBtn, statBtn, equipBtn),
    );
}

function buildEquipmentContainer(user, stats) {
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
        `* Tool equipped: ${equippedToolDisplay.name} ${equippedToolDisplay.emoji}`,
      ),
      new TextDisplayBuilder().setContent(
        `* Gear equipped: ${equippedGearDisplay.name} ${equippedGearDisplay.emoji}`,
      ),
    );
  if (equippedGear)
    section.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${equippedGear.perk}`),
    );
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(section)
    .addActionRowComponents(new ActionRowBuilder().addComponents(toolSelect))
    .addActionRowComponents(new ActionRowBuilder().addComponents(gearSelect))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(backBtn, statBtn, equipBtn),
    );
}

async function sendDig(user, send, resources, fetchReply) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  const container = buildMainContainer(
    user,
    `${user}, ready for digging?`,
    0xffffff,
  );
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
  const { message, user } = interaction;
  const initialFull = alertInventoryFull(interaction, user, stats);
  const snowballed = isSnowballed(stats);
  const gearInfo = getEquippedGear(stats, { cleanup: true });
  const lootStats = applyGearLuck(stats, gearInfo?.luckBonus || 0);
  const gearDurabilityBefore =
    gearInfo && typeof gearInfo.entry?.durability === 'number'
      ? gearInfo.entry.durability
      : null;
  let gearUsesRemaining = gearDurabilityBefore;
  const { chance: successChance, forcedFail } = computeActionSuccessChance(0.5, stats, {
    min: 0.01,
    max: 0.95,
  });
  const success = !forcedFail && Math.random() < successChance;
  const cooldownDuration = Math.round(30000 * getCooldownMultiplier(stats));
  const cooldown = Date.now() + cooldownDuration;
  stats.dig_cd_until = cooldown;
  stats.dig_total = (stats.dig_total || 0) + 1;
  let text;
  let color;
  let xp;
  if (success) {
    let amount = Math.floor(Math.random() * 4001) + 1000;
    amount = applyCoinBoost(stats, amount);
    stats.coins = (stats.coins || 0) + amount;
    stats.dig_success = (stats.dig_success || 0) + 1;
    let extra = '';
    let foundItem = null;
    let itemDropChance = scaleChanceWithLuck(0.15, lootStats, { max: 0.5 });
    if (gearInfo?.dropBonus) {
      itemDropChance = Math.min(1, itemDropChance + gearInfo.dropBonus);
    }
    if (Math.random() < itemDropChance) {
      const item = getRandomDigItem(stats, lootStats);
      if (item) {
        foundItem = item;
        if (!stats.dig_discover) stats.dig_discover = [];
        if (!stats.dig_discover.includes(item.id))
          stats.dig_discover.push(item.id);
        if (!initialFull) {
          const willExceed = getInventoryCount(stats) + 1 > MAX_ITEMS;
          if (!willExceed) {
            stats.inventory = stats.inventory || [];
            const entry = stats.inventory.find(i => i.id === item.id);
            if (entry) entry.amount += 1;
            else stats.inventory.push({ ...item, amount: 1 });
            alertInventoryFull(interaction, user, stats);
          } else {
            alertInventoryFull(interaction, user, stats, 1);
          }
        }
        extra = `\n-# You also found **${item.name} ${item.emoji}** while digging! ${
          RARITY_EMOJIS[item.rarity] || ''
        }`;
      }
    }
    xp = foundItem ? Math.floor(100 * (DIG_XP_MULTIPLIER[foundItem.rarity] || 1)) : 100;
    text = `${user}, you have digged up **${amount} Coins ${COIN_EMOJI}!**${extra}\n-# You gained **${xp} XP ${XP_EMOJI}**\n-# You can dig again <t:${Math.floor(
      cooldown / 1000,
    )}:R>`;
    color = 0x00ff00;
    if (gearInfo && Number.isFinite(gearDurabilityBefore)) {
      const result = useDurableItem(interaction, user, stats, gearInfo.id);
      gearUsesRemaining = Math.max(0, gearDurabilityBefore - 1);
      if (gearUsesRemaining <= 0) delete stats.dig_gear;
      if (result.broken && result.remaining === 0) delete stats.dig_gear;
    }
  } else {
    stats.dig_fail = (stats.dig_fail || 0) + 1;
    xp = 25;
    let failLine = FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)];
    if (forcedFail && snowballed) {
      failLine += '\\n-# A frosty snowball curse makes every attempt fail!';
    }
    text = `${failLine}\n-# You gained **${xp} XP ${XP_EMOJI}**\n-# You can dig again <t:${Math.floor(
      cooldown / 1000,
    )}:R>`;
    color = 0xff0000;
  }
  if (gearInfo && Number.isFinite(gearDurabilityBefore)) {
    const gearEmoji = gearInfo.item.emoji ? ` ${gearInfo.item.emoji}` : '';
    const usesDisplay =
      gearUsesRemaining != null && Number.isFinite(gearUsesRemaining)
        ? Math.max(0, gearUsesRemaining)
        : Math.max(0, gearDurabilityBefore);
    const gearLine = `-# ${gearInfo.item.name}${gearEmoji} expires after ${usesDisplay} ${gearInfo.expireType}`;
    text += `\n${gearLine}`;
  }
  await resources.addXp(user, xp, resources.client);
  const toolId = stats.dig_tool || 'Shovel';
  const res = useDurableItem(interaction, user, stats, toolId);
  if (res.broken && res.remaining === 0 && stats.dig_tool === toolId) delete stats.dig_tool;
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();
  const container = buildMainContainer(user, text, color, false);
  await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
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
    const state = digStates.get(interaction.message?.id);
    if (!state || interaction.user.id !== state.userId) return;
    try {
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
        normalizeInventory(stats);
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
      } else if (interaction.isButton() && interaction.customId === 'dig-back') {
        const stats = resources.userStats[state.userId] || {};
        const container = buildMainContainer(
          interaction.user,
          `${interaction.user}, ready for digging?`,
          0xffffff,
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

