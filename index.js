// index.js
const {
    Client, GatewayIntentBits, Collection, EmbedBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, AttachmentBuilder, MessageFlags, PermissionsBitField, ActivityType
} = require('discord.js');
const dotenv = require('dotenv');
const { LevelingSystem } = require('./levelSystem');
const { postOrUpdateLeaderboard, formatLeaderboardEmbed, LEADERBOARD_LIMIT } = require('./leaderboardManager');

dotenv.config();
const fs = require('fs').promises;
const path = require('path');

// --- Configuration ---
const STAFF_ROLE_IDS = process.env.STAFF_ROLE_IDS ? process.env.STAFF_ROLE_IDS.split(',').map(id => id.trim()) : [];
const LEVEL_UP_CHANNEL_ID = process.env.LEVEL_UP_CHANNEL_ID;
const XP_PER_MESSAGE = parseInt(process.env.XP_PER_MESSAGE) || 1;
const XP_COOLDOWN_SECONDS = parseInt(process.env.XP_COOLDOWN_SECONDS) || 1;
const DEFAULT_REPLY_DELETE_TIMEOUT = 15000;

const DEFAULT_LEADERBOARD_GUILD_ID = process.env.LEADERBOARD_GUILD_ID;
const DEFAULT_LEADERBOARD_CHANNEL_ID = process.env.LEADERBOARD_CHANNEL_ID;

// --- Animated Emoji Definitions (General Purpose) ---
const ANIMATED_SPARKLE_EMOJI = process.env.ANIMATED_SPARKLE_EMOJI || ''; // Add your actual emoji string or leave empty
const ANIMATED_LOADING_EMOJI = process.env.ANIMATED_LOADING_EMOJI || ''; // Add your actual emoji string or leave empty

// --- Level-specific Image URLs (Interpreted as ranges) ---
// IMPORTANT: Ensure these are DIRECT image links (e.g., ending in .png, .gif)
// The image for a level X will be used for levels X up to (but not including) the next defined level.
const LEVEL_IMAGE_URLS_FROM_USER = {
    0: 'https://i.ibb.co/5Xj0kTRZ/nh1.png',    // For levels 0, 1, 2
    3: 'https://i.ibb.co/vxmSBV42/nh2.png',   // For levels 3, 4, 5
    6: 'https://i.ibb.co/Xr22hscJ/nh4.png',   // For levels 6, 7, 8, 9
    10: 'https://i.ibb.co/PZ0GtxBt/nh5.png',  // For levels 10, 11, 12, 13, 14
    15: 'https://i.ibb.co/ZwtTDQx/nh6.png',  // For levels 15, 16, 17, 18, 19
    20: 'https://i.ibb.co/8gJKD6xx/nh7.png', // For levels 20+
    default: null // Fallback if no other image is suitable
};

// Helper function to get the appropriate image URL for a given level based on ranges
function getImageUrlForLevel(level) {
    // Get sorted list of defined levels (numeric keys only) in descending order
    const sortedDefinedLevels = Object.keys(LEVEL_IMAGE_URLS_FROM_USER)
        .map(k => parseInt(k))
        .filter(k => !isNaN(k) && LEVEL_IMAGE_URLS_FROM_USER.hasOwnProperty(k.toString())) // Ensure key is numeric and exists
        .sort((a, b) => b - a); // Sort from highest to lowest (e.g., 20, 15, 10, 6, 3, 0)

    // Find the highest defined level that the current level is greater than or equal to
    for (const definedLevel of sortedDefinedLevels) {
        if (level >= definedLevel) {
            return LEVEL_IMAGE_URLS_FROM_USER[definedLevel.toString()]; // Use toString() to access original key
        }
    }
    // If no specific range matches (e.g., level is lower than all defined keys, though unlikely with '0'), use default
    return LEVEL_IMAGE_URLS_FROM_USER.default;
}


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.levelSystem = new LevelingSystem();
client.commands = new Collection();
let embedBuildingSessions = new Map();

// --- Helper Functions for Replies ---
async function replyAndScheduleDelete(interaction, options, timeout = DEFAULT_REPLY_DELETE_TIMEOUT) {
    try {
        if (!interaction.isRepliable()) return null;
        let message;
        const isEphemeral = options.flags && options.flags.includes(MessageFlags.Ephemeral);

        if (interaction.replied || interaction.deferred) {
            message = await interaction.followUp(options).catch(e => { console.error(`[Helper] FollowUp Error for ${interaction.commandName || interaction.customId} (${interaction.id}): ${e.message}`); return null; });
        } else {
            message = await interaction.reply(options).catch(e => { console.error(`[Helper] Reply Error for ${interaction.commandName || interaction.customId} (${interaction.id}): ${e.message}`); return null; });
        }

        if (message) {
            setTimeout(async () => {
                try {
                    if (isEphemeral) {
                        await interaction.deleteReply().catch(() => { /* silent */ });
                    } else if (message.deletable) {
                        await message.delete().catch(() => { /* silent */ });
                    }
                } catch (e) {
                    console.warn(`[Helper] Error during scheduled delete for ${interaction.id}: ${e.message}`);
                }
            }, timeout);
        }
        return message;
    } catch (error) {
        console.error(`[Helper] General Reply/Delete Error for ${interaction.commandName || interaction.customId} (${interaction.id}): ${error.message}`);
        return null;
    }
}

