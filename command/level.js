const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { renderLevelCard } = require('../levelCard');

async function sendLevelCard(user, send, { userStats, userCardSettings, saveData, xpNeeded, defaultColor, defaultBackground }) {
  const stats = userStats[user.id] || { level:1, xp:0, total_xp:0 };
  const settings = userCardSettings[user.id] || { color: defaultColor, background_url: defaultBackground };
  userStats[user.id] = stats;
  userCardSettings[user.id] = settings;
  saveData();

  const buffer = await renderLevelCard({
    username: user.username,
    level: stats.level,
    xp: stats.xp,
    xpTotal: xpNeeded(stats.level),
    avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
    backgroundUrl: settings.background_url,
    barColor: settings.color
  });

  const attachment = new AttachmentBuilder(buffer, { name: `level_${user.id}.png` });
  const embed = new EmbedBuilder().setImage(`attachment://level_${user.id}.png`);
  await send({ embeds:[embed], files:[attachment] });
}

function setup(client, resources) {
  const command = new SlashCommandBuilder().setName('level').setDescription('Show your level card');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'level') return;
    await interaction.deferReply({ ephemeral: true });
    await sendLevelCard(interaction.user, interaction.editReply.bind(interaction), resources);
  });
}

module.exports = { setup };
