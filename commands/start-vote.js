// commands/start-vote.js
const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-vote')
        .setDescription('Create a timed vote in a channel.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to host the vote in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Vote duration (e.g. 5m, 1h)')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('ping')
                .setDescription('Role to ping (optional)')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.reply({ content: 'Opening vote setup...', ephemeral: true });
        // Further handling in index.js
    },
};
