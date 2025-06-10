// commands/database.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('database')
        .setDescription('View data from a specific database table (Admin Only).')
        .addStringOption(option =>
            option.setName('table')
                .setDescription('The name of the database table to view.')
                .setRequired(true)
                .addChoices(
                    { name: 'Users', value: 'users' },
                    { name: 'User Inventory', value: 'userInventory' },
                    { name: 'User Active Charms', value: 'userActiveCharms' },
                    { name: 'Guild Settings', value: 'guildSettings' },
                    { name: 'User DM Settings', value: 'userDmSettings' },
                    { name: 'User Loot Alert Settings', value: 'userLootAlertSettings' },
                    { name: 'User Global Loot Alert Settings', value: 'userGlobalLootAlertSettings' },
                    { name: 'Embed Sessions', value: 'embed_sessions' },
                    { name: 'Guild Shop Items', value: 'guildShopItems' },
                    { name: 'Guild Shop Settings', value: 'guildShopSettings' },
                ))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for security and direct database access.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing database view command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};