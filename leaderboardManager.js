// leaderboardManager.js
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const LEADERBOARD_LIMIT = 10; // Number of users to show on the leaderboard

// Emojis for different level ranges
const LEVEL_EMOJIS = {
    '0-2': '<:nh1:1373286658627211365>', // Level 0-2
    '3-5': '<:nh2:1373286670253686805>', // Level 3-5
    '6-9': '<:nh4:1373286681683296347>', // Level 6-9
    '10-14': '<:nh5:1373286696636125285>',// Level 10-14
    '15-19': '<:nh6:1373286732669259846>',// Level 15-19
    '20': '<:nh7:1373286745856016394>',   // Level 20+
};

/**
 * Gets the appropriate emoji for a given level.
 * @param {number} level - The user's current level.
 * @returns {string} - The emoji string or an empty string if no emoji is found.
 */
function getEmojiForLevel(level) {
    if (level >= 0 && level <= 2) return LEVEL_EMOJIS['0-2'];
    if (level >= 3 && level <= 5) return LEVEL_EMOJIS['3-5'];
    if (level >= 6 && level <= 9) return LEVEL_EMOJIS['6-9'];
    if (level >= 10 && level <= 14) return LEVEL_EMOJIS['10-14'];
    if (level >= 15 && level <= 19) return LEVEL_EMOJIS['15-19'];
    if (level >= 20) return LEVEL_EMOJIS['20'];
    return ''; // Default if no range matches
}

/**
 * Formats the leaderboard data into an Embed.
 * @param {import('discord.js').Guild} guild - The guild object.
 * @param {Array<Object>} leaderboardData - Array of user data { userId, level, xp }.
 * @param {import('discord.js').Client} client - The Discord client.
 * @returns {Promise<EmbedBuilder>} - The formatted embed.
 */
async function formatLeaderboardEmbed(guild, leaderboardData, client) {
    const settings = client.levelSystem.getGuildSettings(guild.id);
    const lastUpdatedTimestamp = settings ? settings.leaderboardLastUpdated : null;
    
    const embed = new EmbedBuilder()
        .setTitle(`👑 ${guild.name} - Top ${LEADERBOARD_LIMIT} Leaderboard 👑`)
        .setColor(0xFFD700) // Gold color
        // .setTimestamp() // Removed: We'll use the "Updated" field for the primary time indicator
        .setFooter({ text: 'Leaderboard updates daily' }); // Default footer

    if (!leaderboardData || leaderboardData.length === 0) {
        embed.setDescription('No users on the leaderboard yet!');
        // Still add the updated field if available
        if (lastUpdatedTimestamp) {
            embed.addFields({ name: '🕒 Updated', value: `<t:${lastUpdatedTimestamp}:R>`, inline: false });
        }
        return embed;
    }

    const leaderboardEntries = [];
    for (let i = 0; i < leaderboardData.length; i++) {
        const entry = leaderboardData[i];
        try {
            const user = await client.users.fetch(entry.userId).catch(() => null);
            
            const rank = i + 1;
            const userLevel = entry.level;
            const levelEmoji = getEmojiForLevel(userLevel);

            const userName = user ? user.username : `User ID: ${entry.userId}`;
            const userAvatar = user ? user.displayAvatarURL({ dynamic: true, size: 64 }) : guild.iconURL();

            let medal = '';
            if (rank === 1) medal = '🥇';
            else if (rank === 2) medal = '🥈';
            else if (rank === 3) medal = '🥉';

            leaderboardEntries.push(
                `**${rank}. ${medal} ${levelEmoji} ${userName}**\n` +
                `   Level: \`${userLevel}\` (XP: \`${entry.xp}\`)`
            );

            if (rank === 1 && userAvatar) {
                embed.setThumbnail(userAvatar);
            }

        } catch (error) {
            console.error(`[LeaderboardFormat] Error fetching user ${entry.userId}:`, error);
            const levelEmojiOnError = getEmojiForLevel(entry.level);
            leaderboardEntries.push(`**${i + 1}.** ${levelEmojiOnError} User ID: \`${entry.userId}\` - Level: \`${entry.level}\` (Error fetching name)`);
        }
    }

    embed.setDescription(leaderboardEntries.join('\n\n'));

    // Add the "Updated" field after the description and user entries
    if (lastUpdatedTimestamp) {
        embed.addFields({ name: '🕒 Updated', value: `<t:${lastUpdatedTimestamp}:R>`, inline: false });
    } else {
        // Optionally, add a placeholder if no timestamp is available, or leave it out
        // embed.addFields({ name: '🕒 Updated', value: 'Never (or N/A)', inline: false });
    }
    
    // If you still want the embed's own generation timestamp (usually at the bottom, distinct from "Last Updated")
    // you can add it back here. It's often redundant if you have a specific "Last Updated" field.
    embed.setTimestamp();


    return embed;
}

