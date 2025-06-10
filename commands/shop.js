// commands/shop.js
const { SlashCommandBuilder, ApplicationCommandOptionType, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Displays the server shop where you can buy items.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where the shop embed will be displayed or updated.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for dynamic embed building and interaction.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Opening the shop...', ephemeral: false });
        // The actual logic is in index.js under interactionCreate listener.
    },
};