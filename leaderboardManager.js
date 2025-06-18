// leaderboardManager.js
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// NEW: Map levels to custom emoji IDs (USING PLACEHOLDERS - YOU NEED TO REPLACE IDs)
// Assuming you have custom emojis like <:bronze1:ID>, <:bronze2:ID>, ... , <:darkmatter10:ID>
const LEVEL_TO_EMOJI_ID_MAP = {
    0: '<:bronze1:1374389124743823413>',
    1: '<:bronze1:1374389124743823413>',
    2: '<:bronze2:1374389148923986000>',
    3: '<:bronze3:1374389162077196359>',
    4: '<:bronze4:1374389175205498891>',
    5: '<:bronze5:1374389189000560740>',
    6: '<:bronze6:1374389204099928085>',
    7: '<:bronze7:1374389234336661564>',
    8: '<:bronze8:1374389249863979090>',
    9: '<:bronze9:1374389266800578581>',
    10: '<:bronze10:1374389280918470766>',
    11: '<:silver1:1374389308688957560>',
    12: '<:silver2:1374389338317787167>',
    13: '<:silver3:1374389362145493143>',
    14: '<:silver4:1374389380684185830>',
    15: '<:silver5:1374389399638245416>',
    16: '<:silver6:1374389416562393182>',
    17: '<:silver7:1374389453082329169>',
    18: '<:silver8:1374389471104995348>',
    19: '<:silver9:1374389486888419358>',
    20: '<:silver10:1374389502449029242>',
    21: '<:gold1:1374389554114465802>',
    22: '<:gold2:1374389567645417493>',
    23: '<:gold3:1374389593738051634>',
    24: '<:gold4:1374389621609201674>',
    25: '<:gold5:1374389638051008512>',
    26: '<:gold6:1374389654731755592>',
    27: '<:gold7:1374389690567753778>',
    28: '<:gold8:1374389706015510708>',
    29: '<:gold9:1374389720846438451>',
    30: '<:gold10:1374389734922522674>',
    31: '<:darkmatter1:1374389756116467843>',
    32: '<:darkmatter2:1374389815289581598>',
    33: '<:darkmatter3:1374389851582890124>',
    34: '<:darkmatter4:1374389868406505482>',
    35: '<:darkmatter5:1374389883476508712>',
    36: '<:darkmatter6:1374389900362645604>',
    37: '<:darkmatter7:1374389919274762333>',
    38: '<:darkmatter8:1374389933904498790>',
    39: '<:darkmatter9:1374389951642472570>',
    40: '<:darkmatter10:1374389969166143632>',
};

/**
 * Formats the leaderboard data into a Discord Embed.
 * @param {Array<Object>} leaderboardData - An array of user data {userId, level, xp}.
 * @param {import('discord.js').Client} client - The Discord.js client.
 * @param {string} guildId - The ID of the guild.
 * @param {Object} systemsManager - The SystemsManager instance.
 * @returns {Promise<EmbedBuilder>} The formatted leaderboard embed.
 */
async function formatLeaderboardEmbed(leaderboardData, client, guildId, systemsManager, timeUntilNextUpdateMs = 0) {
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🏆 Top 10 Level Leaderboard');

    if (leaderboardData.length === 0) {
        embed.setDescription('No users on the leaderboard yet. Start chatting to gain levels!');
        return embed;
    }

    const fields = await Promise.all(leaderboardData.map(async (user, index) => {
        let userTag = 'Unknown User';
        try {
            const fetchedUser = await client.users.fetch(user.userId);
            userTag = fetchedUser.username;
        } catch (error) {
            console.error(`Error fetching user for leaderboard: ${user.userId}`, error);
        }

        const levelEmoji = LEVEL_TO_EMOJI_ID_MAP[user.level] || ''; // Get custom emoji for level

        // Get required XP for next level
        const requiredXp = systemsManager.getRequiredXpForLevel(user.level + 1);
        const xpProgress = user.level >= systemsManager.MAX_LEVEL ? "MAX" : `${user.xp}/${requiredXp} XP`;

        const rankEmoji = getRankEmoji(index + 1); // Get crown emoji for top ranks

        return {
            name: `${rankEmoji} ${index + 1}. ${userTag}`,
            value: `Level: ${user.level} ${levelEmoji} | XP: ${xpProgress}`,
            inline: false,
        };
    }));

    embed.addFields(fields);
    if (timeUntilNextUpdateMs > 0) {
        const nextUpdateTimestamp = Math.floor((Date.now() + timeUntilNextUpdateMs) / 1000);
        embed.addFields({ name: 'Next Update', value: `<t:${nextUpdateTimestamp}:R>`, inline: false });
    }
    embed.setFooter({ text: 'Last updated:' });
    embed.setTimestamp();

    return embed;
}

