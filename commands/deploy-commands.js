// commands/deploy-commands.js
const { SlashCommandBuilder, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deploy-commands')
        .setDescription('Force update all slash commands for this bot.')
        .addStringOption(option =>
            option.setName('scope')
                .setDescription('Deploy globally or to this guild only.')
                .setRequired(false)
                .addChoices(
                    { name: 'Global Commands (all servers)', value: 'global' },
                    { name: 'Guild Commands (this server)', value: 'guild' },
                ))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        await interaction.reply({ content: 'Deploying slash commands...', ephemeral: true });
    },
};
