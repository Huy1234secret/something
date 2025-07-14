const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { startRain } = require('../utils/weatherManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-weather')
        .setDescription('Start a weather effect (Staff Only).')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Weather ID')
                .setRequired(true)
                .addChoices(
                    { name: 'Rain', value: 'rain' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        const id = interaction.options.getString('id');
        if (id === 'rain') {
            await startRain(interaction.client);
            await interaction.reply({ content: 'Rain has started.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Unknown weather ID.', ephemeral: true });
        }
    },
};
