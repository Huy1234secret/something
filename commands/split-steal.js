// commands/split-steal.js
const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('split-steal')
        .setDescription('Start a Split or Steal game between two users.')
        .addUserOption(option =>
            option.setName('user1')
                .setDescription('First player')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user2')
                .setDescription('Second player')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to announce the result in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('splitprize')
                .setDescription('Prize each gets if both split')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('stealprize')
                .setDescription('Prize the stealer gets if one steals')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.reply({ content: 'Starting Split or Steal game...', ephemeral: true });
        // Logic handled in index.js
    },
};