async function formatCoinLeaderboardEmbed(leaderboardData, client) {
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💰 Top 5 Coins');

    if (leaderboardData.length === 0) {
        embed.setDescription('No data available.');
        return embed;
    }

    const fields = await Promise.all(leaderboardData.map(async (user, index) => {
        let userTag = 'Unknown User';
        try {
            const fetchedUser = await client.users.fetch(user.userId);
            userTag = fetchedUser.username;
        } catch (error) {
            console.error(`Error fetching user for coins leaderboard: ${user.userId}`, error);
        }
        const rankEmoji = getRankEmoji(index + 1);
        return {
            name: `${rankEmoji} ${index + 1}. ${userTag}`,
            value: `${user.totalCoins.toLocaleString()} Coins`,
            inline: false,
        };
    }));

    embed.addFields(fields);
    embed.setFooter({ text: 'Last updated:' });
    embed.setTimestamp();

    return embed;
}

async function formatGemLeaderboardEmbed(leaderboardData, client) {
    const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('💎 Top 5 Gems');

    if (leaderboardData.length === 0) {
        embed.setDescription('No data available.');
        return embed;
    }

    const fields = await Promise.all(leaderboardData.map(async (user, index) => {
        let userTag = 'Unknown User';
        try {
            const fetchedUser = await client.users.fetch(user.userId);
            userTag = fetchedUser.username;
        } catch (error) {
            console.error(`Error fetching user for gems leaderboard: ${user.userId}`, error);
        }
        const rankEmoji = getRankEmoji(index + 1);
        return {
            name: `${rankEmoji} ${index + 1}. ${userTag}`,
            value: `${user.totalGems.toLocaleString()} Gems`,
            inline: false,
        };
    }));

    embed.addFields(fields);
    embed.setFooter({ text: 'Last updated:' });
    embed.setTimestamp();

    return embed;
}

async function formatValueLeaderboardEmbed(leaderboardData, client) {
    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📦 Top 5 Total Value');

    if (leaderboardData.length === 0) {
        embed.setDescription('No data available.');
        return embed;
    }

    const fields = await Promise.all(leaderboardData.map(async (user, index) => {
        let userTag = 'Unknown User';
        try {
            const fetchedUser = await client.users.fetch(user.userId);
            userTag = fetchedUser.username;
        } catch (error) {
            console.error(`Error fetching user for value leaderboard: ${user.userId}`, error);
        }
        const rankEmoji = getRankEmoji(index + 1);
        return {
            name: `${rankEmoji} ${index + 1}. ${userTag}`,
            value: `${user.totalValue.toLocaleString()} Value`,
            inline: false,
        };
    }));

    embed.addFields(fields);
    embed.setFooter({ text: 'Last updated:' });
    embed.setTimestamp();

    return embed;
}

/**
 * Gets a crown emoji for top ranks.
 * @param {number} rank - The rank number.
 * @returns {string} The crown emoji or an empty string.
 */
function getRankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
}

/**
 * Posts or updates the leaderboard message in the designated channel.
 * @param {import('discord.js').Client} client - The Discord.js client.
 * @param {string} guildId - The ID of the guild.
 * @param {Object} systemsManager - The SystemsManager instance.
 * @param {number} limit - The number of users to display on the leaderboard.
 * @returns {Promise<Object>} Status of the leaderboard update.
 */
