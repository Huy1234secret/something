const { SlashCommandBuilder, AttachmentBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

async function renderWalletCard(user, stats) {
  const width = 400, height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#23272a';
  ctx.fillRect(0,0,width,height);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(user.username, 20, 40);
  ctx.fillText(`Coins: ${stats.coins||0}`, 20, 80);
  ctx.fillText(`Diamonds: ${stats.diamonds||0}`, 20, 110);
  ctx.fillText(`Deluxe: ${stats.deluxe_coins||0}`, 20, 140);
  return canvas.toBuffer('image/png');
}

async function sendWalletCard(user, send, { userStats }) {
  const stats = userStats[user.id] || { coins:0, diamonds:0, deluxe_coins:0 };
  const buffer = await renderWalletCard(user, stats);
  const attachment = new AttachmentBuilder(buffer, { name: `wallet_${user.id}.png` });
  const media = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://wallet_${user.id}.png`),
  );
  const mediaRow = new ActionRowBuilder().addComponents(media);
  await send({ files:[attachment], components:[mediaRow] });
}

function setup(client, resources) {
  const command = new SlashCommandBuilder().setName('wallet').setDescription('Show your wallet card');
  client.application.commands.create(command);
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'wallet') return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    await sendWalletCard(interaction.user, interaction.editReply.bind(interaction), resources);
  });
}

module.exports = { setup };
