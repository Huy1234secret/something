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
const { ITEMS, DIG_ITEMS } = require('../items');
const { normalizeInventory, getInventoryCount, MAX_ITEMS } = require('../utils');

const THUMB_URL = 'https://i.ibb.co/G4cSsHHN/dig-symbol.png';
const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
const DIG_STAT_EMOJI = '<:SBDig:1412452052721995868>';
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

const digStates = new Map();

function getRandomDigItem() {
  const total = DIG_ITEMS.reduce((sum, it) => sum + (it.chance || 0), 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const it of DIG_ITEMS) {
    acc += it.chance || 0;
    if (r < acc) return it;
  }
  return null;
}

function buildMainContainer(user, text, color, disable = false) {
  const digBtn = new ButtonBuilder()
    .setCustomId('dig-action')
    .setLabel('Dig')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(ITEMS.Shovel.emoji);
  const statBtn = new ButtonBuilder()
    .setCustomId('dig-stat')
    .setLabel('Dig Stat')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(DIG_STAT_EMOJI);
  const equipBtn = new ButtonBuilder()
    .setCustomId('dig-equipment')
    .setLabel('Equipment')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(DIG_STAT_EMOJI);
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
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(digBtn, statBtn, equipBtn),
    );
}

function buildStatContainer(user, stats) {
  const backBtn = new ButtonBuilder()
    .setCustomId('dig-back')
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  const statBtn = new ButtonBuilder()
    .setCustomId('dig-stat')
    .setLabel('Dig Stat')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true)
    .setEmoji(DIG_STAT_EMOJI);
  const equipBtn = new ButtonBuilder()
    .setCustomId('dig-equipment')
    .setLabel('Equipment')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(DIG_STAT_EMOJI);
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
  const statBtn = new ButtonBuilder()
    .setCustomId('dig-stat')
    .setLabel('Dig Stat')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(DIG_STAT_EMOJI);
  const equipBtn = new ButtonBuilder()
    .setCustomId('dig-equipment')
    .setLabel('Equipment')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true)
    .setEmoji(DIG_STAT_EMOJI);

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
        .setEmoji(it.emoji)
        .setDescription(`You have ${t.amount} ${it.name}`);
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

  const equippedTool = ITEMS[stats.dig_tool] || { name: 'None', emoji: '' };
  const section = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(THUMB_URL))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(` ## ${user} Equipment`),
      new TextDisplayBuilder().setContent(
        `* Tool equipped: ${equippedTool.name} ${equippedTool.emoji}`,
      ),
    );
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(section)
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(toolSelect))
    .addSeparatorComponents(new SeparatorBuilder())
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
  const success = Math.random() < 0.5;
  const cooldown = Date.now() + 30000;
  stats.dig_cd_until = cooldown;
  stats.dig_total = (stats.dig_total || 0) + 1;
  let text;
  let color;
  if (success) {
    const amount = Math.floor(Math.random() * 4001) + 1000;
    stats.coins = (stats.coins || 0) + amount;
    stats.dig_success = (stats.dig_success || 0) + 1;
    let extra = '';
    if (Math.random() < 0.15) {
      const item = getRandomDigItem();
      if (item) {
        if (!stats.dig_discover) stats.dig_discover = [];
        if (!stats.dig_discover.includes(item.id))
          stats.dig_discover.push(item.id);
        const full = getInventoryCount(stats) >= MAX_ITEMS;
        if (!full) {
          stats.inventory = stats.inventory || [];
          const entry = stats.inventory.find(i => i.id === item.id);
          if (entry) entry.amount += 1;
          else stats.inventory.push({ ...item, amount: 1 });
        }
        extra = `\n-# You also found **${item.name} ${item.emoji}** while digging! ${
          RARITY_EMOJIS[item.rarity] || ''
        }${full ? '\n-# Your backpack is full!' : ''}`;
        if (full) {
          interaction
            .followUp({
              content: '<:SBWarning:1404101025849147432> Your backpack is full!',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
      }
    }
    text = `${user}, you have digged up **${amount} Coins ${COIN_EMOJI}!**${extra}\n-# You can dig again <t:${Math.floor(
      cooldown / 1000,
    )}:R>`;
    color = 0x00ff00;
  } else {
    stats.dig_fail = (stats.dig_fail || 0) + 1;
    text = `${
      FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)]
    }\n-# You can dig again <t:${Math.floor(cooldown / 1000)}:R>`;
    color = 0xff0000;
  }
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

