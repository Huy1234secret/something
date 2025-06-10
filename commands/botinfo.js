// commands/botinfo.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Displays information about Maxwell Bot'),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js to access client properties like ping and uptime.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Fetching bot information...', ephemeral: false });
        // The actual logic is in index.js under interactionCreate listener.
    },
};