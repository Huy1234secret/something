const {
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { renderLevelCard } = require('../levelCard');
const { loadImage } = require('canvas');

const WARN = '<:SBWarning:1404101025849147432> ';

async function sendLevelCard(user, send, { userStats, userCardSettings, saveData, xpNeeded, defaultColor, defaultBackground }) {
  const stats = userStats[user.id] || { level:1, xp:0, total_xp:0, prestige:0 };
  const settings = userCardSettings[user.id] || { color: defaultColor, background_url: defaultBackground };
  userStats[user.id] = stats;
  userCardSettings[user.id] = settings;
  saveData();

  const sorted = Object.entries(userStats).sort((a, b) => (b[1].total_xp || 0) - (a[1].total_xp || 0));
  const rank = sorted.findIndex(([id]) => id === user.id) + 1;
  const tag = user.discriminator && user.discriminator !== '0' ? `#${user.discriminator}` : '';

  const buffer = await renderLevelCard({
    username: user.username,
    tag,
    avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
    level: stats.level,
    prestige: stats.prestige || 0,
    currentXP: stats.xp,
    nextLevelXP: xpNeeded(stats.level),
    totalXP: stats.total_xp,
    rankText: `#${rank}`,
    backgroundURL: settings.background_url,
    color: settings.color,
  });

  const attachment = new AttachmentBuilder(buffer, { name: `level_${user.id}.png` });
  
  // Create the media gallery component
  const mediaGallery = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://level_${user.id}.png`)
  );

  // Create the separator component
  const separator = new SeparatorBuilder().setDivider(true);
  separator.data.accent_color = 0xffffff;

  // Create the button inside a container
  const button = new ButtonBuilder()
    .setCustomId('card-edit')
    .setLabel('Card Edit')
    .setEmoji('<:SBBotgear:1403611995814629447>')
    .setStyle(ButtonStyle.Secondary);

  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addMediaGalleryComponents(mediaGallery)
    .addSeparatorComponents(separator)
    .addActionRowComponents(new ActionRowBuilder().addComponents(button));

  await send({
    files: [attachment],
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

function setup(client, resources) {
  const { userCardSettings, saveData, defaultColor, defaultBackground } = resources;
  const command = new SlashCommandBuilder().setName('level').setDescription('Show your level card');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'level') return;
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
    await sendLevelCard(interaction.user, interaction.editReply.bind(interaction), resources);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== 'card-edit') return;
    const settings = userCardSettings[interaction.user.id] || { color: defaultColor, background_url: defaultBackground };

    const modal = new ModalBuilder().setCustomId('card-edit-modal').setTitle('Edit Card');
    const colorInput = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Card color (R,G,B)')
      .setStyle(TextInputStyle.Short)
      .setValue(settings.color.join(','));
    const bgInput = new TextInputBuilder()
      .setCustomId('background')
      .setLabel('Card background URL')
      .setStyle(TextInputStyle.Short)
      .setValue(settings.background_url);
    modal.addComponents(
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(bgInput)
    );
    await interaction.showModal(modal);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'card-edit-modal') return;
    const colorValue = interaction.fields.getTextInputValue('color');
    const bgValue = interaction.fields.getTextInputValue('background');
    const settings = userCardSettings[interaction.user.id] || { color: defaultColor, background_url: defaultBackground };

    const colorParts = colorValue.split(',').map(v => parseInt(v.trim(), 10));
    if (colorParts.length !== 3 || colorParts.some(n => isNaN(n) || n < 0 || n > 255)) {
      await interaction.reply({
        components: [new TextDisplayBuilder().setContent(`${WARN}Invalid color.`)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    try {
      new URL(bgValue);
      await loadImage(bgValue);
    } catch {
      await interaction.reply({
        components: [new TextDisplayBuilder().setContent(`${WARN}Invalid background URL.`)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }
    const changed =
      colorParts.some((n, i) => n !== settings.color[i]) || bgValue !== settings.background_url;

    if (!changed) {
      await interaction.reply({
        components: [new TextDisplayBuilder().setContent(`${WARN}No changes made.`)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    settings.color = colorParts;
    settings.background_url = bgValue;
    userCardSettings[interaction.user.id] = settings;
    saveData();

    if (interaction.message) {
      await sendLevelCard(
        interaction.user,
        interaction.message.edit.bind(interaction.message),
        resources,
      );
    }

    await interaction.reply({
      components: [new TextDisplayBuilder().setContent('Card updated.')],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  });
}

  module.exports = { setup, sendLevelCard };
