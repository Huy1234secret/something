// commands/dm.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send an anonymous DM to a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to DM')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Actual logic handled in index.js when showing the modal and sending the message
        await interaction.reply({ content: 'Opening DM form...', ephemeral: true });
    },
};