/**
 * Posts or updates the leaderboard in the specified channel.
 * @param {import('discord.js').Client} client - The Discord client.
 * @param {string} guildId - The ID of the guild.
 */
async function postOrUpdateLeaderboard(client, guildId) {
    console.log(`[Leaderboard] Attempting to post/update leaderboard for guild ${guildId}`);
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error(`[Leaderboard] Guild ${guildId} not found in cache.`);
        return;
    }

    let settings = client.levelSystem.getGuildSettings(guildId);
    if (!settings || !settings.leaderboardChannelId) {
        console.log(`[Leaderboard] Leaderboard channel not configured for guild ${guildId}.`);
        const DEFAULT_LEADERBOARD_GUILD_ID = process.env.LEADERBOARD_GUILD_ID;
        const DEFAULT_LEADERBOARD_CHANNEL_ID = process.env.LEADERBOARD_CHANNEL_ID;
        if (guildId === DEFAULT_LEADERBOARD_GUILD_ID && DEFAULT_LEADERBOARD_CHANNEL_ID) {
            console.log(`[Leaderboard] Using default channel ${DEFAULT_LEADERBOARD_CHANNEL_ID} for guild ${guildId} as per .env`);
            // Initialize with all necessary fields if settings is null/undefined
            const initialSettings = { 
                guildId: guildId,
                leaderboardChannelId: DEFAULT_LEADERBOARD_CHANNEL_ID,
                leaderboardMessageId: null,
                leaderboardLastUpdated: null 
            };
            client.levelSystem.setGuildSettings(guildId, initialSettings);
            settings = client.levelSystem.getGuildSettings(guildId); 
            if (!settings) { 
                 console.error(`[Leaderboard] Failed to initialize settings for default guild ${guildId} after attempting to set channel.`);
                 return;
            }
        } else {
            return; 
        }
    }


    const channel = guild.channels.cache.get(settings.leaderboardChannelId);
    if (!channel || !channel.isTextBased()) {
        console.error(`[Leaderboard] Configured leaderboard channel ${settings.leaderboardChannelId} not found or not text-based in guild ${guildId}.`);
        return;
    }

    const botMember = guild.members.me;
    if (!botMember) {
        console.error(`[Leaderboard] Could not find bot member in guild ${guildId}.`);
        return;
    }
    const permissions = channel.permissionsFor(botMember);
    if (!permissions || !permissions.has(PermissionsBitField.Flags.SendMessages) || !permissions.has(PermissionsBitField.Flags.EmbedLinks)) {
        console.error(`[Leaderboard] Missing SendMessages or EmbedLinks permission in channel ${channel.id} for guild ${guildId}.`);
        return;
    }

    try {
        const leaderboardData = client.levelSystem.getLeaderboard(guildId, LEADERBOARD_LIMIT);
        const leaderboardEmbed = await formatLeaderboardEmbed(guild, leaderboardData, client);

        let messageToUpdate;
        if (settings.leaderboardMessageId) {
            try {
                messageToUpdate = await channel.messages.fetch(settings.leaderboardMessageId);
            } catch (error) {
                console.warn(`[Leaderboard] Could not fetch previous leaderboard message (ID: ${settings.leaderboardMessageId}) for guild ${guildId}. Will post a new one. Error: ${error.message}`);
                settings.leaderboardMessageId = null; 
            }
        }
        
        const newTimestamp = Math.floor(Date.now() / 1000);

        if (messageToUpdate) {
            await messageToUpdate.edit({ embeds: [leaderboardEmbed], content: ' ' });
            console.log(`[Leaderboard] Leaderboard updated in channel ${channel.id} for guild ${guildId} (Message ID: ${messageToUpdate.id})`);
        } else {
            const newMessage = await channel.send({ embeds: [leaderboardEmbed] });
            settings.leaderboardMessageId = newMessage.id; // This will be part of the 'settings' object
            console.log(`[Leaderboard] Leaderboard posted in channel ${channel.id} for guild ${guildId} (New Message ID: ${newMessage.id})`);
        }
        
        // Ensure all existing settings are preserved when updating
        client.levelSystem.setGuildSettings(guildId, { 
            ...settings, // Spread the potentially modified settings (e.g., new leaderboardMessageId)
            leaderboardLastUpdated: newTimestamp 
        });

    } catch (error) {
        console.error(`[Leaderboard] Failed to post/update leaderboard for guild ${guildId}:`, error);
    }
}

module.exports = {
    postOrUpdateLeaderboard,
    formatLeaderboardEmbed,
    LEADERBOARD_LIMIT
};
