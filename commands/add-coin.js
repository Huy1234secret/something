// commands/add-coin.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-coin')
        .setDescription('Add coins to a user (Staff Only).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add coins to.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of coins to add (negative to remove).')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('bank')
                .setDescription('Modify bank balance instead of wallet.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        // This command's logic is primarily handled in index.js for centralizing user stat modifications.
        // It's defined here for command deployment.
        await interaction.reply({ content: 'Processing add-coin command...', ephemeral: true });
        // The actual logic is in index.js under interactionCreate listener.
    },
};
