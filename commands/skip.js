const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    async execute(interaction) {
        const queue = getQueue(interaction.guild.id);
        queue.skip();
        const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
        await interaction[method]({ content: 'Skipped current song.' });
    }
};
