const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-level')
        .setDescription('Set a user\'s level (resets XP to 0)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to set level for')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('The level to set (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const level = interaction.options.getInteger('level');
        
        try {
            const result = await interaction.client.levelSystem.setLevel(
                targetUser.id,
                interaction.guildId,
                level,
                interaction.guild.members.cache.get(targetUser.id)
            );

            await interaction.reply({
                content: ` Set ${targetUser}'s level to ${result.newLevel} (XP reset to 0)`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        }
    },
};