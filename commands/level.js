const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateLevelCard } = require('../levelCard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your current level and XP'),
  async execute(interaction) {
    const user = interaction.user;

    // Placeholder data until a real leveling system is implemented
    const levelData = {
      username: user.username,
      avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
      level: 1,
      xp: 0,
      xpNeeded: 100,
      progressPercentage: 0,
      rank: 1,
      prestige: 0,
      dailyXP: 0,
      streak: 0,
      badgeUrls: []
    };

    const buffer = await generateLevelCard(levelData);
    const attachment = new AttachmentBuilder(buffer, { name: 'level.png' });
    await interaction.reply({ files: [attachment] });
  },
};
