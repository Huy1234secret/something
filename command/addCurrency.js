const { SlashCommandBuilder } = require('discord.js');
const { formatNumber, parseAmount } = require('../utils');

const WARNING = '<:SBWarning:1404101025849147432>';
const DELUXE_ALLOWED = new Set(['1152200741566566440', '902736357766594611']);
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('add-currency')
    .setDescription('Add or remove currency from a user')
    .addUserOption(o =>
      o.setName('user').setDescription('Target user').setRequired(true),
    )
    .addStringOption(o =>
      o
        .setName('type')
        .setDescription('Currency type')
        .setRequired(true)
        .addChoices(
          { name: 'Coin', value: 'coin' },
          { name: 'Diamond', value: 'diamond' },
          { name: 'Deluxe Coin', value: 'deluxe' },
        ),
    )
    .addStringOption(o =>
      o
        .setName('amount')
        .setDescription('Amount to add or remove (use abbreviations)')
        .setRequired(true),
    );
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'add-currency') return;
    if (
      !interaction.member.roles.cache.has(ADMIN_ROLE_ID) &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      await interaction.reply({ content: `${WARNING} You do not have permission to use this command.` });
      return;
    }
    const target = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const amountStr = interaction.options.getString('amount');
    const amount = parseAmount(amountStr);
    if (isNaN(amount)) {
      await interaction.reply({ content: `${WARNING} Invalid amount.` });
      return;
    }
    if (
      type === 'deluxe' &&
      !DELUXE_ALLOWED.has(interaction.user.id) &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      await interaction.reply({ content: `${WARNING} You cannot modify Deluxe Coin.` });
      return;
    }
    const stats = resources.userStats[target.id] || { coins: 0, diamonds: 0, deluxe_coins: 0 };
    if (type === 'coin') stats.coins = (stats.coins || 0) + amount;
    else if (type === 'diamond') stats.diamonds = (stats.diamonds || 0) + amount;
    else if (type === 'deluxe') stats.deluxe_coins = (stats.deluxe_coins || 0) + amount;
    resources.userStats[target.id] = stats;
    resources.saveData();

    const balance =
      type === 'coin'
        ? stats.coins
        : type === 'diamond'
        ? stats.diamonds
        : stats.deluxe_coins;
    await interaction.reply({
      content: `Updated ${target.username}'s ${type.replace('deluxe', 'deluxe coin')} by ${formatNumber(amount)}. New balance: ${formatNumber(balance)}.`,
      allowedMentions: { parse: [] },
    });
  });
}

module.exports = { setup };
