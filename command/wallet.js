const {
  SlashCommandBuilder,
  MessageFlags,
  ButtonStyle,
} = require('discord.js');
const {
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require('@discordjs/builders');
const { formatNumber, normalizeInventory, applyComponentEmoji } = require('../utils');
const { ITEMS } = require('../items');

async function sendWallet(user, send, { userStats, saveData }) {
  const stats = userStats[user.id] || { coins: 0, diamonds: 0, deluxe_coins: 0 };
  normalizeInventory(stats);
  userStats[user.id] = stats;
  if (saveData) saveData();
  const coins = stats.coins || 0;
  const diamonds = stats.diamonds || 0;
  const deluxe = stats.deluxe_coins || 0;
  const inventory = stats.inventory || [];
  const inventoryValue = inventory.reduce(
    (sum, item) => sum + (item.value || 0) * (item.amount || 0),
    0,
  );
  const totalValue = coins + diamonds + deluxe + inventoryValue;

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL()))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${user.username}'s Wallet\n<:SBstars:1404723253200552009> Total Value: ${formatNumber(totalValue)}\n-# <:SBreply:1403665761825980456>Inventory Value: ${formatNumber(inventoryValue)}`,
      ),
    );

  const balancesText = new TextDisplayBuilder().setContent(
    `> <:CRCoin:1405595571141480570> Coin: ${formatNumber(coins)}\n> <:CRDiamond:1405595593069432912> Diamond: ${formatNumber(diamonds)}\n> <:CRDeluxeCoin:1405595587780280382> Deluxe Coin: ${formatNumber(deluxe)}`,
  );

  const padlockActive = stats.padlock_until && stats.padlock_until > Date.now();
  const padlockButton = new ButtonBuilder()
    .setCustomId('walletpadlock')
    .setStyle(padlockActive ? ButtonStyle.Success : ButtonStyle.Secondary)
    .setDisabled(true);
  applyComponentEmoji(
    padlockButton,
    padlockActive ? ITEMS.Padlock.emoji : '<:SBline:1405444056200253521>',
  );

  const landmineActive =
    stats.landmine_until && stats.landmine_until > Date.now();
  const landmineButton = new ButtonBuilder()
    .setCustomId('walletlandmine')
    .setStyle(landmineActive ? ButtonStyle.Danger : ButtonStyle.Secondary)
    .setDisabled(true);
  applyComponentEmoji(
    landmineButton,
    landmineActive ? ITEMS.Landmine.emoji : '<:SBline:1405444056200253521>',
  );

  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(headerSection)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(balancesText)
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(padlockButton, landmineButton),
    );

  await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

function setup(client, resources) {
  const command = new SlashCommandBuilder().setName('wallet').setDescription('Show your wallet');
  client.application.commands.create(command);
  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'wallet') return;
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      await sendWallet(interaction.user, interaction.editReply.bind(interaction), resources);
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, sendWallet };

