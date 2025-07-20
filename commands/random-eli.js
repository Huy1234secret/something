const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { startRandomElimination } = require('../utils/randomElimination');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random-eli')
        .setDescription('Start a random elimination game.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to host the game in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('Prize for the winner')
                .setRequired(true)),
    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel');
        const prize = interaction.options.getString('prize');

        await interaction.reply({ content: 'Starting random elimination...', ephemeral: true });

        const members = await interaction.guild.members.fetch();
        startRandomElimination(targetChannel, Array.from(members.values()), prize);
    },
};
