const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { ContainerBuilder, SeparatorBuilder } = require('@discordjs/builders');
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
  const button = new ButtonBuilder()
    .setCustomId('card-edit')
    .setLabel('Card Edit')
    .setEmoji('<:Botgear:1403611995814629447>')
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(button);
  const separator = new SeparatorBuilder().setDivider(true);
  const container = new ContainerBuilder().addActionRowComponents(row);
  await send({ embeds:[embed], files:[attachment], components:[separator, container] });
}

function setup(client, resources) {
  const command = new SlashCommandBuilder().setName('level').setDescription('Show your level card');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'level') return;
    await interaction.deferReply();
    await sendLevelCard(interaction.user, interaction.editReply.bind(interaction), resources);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== 'card-edit') return;
    await interaction.reply({ content: 'Card editing is not available yet.', ephemeral: true });
  });
}

module.exports = { setup };
