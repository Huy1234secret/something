// commands/giveaway.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { sendSetupChannelMessage } = require('../utils/giveawayManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-giveaway')
        .setDescription('Starts a new giveaway setup process.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where the giveaway will be hosted.')
                .setRequired(true)),
    async execute(interaction) {
        const giveawayChannel = interaction.options.getChannel('channel');

        await interaction.deferReply({ ephemeral: true });

        try {
            const imageUrl = 'https://i.ibb.co/fdF6BCtV/images.png'; // New image URL

            // Initialize initial giveaway configuration
            const giveawayConfig = {
                channelId: giveawayChannel.id,
                messageId: null, // Will be updated after sending the main giveaway message
                setupMessageId: null, // Add new field to store setup message ID
                hostId: interaction.user.id,
                embed: {
                    title: 'New Giveaway!',
                    description: 'Good luck everyone!',
                    author: { name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() },
                    color: parseInt('FFD700', 16), // Default color
                    thumbnail: imageUrl,
                    fields: []
                },
                duration: null, // Thời gian chạy giveaway sau khi bắt đầu
                actualStartTime: null, // Thời điểm giveaway được lên lịch bắt đầu
                winnerCount: 1,
                dmWinner: false,
                claimTime: 5 * 60 * 1000,
                prize: 'A fantastic prize!',
                participants: [],
                status: 'pending_message_config',
                setupChannelId: interaction.channel.id // Channel to send setup messages is the channel where the command was used
            };

            // Save configuration to client.giveawaySetups, use user ID to track
            if (!interaction.client.giveawaySetups) {
                interaction.client.giveawaySetups = new Collection();
            }
            interaction.client.giveawaySetups.set(interaction.user.id, giveawayConfig);

            // Send setup message to the selected channel and get the message object
            const setupMessage = await sendSetupChannelMessage(interaction, giveawayConfig);

            // Update setupMessageId of the setup message into giveawayConfig
            giveawayConfig.setupMessageId = setupMessage.id;
            interaction.client.giveawaySetups.set(interaction.user.id, giveawayConfig); // Save updated config

            await interaction.editReply({ content: `Giveaway setup has been started in this channel. Please configure it here. The actual giveaway will be in <#${giveawayChannel.id}>.`, ephemeral: true });

        } catch (error) {
            console.error('Error starting giveaway setup:', error);
            await interaction.editReply({ content: 'Failed to start giveaway setup. Please ensure the bot has permissions to send messages and embeds in the chosen channel.', ephemeral: true });
        }
    },
};