async function editReplyAndScheduleDelete(interaction, options, deleteAfter = true, timeout = DEFAULT_REPLY_DELETE_TIMEOUT) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            console.warn(`[Helper] EditReply called on non-deferred/replied interaction ${interaction.commandName || interaction.customId} (${interaction.id}). Attempting new reply.`);
            return deleteAfter ? replyAndScheduleDelete(interaction, options, timeout) : interaction.reply(options).catch(e => console.error(`[Helper] Fallback Reply Error: ${e.message}`));
        }
        const message = await interaction.editReply(options).catch(e => { console.error(`[Helper] EditReply Error for ${interaction.commandName || interaction.customId} (${interaction.id}): ${e.message}`); return null; });

        if (deleteAfter && message) {
            const isIntendedEphemeral = options.flags && options.flags.includes(MessageFlags.Ephemeral);
            setTimeout(async () => {
                try {
                    // If the interaction was originally ephemeral or intended to be, use deleteReply
                    if (isIntendedEphemeral || interaction.ephemeral) {
                         await interaction.deleteReply().catch(() => { /* silent */ });
                    } else if (message.deletable) { // Otherwise, try to delete the message object
                        await message.delete().catch(() => { /* silent */ });
                    }
                } catch (e) {
                    console.warn(`[Helper] Error during scheduled delete for edited reply ${interaction.id}: ${e.message}`);
                }
            }, timeout);
        }
        return message;
    } catch (error) {
        console.error(`[Helper] General Edit/Delete Error for ${interaction.commandName || interaction.customId} (${interaction.id}): ${error.message}`);
        return null;
    }
}
// --- End Helper Functions ---

// --- Daily Leaderboard Scheduler ---
function scheduleDailyLeaderboardUpdate(clientInstance) {
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const updateTask = async () => {
        console.log('[Scheduler] Running daily leaderboard update task...');
        clientInstance.guilds.cache.forEach(async (guild) => {
            const settings = clientInstance.levelSystem.getGuildSettings(guild.id);
            if (settings && settings.leaderboardChannelId) {
                console.log(`[Scheduler] Updating leaderboard for guild ${guild.name} (${guild.id}) in channel ${settings.leaderboardChannelId}`);
                await postOrUpdateLeaderboard(clientInstance, guild.id);
            } else if (guild.id === DEFAULT_LEADERBOARD_GUILD_ID && DEFAULT_LEADERBOARD_CHANNEL_ID) {
                console.log(`[Scheduler] Updating leaderboard for default guild ${guild.name} (${guild.id}) using .env channel ${DEFAULT_LEADERBOARD_CHANNEL_ID} (DB setting not found).`);
                clientInstance.levelSystem.setGuildSettings(guild.id, { leaderboardChannelId: DEFAULT_LEADERBOARD_CHANNEL_ID }); // Store it for next time
                await postOrUpdateLeaderboard(clientInstance, guild.id);
            }
        });
    };

    const now = new Date();
    const desiredUpdateTime = new Date(now);
    const desiredHour = 3; // Example: 3 AM
    const desiredMinute = 0;

    if (now.getHours() > desiredHour || (now.getHours() === desiredHour && now.getMinutes() >= desiredMinute)) {
        desiredUpdateTime.setDate(desiredUpdateTime.getDate() + 1);
    }
    desiredUpdateTime.setHours(desiredHour, desiredMinute, 0, 0);

    const initialDelay = desiredUpdateTime.getTime() - now.getTime();
    console.log(`[Scheduler] Next daily leaderboard update scheduled for: ${desiredUpdateTime.toLocaleString()} (local time). Initial delay: ${Math.round(initialDelay / 1000 / 60)} minutes.`);

    setTimeout(() => {
        updateTask();
        setInterval(updateTask, twentyFourHours);
    }, initialDelay > 0 ? initialDelay : 0);
}

