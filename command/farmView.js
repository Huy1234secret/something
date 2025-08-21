const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

const CANVAS_SIZE = 500;
const FARM_BG = 'https://i.ibb.co/9mmF6p1v/Flower-Garden.png';
const SELECT_IMG = 'https://i.ibb.co/Vckrr6jc/Select-pattern.png';

const PLOT_POSITIONS = {
  1: { x: 100, y: 100 },
  2: { x: 200, y: 100 },
  3: { x: 300, y: 100 },
  4: { x: 100, y: 200 },
  5: { x: 200, y: 200 },
  6: { x: 300, y: 200 },
  7: { x: 100, y: 300 },
  8: { x: 200, y: 300 },
  9: { x: 300, y: 300 },
};

async function renderFarm(selected = []) {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');
  const bg = await loadImage(FARM_BG);
  ctx.drawImage(bg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  if (selected.length) {
    const overlay = await loadImage(SELECT_IMG);
    selected.forEach(id => {
      const pos = PLOT_POSITIONS[id];
      if (pos) ctx.drawImage(overlay, pos.x, pos.y);
    });
  }
  return canvas.toBuffer('image/png');
}

const farmStates = new Map();

function buildFarmContainer(user) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('farm-select')
    .setPlaceholder('Plot')
    .setMinValues(0)
    .setMaxValues(9)
    .addOptions(
      Array.from({ length: 9 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` }))
    );

  return new ContainerBuilder()
    .setAccentColor(0x2b2d31)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${user.username}'s Farm\n### Progress:`),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://farm.png'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(select));
}

async function sendFarmView(user, send) {
  const buffer = await renderFarm();
  const attachment = new AttachmentBuilder(buffer, { name: 'farm.png' });
  const container = buildFarmContainer(user);

  const farmMsg = await send({
    files: [attachment],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  farmStates.set(farmMsg.id, { userId: user.id, farmMsg });
}

function setup(client) {
  const command = new SlashCommandBuilder()
    .setName('farm-view')
    .setDescription('View your farm');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'farm-view') {
      await interaction.deferReply();
      await sendFarmView(interaction.user, interaction.editReply.bind(interaction));
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'farm-select') {
      const state = farmStates.get(interaction.message.id);
      if (!state || interaction.user.id !== state.userId) return;
      await interaction.deferUpdate({ flags: MessageFlags.IsComponentsV2 });
      const selected = interaction.values.map(v => parseInt(v, 10));
      const buffer = await renderFarm(selected);
      const attachment = new AttachmentBuilder(buffer, { name: 'farm.png' });
      const container = buildFarmContainer(interaction.user);
      await state.farmMsg.edit({ files: [attachment], components: [container] });
    }
  });
}

module.exports = { setup, sendFarmView };
