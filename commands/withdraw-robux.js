// commands/withdraw-robux.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw-robux')
        .setDescription('Request to withdraw Robux from your bot balance.'),
    // No options here, as we'll use a modal to collect input.
    async execute(interaction) {
        // This command's logic is primarily handled in index.js
        // to manage the modal, database checks, and staff notifications.
        // It's defined here for command deployment.
        // The actual logic (showing the modal)
        // will be in the interactionCreate listener in index.js.
        await interaction.reply({ content: 'Initiating Robux withdrawal request...', ephemeral: true });
    },
};