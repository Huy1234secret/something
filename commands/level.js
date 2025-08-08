const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your current level and XP'),
  async execute(interaction) {
    await interaction.reply('Level feature coming soon.');
  },
};
