const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Posts the fishing market embed to the designated channel.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Posting market info...', ephemeral: true });
    },
};
