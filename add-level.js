const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-level')
        .setDescription('Add or remove levels from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to modify levels for')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of levels to add (negative to remove)')
                .setRequired(true)),
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const member = interaction.guild.members.cache.get(targetUser.id);
            
            const result = await interaction.client.levelSystem.addLevelManually(
                targetUser.id,
                interaction.guildId,
                amount,
                member
            );

            await interaction.reply({
                content: ` ${amount >= 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} level(s) ${amount >= 0 ? 'to' : 'from'} ${targetUser}.\nNew Level: ${result.newLevel}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('[add-level] Error:', error);
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        }
    },
};