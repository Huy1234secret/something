// leaderboardManager.js
const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const FINAL_POINTS_EMOJI = '<:bdpoint:1389238189671321672>';

const LEADERBOARD_DAILY_UPDATE_HOUR_UTC = parseInt(process.env.LEADERBOARD_DAILY_UPDATE_HOUR_UTC) || 17;

const LEADERBOARD_BLACKLIST_ROLE_IDS = ['1381232791198367754', '1372979474857197688'];

// Single reward role for overall leaderboard champion
const LEADERBOARD_REWARD_ROLE_ID = '1384939352236490842';

const FIRST_PLACE_ALERT_DELETE_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day

function getMsUntilNextDailyUpdate() {
    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setUTCHours(LEADERBOARD_DAILY_UPDATE_HOUR_UTC, 0, 0, 0);
    if (nextUpdate <= now) {
        nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
    }
    return nextUpdate.getTime() - now.getTime();
}

async function sendFirstPlaceAlert(guild, channelId, typeName, oldUserId, newUserId, role) {
    if (!channelId) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🏅 First Place Update');
    let desc = '';
    if (newUserId && newUserId !== oldUserId) {
        desc += `<@${newUserId}> is now **#1** in the **${typeName}** leaderboard!`;
        if (role) desc += `\nReward: ${role}`;
    }
    if (oldUserId && oldUserId !== newUserId) {
        if (desc) desc += '\n';
        desc += `<@${oldUserId}> lost the top spot.`;
        if (role) desc += ` Lost: ${role}`;
    }
    if (!desc) return;
    embed.setDescription(desc);
    const sent = await channel.send({ embeds: [embed] }).catch(() => null);
    if (sent && sent.deletable) {
        setTimeout(() => {
            sent.delete().catch(() => {});
        }, FIRST_PLACE_ALERT_DELETE_TIMEOUT);
    }
}

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

async function formatCoinLeaderboardEmbed(leaderboardData, client, timeUntilNextUpdateMs = 0) {
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
    if (timeUntilNextUpdateMs > 0) {
        const nextUpdateTimestamp = Math.floor((Date.now() + timeUntilNextUpdateMs) / 1000);
        embed.addFields({ name: 'Next Update', value: `<t:${nextUpdateTimestamp}:R>`, inline: false });
    }
    embed.setFooter({ text: 'Last updated:' });
    embed.setTimestamp();

    return embed;
}

async function formatGemLeaderboardEmbed(leaderboardData, client, timeUntilNextUpdateMs = 0) {
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
    if (timeUntilNextUpdateMs > 0) {
        const nextUpdateTimestamp = Math.floor((Date.now() + timeUntilNextUpdateMs) / 1000);
        embed.addFields({ name: 'Next Update', value: `<t:${nextUpdateTimestamp}:R>`, inline: false });
    }
    embed.setFooter({ text: 'Last updated:' });
    embed.setTimestamp();

    return embed;
}

