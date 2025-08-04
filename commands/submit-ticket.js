// commands/submit-ticket.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit-ticket')
        .setDescription('Submit your build for review.'),
    async execute(interaction) {
        // Actual logic handled in index.js
        await interaction.reply({ content: 'Opening submission form...', ephemeral: true });
    },
};
