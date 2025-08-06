const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { startBlossom, startPrismaticTide, startEclipse, startAurora } = require('../utils/weatherManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-event')
        .setDescription('Start a special event (Staff Only).')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Event ID')
                .setRequired(true)
                .addChoices(
                    { name: 'Cherry Blossom Breeze', value: 'blossom' },
                    { name: 'Prismatic Tide', value: 'prismatic' },
                    { name: 'Eclipse', value: 'eclipse' },
                    { name: 'Aurora', value: 'aurora' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction) {
        const id = interaction.options.getString('id');
        let response;
        let result;
        if (id === 'blossom') {
            result = await startBlossom(interaction.client, { byAdmin: true });
        } else if (id === 'prismatic') {
            result = await startPrismaticTide(interaction.client, { byAdmin: true });
        } else if (id === 'eclipse') {
            result = await startEclipse(interaction.client, { byAdmin: true });
        } else if (id === 'aurora') {
            result = await startAurora(interaction.client, { byAdmin: true });
        } else {
            response = { content: 'Unknown event ID.', ephemeral: true };
        }

        if (!response) {
            if (!result.started) {
                const endTs = Math.floor((Date.now() + result.remaining) / 1000);
                const nameMap = {
                    blossom: 'Cherry Blossom Breeze',
                    prismatic: 'Prismatic Tide',
                    eclipse: 'Eclipse',
                    aurora: 'Aurora'
                };
                response = { content: `The event ${nameMap[id]} is currently active, you can use again in <t:${endTs}:R>`, ephemeral: true };
            } else {
                const nameMap = {
                    blossom: 'Cherry Blossom Breeze',
                    prismatic: 'Prismatic Tide',
                    eclipse: 'Eclipse',
                    aurora: 'Aurora'
                };
                response = { content: `${nameMap[id]} started.`, ephemeral: true };
            }
        }

        if (interaction.deferred || interaction.replied) return interaction.editReply(response);
        return interaction.reply(response);
    },
};
