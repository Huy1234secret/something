// commands/level.js
const { SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your current level and XP')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check (optional)')
                .setRequired(false)),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for fetching user data and building the level card image.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Fetching level information...', ephemeral: false });
        // The actual logic is in index.js under interactionCreate listener.
    },
};