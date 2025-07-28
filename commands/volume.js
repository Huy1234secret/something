const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set playback volume (0-100)')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-100)')
                .setRequired(true)),
    async execute(interaction) {
        const level = interaction.options.getInteger('level');
        const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
        if (level < 0 || level > 100) {
            return interaction[method]({ content: 'Volume must be between 0 and 100.', ephemeral: true });
        }
        const queue = getQueue(interaction.guild.id);
        queue.setVolume(level / 100);
        await interaction[method]({ content: `Volume set to ${level}%` });
    }
};
