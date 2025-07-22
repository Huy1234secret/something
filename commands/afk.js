// commands/afk.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Mark yourself as AFK with an optional reason.')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for going AFK')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.reply({ content: 'Updating your AFK status...', ephemeral: true });
    },
};
