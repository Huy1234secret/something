const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require('discord.js');

async function sendWallet(user, send, { userStats }) {
  const stats = userStats[user.id] || { coins: 0, diamonds: 0, deluxe_coins: 0 };
  const coins = stats.coins || 0;
  const diamonds = stats.diamonds || 0;
  const deluxe = stats.deluxe_coins || 0;
  const inventoryValue = 0;
  const totalValue = coins + diamonds + deluxe + inventoryValue;

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL()))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${user.username}'s Wallet\n<:stars:1404723253200552009> Total Value: ${totalValue}\n-# <:reply:1403665761825980456>Inventory Value: ${inventoryValue}`,
      ),
    );

  const balancesText = new TextDisplayBuilder().setContent(
    `> <:Coin:1404348210146967612> Coin: ${coins}\n> <:Diamond:1404350385463885886> Diamond: ${diamonds}\n> <:DeluxeCoin:1404351654005833799> Deluxe Coin: ${deluxe}`,
  );

  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(headerSection)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(balancesText);

  await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

function setup(client, resources) {
  const command = new SlashCommandBuilder().setName('wallet').setDescription('Show your wallet');
  client.application.commands.create(command);
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'wallet') return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    await sendWallet(interaction.user, interaction.editReply.bind(interaction), resources);
  });
}

module.exports = { setup };

