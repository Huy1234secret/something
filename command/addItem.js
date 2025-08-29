const { SlashCommandBuilder } = require('discord.js');
const { ITEMS } = require('../items');
const { formatNumber, normalizeInventory } = require('../utils');

const WARNING = '<:SBWarning:1404101025849147432>';
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('add-item')
    .setDescription('Add or remove an item from a user')
    .addUserOption(o =>
      o.setName('user').setDescription('Target user').setRequired(true),
    )
    .addStringOption(o => {
      o.setName('item').setDescription('Item ID').setRequired(true);
      Object.values(ITEMS)
        .slice(0, 25)
        .forEach(i => o.addChoices({ name: i.name, value: i.id }));
      return o;
    })
    .addIntegerOption(o =>
      o
        .setName('amount')
        .setDescription('Amount to add or remove')
        .setRequired(true),
    );
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'add-item') return;
      if (
        !interaction.member.roles.cache.has(ADMIN_ROLE_ID) &&
        interaction.guild.ownerId !== interaction.user.id
      ) {
        await interaction.reply({ content: `${WARNING} You do not have permission to use this command.` });
        return;
      }
      const target = interaction.options.getUser('user');
      const itemId = interaction.options.getString('item');
      const amount = interaction.options.getInteger('amount');
      if (!Number.isInteger(amount) || amount === 0) {
        await interaction.reply({ content: `${WARNING} Invalid amount.` });
        return;
      }
      const base = ITEMS[itemId];
      if (!base) {
        await interaction.reply({ content: `${WARNING} Invalid item.` });
        return;
      }
      const stats = resources.userStats[target.id] || { inventory: [] };
      stats.inventory = stats.inventory || [];
      normalizeInventory(stats);
      const entry = stats.inventory.find(i => i.id === itemId);
      if (amount < 0) {
        if (!entry) {
          await interaction.reply({ content: `${WARNING} User does not have this item.` });
          return;
        }
        entry.amount = (entry.amount || 0) + amount;
        if (entry.amount <= 0) {
          stats.inventory = stats.inventory.filter(i => i !== entry);
        }
      } else {
        if (entry) entry.amount = (entry.amount || 0) + amount;
        else stats.inventory.push({ ...base, amount });
      }
      normalizeInventory(stats);
      resources.userStats[target.id] = stats;
      resources.saveData();
      const newEntry = stats.inventory.find(i => i.id === itemId);
      const newAmount = newEntry ? newEntry.amount : 0;
      await interaction.reply({
        content: `Updated ${target.username}'s ${base.name} by ${formatNumber(amount)}. New amount: ${formatNumber(newAmount)}.`,
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };
