const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { startBlossom } = require('../utils/weatherManager');
const { initBuildBattleEvent } = require('../buildBattleEvent');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-event')
        .setDescription('Start a special event (Staff Only).')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Event ID')
                .setRequired(true)
                .addChoices(
                    { name: 'Cherry Blossom Breeze', value: 'blossom' },
                    { name: 'Build Battle', value: 'build_battle' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        const id = interaction.options.getString('id');
        if (id === 'blossom') {
            await startBlossom(interaction.client);
            await interaction.reply({ content: 'Cherry Blossom Breeze started.', ephemeral: true });
        } else if (id === 'build_battle') {
            await initBuildBattleEvent(interaction.client);
            await interaction.reply({ content: 'Build Battle event initialized.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Unknown event ID.', ephemeral: true });
        }
    },
};
