// giveawayManager.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Collection } = require('discord.js');
const { saveGiveaways } = require('./dataManager');

const activeGiveaways = new Collection();

function getGiveawaySetup(giveawaySetupsMap, userId) {
    return giveawaySetupsMap.get(userId);
}

function setGiveawaySetup(giveawaySetupsMap, userId, config) {
    giveawaySetupsMap.set(userId, config);
    saveGiveaways(activeGiveaways, giveawaySetupsMap);
}

function deleteGiveawaySetup(giveawaySetupsMap, userId) {
    giveawaySetupsMap.delete(userId);
    saveGiveaways(activeGiveaways, giveawaySetupsMap);
}

async function sendSetupChannelMessage(interaction, config) {
    const embedData = JSON.parse(JSON.stringify(config.embed));
    if (typeof embedData.color === 'string' && embedData.color.startsWith('#')) {
        embedData.color = parseInt(embedData.color.slice(1), 16);
    }

    const embed = new EmbedBuilder(embedData);
    const imageUrl = 'https://i.ibb.co/fdF6BCtV/images.png';
    embed.setThumbnail(imageUrl);

    let components = [];

    if (config.status === 'pending_message_config') {
        embed.setTitle('🎁 Giveaway Setup: Message Content 🎁');
        embed.setDescription('Use the buttons below to customize your giveaway message embed. Click "Next" when you are done.');
        components = [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('edit_title')
                        .setLabel('Edit Title')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('edit_description')
                        .setLabel('Edit Description')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('edit_author')
                        .setLabel('Edit Author')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('edit_color')
                        .setLabel('Edit Color')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('next_step_message')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Success),
                )
        ];
    } else if (config.status === 'pending_settings_config') {
        embed.setTitle('⚙️ Giveaway Setup: Settings ⚙️');
        embed.setDescription('Configure your giveaway settings below. Click "Submit Giveaway" to begin!');
        embed.data.fields = [];

        if (config.prize) embed.addFields({ name: 'Prize', value: config.prize, inline: true });

        // --- Hiển thị Start Date ---
        if (config.actualStartTime) {
            embed.addFields({ name: 'Start Date', value: `<t:${Math.floor(config.actualStartTime / 1000)}:F>`, inline: false });
        } else {
            embed.addFields({ name: 'Start Date', value: 'Immediately (No schedule set)', inline: false });
        }

        // --- Hiển thị Active Duration ---
        if (config.duration) {
            embed.addFields({ name: 'Active Duration', value: formatDurationForInput(config.duration), inline: true });
        } else {
            embed.addFields({ name: 'Active Duration', value: 'Not set (will run for 5 minutes)', inline: true });
        }

        // --- Tính toán và hiển thị End Date ---
        let calculatedEndTime = null;
        // Logic để ước tính thời gian bắt đầu hiển thị
        let estimatedStartTimeForDisplay = config.actualStartTime || Date.now();
        // Logic để ước tính thời lượng hoạt động hiển thị
        let estimatedActiveDurationForDisplay = config.duration || (5 * 60 * 1000);

        // Tính toán thời gian kết thúc dựa trên ước tính
        calculatedEndTime = estimatedStartTimeForDisplay + estimatedActiveDurationForDisplay;

        if (calculatedEndTime) {
            embed.addFields({ name: 'End Date', value: `<t:${Math.floor(calculatedEndTime / 1000)}:F>`, inline: false });
        } else {
            embed.addFields({ name: 'End Date', value: 'Will be calculated at start', inline: false });
        }

        embed.addFields(
            { name: 'Winners', value: String(config.winnerCount), inline: true },
            { name: 'DM Winner', value: config.dmWinner ? 'Yes' : 'No', inline: true },
            { name: 'Claim Time', value: `${config.claimTime / (60 * 1000)} minutes`, inline: true }
        );

        components = [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('set_start_date')
                        .setLabel('Set Start Date')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('set_duration')
                        .setLabel('Set Active Duration')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('set_winner_amount')
                        .setLabel('Winner Amount')
                        .setStyle(ButtonStyle.Primary),
                ),
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('set_dm_winner')
                        .setLabel('DM Winner?')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('set_claim_time')
                        .setLabel('Claim Time')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('set_prize')
                        .setLabel('Set Prize')
                        .setStyle(ButtonStyle.Primary),
                ),
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('submit_giveaway')
                        .setLabel('Submit Giveaway')
                        .setStyle(ButtonStyle.Success),
                )
        ];
    }

    try {
        const channel = await interaction.client.channels.fetch(config.setupChannelId);
        if (!channel) {
            console.error(`Setup channel not found: ${config.setupChannelId}`);
            // Return null or throw a specific error that can be caught by the caller
            throw new Error(`Setup channel not found: ${config.setupChannelId}`);
        }

        // Check bot's permissions in the setup channel
        const selfMember = await channel.guild.members.fetch(interaction.client.user.id);
        if (!selfMember.permissionsIn(channel).has(['SendMessages', 'EmbedLinks', 'ManageMessages'])) {
            const missingPerms = [];
            if (!selfMember.permissionsIn(channel).has('SendMessages')) missingPerms.push('Send Messages');
            if (!selfMember.permissionsIn(channel).has('EmbedLinks')) missingPerms.push('Embed Links');
            if (!selfMember.permissionsIn(channel).has('ManageMessages')) missingPerms.push('Manage Messages'); // Required for editing old messages
            
            throw new Error(`Missing permissions in setup channel <#${channel.id}>: ${missingPerms.join(', ')}. Please grant them to the bot.`);
        }

        if (config.setupMessageId) {
            const message = await channel.messages.fetch(config.setupMessageId).catch(() => null);
            if (message && message.editable) { // Ensure message exists and is editable
                return await message.edit({ embeds: [embed], components: components });
            } else {
                console.warn(`Setup message ${config.setupMessageId} not found or not editable, sending new message.`);
                const newMessage = await channel.send({ embeds: [embed], components: components });
                config.setupMessageId = newMessage.id;
                return newMessage;
            }
        } else {
            const newMessage = await channel.send({ embeds: [embed], components: components });
            config.setupMessageId = newMessage.id;
            return newMessage;
        }
    } catch (error) {
        console.error('Error sending/updating setup channel message:', error);
        // Re-throw to be caught by the interaction handler in index.js
        throw error;
    }
}

