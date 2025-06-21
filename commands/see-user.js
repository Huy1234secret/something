// commands/see-user.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('see-user')
        .setDescription('View another user\'s inventory, bank, or level.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to inspect.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('info')
                .setDescription('What information to view.')
                .setRequired(true)
                .addChoices(
                    { name: 'Inventory', value: 'inventory' },
                    { name: 'Bank', value: 'bank' },
                    { name: 'Level', value: 'level' }
                )),
    async execute(interaction) {
        // Actual logic handled in index.js command handler.
        await interaction.reply({ content: 'Fetching user information...', ephemeral: false });
    },
};
