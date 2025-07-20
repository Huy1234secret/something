const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { startRandomElimination } = require('../utils/randomElimination');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random-eli')
        .setDescription('Start a random elimination game.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to host the game in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('Prize for the winner')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('users')
                .setDescription('Mention users to participate (optional)')
                .setRequired(false)),
    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel');
        const prize = interaction.options.getString('prize');
        const userInput = interaction.options.getString('users');

        const replyOptions = { content: 'Starting random elimination...', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(replyOptions);
        } else {
            await interaction.reply(replyOptions);
        }

        let members;
        if (userInput) {
            const ids = [];
            const mentionRegex = /<@!?(?<id>\d+)>/g;
            let match;
            while ((match = mentionRegex.exec(userInput)) !== null) {
                ids.push(match.groups.id);
            }
            // allow raw IDs separated by spaces
            const idRegex = /\b\d{17,19}\b/g;
            while ((match = idRegex.exec(userInput)) !== null) {
                if (!ids.includes(match[0])) ids.push(match[0]);
            }
            const uniqueIds = [...new Set(ids)];
            const fetched = await Promise.all(uniqueIds.map(id => interaction.guild.members.fetch(id).catch(() => null)));
            members = fetched.filter(Boolean);
        } else {
            const fetched = await interaction.guild.members.fetch();
            members = Array.from(fetched.values());
        }

        startRandomElimination(targetChannel, members, prize);
    },
};
