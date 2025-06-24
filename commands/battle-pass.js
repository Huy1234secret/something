const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle-pass')
        .setDescription('Show your Battle Pass progress'),
    async execute(interaction) {
        await interaction.reply({ content: 'Loading Battle Pass...', ephemeral: false });
    },
};
