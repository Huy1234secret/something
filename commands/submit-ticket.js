// commands/submit-ticket.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit-ticket')
        .setDescription('Create a private build submission channel.'),
    async execute(interaction) {
        // Actual logic handled in index.js
        await interaction.reply({ content: 'Creating your build channel...', ephemeral: true });
    },
};