async function postOrUpdateLeaderboard(client, guildId, systemsManager, limit, isForcedByAdmin = false) {
    try {
        const settings = systemsManager.getGuildSettings(guildId);
        const channelId = settings.leaderboardChannelId || systemsManager.DEFAULT_LEADERBOARD_CHANNEL_ID; // Assuming DEFAULT_LEADERBOARD_CHANNEL_ID is available via systemsManager or globally
        const messageId = settings.leaderboardMessageId;
        const lastUpdated = settings.leaderboardLastUpdated;
        const now = Date.now();

        const updateInterval = 60 * 60 * 1000; // 1 hour

        // If not forced by admin, check the update interval
        if (!isForcedByAdmin && lastUpdated && (now - lastUpdated < updateInterval)) {
            // console.log(`[Leaderboard] Skipping update for guild ${guildId}: Too soon.`);
            return { success: true, updated: false, message: "Leaderboard was updated recently. Automatic updates follow an interval." };
        }

        const leaderboardData = systemsManager.getLeaderboard(guildId, limit);
        const coinData = systemsManager.getCoinLeaderboard(guildId, 5);
        const gemData = systemsManager.getGemLeaderboard(guildId, 5);
        const valueData = systemsManager.getValueLeaderboard(guildId, 5);

        const leaderboardEmbed = await formatLeaderboardEmbed(
            leaderboardData,
            client,
            guildId,
            systemsManager,
            updateInterval
        );
        const coinEmbed = await formatCoinLeaderboardEmbed(coinData, client);
        const gemEmbed = await formatGemLeaderboardEmbed(gemData, client);
        const valueEmbed = await formatValueLeaderboardEmbed(valueData, client);

        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
            console.warn(`[Leaderboard] Guild with ID ${guildId} not found.`);
            return { success: false, message: "Guild not found." };
        }

        const channel = await guild.channels.fetch(channelId).catch(() => null); // Catch if channel not found
        if (!channel) {
            console.warn(`[Leaderboard] Leaderboard channel with ID ${channelId} not found in guild ${guildId}.`);
            return { success: false, message: `Leaderboard channel (ID: ${channelId}) not found. Please configure it using /leaderboard config channel.` };
        }

        if (channel.type !== 0 && channel.type !== 5) { // 0 = GUILD_TEXT, 5 = GUILD_NEWS
            console.warn(`[Leaderboard] Channel ${channel.name} is not a text channel. Cannot post leaderboard.`);
            return { success: false, message: "Leaderboard channel is not a text channel." };
        }

        const botPermissionsInChannel = channel.permissionsFor(guild.members.me);
        if (!botPermissionsInChannel.has(PermissionsBitField.Flags.SendMessages)) {
            console.error(`[Leaderboard] Missing SEND_MESSAGES permission in ${channel.name} for guild ${guildId}.`);
            return { success: false, message: "Missing SEND_MESSAGES permission in the leaderboard channel." };
        }
        // ManageMessages permission is only warned about, not a hard fail
        if (messageId && !botPermissionsInChannel.has(PermissionsBitField.Flags.ManageMessages)) {
            console.warn(`[Leaderboard] Missing MANAGE_MESSAGES permission in ${channel.name}. Cannot update existing message, will post a new one if necessary.`);
        }

        let messageUpdated = false;
        let newMsgId = messageId;

        if (messageId) {
            try {
                const oldMessage = await channel.messages.fetch(messageId);
                if (oldMessage.author.id === client.user.id) { // Check if bot owns message
                    if (botPermissionsInChannel.has(PermissionsBitField.Flags.ManageMessages) || oldMessage.editable) { // Check editability
                        await oldMessage.edit({ embeds: [leaderboardEmbed, coinEmbed, gemEmbed, valueEmbed] });
                        messageUpdated = true;
                    } else {
                         console.warn(`[Leaderboard] Cannot edit message ${messageId} (not editable or missing ManageMessages). Will post new.`);
                         settings.leaderboardMessageId = null; newMsgId = null;
                    }
                } else {
                    console.warn(`[Leaderboard] Message ID ${messageId} in channel ${channel.id} is not owned by the bot. Posting a new one.`);
                    settings.leaderboardMessageId = null; newMsgId = null;
                }
            } catch (error) {
                console.warn(`[Leaderboard] Could not fetch or edit existing leaderboard message ${messageId}. Will post a new one. Error: ${error.message}`);
                settings.leaderboardMessageId = null; newMsgId = null;
            }
        }

        if (!settings.leaderboardMessageId && !messageUpdated) {
            const newMessage = await channel.send({ embeds: [leaderboardEmbed, coinEmbed, gemEmbed, valueEmbed] });
            newMsgId = newMessage.id;
        }
        
        systemsManager.setGuildSettings(guildId, {
            ...settings,
            leaderboardMessageId: newMsgId,
            leaderboardLastUpdated: now // Always update the timestamp
        });
        return { success: true, updated: messageUpdated, channelId: channel.id, message: messageUpdated ? "Leaderboard updated." : "Leaderboard posted." };

    } catch (error) {
        console.error(`[Leaderboard] Failed to post/update leaderboard for guild ${guildId}:`, error);
        return { success: false, message: "An internal error occurred while updating the leaderboard." };
    }
}

module.exports = {
    postOrUpdateLeaderboard,
    formatLeaderboardEmbed,
    formatCoinLeaderboardEmbed,
    formatGemLeaderboardEmbed,
    formatValueLeaderboardEmbed,
    // LEVEL_TO_EMOJI_ID_MAP // No need to export this
};
