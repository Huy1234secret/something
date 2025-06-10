// commands/ping.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong! and the bot\'s latency.'),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js to access client.ws.ping.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Pinging...', ephemeral: false });
        // The actual logic is in index.js under interactionCreate listener.
    },
};