const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join-scavenger')
        .setDescription('Join the scavenger hunt and receive a private channel.'),
    async execute(interaction) {
        if (interaction.client.SCAVENGER_JOIN_ENABLED === false) {
            return interaction.reply({ content: 'The scavenger hunt can no longer be joined.', ephemeral: true });
        }
        if (!interaction.guild) {
            return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        }
        const baseName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const channelName = `scavenger-${baseName}`;
        const existing = interaction.guild.channels.cache.find(ch => ch.name === channelName);
        if (existing) {
            return interaction.reply({ content: `You already have a scavenger channel: <#${existing.id}>`, ephemeral: true });
        }
        try {
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
                ]
            });
            await interaction.reply({ content: `Private channel created: <#${channel.id}>`, ephemeral: true });
        } catch (error) {
            console.error('[join-scavenger] Failed to create channel:', error);
            await interaction.reply({ content: 'Failed to create your scavenger channel. Please ensure I have permission to manage channels.', ephemeral: true });
        }
    },
};
