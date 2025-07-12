const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Play the fishing minigame or view your fish inventory.')
        .addSubcommand(s =>
            s.setName('start').setDescription('Start fishing'))
        .addSubcommand(s =>
            s.setName('inventory').setDescription('View your fish inventory'))
        .addSubcommand(s =>
            s.setName('wallet').setDescription('View your fish dollars')),
    async execute(interaction) {
        await interaction.reply({ content: 'Preparing fishing...', ephemeral: false });
    },
};
