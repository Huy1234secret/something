// commands/usersettings.js
const { SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('usersettings')
        .setDescription('Manage your personal bot settings.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current bot settings.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-shop-dm')
                .setDescription('Enable/disable DM notifications for rare items/discounts in the shop.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-rarity-alert')
                .setDescription('Set rarity threshold for item drop alerts in the public channel (e.g., 1000 for 1-in-1000).')
                .addIntegerOption(option =>
                    option.setName('threshold')
                        .setDescription('Enter rarity (e.g., 1000 for 1-in-1000). 0 to disable.')
                        .setRequired(true)
                        .setMinValue(0)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-item-alert')
                .setDescription('Enable/disable public channel announcements for specific items you find.')
                .addStringOption(option =>
                    option.setName('item_id_alert')
                        .setDescription('The ID or name of the item to configure alerts for.')
                        .setRequired(true)
                        .setAutocomplete(true) // Enable autocomplete for item ID/name
                )
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable public channel alerts for this item type.')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for fetching and updating user settings.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing user settings command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};