async function handleGiveawaySetupInteraction(interaction, giveawaySetupsMap) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const userId = interaction.user.id;
    const config = getGiveawaySetup(giveawaySetupsMap, userId);

    if (!config || config.setupChannelId !== interaction.channel.id) {
        if (interaction.isButton() || interaction.isModalSubmit()) {
            // Only reply if the interaction hasn't been replied to or deferred already
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'It seems your giveaway setup session has expired or was not found, or you are interacting in the wrong channel. Please start a new one with `/start-giveaway`.', ephemeral: true }).catch(console.error);
            } else {
                // If it was deferred by index.js's main interaction handler, then followUp or editReply.
                // Given the context, this is usually for a button that doesn't immediately open a modal.
                // However, the fix in index.js should prevent double deferring for modals.
                await interaction.followUp({ content: 'It seems your giveaway setup session has expired or was not found, or you are interacting in the wrong channel. Please start a new one with `/start-giveaway`.', ephemeral: true }).catch(console.error);
            }
        }
        return;
    }

    // Buttons that open modals should NOT be deferred with deferUpdate *before* showModal.
    // showModal implicitly defers/acknowledges the interaction.
    const isButtonOpeningModal = ['edit_title', 'edit_description', 'edit_author', 'edit_color',
                                  'set_duration', 'set_start_date', 'set_winner_amount',
                                  'set_dm_winner', 'set_claim_time', 'set_prize'].includes(interaction.customId);

    // Only deferUpdate if it's NOT a button directly opening a modal and NOT a modal submission.
    // Modal submissions implicitly defer when they are shown.
    if (!interaction.deferred && !interaction.replied && interaction.isButton() && !isButtonOpeningModal) {
        await interaction.deferUpdate().catch(console.error);
    } else if (!interaction.deferred && !interaction.replied && interaction.isModalSubmit()) {
        // Modal submissions are *already deferred* by the act of submitting them.
        // Calling deferUpdate again here after submission will result in InteractionAlreadyReplied.
        // So, we do nothing here for modal submissions as they are auto-deferred.
    }


    switch (interaction.customId) {
        case 'edit_title': {
            const modal = new ModalBuilder()
                .setCustomId('edit_title_modal')
                .setTitle('Edit Giveaway Title');
            const titleInput = new TextInputBuilder()
                .setCustomId('giveaway_title_input')
                .setLabel('Giveaway Title')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(config.embed.title || 'New Giveaway!');
            modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'edit_description': {
            const modal = new ModalBuilder()
                .setCustomId('edit_description_modal')
                .setTitle('Edit Giveaway Description');
            const descriptionInput = new TextInputBuilder()
                .setCustomId('giveaway_description_input')
                .setLabel('Giveaway Description')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setValue(config.embed.description || 'Good luck everyone!');
            modal.addComponents(new ActionRowBuilder().addComponents(descriptionInput));
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'edit_author': {
            const modal = new ModalBuilder()
                .setCustomId('edit_author_modal')
                .setTitle('Edit Giveaway Author');
            const authorNameInput = new TextInputBuilder()
                .setCustomId('giveaway_author_name_input')
                .setLabel('Author Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(config.embed.author?.name || interaction.user.tag);
            const authorIconInput = new TextInputBuilder()
                .setCustomId('giveaway_author_icon_input')
                .setLabel('Author Icon URL (Optional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(config.embed.author?.iconURL || '');
            modal.addComponents(
                new ActionRowBuilder().addComponents(authorNameInput),
                new ActionRowBuilder().addComponents(authorIconInput)
            );
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'edit_color': {
            const modal = new ModalBuilder()
                .setCustomId('edit_color_modal')
                .setTitle('Edit Giveaway Embed Color');
            const colorInput = new TextInputBuilder()
                .setCustomId('giveaway_color_input')
                .setLabel('Embed Color (Hex code, e.g., #FFD700)')
                .setPlaceholder('Example: #FFD700 or #00FF00')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(config.embed.color ? `#${config.embed.color.toString(16).padStart(6, '0').toUpperCase()}` : '#FFD700');
            modal.addComponents(new ActionRowBuilder().addComponents(colorInput));
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'next_step_message':
            config.status = 'pending_settings_config';
            setGiveawaySetup(giveawaySetupsMap, userId, config);
            // This button's deferredUpdate already happened, so editReply
            await sendSetupChannelMessage(interaction, config).catch(console.error);
            break;
        case 'set_duration': {
            const modal = new ModalBuilder()
                .setCustomId('set_duration_modal')
                .setTitle('Set Giveaway Active Duration');
            const durationInput = new TextInputBuilder()
                .setCustomId('giveaway_duration_input')
                .setLabel('Duration (e.g., 2h, 30m, 1d)')
                .setPlaceholder('Example: 2h for 2 hours, 30m for 30 minutes')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(config.duration ? formatDurationForInput(config.duration) : '');
            modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'set_start_date': {
            const modal = new ModalBuilder()
                .setCustomId('set_start_date_modal')
                .setTitle('Schedule Giveaway Start Date'); // Title for the modal
            const dateInput = new TextInputBuilder()
                .setCustomId('giveaway_start_date_input')
                .setLabel('Start Date (DD/MM/YYYY)')
                .setPlaceholder('Example: 15/05/2025')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(config.actualStartTime ? new Date(config.actualStartTime).toLocaleDateString('en-GB') : '');
            const timeInput = new TextInputBuilder()
                .setCustomId('giveaway_start_time_input')
                .setLabel('Start Time (HH:MM)')
                .setPlaceholder('Example: 09:00')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(config.actualStartTime ? new Date(config.actualStartTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
            const timezoneInput = new TextInputBuilder()
                .setCustomId('giveaway_start_timezone_input')
                .setLabel('Timezone (e.g., +7, -5)')
                .setPlaceholder('Example: +7 for UTC+7')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue('');

            modal.addComponents(
                new ActionRowBuilder().addComponents(dateInput),
                new ActionRowBuilder().addComponents(timeInput),
                new ActionRowBuilder().addComponents(timezoneInput)
            );
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'set_winner_amount': {
            const modal = new ModalBuilder()
                .setCustomId('set_winner_amount_modal')
                .setTitle('Set Winner Amount');
            const winnerAmountInput = new TextInputBuilder()
                .setCustomId('giveaway_winner_amount_input')
                .setLabel('Number of Winners (Max 5)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(String(config.winnerCount));
            modal.addComponents(new ActionRowBuilder().addComponents(winnerAmountInput));
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'set_dm_winner': {
            const modal = new ModalBuilder()
                .setCustomId('set_dm_winner_modal')
                .setTitle('DM Winner?');
            const dmWinnerInput = new TextInputBuilder()
                .setCustomId('giveaway_dm_winner_input')
                .setLabel('DM Winner (YES/NO)')
                .setPlaceholder('Type YES or NO')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(config.dmWinner ? 'YES' : 'NO');
            modal.addComponents(new ActionRowBuilder().addComponents(dmWinnerInput));
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'set_claim_time': {
            const modal = new ModalBuilder()
                .setCustomId('set_claim_time_modal')
                .setTitle('Set Claim Time');
            const claimTimeInput = new TextInputBuilder()
                .setCustomId('giveaway_claim_time_input')
                .setLabel('Claim Time (in minutes)')
                .setPlaceholder('Example: 5 for 5 minutes')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(String(config.claimTime / (60 * 1000)));
            modal.addComponents(new ActionRowBuilder().addComponents(claimTimeInput));
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'set_prize': {
            const modal = new ModalBuilder()
                .setCustomId('set_prize_modal')
                .setTitle('Set Giveaway Prize');
            const prizeInput = new TextInputBuilder()
                .setCustomId('giveaway_prize_input')
                .setLabel('Giveaway Prize')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setValue(config.prize);
            modal.addComponents(new ActionRowBuilder().addComponents(prizeInput));
            await interaction.showModal(modal).catch(console.error);
            break;
        }
        case 'submit_giveaway':
            config.guildId = interaction.guildId;
            // Ensure actualStartTime and duration are correctly set for scheduling
            if (config.actualStartTime && config.actualStartTime > Date.now()) {
                await startScheduledGiveaway(interaction.client, config).catch(console.error);
            } else {
                // If scheduled time is in the past or not set, start instantly
                await startInstantGiveaway(interaction.client, config).catch(console.error);
            }
            deleteGiveawaySetup(giveawaySetupsMap, userId); // Clean up setup config
            // The submit_giveaway button was deferred. Now editReply to acknowledge submission.
            // Since deferUpdate() was used for the button, send a new ephemeral follow-up.
            await interaction.followUp({ content: 'Giveaway submitted successfully! Check the target channel.', ephemeral: true }).catch(e => {
                console.error('[submit_giveaway] Error sending followUp confirmation:', e);
                // As a last resort, if followUp fails, try to edit the original interaction reply context
                // This might happen if the interaction token is very close to expiring
                if (interaction.replied || interaction.deferred) { // Check again, as state might change
                    interaction.editReply({ content: 'Giveaway submitted (follow-up failed).', ephemeral: true }).catch(finalErr => {
                        console.error('[submit_giveaway] Fallback editReply also failed:', finalErr);
                    });
                }
            });
            break;
        // Handle Modal Submissions
        case 'edit_title_modal':
            try {
                // Defer immediately to acknowledge the modal submission
                await interaction.deferReply({ ephemeral: true });

                const newTitle = interaction.fields.getTextInputValue('giveaway_title_input');
                if (newTitle.length > 256) { // Discord embed title limit
                    await interaction.editReply({ content: 'Error: Title is too long. Maximum 256 characters.' });
                    return; // Do not proceed or refresh panel
                }
                config.embed.title = newTitle;
                setGiveawaySetup(giveawaySetupsMap, userId, config);

                // Ephemeral success message for the modal interaction
                await interaction.editReply({ content: 'Title updated successfully. The setup panel will refresh.' });

                // Refresh the main setup panel message
                await sendSetupChannelMessage(interaction, config);
            } catch (error) {
                console.error(`[EditTitleModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update title. Please try again. If the issue persists, check bot logs.`;
                // Attempt to edit the deferred reply with the error message
                if (interaction.deferred) { // Should always be true if deferReply succeeded
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    // Fallback, though ideally not reached if deferReply is first
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return; // Prevent further action on error
            }
            break;
        case 'edit_description_modal':
            try {
                await interaction.deferReply({ ephemeral: true });

                const newDescription = interaction.fields.getTextInputValue('giveaway_description_input');
                if (newDescription.length > 4096) { // Discord embed description limit
                    await interaction.editReply({ content: 'Error: Description is too long. Maximum 4096 characters.' });
                    return;
                }
                config.embed.description = newDescription;
                setGiveawaySetup(giveawaySetupsMap, userId, config);

                await interaction.editReply({ content: 'Description updated successfully. The setup panel will refresh.' });
                await sendSetupChannelMessage(interaction, config);
            } catch (error) {
                console.error(`[EditDescriptionModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update description. Please try again.`;
                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        case 'edit_author_modal':
            try {
                await interaction.deferReply({ ephemeral: true });

                const authorName = interaction.fields.getTextInputValue('giveaway_author_name_input');
                const authorIconURL = interaction.fields.getTextInputValue('giveaway_author_icon_input') || undefined;

                if (authorName.length > 256) { // Discord embed author name limit
                     await interaction.editReply({ content: 'Error: Author name is too long. Maximum 256 characters.' });
                     return;
                }

                config.embed.author = { name: authorName, iconURL: authorIconURL };
                setGiveawaySetup(giveawaySetupsMap, userId, config);

                await interaction.editReply({ content: 'Author updated successfully. The setup panel will refresh.' });
                await sendSetupChannelMessage(interaction, config);
            } catch (error) {
                console.error(`[EditAuthorModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update author. Please try again.`;
                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        case 'edit_color_modal': {
            try {
                await interaction.deferReply({ ephemeral: true });

                const colorInput = interaction.fields.getTextInputValue('giveaway_color_input');
                const hexColor = colorInput.startsWith('#') ? colorInput.slice(1) : colorInput;

                if (/^[0-9A-Fa-f]{6}$/.test(hexColor)) {
                    config.embed.color = parseInt(hexColor, 16);
                    setGiveawaySetup(giveawaySetupsMap, userId, config);
                    await interaction.editReply({ content: 'Color updated successfully. The setup panel will refresh.' });
                    await sendSetupChannelMessage(interaction, config);
                } else {
                    await interaction.editReply({ content: 'Invalid color format. Please use a 6-digit hex code (e.g., #FFD700).' });
                    return; // Don't update panel if color is invalid
                }
            } catch (error) {
                console.error(`[EditColorModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update color. Please try again.`;
                 if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        }
        case 'set_duration_modal': {
            try {
                await interaction.deferReply({ ephemeral: true });
                const durationStr = interaction.fields.getTextInputValue('giveaway_duration_input');
                const durationMs = parseDuration(durationStr);

                if (durationMs === null || durationMs <= 0) {
                    await interaction.editReply({ content: 'Invalid duration. Please use formats like 2h, 30m, 1d (e.g., 1d 2h 30m). Minimum 1 minute.' });
                    return;
                } else if (durationMs < 60000) { // Minimum 1 minute
                    await interaction.editReply({ content: 'Duration too short. Minimum 1 minute.' });
                    return;
                }
                // Optional: Add a maximum duration check if desired
                // const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
                // if (durationMs > maxDuration) {
                //     await interaction.editReply({ content: 'Duration too long. Maximum 30 days.' });
                //     return;
                // }

                config.duration = durationMs;
                setGiveawaySetup(giveawaySetupsMap, userId, config);
                await interaction.editReply({ content: 'Duration updated successfully. The setup panel will refresh.' });
                await sendSetupChannelMessage(interaction, config);
            } catch (error) {
                console.error(`[SetDurationModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update duration. Please try again.`;
                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        }
        case 'set_start_date_modal': {
            try {
                await interaction.deferReply({ ephemeral: true });
                const dateStr = interaction.fields.getTextInputValue('giveaway_start_date_input');
                const timeStr = interaction.fields.getTextInputValue('giveaway_start_time_input');
                const timezoneStr = interaction.fields.getTextInputValue('giveaway_start_timezone_input');
                let replyMessage = '';

                if (!dateStr && !timeStr && !timezoneStr) { // All fields empty means start immediately
                    config.actualStartTime = null;
                    replyMessage = 'Giveaway will start immediately (schedule cleared).';
                } else if (dateStr && timeStr) { // Date and Time are mandatory if scheduling
                    const dateTimeMs = parseDateTimeWithTimezone(dateStr, timeStr, timezoneStr);
                    if (dateTimeMs === null) {
                        replyMessage = 'Invalid date, time, or timezone format. Please use DD/MM/YYYY, HH:MM, and a valid timezone offset (e.g., +7 or -5). Schedule not set.';
                        // config.actualStartTime remains unchanged or null if previously so
                    } else if (dateTimeMs < Date.now()) {
                        replyMessage = 'Scheduled start time is in the past. Please choose a future time. Schedule not set.';
                        // config.actualStartTime remains unchanged or null
                    } else {
                        config.actualStartTime = dateTimeMs;
                        replyMessage = `Giveaway scheduled for <t:${Math.floor(dateTimeMs / 1000)}:F>.`;
                    }
                } else { // Incomplete input for scheduling
                    replyMessage = 'To schedule, please provide both Start Date and Start Time. Timezone is optional (defaults to bot server time if not specified or invalid). To start immediately, leave all fields blank. No changes made.';
                    await interaction.editReply({ content: replyMessage });
                    return; // Don't update panel or config if input is incomplete for scheduling
                }

                setGiveawaySetup(giveawaySetupsMap, userId, config);
                await interaction.editReply({ content: replyMessage + ' The setup panel will refresh.' });
                await sendSetupChannelMessage(interaction, config);

            } catch (error) {
                console.error(`[SetStartDateModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update start date. Please try again.`;
                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        }
        case 'set_winner_amount_modal': {
            try {
                await interaction.deferReply({ ephemeral: true });
                const winnerAmountStr = interaction.fields.getTextInputValue('giveaway_winner_amount_input');
                const winnerAmount = parseInt(winnerAmountStr);

                if (isNaN(winnerAmount) || winnerAmount <= 0 || winnerAmount > 20) { // Max winners increased slightly, adjust as needed
                    await interaction.editReply({ content: 'Invalid number of winners. Please enter a whole number between 1 and 20.' });
                    return;
                }

                config.winnerCount = winnerAmount;
                setGiveawaySetup(giveawaySetupsMap, userId, config);
                await interaction.editReply({ content: 'Winner amount updated successfully. The setup panel will refresh.' });
                await sendSetupChannelMessage(interaction, config);
            } catch (error) {
                console.error(`[SetWinnerAmountModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update winner amount. Please try again.`;
                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        }
        case 'set_dm_winner_modal': {
            try {
                await interaction.deferReply({ ephemeral: true });
                const dmWinnerInput = interaction.fields.getTextInputValue('giveaway_dm_winner_input').trim().toLowerCase();
                let message;

                if (dmWinnerInput === 'yes') {
                    config.dmWinner = true;
                    message = 'Winners will now be DMed. The setup panel will refresh.';
                } else if (dmWinnerInput === 'no') {
                    config.dmWinner = false;
                    message = 'Winners will no longer be DMed. The setup panel will refresh.';
                } else {
                    await interaction.editReply({ content: 'Invalid input. Please type "YES" or "NO". No changes made.' });
                    return; // Don't update panel or config
                }
                setGiveawaySetup(giveawaySetupsMap, userId, config);
                await interaction.editReply({ content: message });
                await sendSetupChannelMessage(interaction, config);
            } catch (error) {
                console.error(`[SetDMWinnerModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update DM winner setting. Please try again.`;
                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        }
        case 'set_claim_time_modal': {
            try {
                await interaction.deferReply({ ephemeral: true });
                const claimTimeStr = interaction.fields.getTextInputValue('giveaway_claim_time_input');
                const claimTimeMinutes = parseInt(claimTimeStr);

                // Example: Min 1 minute, Max 7 days (10080 minutes)
                if (isNaN(claimTimeMinutes) || claimTimeMinutes <= 0 || claimTimeMinutes > 10080) {
                    await interaction.editReply({ content: 'Invalid claim time. Please enter a positive number of minutes (e.g., 1 to 10080 for 7 days).' });
                    return;
                }

                config.claimTime = claimTimeMinutes * 60 * 1000; // Convert to milliseconds
                setGiveawaySetup(giveawaySetupsMap, userId, config);
                await interaction.editReply({ content: 'Claim time updated successfully. The setup panel will refresh.' });
                await sendSetupChannelMessage(interaction, config);
            } catch (error) {
                console.error(`[SetClaimTimeModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update claim time. Please try again.`;
                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        }
        case 'set_prize_modal':
            try {
                await interaction.deferReply({ ephemeral: true });
                const prize = interaction.fields.getTextInputValue('giveaway_prize_input');

                if (!prize || prize.trim().length === 0) {
                    await interaction.editReply({ content: 'Prize cannot be empty.' });
                    return;
                }
                if (prize.length > 1024) { // Discord embed field value limit (though prize is often in description or title)
                    await interaction.editReply({ content: 'Prize is too long. Maximum 1024 characters.' });
                    return;
                }

                config.prize = prize;
                setGiveawaySetup(giveawaySetupsMap, userId, config);
                await interaction.editReply({ content: 'Prize updated successfully. The setup panel will refresh.' });
                await sendSetupChannelMessage(interaction, config);
            } catch (error) {
                console.error(`[SetPrizeModal Error]: ${error.message}`, error.stack);
                const errorMessage = `Failed to update prize. Please try again.`;
                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage }).catch(e => console.error("Error editing reply for modal error:", e.stack));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => console.error("Error replying to modal error:", e.stack));
                }
                return;
            }
            break;
        default:
            // This is for unexpected button interactions that were deferred.
            // If the interaction was deferred by the initial deferUpdate, it needs a follow-up or editReply.
            // For example, if a button that *doesn't* open a modal is clicked.
            if (interaction.isButton() && !isButtonOpeningModal) {
                 if (interaction.deferred) {
                    await interaction.editReply({ content: 'Unknown interaction, or the task is already being processed.', ephemeral: true }).catch(console.error);
                } else if (interaction.replied) {
                    await interaction.followUp({ content: 'Unknown interaction.', ephemeral: true }).catch(console.error);
                } else {
                     // Fallback for cases where deferUpdate was skipped or failed initially.
                    await interaction.reply({ content: 'Unknown interaction.', ephemeral: true }).catch(console.error);
                }
            } else if (interaction.isModalSubmit()) {
                // For modal submissions, deferReply is used at the start of modal handlers.
                // So, if we reach here, it's an unhandled modal, but it's already deferred.
                await interaction.editReply({ content: 'Unknown modal submission.', ephemeral: true }).catch(console.error);
            }
            break;
    }

    // This block for refreshing the setup message should be carefully placed.
    // It's meant to re-render the setup panel after a change.
    // Ensure it's not called if a modal is still active or if the interaction is done.
    if (interaction.isModalSubmit() || ['next_step_message'].includes(interaction.customId)) {
        // The sendSetupChannelMessage function now handles interaction.editReply for these cases
        // so we don't need a separate call here.
        // It's already called within the modal submission handlers and next_step_message.
    }
}

function parseDuration(durationStr) {
    const unitMap = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };

    const match = durationStr.match(/^(\d+)([smhd])$/i);
    if (!match) {
        return null;
    }

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (isNaN(value) || value <= 0 || !unitMap[unit]) {
        return null;
    }

    return value * unitMap[unit];
}

function formatDurationForInput(milliseconds) {
    if (milliseconds === null) return '';

    if (milliseconds % (24 * 60 * 60 * 1000) === 0) {
        return `${milliseconds / (24 * 60 * 60 * 1000)}d`;
    } else if (milliseconds % (60 * 60 * 1000) === 0) {
        return `${milliseconds / (60 * 60 * 1000)}h`;
    } else if (milliseconds % (60 * 1000) === 0) {
        return `${milliseconds / (60 * 1000)}m`;
    } else if (milliseconds % 1000 === 0) {
        return `${milliseconds / 1000}s`;
    }
    return '';
}

function parseDateTimeWithTimezone(dateStr, timeStr, timezoneStr) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

    if (timezoneStr) {
        const tzOffset = parseInt(timezoneStr);
        if (!isNaN(tzOffset)) {
            // Apply timezone offset. If +7, we subtract 7 hours from UTC to get the local time's UTC representation.
            date.setUTCHours(date.getUTCHours() - tzOffset);
        }
    }

    if (isNaN(date.getTime())) {
        return null;
    }

    return date.getTime();
}

async function startScheduledGiveaway(client, config) {
    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (!channel) {
        console.error(`Giveaway channel not found: ${config.channelId}`);
        const hostUser = await client.users.fetch(config.hostId).catch(() => null);
        if (hostUser) await hostUser.send(`Failed to start your scheduled giveaway for **${config.prize}** because the channel <#${config.channelId}> could not be found or I don't have access.`).catch(console.error);
        return;
    }

    // Check bot's permissions in the target channel
    const selfMember = await channel.guild.members.fetch(client.user.id);
    if (!selfMember.permissionsIn(channel).has(['SendMessages', 'EmbedLinks', 'ManageMessages'])) {
        const missingPerms = [];
        if (!selfMember.permissionsIn(channel).has('SendMessages')) missingPerms.push('Send Messages');
        if (!selfMember.permissionsIn(channel).has('EmbedLinks')) missingPerms.push('Embed Links');
        if (!selfMember.permissionsIn(channel).has('ManageMessages')) missingPerms.push('Manage Messages'); // For deleting scheduled message later
        const hostUser = await client.users.fetch(config.hostId).catch(() => null);
        if (hostUser) await hostUser.send(`Failed to start your scheduled giveaway for **${config.prize}** in <#${config.channelId}> due to missing permissions: ${missingPerms.join(', ')}. Please grant them to the bot.`).catch(console.error);
        console.error(`Missing permissions in target channel ${channel.name} for scheduled giveaway: ${missingPerms.join(', ')}`);
        return;
    }

    const { actualStartTime, hostId } = config;
    const now = Date.now();
    const timeUntilStart = actualStartTime - now;

    if (!actualStartTime || timeUntilStart <= 0) {
        console.log(`Giveaway for ${config.prize} starting instantly as scheduled date is invalid or in the past.`);
        await startInstantGiveaway(client, config).catch(console.error);
        try { // Attempt to delete setup message after starting
            const setupChannel = await client.channels.fetch(config.setupChannelId);
            if (setupChannel && config.setupMessageId) {
                const setupMsg = await setupChannel.messages.fetch(config.setupMessageId).catch(() => null);
                if (setupMsg && setupMsg.deletable) {
                    await setupMsg.delete().catch(console.error);
                }
            }
        } catch (err) {
            console.error('Error deleting setup message after instant start:', err);
        }
        return;
    }

    const hostUser = await client.users.fetch(hostId);

    const scheduledEmbedData = JSON.parse(JSON.stringify(config.embed));
    if (typeof scheduledEmbedData.color === 'string' && scheduledEmbedData.color.startsWith('#')) {
        scheduledEmbedData.color = parseInt(scheduledEmbedData.color.slice(1), 16);
    }
    const scheduledEmbed = new EmbedBuilder(scheduledEmbedData)
        .setTitle('Giveaway Scheduled!')
        .setDescription(`${hostUser.username} has scheduled a giveaway!`)
        .addFields(
            { name: 'Giveaway will begin', value: `<t:${Math.floor(actualStartTime / 1000)}:R>`, inline: false },
            { name: 'Prize', value: config.prize, inline: false },
            { name: 'Active Duration', value: config.duration ? formatDurationForInput(config.duration) : 'Not set (will run for 5 minutes after start)', inline: false },
            { name: 'Host', value: `<@${hostId}>`, inline: false }
        )
        .setColor(scheduledEmbedData.color || '#FFA500');

    const imageUrl = 'https://i.ibb.co/fdF6BCtV/images.png';
    scheduledEmbed.setThumbnail(imageUrl);

    const message = await channel.send({ embeds: [scheduledEmbed] }).catch(async (err) => {
        console.error(`Failed to send scheduled giveaway message to ${channel.name}:`, err);
        const host = await client.users.fetch(hostId).catch(() => null);
        if (host) await host.send(`Failed to post your scheduled giveaway for **${config.prize}** in <#${config.channelId}> due to an error: ${err.message}`).catch(console.error);
        return null;
    });

    if (message) { // Only set and save if message was sent successfully
        activeGiveaways.set(message.id, {
            ...config,
            messageId: message.id,
            scheduled: true,
            // Ensure `endTime` is calculated and saved for scheduled giveaways too
            // This `endTime` will be the moment the *instant* giveaway starts, not when the scheduled message is posted.
            // The actual endTime for the instant giveaway will be calculated by `startInstantGiveaway`.
            // So, `endTime` should only be set in `startInstantGiveaway`.
        });
        saveGiveaways(activeGiveaways, client.giveawaySetups);

        setTimeout(async () => {
            const currentConfig = activeGiveaways.get(message.id);
            if (currentConfig && currentConfig.scheduled) {
                const scheduledMsgChannel = await client.channels.fetch(currentConfig.channelId).catch(() => null);
                if (scheduledMsgChannel) {
                    const scheduledMsg = await scheduledMsgChannel.messages.fetch(currentConfig.messageId).catch(() => null);
                    if (scheduledMsg && scheduledMsg.deletable) {
                        await scheduledMsg.delete().catch(console.error);
                    } else {
                        console.warn(`Scheduled giveaway message ${currentConfig.messageId} not found for deletion in channel ${currentConfig.channelId}.`);
                    }
                } else {
                    console.warn(`Scheduled message channel ${currentConfig.channelId} not found for deletion.`);
                }
                
                // Now trigger the instant giveaway with the full config, which includes original duration.
                currentConfig.actualStartTime = null; // Reset to ensure it's treated as instant now
                await startInstantGiveaway(client, currentConfig).catch(console.error);
                activeGiveaways.delete(message.id); // Remove the scheduled entry
                saveGiveaways(activeGiveaways, client.giveawaySetups);
            }
        }, timeUntilStart);

        try { // Attempt to delete setup message after successful scheduling
            const setupChannel = await client.channels.fetch(config.setupChannelId);
            if (setupChannel && config.setupMessageId) {
                const setupMsg = await setupChannel.messages.fetch(config.setupMessageId).catch(() => null);
                if (setupMsg && setupMsg.deletable) {
                    await setupMsg.delete().catch(console.error);
                }
            }
        } catch (err) {
            console.error('Error deleting setup message:', err);
        }

        const interactionUser = await client.users.fetch(config.hostId);
        if (interactionUser) {
            await interactionUser.send(`Your giveaway for **${config.prize}** is scheduled to start at <t:${Math.floor(actualStartTime / 1000)}:F> in <#${config.channelId}>. It will then run for ${config.duration ? formatDurationForInput(config.duration) : '5 minutes (default)'}.`).catch(console.error);
        }
    } else {
        console.error("Failed to send scheduled giveaway message, aborting schedule setup.");
        const host = await client.users.fetch(config.hostId).catch(() => null);
        if (host) await host.send(`Your scheduled giveaway for **${config.prize}** could not be posted. Please check bot permissions or try again later.`).catch(console.error);
    }
}

async function startInstantGiveaway(client, config) {
    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (!channel) {
        console.error(`Giveaway channel not found for instant giveaway: ${config.channelId}`);
        const hostUser = await client.users.fetch(config.hostId).catch(() => null);
        if (hostUser) await hostUser.send(`Failed to start your giveaway for **${config.prize}** because the channel <#${config.channelId}> could not be found or I don't have access.`).catch(console.error);
        return;
    }

    // Check bot's permissions in the target channel
    const selfMember = await channel.guild.members.fetch(client.user.id);
    if (!selfMember.permissionsIn(channel).has(['SendMessages', 'EmbedLinks'])) {
        const missingPerms = [];
        if (!selfMember.permissionsIn(channel).has('SendMessages')) missingPerms.push('Send Messages');
        if (!selfMember.permissionsIn(channel).has('EmbedLinks')) missingPerms.push('Embed Links');
        const hostUser = await client.users.fetch(config.hostId).catch(() => null);
        if (hostUser) await hostUser.send(`Failed to start your giveaway for **${config.prize}** in <#${config.channelId}> due to missing permissions: ${missingPerms.join(', ')}. Please grant them to the bot.`).catch(console.error);
        console.error(`Missing permissions in target channel ${channel.name} for instant giveaway: ${missingPerms.join(', ')}`);
        return;
    }


    const { embed, prize, winnerCount, hostId, claimTime, dmWinner } = config;

    let actualDuration = config.duration || (5 * 60 * 1000); // Default to 5 minutes if not set

    const endTime = Date.now() + actualDuration;

    const giveawayEmbedData = JSON.parse(JSON.stringify(embed));
    if (typeof giveawayEmbedData.color === 'string' && giveawayEmbedData.color.startsWith('#')) {
        giveawayEmbedData.color = parseInt(giveawayEmbedData.color.slice(1), 16);
    }
    const giveawayEmbed = new EmbedBuilder(giveawayEmbedData)
        .addFields(
            { name: 'Prize', value: prize, inline: false },
            { name: 'Giveaway ends in', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
            { name: 'Winners', value: `${winnerCount}`, inline: true },
            { name: 'Host', value: `<@${hostId}>`, inline: false }
        )
        .setColor(giveawayEmbedData.color || '#7289DA');

    const imageUrl = 'https://i.ibb.co/fdF6BCtV/images.png';
    giveawayEmbed.setThumbnail(imageUrl);

    const enterButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('enter_giveaway')
                .setLabel('🎉 Enter Giveaway 🎉')
                .setStyle(ButtonStyle.Primary),
        );

    const message = await channel.send({ embeds: [giveawayEmbed], components: [enterButton] }).catch(async (err) => {
        console.error(`Failed to send instant giveaway message to ${channel.name}:`, err);
        const host = await client.users.fetch(hostId).catch(() => null);
        if (host) await host.send(`Failed to post your instant giveaway for **${config.prize}** in <#${config.channelId}> due to an error: ${err.message}`).catch(console.error);
        return null;
    });

    if (message) { // Only proceed if the message was sent successfully
        config.messageId = message.id;
        config.messageTimestamp = Date.now();
        config.endTime = endTime;

        activeGiveaways.set(message.id, {
            ...config,
            participants: [],
            claimedWinners: [],
            rolledUsers: [],
            expired: false,
            dmMessageIds: {},
            duration: actualDuration // Store the actual duration used
        });
        saveGiveaways(activeGiveaways, client.giveawaySetups);

        try { // Attempt to delete setup message after starting instant giveaway
            const setupChannel = await client.channels.fetch(config.setupChannelId);
            if (setupChannel && config.setupMessageId) {
                const setupMsg = await setupChannel.messages.fetch(config.setupMessageId).catch(() => null);
                if (setupMsg && setupMsg.deletable) {
                    await setupMsg.delete().catch(console.error);
                }
            }
        } catch (err) {
            console.error('Error deleting setup message:', err);
        }

        const interactionUser = await client.users.fetch(config.hostId);
        if (interactionUser) {
            await interactionUser.send(`Your giveaway for **${prize}** has started in <#${config.channelId}>! It will run for ${formatDurationForInput(actualDuration)}.`);
        }

        if (actualDuration > 0) {
            setTimeout(async () => {
                await endGiveaway(client, message.id).catch(console.error);
            }, actualDuration);
        }
    } else {
        console.error("Failed to send instant giveaway message, aborting giveaway start.");
        const host = await client.users.fetch(config.hostId).catch(() => null);
        if (host) await host.send(`Your instant giveaway for **${config.prize}** could not be posted. Please check bot permissions or try again later.`).catch(console.error);
    }
}

async function handleEnterGiveaway(interaction, activeGiveawaysMap) {
    // Luôn deferReply ephemeral ngay từ đầu để đảm bảo tương tác được phản hồi kịp thời.
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(e => {
            console.error('[handleEnterGiveaway] Failed to deferReply:', e);
            // Nếu không thể defer, không thể phản hồi lại tương tác này nữa, nên thoát.
            return;
        });
    }

    const giveaway = activeGiveawaysMap.get(interaction.message.id);
    let replyContent = '';

    if (!giveaway) {
        replyContent = 'This giveaway is no longer active.';
    } else if (Date.now() > giveaway.endTime) {
        replyContent = 'This giveaway has ended and entries are no longer accepted.';
        if (!giveaway.expired) {
            console.log(`Calling endGiveaway for ${giveaway.message.id} due to late entry attempt.`);
            endGiveaway(interaction.client, giveaway.message.id).catch(console.error);
        }
    } else if (giveaway.participants.includes(interaction.user.id)) {
        replyContent = '✅ You have ALREADY entered this giveaway!';
    } else {
        giveaway.participants.push(interaction.user.id);
        activeGiveawaysMap.set(interaction.message.id, giveaway);
        await saveGiveaways(activeGiveawaysMap, interaction.client.giveawaySetups); // Đảm bảo lưu trạng thái mới nhất
        replyContent = '🎉 You have successfully entered the giveaway!';
    }

    // Luôn sử dụng editReply vì chúng ta đã defer ở đầu hàm.
    await interaction.editReply({ content: replyContent }).catch(e => {
        console.error('[handleEnterGiveaway] Failed to editReply:', e);
    });
}

async function endGiveaway(client, messageId) {
    const giveaway = activeGiveaways.get(messageId);

    if (!giveaway || giveaway.expired) {
        return;
    }

    giveaway.expired = true;
    activeGiveaways.set(messageId, giveaway);
    saveGiveaways(activeGiveaways, client.giveawaySetups);

    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) {
        console.error(`Giveaway channel not found for message ${messageId}. Cannot determine winners.`);
        const hostUser = await client.users.fetch(giveaway.hostId).catch(() => null);
        if (hostUser) await hostUser.send(`The giveaway for **${giveaway.prize}** (${messageId}) could not be fully processed because its channel <#${giveaway.channelId}> was not found or accessible.`).catch(console.error);
        activeGiveaways.delete(messageId);
        saveGiveaways(activeGiveaways, client.giveawaySetups);
        return;
    }

    const message = await channel.messages.fetch(messageId).catch(async (error) => {
        console.error(`Giveaway message not found for ID ${messageId} in channel ${channel.id}:`, error);
        const errorEmbed = new EmbedBuilder()
            .setTitle('🚨 Giveaway Error 🚨')
            .setDescription(`The giveaway message for "**${giveaway.prize}**" could not be found or was deleted. Cannot determine winners.`)
            .setColor('#FF0000')
            .setTimestamp()
            .setFooter({ text: 'Giveaway System' });

        await channel.send({ embeds: [errorEmbed] }).catch(console.error);
        activeGiveaways.delete(messageId);
        saveGiveaways(activeGiveaways, client.giveawaySetups);
        return null;
    });

    if (!message) {
        return;
    }

    let winners = [];
    let remainingParticipants = [...giveaway.participants];

    for (let i = 0; i < giveaway.winnerCount; i++) {
        if (remainingParticipants.length === 0) {
            break;
        }
        const randomIndex = Math.floor(Math.random() * remainingParticipants.length);
        const winnerId = remainingParticipants[randomIndex];
        winners.push(winnerId);
        remainingParticipants.splice(randomIndex, 1);
    }

    giveaway.rolledUsers = [...new Set([...(giveaway.rolledUsers || []), ...winners])];
    activeGiveaways.set(messageId, giveaway);
    saveGiveaways(activeGiveaways, client.giveawaySetups);


    if (winners.length === 0) {
        const noWinnerEmbedData = JSON.parse(JSON.stringify(giveaway.embed));
        if (typeof noWinnerEmbedData.color === 'string' && noWinnerEmbedData.color.startsWith('#')) {
            noWinnerEmbedData.color = parseInt(noWinnerEmbedData.color.slice(1), 16);
        }
        const noWinnerEmbed = new EmbedBuilder(noWinnerEmbedData)
            .setTitle('🎉 Giveaway Ended 🎉')
            .setDescription('No winners! (No one entered or no eligible participants to roll from).')
            .setColor(noWinnerEmbedData.color || '#FF0000');
        noWinnerEmbed.setThumbnail(noWinnerEmbedData.thumbnail || 'https://i.ibb.co/fdF6BCtV/images.png');

        const updatedComponents = message.components.map(row => {
            const newRow = new ActionRowBuilder();
            newRow.addComponents(row.components.map(button => {
                return ButtonBuilder.from(button).setDisabled(true);
            }));
            return newRow;
        });
        await message.edit({ embeds: [noWinnerEmbed], components: updatedComponents }).catch(console.error);
        activeGiveaways.delete(messageId);
        saveGiveaways(activeGiveaways, client.giveawaySetups);
        return;
    }

    const winnerUsernames = [];
    for (const winnerId of winners) {
        const winnerUser = await client.users.fetch(winnerId).catch(() => null);
        if (winnerUser) {
            winnerUsernames.push(`<@${winnerId}>`);
        } else {
            winnerUsernames.push(`(Unknown User: ${winnerId})`);
        }
    }

    const winnerEmbedData = JSON.parse(JSON.stringify(giveaway.embed));
    if (typeof winnerEmbedData.color === 'string' && winnerEmbedData.color.startsWith('#')) {
        winnerEmbedData.color = parseInt(winnerEmbedData.color.slice(1), 16);
    }
    const winnerEmbed = new EmbedBuilder(winnerEmbedData)
        .setTitle('🎉 Giveaway Ended! 🎉')
        .setDescription(`Congratulations to the winners of **${giveaway.prize}**!`)
        .addFields(
            { name: 'Winners', value: winnerUsernames.join(', ') || 'No winners', inline: false }
        )
        .setColor(winnerEmbedData.color || '#00FF00');
    winnerEmbed.setThumbnail(winnerEmbedData.thumbnail || 'https://i.ibb.co/fdF6BCtV/images.png');

    const updatedComponents = message.components.map(row => {
        const newRow = new ActionRowBuilder();
        newRow.addComponents(row.components.map(button => {
            return ButtonBuilder.from(button).setDisabled(true);
        }));
        return newRow;
    });

    await message.edit({ embeds: [winnerEmbed], components: updatedComponents }).catch(console.error);

    await channel.send(`🎉 **GIVEAWAY ENDED!** 🎉 The winner(s) of **${giveaway.prize}** are: ${winnerUsernames.join(', ')}!`).catch(console.error);

    for (const winnerId of winners) {
        if (!giveaway.claimedWinners.includes(winnerId)) {
            await handleWinNotification(client, winnerId, giveaway, giveaway.dmWinner).catch(console.error);
        }
    }
}

async function handleWinNotification(client, winnerId, giveaway, sendViaDM) {
    const winnerUser = await client.users.fetch(winnerId).catch(() => null);
    if (!winnerUser) {
        console.error(`Could not fetch winner user ${winnerId} for win notification. Attempting reroll.`);
        await rerollWinner(client, giveaway, winnerId).catch(console.error);
        return;
    }

    if (!giveaway.rolledUsers) {
        giveaway.rolledUsers = [];
    }

    if (giveaway.claimedWinners.includes(winnerId)) {
        return;
    }

    const claimButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`claim_${giveaway.messageId}_${winnerId}`)
                .setLabel('Claim!')
                .setStyle(ButtonStyle.Success),
        );

    const winNotificationEmbed = new EmbedBuilder()
        .setTitle('🎉 Congratulations! You Won! 🎉')
        .setDescription(`You won the giveaway for **${giveaway.prize}** in <#${giveaway.channelId}>! Click the button below to claim your prize within ${giveaway.claimTime / (60 * 1000)} minutes.`)
        .setColor('#00FF00')
        .setThumbnail('https://i.ibb.co/fdF6BCtV/images.png')
        .setTimestamp();

    try {
        let notificationMessage = null;
        let targetChannelForNotification = null;

        if (sendViaDM) {
            targetChannelForNotification = await winnerUser.createDM().catch(err => {
                console.warn(`Could not create DM for winner ${winnerUser.tag}: ${err.message}. Attempting to send in public channel.`);
                return null;
            });
            if (targetChannelForNotification) {
                 notificationMessage = await winnerUser.send({
                    content: `<@${winnerId}>`,
                    components: [claimButton],
                    embeds: [winNotificationEmbed]
                }).catch(async (err) => {
                    console.error(`Error sending DM win notification to ${winnerUser.tag}: ${err.message}. Attempting to send in public channel.`);
                    targetChannelForNotification = await client.channels.fetch(giveaway.channelId).catch(() => null);
                    if (targetChannelForNotification && targetChannelForNotification.isTextBased()) {
                        notificationMessage = await targetChannelForNotification.send({
                            content: `<@${winnerId}>`,
                            components: [claimButton],
                            embeds: [winNotificationEmbed]
                        }).catch(console.error);
                        console.log(`Sent fallback in-channel win notification to ${winnerUser.tag} for giveaway ${giveaway.messageId}`);
                    } else {
                        console.error(`Failed to send win notification for ${winnerUser.tag} (both DM and public channel failed or inaccessible).`);
                        notificationMessage = null;
                    }
                });
                if (notificationMessage) console.log(`Sent DM win notification to ${winnerUser.tag} for giveaway ${giveaway.messageId}`);
            }
        }
        
        // If sendViaDM was false, or if DM fallback happened and failed, send in the public channel
        if (!sendViaDM || !notificationMessage) {
            targetChannelForNotification = await client.channels.fetch(giveaway.channelId).catch(() => null);
            if (!targetChannelForNotification || !targetChannelForNotification.isTextBased()) {
                console.error(`Channel ${giveaway.channelId} not found or not text-based for in-channel notification.`);
                notificationMessage = null;
            } else {
                notificationMessage = await targetChannelForNotification.send({
                    content: `<@${winnerId}>`,
                    components: [claimButton],
                    embeds: [winNotificationEmbed]
                }).catch(console.error);
                if (notificationMessage) console.log(`Sent in-channel win notification to ${winnerUser.tag} for giveaway ${giveaway.messageId}`);
            }
        }

        if (notificationMessage) {
            if (!giveaway.dmMessageIds) {
                giveaway.dmMessageIds = {};
            }
            giveaway.dmMessageIds[winnerId] = notificationMessage.id;
            activeGiveaways.set(giveaway.messageId, giveaway);
            saveGiveaways(activeGiveaways, client.giveawaySetups);

            setTimeout(async () => {
                const currentGiveaway = activeGiveaways.get(giveaway.messageId);
                if (currentGiveaway && !currentGiveaway.claimedWinners.includes(winnerId)) {
                    console.log(`Winner ${winnerId} for giveaway ${giveaway.messageId} did not claim prize in time. Initiating reroll.`);

                    const failedEmbed = new EmbedBuilder()
                        .setTitle('⏰ Time Expired! ⏰')
                        .setDescription(`Unfortunately, <@${winnerId}> did not claim their prize for **${giveaway.prize}** in time. The prize has been rerolled!`)
                        .setColor('#FF5733')
                        .setThumbnail('https://i.ibb.co/fdF6BCtV/images.png')
                        .setTimestamp();

                    try {
                        let messageToUpdateExpired = null;
                        let channelToFetch = null;

                        if (sendViaDM) {
                            const dmChannel = await winnerUser.createDM().catch(() => null);
                            if (dmChannel && currentGiveaway.dmMessageIds[winnerId]) {
                                channelToFetch = dmChannel;
                            }
                        } else {
                            channelToFetch = await client.channels.fetch(giveaway.channelId).catch(() => null);
                        }

                        if (channelToFetch && currentGiveaway.dmMessageIds[winnerId]) {
                            messageToUpdateExpired = await channelToFetch.messages.fetch(currentGiveaway.dmMessageIds[winnerId]).catch(() => null);
                        }

                        if (messageToUpdateExpired && messageToUpdateExpired.editable) {
                            await messageToUpdateExpired.edit({ embeds: [failedEmbed], components: [] }).catch(console.error);
                            console.log(`Updated expired claim message for ${winnerUser.tag} in ${sendViaDM ? 'DM' : 'channel'}.`);
                        } else {
                            console.warn(`Could not find or edit original claim notification message for ${winnerUser.tag}. Sending new one.`);
                            if (sendViaDM) {
                                await winnerUser.send({ embeds: [failedEmbed] }).catch(console.error);
                            } else if (channelToFetch) {
                                await channelToFetch.send({ content: `<@${winnerId}>`, embeds: [failedEmbed] }).catch(console.error);
                            }
                        }

                        const hostUser = await client.users.fetch(giveaway.hostId).catch(() => null);
                        if (hostUser) {
                            await hostUser.send({
                                content: `<@${giveaway.hostId}>, a winner for **${giveaway.prize}** (<@${winnerId}>) did not claim in time. A reroll has been initiated.`,
                                embeds: [failedEmbed]
                            }).catch(err => console.error(`Error sending expired claim DM to host ${hostUser.tag}:`, err));
                            console.log(`Sent expired claim notification to host ${hostUser.tag}.`);
                        }

                    } catch (err) {
                        console.error(`Error processing expired claim for ${winnerId} (during message update/send):`, err);
                    }

                    await rerollWinner(client, currentGiveaway, winnerId).catch(console.error);
                }
            }, giveaway.claimTime);

        } else {
            console.error(`Failed to send win notification to ${winnerId} for giveaway ${giveaway.messageId}. No message object was returned.`);
            await rerollWinner(client, giveaway, winnerId).catch(console.error);
        }

    } catch (error) {
        console.error(`Error sending win notification to ${winnerId} (DM: ${sendViaDM}) for giveaway ${giveaway.messageId}:`, error);
        await rerollWinner(client, giveaway, winnerId).catch(console.error);
    }
}


async function handleClaimPrize(interaction, activeGiveawaysMap) {
    const parts = interaction.customId.split('_');
    if (parts.length < 3 || parts[0] !== 'claim') {
        console.error(`Invalid customId format for claim button: ${interaction.customId}`);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Invalid claim request. Please try again or contact support.', ephemeral: true }).catch(console.error);
        } else {
            await interaction.followUp({ content: 'Invalid claim request. Please try again or contact support.', ephemeral: true }).catch(console.error);
        }
        return;
    }
    const messageId = parts[1];
    const winnerId = parts[2];

    // Defer the interaction. Ephemeral replies are not allowed in DMs
    if (!interaction.deferred && !interaction.replied) {
        const deferOptions = interaction.guild ? { ephemeral: true } : {};
        await interaction.deferReply(deferOptions).catch(e => {
            console.error('[handleClaimPrize] Failed to deferReply:', e);
        });
    }

    const giveaway = activeGiveawaysMap.get(messageId);
    let replyMessageContent = '';
    let dmSentSuccessfully = false;

    if (!giveaway) {
        console.warn(`Giveaway with message ID ${messageId} not found in activeGiveaways during claim attempt by ${winnerId}.`);
        replyMessageContent = 'This giveaway is no longer active or the prize has already been claimed/expired. If you believe this is an error, please contact the host.';
    } else if (interaction.user.id !== winnerId) {
        replyMessageContent = 'You are not the winner of this prize!';
    } else if (giveaway.claimedWinners.includes(winnerId)) {
        replyMessageContent = 'You have already claimed this prize!';
    } else {
        // Add winner to claimed list
        giveaway.claimedWinners.push(winnerId);
        activeGiveawaysMap.set(messageId, giveaway);
        await saveGiveaways(activeGiveawaysMap, interaction.client.giveawaySetups);

        try {
            if (giveaway.dmMessageIds && giveaway.dmMessageIds[winnerId]) {
                const messageIdToDelete = giveaway.dmMessageIds[winnerId];
                let targetChannelForDeletion;

                if (giveaway.dmWinner) {
                    const user = await interaction.client.users.fetch(winnerId).catch(() => null);
                    if (user) targetChannelForDeletion = await user.createDM().catch(() => null);
                } else {
                    targetChannelForDeletion = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
                }

                if (targetChannelForDeletion) {
                    const oldMessage = await targetChannelForDeletion.messages.fetch(messageIdToDelete).catch(() => null);
                    if (oldMessage && oldMessage.deletable) {
                        await oldMessage.delete().catch(console.error);
                        console.log(`Deleted old claim notification message ${messageIdToDelete} for winner ${winnerId}.`);
                    } else {
                        console.warn(`Original claim notification message ${messageIdToDelete} for winner ${winnerId} not found or not deletable.`);
                    }
                } else {
                    console.warn(`Target channel for deletion for winner ${winnerId} not found.`);
                }
            } else {
                console.warn(`Claim notification message ID not found for winner ${winnerId} in giveaway ${messageId}. Cannot delete original.`);
            }
        } catch (err) {
            console.error(`Error deleting old claim notification message for ${winnerId}:`, err);
        }

        const claimedEmbed = new EmbedBuilder()
            .setTitle('✅ Prize Claimed! ✅')
            .setDescription(`You have successfully claimed your prize for **${giveaway.prize}**! The host has been notified.`)
            .setColor('#00FF00')
            .setThumbnail('https://i.ibb.co/fdF6BCtV/images.png')
            .setTimestamp();

        try {
            await interaction.user.send({ embeds: [claimedEmbed] });
            dmSentSuccessfully = true;
            replyMessageContent = '🎉 You have successfully claimed your prize! Check your DMs for confirmation.';
        } catch (err) {
            console.error(`Could not send claimed DM to ${winnerId}:`, err);
            replyMessageContent = '🎉 You have successfully claimed your prize! (Could not send DM confirmation, but the host is notified).';
        }

        const publicNotificationChannel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
        if (publicNotificationChannel && publicNotificationChannel.isTextBased()) {
            await publicNotificationChannel.send(`<@${winnerId}> has claimed the giveaway for **${giveaway.prize}**!`).catch(console.error);
        } else {
            const hostUser = await interaction.client.users.fetch(giveaway.hostId).catch(() => null);
            if (hostUser) {
                await hostUser.send(`<@${winnerId}> has claimed their prize for **${giveaway.prize}**!`).catch(console.error);
            }
        }
    }

    // Always use editReply as we deferred at the start.
    await interaction.editReply({ content: replyMessageContent }).catch(e => {
        console.error('[handleClaimPrize] Failed to editReply for final response:', e);
    });

    // Update the original giveaway message to reflect claimed winners
    if (giveaway && replyMessageContent.startsWith('🎉')) {
        const originalGiveawayChannel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
        if (originalGiveawayChannel && originalGiveawayChannel.isTextBased()) {
            try {
                const giveawayMessage = await originalGiveawayChannel.messages.fetch(giveaway.messageId).catch(() => null);
                if (giveawayMessage) {
                    const updatedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0]);
                    const winnerField = updatedEmbed.data.fields?.find(f => f.name.toLowerCase().includes('winner'));
                    if (winnerField) {
                        // Ensure it's the correct field and update it
                        winnerField.value = giveaway.rolledUsers.map(id => {
                            if (giveaway.claimedWinners.includes(id)) {
                                return `<@${id}> (Claimed)`;
                            } else {
                                return `<@${id}> (Unclaimed)`;
                            }
                        }).join('\n') || 'No winners yet';
                    } else {
                        updatedEmbed.addFields({ name: '🏆 Winners', value: giveaway.claimedWinners.map(id => `<@${id}> (Claimed)`).join('\n') });
                    }
                    updatedEmbed.setThumbnail(updatedEmbed.data.thumbnail?.url || 'https://i.ibb.co/fdF6BCtV/images.png'); // Ensure thumbnail stays
                    await giveawayMessage.edit({ embeds: [updatedEmbed], components: giveawayMessage.components }).catch(console.error);
                }
            } catch (e) {
                console.error(`[handleClaimPrize] Error updating original giveaway message ${giveaway.messageId}:`, e);
            }
        }
    }
}

async function rerollWinner(client, giveaway, failedWinnerId) {
    giveaway.participants = giveaway.participants.filter(id => id !== failedWinnerId);

    const eligibleParticipants = giveaway.participants.filter(id => !giveaway.claimedWinners.includes(id) && !giveaway.rolledUsers.includes(id));

    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) {
        console.error(`Giveaway channel not found for reroll for giveaway ${giveaway.messageId}.`);
        activeGiveaways.delete(giveaway.messageId);
        saveGiveaways(activeGiveaways, client.giveawaySetups);
        return;
    }

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);

    if (eligibleParticipants.length === 0) {
        console.log(`No more eligible participants for reroll for giveaway ${giveaway.messageId}.`);
        if (message && message.editable) {
            const noMoreWinnersEmbedData = JSON.parse(JSON.stringify(giveaway.embed));
            if (typeof noMoreWinnersEmbedData.color === 'string' && noMoreWinnersEmbedData.color.startsWith('#')) {
                noMoreWinnersEmbedData.color = parseInt(noMoreWinnersEmbedData.color.slice(1), 16);
            }
            const noMoreWinnersEmbed = new EmbedBuilder(noMoreWinnersEmbedData)
                .setTitle('🎉 Giveaway Ended 🎉')
                .setDescription('No more eligible participants for this prize. (All claimed or no one left to reroll).')
                .setColor(noMoreWinnersEmbedData.color || '#FF0000');
            noMoreWinnersEmbed.setThumbnail(noMoreWinnersEmbedData.thumbnail || 'https://i.ibb.co/fdF6BCtV/images.png');

            const updatedComponents = message.components.map(row => {
                const newRow = new ActionRowBuilder();
                newRow.addComponents(row.components.map(button => {
                    return ButtonBuilder.from(button).setDisabled(true);
                }));
                return newRow;
            });
            await message.edit({ embeds: [noMoreWinnersEmbed], components: updatedComponents }).catch(console.error);
        } else {
            const errorEmbed = new EmbedBuilder()
                .setTitle('🚨 Reroll Error 🚨')
                .setDescription(`The original giveaway message for "**${giveaway.prize}**" was deleted or uneditable. No more eligible participants to reroll.`)
                .setColor('#FF0000')
                .setTimestamp()
                .setFooter({ text: 'Giveaway System' });
            await channel.send({ embeds: [errorEmbed] }).catch(console.error);
        }
        activeGiveaways.delete(giveaway.messageId);
        saveGiveaways(activeGiveaways, client.giveawaySetups);
        return;
    }

    const randomIndex = Math.floor(Math.random() * eligibleParticipants.length);
    const newWinnerId = eligibleParticipants[randomIndex];

    giveaway.rolledUsers.push(newWinnerId);
    activeGiveaways.set(giveaway.messageId, giveaway);
    saveGiveaways(activeGiveaways, client.giveawaySetups);

    const newWinnerUser = await client.users.fetch(newWinnerId).catch(() => null);
    const newWinnerMention = newWinnerUser ? `<@${newWinnerId}>` : `(Unknown User: ${newWinnerId})`;

    await channel.send(`🔄 Reroll for **${giveaway.prize}**! The new winner is ${newWinnerMention}!`).catch(console.error);

    if (message && message.editable) {
        const currentEmbed = new EmbedBuilder(message.embeds[0].toJSON());
        const winnerNames = [];
        for (const id of giveaway.rolledUsers) {
            const user = await client.users.fetch(id).catch(() => null);
            if (user) {
                if (giveaway.claimedWinners.includes(id)) {
                    winnerNames.push(`<@${id}> (Claimed)`);
                } else {
                    winnerNames.push(`<@${id}> (Unclaimed)`);
                }
            }
        }

        const winnersField = currentEmbed.data.fields.find(field => field.name === 'Winners');
        if (winnersField) {
            winnersField.value = winnerNames.join(', ') || 'No winners yet';
        } else {
            currentEmbed.addFields({ name: 'Winners', value: winnerNames.join(', ') || 'No winners yet', inline: false });
        }
        currentEmbed.setThumbnail(currentEmbed.data.thumbnail?.url || 'https://i.ibb.co/fdF6BCtV/images.png');
        await message.edit({ embeds: [currentEmbed] }).catch(console.error);
    } else {
        console.warn(`Original giveaway message ${giveaway.messageId} not found or not editable during reroll.`);
        const errorEmbed = new EmbedBuilder()
            .setTitle('🚨 Reroll Update Error 🚨')
            .setDescription(`The original giveaway message for "**${giveaway.prize}**" was deleted or uneditable. New winner is <@${newWinnerId}>.`)
            .setColor('#FF0000')
            .setTimestamp()
            .setFooter({ text: 'Giveaway System' });
        await channel.send({ embeds: [errorEmbed] }).catch(console.error);
    }

    await handleWinNotification(client, newWinnerId, giveaway, giveaway.dmWinner).catch(console.error);
}


module.exports = {
    handleGiveawaySetupInteraction,
    handleEnterGiveaway,
    handleClaimPrize,
    activeGiveaways,
    endGiveaway,
    sendSetupChannelMessage,
    startInstantGiveaway
};