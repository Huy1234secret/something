const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trick-or-treat🎃')
        .setDescription('Go trick-or-treating for candies.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Trick-or-treating...', ephemeral: false });
    },
};
