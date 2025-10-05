const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('@discordjs/builders');
const {
  BADGES,
  getBadgeProgress,
  formatBadgeRewards,
} = require('../badges');

const BADGES_PER_PAGE = 5;
const badgeStates = new Map();

function buildBar(current, max) {
  if (!max || max <= 0) return '▓'.repeat(20);
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * 20);
  return '▓'.repeat(filled) + '░'.repeat(20 - filled);
}

function buildBadgeContainer(user, stats, page) {
  const totalBadges = BADGES.length;
  const totalPages = Math.max(1, Math.ceil(totalBadges / BADGES_PER_PAGE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  stats.badges = stats.badges || {};
  const completed = BADGES.reduce(
    (count, badge) => count + (stats.badges[badge.id] ? 1 : 0),
    0,
  );
  const container = new ContainerBuilder().setAccentColor(0xffffff);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${user} You have discovered ${completed} / ${totalBadges} Badges!`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder());

  const start = safePage * BADGES_PER_PAGE;
  const currentBadges = BADGES.slice(start, start + BADGES_PER_PAGE);
  for (const badge of currentBadges) {
    const progress = getBadgeProgress(badge, stats);
    const bar = buildBar(progress.current, progress.max);
    const check = stats.badges[badge.id] ? '✅' : '⬜';
    const lines = [`## ${badge.emoji} ${badge.name} ${check}`];
    if (badge.description) {
      lines.push(`-# ${badge.description}`);
    }
    lines.push(
      `${bar} [${progress.current} / ${progress.max || 'MAX'}]`,
    );
    const rewards = formatBadgeRewards(badge);
    lines.push(`🎁Prizes: ${rewards}`);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join('\n')),
    );
    container.addSeparatorComponents(new SeparatorBuilder());
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('badge-page')
    .setPlaceholder('Badge pages');
  for (let i = 0; i < totalPages; i++) {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(`Page ${i + 1}`)
      .setValue(String(i))
      .setDefault(i === safePage);
    const rangeStart = i * BADGES_PER_PAGE + 1;
    const rangeEnd = Math.min((i + 1) * BADGES_PER_PAGE, totalBadges);
    option.setDescription(`Badges ${rangeStart}-${rangeEnd}`);
    select.addOptions(option);
  }
  if (totalPages === 1) select.setDisabled(true);
  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
  return container;
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('badges')
    .setDescription('Show your badge progress');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'badges') return;
      const stats = resources.userStats[interaction.user.id] || {};
      const container = buildBadgeContainer(interaction.user, stats, 0);
      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      const message = await interaction.fetchReply();
      badgeStates.set(message.id, { userId: interaction.user.id });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isStringSelectMenu() || interaction.customId !== 'badge-page') return;
      const state = badgeStates.get(interaction.message.id);
      if (!state) return;
      if (state.userId !== interaction.user.id) {
        await interaction.reply({
          content: `${interaction.user}, you cannot interact with this menu.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const page = parseInt(interaction.values[0], 10) || 0;
      const stats = resources.userStats[interaction.user.id] || {};
      const container = buildBadgeContainer(interaction.user, stats, page);
      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };
