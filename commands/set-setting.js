// commands/set-setting.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-setting')
        .setDescription('Configure your personal alert settings.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Opening settings panel...', ephemeral: true });
    },
};
