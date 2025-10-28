const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
} = require('@discordjs/builders');

function formatBoostLine(name, amount, expiresAt, { prefix = '' } = {}) {
  const timestamp = Math.floor(expiresAt / 1000);
  return `* ${prefix}${name} - ${amount} - <t:${timestamp}:R> left`;
}

function buildBoostContainer(user, stats) {
  const now = Date.now();
  const boosts = [];
  if (stats.xp_boost_until && stats.xp_boost_until > now) {
    boosts.push(formatBoostLine('XP Boost', '+100%', stats.xp_boost_until));
  }
  if (stats.coin_boost_until && stats.coin_boost_until > now) {
    let percent = 0;
    if (Number.isFinite(stats.coin_boost_percent)) percent = stats.coin_boost_percent;
    else if (Number.isFinite(stats.coin_boost_multiplier))
      percent = Math.round((stats.coin_boost_multiplier - 1) * 100);
    const amountText = percent ? `+${percent}%` : '+??%';
    boosts.push(
      formatBoostLine('Coin Boost', amountText, stats.coin_boost_until, {
        prefix: '<:CRCoin:1405595571141480570> ',
      }),
    );
  }
  const content =
    boosts.length > 0
      ? boosts.join('\n')
      : '-# You have no active boost';
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${user}'s Active Boosts\n${content}`,
      ),
    );
}

async function sendBoosts(user, send, resources) {
  const stats = resources.userStats[user.id] || {};
  const container = buildBoostContainer(user, stats);
  return send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('my-boost')
    .setDescription('Show your active boosts');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'my-boost') return;
      const container = buildBoostContainer(
        interaction.user,
        resources.userStats[interaction.user.id] || {},
      );
      await interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, sendBoosts };
