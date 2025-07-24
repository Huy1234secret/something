const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reroll-theme')
        .setDescription('Reroll a build battle theme for yourself or another user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to reroll the theme for')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.reply({ content: 'Rerolling theme...', ephemeral: true });
    },
};