client.once('ready', c => {
    console.log(`Logged in as ${c.user.tag}! Bot is ready at ${new Date().toISOString()}.`);
    client.user.setActivity('levels & leaderboards!', { type: ActivityType.Watching });

    embedBuildingSessions = client.levelSystem.loadAllEmbedSessions();
    console.log(`[EmbedSessions] Loaded ${embedBuildingSessions.size} embed building sessions from database.`);

    const sevenDaysAgoTimestamp = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    try {
        if (client.levelSystem.db) {
            const result = client.levelSystem.db.prepare('DELETE FROM embed_sessions WHERE createdAt < ?').run(sevenDaysAgoTimestamp);
            if (result.changes > 0) console.log(`[EmbedSessions] Cleaned up ${result.changes} old embed sessions from DB.`);
        } else console.warn("[EmbedSessions] levelSystem.db not accessible for startup cleanup.");
    } catch (e) { console.error("[EmbedSessions] Error cleaning up old embed sessions during startup:", e); }

    scheduleDailyLeaderboardUpdate(client);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const cooldownKey = `xp-${message.author.id}-${message.guild.id}`;
    if (client.levelSystem.xpCooldowns.has(cooldownKey)) {
        if (Date.now() - client.levelSystem.xpCooldowns.get(cooldownKey) < XP_COOLDOWN_SECONDS * 1000) return;
    }
    client.levelSystem.xpCooldowns.set(cooldownKey, Date.now());
    try {
        const leveledUpNewLevel = await client.levelSystem.addXP(message.author.id, message.guild.id, XP_PER_MESSAGE, message.member);
        if (leveledUpNewLevel !== null) {
            const botMember = message.guild.members.me;
            if (!botMember) { console.error(`[LevelUp] Bot member not found in guild ${message.guild.name}.`); return; }

            // Use the helper function to get the image URL for the new level
            const levelUpImageURL = getImageUrlForLevel(leveledUpNewLevel) || message.author.displayAvatarURL({ dynamic: true });

            const levelUpEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('<:levelup:1373261581126860910> Level Up! 🎉')
                .setDescription(`<a:sparkly:1373275364230697061> Congratulations ${message.author}! You've advanced to **Level ${leveledUpNewLevel}**!`)
                .setThumbnail(levelUpImageURL) // Use the determined image URL
                .setTimestamp()
                .setFooter({ text: `Leveled up in: ${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true }) });

            let messageSent = false;
            const guildSettings = client.levelSystem.getGuildSettings(message.guild.id);
            const levelUpChannelId = LEVEL_UP_CHANNEL_ID || (guildSettings && guildSettings.levelUpChannelId);
            const targetChannel = levelUpChannelId ? message.guild.channels.cache.get(levelUpChannelId) : message.channel;

            if (targetChannel && targetChannel.isTextBased()) {
                const permissionsInTarget = targetChannel.permissionsFor(botMember);
                if (permissionsInTarget && permissionsInTarget.has(PermissionsBitField.Flags.SendMessages) && permissionsInTarget.has(PermissionsBitField.Flags.EmbedLinks)) {
                    try { await targetChannel.send({ embeds: [levelUpEmbed] }); messageSent = true; }
                    catch (err) { console.error(`[LevelUp] Failed to send to targetChannel ${targetChannel.id}:`, err.message); }
                }
            }
            if (!messageSent && targetChannel !== message.channel && message.channel.isTextBased()) {
                const permissionsInCurrent = message.channel.permissionsFor(botMember);
                if (permissionsInCurrent && permissionsInCurrent.has(PermissionsBitField.Flags.SendMessages) && permissionsInCurrent.has(PermissionsBitField.Flags.EmbedLinks)) {
                    try { await message.channel.send({ embeds: [levelUpEmbed] }); }
                    catch (err) { console.error(`[LevelUp] Failed to send to message.channel (fallback) ${message.channel.id}:`, err.message); }
                }
            }
        }
    } catch (error) {
        console.error('[XP System] Error in messageCreate:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.guild) {
        if (interaction.isRepliable()) {
            await replyAndScheduleDelete(interaction, { content: "Sorry, I can only work inside servers (guilds).", flags: [MessageFlags.Ephemeral] });
        }
        return;
    }

    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // --- Staff/Admin Commands ---
        if (commandName === 'add-xp') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !STAFF_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
                return replyAndScheduleDelete(interaction, { content: "<:admin:1373279857798025296> You don't have permission to use this command.", flags: [MessageFlags.Ephemeral] });
            }
            try {
                const targetUser = interaction.options.getUser('user');
                const amount = interaction.options.getInteger('amount');
                const member = interaction.guild.members.cache.get(targetUser.id);
                const result = await client.levelSystem.addXPManually(targetUser.id, interaction.guild.id, amount, member);
                await replyAndScheduleDelete(interaction, { content: `✅ ${amount >= 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} XP ${amount >= 0 ? 'to' : 'from'} ${targetUser}.\nNew XP: ${result.newXP} (Level ${result.level})`, flags: [MessageFlags.Ephemeral] });
            } catch (error) { console.error('[Cmd add-xp] Error:', error); await replyAndScheduleDelete(interaction, { content: 'Error executing add-xp command!', flags: [MessageFlags.Ephemeral] }); }
        }
        else if (commandName === 'add-level') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !STAFF_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
                return replyAndScheduleDelete(interaction, { content: "<:admin:1373279857798025296> You don't have permission to use this command.", flags: [MessageFlags.Ephemeral] });
            }
            try {
                const targetUser = interaction.options.getUser('user');
                const amount = interaction.options.getInteger('amount');
                const member = interaction.guild.members.cache.get(targetUser.id);
                const result = await client.levelSystem.addLevelManually(targetUser.id, interaction.guild.id, amount, member);
                await replyAndScheduleDelete(interaction, { content: `✅ ${amount >= 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} level(s) ${amount >= 0 ? 'to' : 'from'} ${targetUser}.\nNew Level: ${result.newLevel}`, flags: [MessageFlags.Ephemeral] });
            } catch (error) { console.error('[Cmd add-level] Error:', error); await replyAndScheduleDelete(interaction, { content: 'Error executing add-level command!', flags: [MessageFlags.Ephemeral] }); }
        }
        else if (commandName === 'set-level') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !STAFF_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
                return replyAndScheduleDelete(interaction, { content: "<:admin:1373279857798025296> You don't have permission to use this command.", flags: [MessageFlags.Ephemeral] });
            }
            try {
                const targetUser = interaction.options.getUser('user');
                const levelValue = interaction.options.getInteger('level');
                const member = interaction.guild.members.cache.get(targetUser.id);
                const result = await client.levelSystem.setLevel(targetUser.id, interaction.guild.id, levelValue, member);
                await replyAndScheduleDelete(interaction, { content: `✅ Set ${targetUser}'s level to ${result.newLevel} (XP reset to 0).`, flags: [MessageFlags.Ephemeral] });
            } catch (error) { console.error('[Cmd set-level] Error:', error); await replyAndScheduleDelete(interaction, { content: 'Error executing set-level command!', flags: [MessageFlags.Ephemeral] }); }
        }
        else if (commandName === 'backup-database') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !STAFF_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
                return replyAndScheduleDelete(interaction, { content: '<:admin:1373279857798025296> You do not have permission for this command.', flags: [MessageFlags.Ephemeral] });
            }
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const src = path.join(__dirname, 'database.db');
            const now = new Date();
            const ts = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
            const bakFile = `database_backup_${ts}.db`;
            const tmpPath = path.join(__dirname, bakFile);
            try {
                await fs.access(src);
                await fs.copyFile(src, tmpPath);
                const attachment = new AttachmentBuilder(tmpPath);
                let sentDM = false;
                try {
                    await interaction.user.send({ content: `📦 Database Backup for ${interaction.guild.name} (${now.toLocaleString()})\nFilename: \`${bakFile}\``, files: [attachment] });
                    sentDM = true;
                    await editReplyAndScheduleDelete(interaction, { content: '✅ Backup of the database has been sent to your DMs!' });
                } catch (dmErr) {
                    console.warn(`[Backup] Failed to DM backup to ${interaction.user.tag}: ${dmErr.message}`);
                    await editReplyAndScheduleDelete(interaction, { content: '⚠️ Could not send backup to your DMs. It is attached here instead.', files: [attachment] });
                }
                await fs.unlink(tmpPath);
                console.log(`[Backup] Database backup ${bakFile} sent to ${interaction.user.tag}. Temp file deleted.`);
            } catch (err) {
                console.error('[Cmd backup-database] Error:', err);
                if (tmpPath) try { await fs.unlink(tmpPath); } catch (e) { /* ignore */ }
                await editReplyAndScheduleDelete(interaction, { content: '❌ An error occurred during the database backup process.' });
            }
        }
        else if (commandName === 'createembed') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !STAFF_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
                 return replyAndScheduleDelete(interaction, { content: '<:admin:1373279857798025296> You do not have permission to use this command.', flags: [MessageFlags.Ephemeral] });
            }
            try {
                const targetChannelOpt = interaction.options.getChannel('channel');
                const roleToMentionOpt = interaction.options.getRole('mention_role');

                if (!targetChannelOpt || targetChannelOpt.type !== ChannelType.GuildText) {
                    return replyAndScheduleDelete(interaction, { content: 'Invalid text channel selected.', flags: [MessageFlags.Ephemeral] });
                }
                const botMember = interaction.guild.members.me;
                if (!botMember) return replyAndScheduleDelete(interaction, { content: "Error: Could not verify my own permissions.", flags: [MessageFlags.Ephemeral] });

                const permsInChannel = targetChannelOpt.permissionsFor(botMember);
                if (!permsInChannel || !permsInChannel.has(PermissionsBitField.Flags.SendMessages) || !permsInChannel.has(PermissionsBitField.Flags.EmbedLinks)) {
                    return replyAndScheduleDelete(interaction, { content: `I need "Send Messages" & "Embed Links" permissions in ${targetChannelOpt} to proceed.`, flags: [MessageFlags.Ephemeral] });
                }

                const sessionId = `embed_${interaction.user.id}_${Date.now()}`;
                const sessionData = {
                    userId: interaction.user.id, guildId: interaction.guild.id, targetChannelId: targetChannelOpt.id,
                    roleToMentionId: roleToMentionOpt ? roleToMentionOpt.id : null,
                    embedData: { title: null, description: null, color: 0x555555, footerText: null, thumbnailUrl: null, imageUrl: null, fields: [], timestamp: true },
                    builderMessageId: null
                };

                if (!client.levelSystem.saveEmbedSession(sessionId, sessionData)) {
                    embedBuildingSessions.delete(sessionId);
                    return replyAndScheduleDelete(interaction, { content: '❌ Failed to save embed session to DB.', flags: [MessageFlags.Ephemeral] });
                }
                embedBuildingSessions.set(sessionId, sessionData);

                const previewEmbed = buildSessionPreviewEmbed(sessionData);
                const components = getSessionBuilderComponents(sessionId);

                // Initial panel - NOT auto-deleted
                await interaction.reply({
                    content: `🛠️ Embed Builder for ${targetChannelOpt}${roleToMentionOpt ? ` (mentioning ${roleToMentionOpt})` : ''}\nConfigure using buttons.`,
                    embeds: [previewEmbed], components: components, flags: [MessageFlags.Ephemeral]
                });

                const builderMessage = await interaction.fetchReply();
                sessionData.builderMessageId = builderMessage.id;

                if (!client.levelSystem.updateEmbedSession(sessionId, { builderMessageId: builderMessage.id })) {
                    console.error(`[CreateEmbed] CRITICAL: Failed to update builderMessageId in DB for ${sessionId}.`);
                    embedBuildingSessions.delete(sessionId); client.levelSystem.deleteEmbedSession(sessionId);
                    await editReplyAndScheduleDelete(interaction, {
                        content: "🚨 Error: Could not save session details. Builder cancelled.", embeds: [], components: []
                    }); // This error message WILL be auto-deleted
                    return;
                }
                embedBuildingSessions.set(sessionId, sessionData);
                console.log(`[CreateEmbed] Builder panel created for session ${sessionId}, ID: ${builderMessage.id}`);
            } catch (error) {
                console.error('[Cmd CreateEmbed] General Error:', error);
                await replyAndScheduleDelete(interaction, { content: 'Unexpected error starting embed builder.', flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- General User Commands ---
        else if (commandName === 'botinfo') {
            try {
                await interaction.deferReply();
                const uptime = Math.floor(client.uptime / 1000); const d = Math.floor(uptime / 86400); const h = Math.floor((uptime % 86400) / 3600); const m = Math.floor((uptime % 3600) / 60); const s = uptime % 60;
                const embed = new EmbedBuilder().setColor(0x0099FF).setTitle(`🤖 ${client.user.username} Information`)
                    .setThumbnail(client.user.displayAvatarURL())
                    .addFields(
                        { name: '🏷️ Name', value: client.user.username, inline: true }, { name: '🔖 Tag', value: client.user.tag, inline: true },
                        { name: '🆔 ID', value: client.user.id, inline: true },
                        { name: '🎂 Created On', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>)`, inline: false },
                        { name: '⏱️ Uptime', value: `${d}d ${h}h ${m}m ${s}s`, inline: false },
                        { name: '🌐 Servers', value: client.guilds.cache.size.toString(), inline: true },
                        { name: '👥 Total Users (Approx)', value: `${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`, inline: true },
                        { name: '💬 Discord.js', value: `v${require('discord.js').version}`, inline: true },
                        { name: '💻 Node.js', value: process.version, inline: true },
                        { name: '🧠 Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                        { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true }
                    )
                    .setTimestamp().setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                await editReplyAndScheduleDelete(interaction, { embeds: [embed] });
            } catch (e) { console.error('[Cmd botinfo] Error:', e); await editReplyAndScheduleDelete(interaction, { content: 'Error fetching bot info.', flags: [MessageFlags.Ephemeral] });}
        }
        else if (commandName === 'level') {
             try {
                await interaction.deferReply(); // Public deferral

                const userOption = interaction.options.getUser('user');
                const targetUser = userOption || interaction.user;
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                const levelInfo = client.levelSystem.getLevelInfo(targetUser.id, interaction.guild.id);
                const currentLevel = levelInfo.level;
                const currentXP = levelInfo.xp;
                const rank = levelInfo.rank;
                let xpNeeded = levelInfo.xpNeeded;
                // Define bar characters
                const fillGreen = '🟩'; // For regular progress
                const fillYellow = '🟨'; // For max level
                const empty = '⬛';
                let bar = empty.repeat(10); // Default to empty

                if (currentLevel >= client.levelSystem.maxLevel) {
                    xpNeeded = currentXP; // Or set to 0, as XP needed is technically 0
                    bar = fillYellow.repeat(10); // Max level bar
                } else if (xpNeeded > 0) {
                    const progress = Math.min(100, Math.floor((currentXP / xpNeeded) * 100));
                    const blocks = Math.floor(progress / 10);
                    bar = fillGreen.repeat(blocks) + empty.repeat(10 - blocks); // Regular progress bar
                }
                const remainingXP = xpNeeded - currentXP > 0 ? xpNeeded - currentXP : 0;

                // Use the helper function to get the image URL for the current level
                const levelImageIconUrl = getImageUrlForLevel(currentLevel);

                const embedColor = member ? (member.displayHexColor === '#000000' ? '#2ECC71' : member.displayHexColor) : '#2ECC71';

                const embed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setAuthor({
                        name: `${targetUser.username}'s Stats - Level ${currentLevel}`,
                        iconURL: levelImageIconUrl || undefined // Use the determined image URL
                    })
                    .setThumbnail(targetUser.displayAvatarURL({dynamic: true}))
                    .setFooter({ text: `Server: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL({dynamic: true}) })
                    .setTimestamp();

                const roleName = member ? client.levelSystem.getHighestCurrentLevelRoleName(member, currentLevel) : "N/A";

                embed.addFields(
                    { name: '🎖️ Level', value: `\`${currentLevel}\``, inline: true },
                    { name: '<a:trophy:1373261592610734100> Rank', value: rank > 0 ? `\`#${rank}\`` : '\`Unranked\`', inline: true },
                    { name: '<:role:1373261602882588702> Role', value: `\`${roleName || "No role"}\``, inline: true }
                );
                if (currentLevel >= client.levelSystem.maxLevel) {
                    embed.addFields({ name: 'XP Progress', value: `${bar} <a:Kings_crown:1373275398229725316> \`(Max Level)\`` });
                } else {
                    embed.addFields({ name: 'XP Progress', value: `${bar} \`(${currentXP}/${xpNeeded})\`` });
                }
                if (currentLevel < client.levelSystem.maxLevel && remainingXP > 0) {
                    embed.addFields({ name: '🎯 XP to Next', value: `\`${remainingXP} XP\`` });
                }
                if (!member) {
                    embed.setDescription('ℹ️ *User not in server. Displaying stored data.*');
                }

                await editReplyAndScheduleDelete(interaction, { embeds: [embed] });
            } catch (e) {
                console.error('[Cmd level] Error:', e);
                await editReplyAndScheduleDelete(interaction, { content: 'Error fetching level info!', flags: [MessageFlags.Ephemeral] });
            }
        }

        // --- Leaderboard Command ---
        else if (commandName === 'leaderboard') {
            const subcommandGroup = interaction.options.getSubcommandGroup(false);
            const subcommand = interaction.options.getSubcommand();

            if (subcommandGroup === 'config') {
                if (subcommand === 'channel') {
                    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !STAFF_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
                        return replyAndScheduleDelete(interaction, { content: "You don't have permission to configure the leaderboard.", flags: [MessageFlags.Ephemeral] });
                    }
                    const newChannel = interaction.options.getChannel('set');
                    if (!newChannel || newChannel.type !== ChannelType.GuildText) {
                        return replyAndScheduleDelete(interaction, { content: "Please provide a valid text channel.", flags: [MessageFlags.Ephemeral] });
                    }
                    client.levelSystem.setGuildSettings(interaction.guildId, { leaderboardChannelId: newChannel.id, leaderboardMessageId: null });
                    await replyAndScheduleDelete(interaction, { content: `Leaderboard channel set to ${newChannel}. Daily updates will appear there.`, flags: [MessageFlags.Ephemeral] });
                }
            } else if (subcommand === 'postnow') {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !STAFF_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
                    return replyAndScheduleDelete(interaction, { content: "You don't have permission to manually post the leaderboard.", flags: [MessageFlags.Ephemeral] });
                }
                await interaction.deferReply({ ephemeral: true });
                await postOrUpdateLeaderboard(client, interaction.guildId);
                await editReplyAndScheduleDelete(interaction, { content: "Leaderboard update triggered." });
            } else if (subcommand === 'view') {
                await interaction.deferReply();
                const leaderboardData = client.levelSystem.getLeaderboard(interaction.guildId, LEADERBOARD_LIMIT);
                const embed = await formatLeaderboardEmbed(interaction.guild, leaderboardData, client);
                await editReplyAndScheduleDelete(interaction, { embeds: [embed] });
            } else {
                 await replyAndScheduleDelete(interaction, { content: "Invalid leaderboard subcommand.", flags: [MessageFlags.Ephemeral] });
            }
        }
        // --- End of Leaderboard Command ---

    } else if (interaction.isButton()) {
        // (Your existing refined embed builder button logic from previous responses)
        const parts = interaction.customId.split('_');
        const prefix = parts[0];
        const action = parts[1];
        const sessionId = parts.slice(2).join('_');

        if (prefix !== 'eb') return;

        let session = embedBuildingSessions.get(sessionId);
        if (!session) {
            const dbSession = client.levelSystem.fetchEmbedSession(sessionId);
            if (dbSession) {
                embedBuildingSessions.set(sessionId, dbSession);
                session = dbSession;
            } else {
                return replyAndScheduleDelete(interaction, { content: "This embed builder session is no longer active or has expired.", flags: [MessageFlags.Ephemeral] });
            }
        }
        if (!session || session.userId !== interaction.user.id) {
            return replyAndScheduleDelete(interaction, { content: "This is not your embed builder session.", flags: [MessageFlags.Ephemeral] });
        }

        if (action === 'cancel') {
            client.levelSystem.deleteEmbedSession(sessionId);
            embedBuildingSessions.delete(sessionId);
            try {
                await interaction.update({ content: 'Embed builder cancelled by user.', embeds: [], components: [] });
            } catch (updateError) {
                console.error(`[Button Cancel] Error updating panel for ${sessionId}:`, updateError);
                await replyAndScheduleDelete(interaction, { content: 'Embed builder cancelled.', flags: [MessageFlags.Ephemeral] });
            }
            return;
        }
        if (action === 'send') {
            try {
                const targetChannel = await client.channels.fetch(session.targetChannelId).catch(() => null);
                if (!targetChannel || !targetChannel.isTextBased()) {
                    client.levelSystem.deleteEmbedSession(sessionId); embedBuildingSessions.delete(sessionId);
                    return editReplyAndScheduleDelete(interaction, {
                        content: 'Error: Target channel for the embed is invalid or no longer accessible.',
                        embeds: [], components: [], flags: [MessageFlags.Ephemeral]
                    });
                }
                const botMember = interaction.guild.members.me;
                if (!botMember) {
                    client.levelSystem.deleteEmbedSession(sessionId); embedBuildingSessions.delete(sessionId);
                    return editReplyAndScheduleDelete(interaction, {
                        content: 'Error: Could not verify my own permissions to send the embed.',
                        embeds: [], components: [], flags: [MessageFlags.Ephemeral]
                    });
                }
                const perms = targetChannel.permissionsFor(botMember);
                if (!perms || !perms.has(PermissionsBitField.Flags.SendMessages) || !perms.has(PermissionsBitField.Flags.EmbedLinks)) {
                    client.levelSystem.deleteEmbedSession(sessionId); embedBuildingSessions.delete(sessionId);
                    return editReplyAndScheduleDelete(interaction, {
                        content: `Error: I need "Send Messages" & "Embed Links" permissions in ${targetChannel} to send the embed.`,
                        embeds: [], components: [], flags: [MessageFlags.Ephemeral]
                    });
                }
                if (!session.embedData.title && !session.embedData.description && (!session.embedData.fields || session.embedData.fields.length === 0)) {
                    return replyAndScheduleDelete(interaction, {
                        content: "The embed must have at least a title, description, or a field to be sent.",
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                const finalEmbed = buildSessionPreviewEmbed(session);
                const payload = { embeds: [finalEmbed] };
                if (session.roleToMentionId) payload.content = `<@&${session.roleToMentionId}>`;

                await targetChannel.send(payload);

                client.levelSystem.deleteEmbedSession(sessionId);
                embedBuildingSessions.delete(sessionId);

                await editReplyAndScheduleDelete(interaction, {
                    content: `<a:Verify:1373275379007230022> Embed successfully sent to ${targetChannel}! This confirmation will disappear.`,
                    embeds: [], components: [], flags: [MessageFlags.Ephemeral]
                });

            } catch (e) {
                console.error('[Embed Send Button] Error:', e);
                await editReplyAndScheduleDelete(interaction, {
                    content: 'An error occurred while trying to send the embed.',
                    embeds: [], components: [], flags: [MessageFlags.Ephemeral]
                });
            }
            return;
        }
        const modal = new ModalBuilder().setCustomId(`eb_modal_${action}_${sessionId}`).setTitle('Configure Embed Section');
        let textInputComponent;
        switch (action) {
            case 'setTitle': textInputComponent = new TextInputBuilder().setCustomId('inputValue').setLabel('Embed Title').setStyle(TextInputStyle.Short).setMaxLength(256).setValue(session.embedData.title || '').setRequired(false); break;
            case 'setDesc': textInputComponent = new TextInputBuilder().setCustomId('inputValue').setLabel('Embed Description').setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setValue(session.embedData.description || '').setRequired(false); break;
            case 'setColor': textInputComponent = new TextInputBuilder().setCustomId('inputValue').setLabel('Embed Color (Hex, e.g., #FF00AA)').setStyle(TextInputStyle.Short).setMaxLength(7).setPlaceholder('#RRGGBB').setValue(session.embedData.color ? `#${session.embedData.color.toString(16).padStart(6, '0')}` : '').setRequired(false); break;
            case 'setFooter': textInputComponent = new TextInputBuilder().setCustomId('inputValue').setLabel('Embed Footer Text').setStyle(TextInputStyle.Short).setMaxLength(2048).setValue(session.embedData.footerText || '').setRequired(false); break;
            case 'setThumb': textInputComponent = new TextInputBuilder().setCustomId('inputValue').setLabel('Thumbnail URL (must be https)').setStyle(TextInputStyle.Short).setPlaceholder('https://domain.com/image.png').setValue(session.embedData.thumbnailUrl || '').setRequired(false); break;
            case 'setImage': textInputComponent = new TextInputBuilder().setCustomId('inputValue').setLabel('Main Image URL (must be https)').setStyle(TextInputStyle.Short).setPlaceholder('https://domain.com/image.png').setValue(session.embedData.imageUrl || '').setRequired(false); break;
            default:
                console.warn(`[Button Debug] Unrecognized action '${action}' for embed builder button. CustomID: ${interaction.customId}`);
                return replyAndScheduleDelete(interaction, { content: 'Invalid button action received.', flags: [MessageFlags.Ephemeral] });
        }

        if (textInputComponent) {
            modal.addComponents(new ActionRowBuilder().addComponents(textInputComponent));
            try {
                await interaction.showModal(modal);
            } catch (modalError) {
                console.error(`[Button Debug] Error showing modal for action ${action}, session ${sessionId}:`, modalError);
                await replyAndScheduleDelete(interaction, { content: 'Error preparing the configuration window. Please try again.', flags: [MessageFlags.Ephemeral] });
            }
        } else {
            console.error(`[Button Debug] textInputComponent was unexpectedly not defined for action '${action}'.`);
            await replyAndScheduleDelete(interaction, { content: 'There was an internal issue processing this button action.', flags: [MessageFlags.Ephemeral] });
        }

    } else if (interaction.isModalSubmit()) {
        const parts = interaction.customId.split('_');
        const prefix = parts[0];
        const modalKeyword = parts[1];
        const action = parts[2];
        const sessionId = parts.slice(3).join('_');

        if (prefix !== 'eb' || modalKeyword !== 'modal') { /* ... */ return; }

        let session = embedBuildingSessions.get(sessionId);
        if (!session) { /* ... session recovery ... */ }
        if (!session || session.userId !== interaction.user.id) { /* ... error reply ... */ return; }

        await interaction.deferUpdate().catch(e => console.error("[ModalSubmit Debug] Error deferring modal update:", e));

        const value = interaction.fields.getTextInputValue('inputValue').trim();
        switch (action) {
            case 'setTitle': session.embedData.title = value || null; break;
            case 'setDesc': session.embedData.description = value || null; break;
            case 'setColor':
                const cval = value.replace('#', '');
                if (cval === '') { session.embedData.color = 0x555555; }
                else { const p = parseInt(cval, 16); if (!isNaN(p)) session.embedData.color = p; else console.warn(`[ModalSubmit Debug] Invalid color hex: ${value}`);}
                break;
            case 'setFooter': session.embedData.footerText = value || null; break;
            case 'setThumb': session.embedData.thumbnailUrl = (value && (value.startsWith('http://') || value.startsWith('https://'))) ? value : null; break;
            case 'setImage': session.embedData.imageUrl = (value && (value.startsWith('http://') || value.startsWith('https://'))) ? value : null; break;
            default:
                console.warn(`[ModalSubmit Debug] Unrecognized action '${action}' in modal data update.`);
                await replyAndScheduleDelete(interaction, { content: "An internal error occurred processing your input.", flags: [MessageFlags.Ephemeral] });
                return;
        }

        if (!client.levelSystem.updateEmbedSession(sessionId, { embedData: session.embedData, builderMessageId: session.builderMessageId })) { /* ... handle DB error ... */ }

        const previewEmbed = buildSessionPreviewEmbed(session);
        const components = getSessionBuilderComponents(sessionId);

        try {
            await interaction.editReply({
                content: `🛠️ Embed Builder for <#${session.targetChannelId}>${session.roleToMentionId ? ` (mentioning <@&${session.roleToMentionId}>)` : ''}\nConfigure the embed using the buttons below. (Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'})})`,
                embeds: [previewEmbed],
                components: components
            });
            const currentPanelMessage = await interaction.fetchReply();
            if (session.builderMessageId !== currentPanelMessage.id) {
                session.builderMessageId = currentPanelMessage.id;
                if (!client.levelSystem.updateEmbedSession(sessionId, { builderMessageId: currentPanelMessage.id, embedData: session.embedData })) { /* ... */ }
                embedBuildingSessions.set(sessionId, session);
            } else {
                 if (!client.levelSystem.updateEmbedSession(sessionId, { embedData: session.embedData, builderMessageId: session.builderMessageId })) { /* ... */ }
            }
        } catch (error) {
            console.error(`[ModalSubmit Debug] Error updating panel via interaction.editReply for session ${sessionId}:`, error);
            let userErrorMessage = "Your changes have been saved, but an error occurred while refreshing the preview panel.";
            if (error.code === 10008) {
                userErrorMessage = "Your changes are saved, but the preview panel could not be updated (it may have been manually dismissed or the interaction expired). Try another action, or Send/Cancel.";
            } else if (error.code === 10062) {
                 userErrorMessage = "Your changes are saved, but the interaction to update the panel has expired. Try another action, or Send/Cancel.";
            }
            await replyAndScheduleDelete(interaction, { content: userErrorMessage, flags: [MessageFlags.Ephemeral] });
        }
    }
});

// Voice state update for voice XP
client.on('voiceStateUpdate', (oldState, newState) => {
    try {
        client.levelSystem.handleVoiceStateUpdate(oldState, newState);
    } catch (error) {
        console.error("[VoiceXP] Error in voiceStateUpdate handler:", error);
    }
});

// --- Error Handling & Login ---
process.on('unhandledRejection', error => {
    console.error('Unhandled Rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("FATAL: Failed to login. Check DISCORD_TOKEN in your .env file.", err);
    process.exit(1);
});

console.log("Attempting to log in with the bot...");

// Helper function to build embed preview (ensure this is defined if not already)
function buildSessionPreviewEmbed(sessionData) {
    const embed = new EmbedBuilder();
    if (sessionData.embedData.title) embed.setTitle(sessionData.embedData.title);
    if (sessionData.embedData.description) embed.setDescription(sessionData.embedData.description);
    if (sessionData.embedData.color) embed.setColor(sessionData.embedData.color);
    if (sessionData.embedData.footerText) embed.setFooter({ text: sessionData.embedData.footerText });
    if (sessionData.embedData.thumbnailUrl) embed.setThumbnail(sessionData.embedData.thumbnailUrl);
    if (sessionData.embedData.imageUrl) embed.setImage(sessionData.embedData.imageUrl);
    if (sessionData.embedData.timestamp) embed.setTimestamp();
    // Add fields if any
    if (sessionData.embedData.fields && sessionData.embedData.fields.length > 0) {
        sessionData.embedData.fields.forEach(field => {
            embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
        });
    }
    return embed;
}

// Helper function to get builder components (ensure this is defined if not already)
function getSessionBuilderComponents(sessionId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eb_setTitle_${sessionId}`).setLabel('Title').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`eb_setDesc_${sessionId}`).setLabel('Description').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`eb_setColor_${sessionId}`).setLabel('Color').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`eb_setFooter_${sessionId}`).setLabel('Footer').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eb_setThumb_${sessionId}`).setLabel('Thumbnail URL').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`eb_setImage_${sessionId}`).setLabel('Image URL').setStyle(ButtonStyle.Secondary)
            // Add buttons for addField, removeField, editField later if needed
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eb_send_${sessionId}`).setLabel('Send Embed').setStyle(ButtonStyle.Success).setEmoji('🚀'),
            new ButtonBuilder().setCustomId(`eb_cancel_${sessionId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        )
    ];
}
