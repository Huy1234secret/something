const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require('discord.js');

function formatBoostLine(name, amount, expiresAt, { prefix = '' } = {}) {
  const timestamp = Math.floor(expiresAt / 1000);
  return `* ${prefix}${name} - ${amount} - <t:${timestamp}:R> left`;
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('my-boost')
    .setDescription('Show your active boosts');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'my-boost') return;
      const stats = resources.userStats[interaction.user.id] || {};
      const now = Date.now();
      const boosts = [];
      if (stats.xp_boost_until && stats.xp_boost_until > now) {
        boosts.push(
          formatBoostLine('XP Boost', '+100%', stats.xp_boost_until),
        );
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
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ${interaction.user}'s Active Boosts\n${content}`,
          ),
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

module.exports = { setup };