async function formatValueLeaderboardEmbed(leaderboardData, client, timeUntilNextUpdateMs = 0) {
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
    if (timeUntilNextUpdateMs > 0) {
        const nextUpdateTimestamp = Math.floor((Date.now() + timeUntilNextUpdateMs) / 1000);
        embed.addFields({ name: 'Next Update', value: `<t:${nextUpdateTimestamp}:R>`, inline: false });
    }
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

function calculateCategoryPoints(amount) {
    if (amount >= 1000000) {
        const digits = Math.floor(amount / 1000000);
        return digits / 100 + 20;
    }
    if (amount >= 1000) {
        const digits = Math.floor(amount / 1000);
        return digits / 100 + 10;
    }
    const str = String(Math.floor(amount));
    const digits = parseInt(str.substring(0, 3)) || 0;
    return digits / 100;
}

function calculateUserPoints(user) {
    const levelPts = (user.level || 0) / 10;
    const coinPts = calculateCategoryPoints(user.totalCoins || 0);
    const gemPts = calculateCategoryPoints(user.totalGems || 0);
    const valuePts = calculateCategoryPoints(user.totalValue || 0);
    const finalPts = (levelPts + coinPts + gemPts + valuePts) / 4;
    return { ...user, levelPts, coinPts, gemPts, valuePts, finalPts };
}

async function formatOverallLeaderboardEmbed(data, client, timeUntilNextUpdateMs = 0) {
    const embed = new EmbedBuilder()
        .setColor('#ffffff')
        .setTitle('🌟 Overall Leaderboard');

    if (data.length === 0) {
        embed.setDescription('No data available.');
        return embed;
    }

    data = data.slice(0, 10);
    const coinEmoji = client.levelSystem?.coinEmoji || '🪙';
    const gemEmoji = client.levelSystem?.gemEmoji || '💎';
    const valueEmoji = '<:sstar:1397839647656378419>';

    const lines = await Promise.all(data.map(async (user, idx) => {
        let tag = 'Unknown User';
        try {
            const fetched = await client.users.fetch(user.userId);
            tag = fetched.username;
        } catch (err) {
            console.error(`Error fetching user for overall leaderboard: ${user.userId}`, err);
        }
        const levelEmoji = LEVEL_TO_EMOJI_ID_MAP[Math.min(user.level, 40)] || '';
        const medal = getRankEmoji(idx + 1);
        const header = `### ${medal ? medal + ' ' : ''}${idx + 1}# <@${user.userId}> - ${user.finalPts.toFixed(2)} ${FINAL_POINTS_EMOJI}`;
        const details = `-# ${coinEmoji} ${user.coinPts.toFixed(2)}pts - ${gemEmoji} ${user.gemPts.toFixed(2)}pts - ${valueEmoji} ${user.valuePts.toFixed(2)}pts - ${levelEmoji} ${user.levelPts.toFixed(2)}pts`;
        return `${header}\n${details}`;
    }));

    embed.setDescription(lines.join('\n'));
    if (timeUntilNextUpdateMs > 0) {
        const ts = Math.floor((Date.now() + timeUntilNextUpdateMs) / 1000);
        embed.addFields({ name: 'Next Update', value: `<t:${ts}:R>`, inline: false });
    }
    embed.setFooter({ text: 'Last updated:' });
    embed.setTimestamp();
    return embed;
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

        const updateInterval = 24 * 60 * 60 * 1000; // 24 hours
        const timeUntilNextDailyUpdate = getMsUntilNextDailyUpdate();

        // If not forced by admin, check the update interval
        if (!isForcedByAdmin && lastUpdated && (now - lastUpdated < updateInterval)) {
            // console.log(`[Leaderboard] Skipping update for guild ${guildId}: Too soon.`);
            return { success: true, updated: false, message: "Leaderboard was updated recently. Automatic updates follow an interval." };
        }

        const guild = await client.guilds.fetch(guildId);
        await guild.members.fetch().catch(() => {});
        const blacklistSet = new Set();
        for (const rId of LEADERBOARD_BLACKLIST_ROLE_IDS) {
            const role = guild.roles.cache.get(rId);
            if (role) role.members.forEach(m => blacklistSet.add(m.id));
        }

        const overallRaw = systemsManager.getOverallStats(guildId);
        const overallData = overallRaw
            .map(u => calculateUserPoints(u))
            .filter(u => !blacklistSet.has(u.userId))
            .sort((a, b) => b.finalPts - a.finalPts)
            .slice(0, limit);

        const overallEmbed = await formatOverallLeaderboardEmbed(overallData, client, timeUntilNextDailyUpdate);

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('check_rank')
                    .setLabel('Check Rank')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊')
            )
        ];

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
                        await oldMessage.edit({ embeds: [overallEmbed], components });
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
            const newMessage = await channel.send({ embeds: [overallEmbed], components });
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

async function updateLeaderboardRewards(client, guildId, systemsManager) {
    try {
        const guild = await client.guilds.fetch(guildId);
        await guild.members.fetch().catch(() => {});
        const settings = systemsManager.getGuildSettings(guildId);

        const channelId = settings.leaderboardChannelId;

        const blacklistSet = new Set();
        for (const rId of LEADERBOARD_BLACKLIST_ROLE_IDS) {
            const role = guild.roles.cache.get(rId);
            if (role) role.members.forEach(m => blacklistSet.add(m.id));
        }

        const overallRaw = systemsManager.getOverallStats(guildId);
        const overallData = overallRaw
            .map(u => calculateUserPoints(u))
            .filter(u => !blacklistSet.has(u.userId))
            .sort((a, b) => b.finalPts - a.finalPts);
        const topOverall = overallData[0];

        const roleSpec = { roleId: LEADERBOARD_REWARD_ROLE_ID, userId: topOverall?.userId };

        const newTops = {
            topFinalUserId: topOverall?.userId || null,
        };

        const oldId = settings.topFinalUserId;
        if (oldId !== newTops.topFinalUserId) {
            const role = guild.roles.cache.get(LEADERBOARD_REWARD_ROLE_ID);
            await sendFirstPlaceAlert(guild, channelId, 'overall', oldId, newTops.topFinalUserId, role ? role.toString() : null);
            settings.topFinalUserId = newTops.topFinalUserId;
        }

        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

        const role = guild.roles.cache.get(roleSpec.roleId);
        if (role && guild.members.me.roles.highest.position > role.position) {
            const currentMembers = Array.from(role.members.values());
            const newMember = roleSpec.userId ? guild.members.cache.get(roleSpec.userId) : null;

            if (newMember && !blacklistSet.has(roleSpec.userId)) {
                if (!newMember.roles.cache.has(role.id)) {
                    await newMember.roles.add(role).catch(() => {});
                }
                for (const member of currentMembers) {
                    if (member.id !== newMember.id) {
                        await member.roles.remove(role).catch(() => {});
                    }
                }
            } else {
                for (const member of currentMembers) {
                    await member.roles.remove(role).catch(() => {});
                }
            }
        }

        systemsManager.setGuildSettings(guildId, newTops);
    } catch (err) {
        console.error(`[LeaderboardReward] Failed to update rewards for guild ${guildId}:`, err);
    }
}

module.exports = {
    postOrUpdateLeaderboard,
    updateLeaderboardRewards,
    formatLeaderboardEmbed,
    formatCoinLeaderboardEmbed,
    formatGemLeaderboardEmbed,
    formatValueLeaderboardEmbed,
    formatOverallLeaderboardEmbed,
    calculateCategoryPoints,
    calculateUserPoints,
    getMsUntilNextDailyUpdate,
    LEVEL_TO_EMOJI_ID_MAP,
    FINAL_POINTS_EMOJI
};
