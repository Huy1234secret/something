const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COIN_BOOST_EMOJI = '<:scoinmulti:1384503519330959380>';
const GEM_BOOST_EMOJI = '<:sgemmulti:1384507113048506428>';
const XP_BOOST_EMOJI = '<:sxpmulti:1384502410059317410>';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-badge')
        .setDescription('View your obtained and unobtained badges'),
    async execute(interaction, client) {
        const systems = client.levelSystem;
        const allBadges = systems.getAllBadges();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const obtainedIds = systems.getUserBadgeIds(userId, guildId);
        const obtainedList = Object.values(allBadges).filter(b => obtainedIds.includes(b.id));
        const unobtainedList = Object.values(allBadges).filter(b => !obtainedIds.includes(b.id));
        const buildEmbed = (type, page) => {
            const list = type === 'obtained' ? obtainedList : unobtainedList;
            const pageCount = Math.max(1, Math.ceil(list.length / 25));
            page = Math.min(Math.max(page, 1), pageCount);
            const embed = new EmbedBuilder()
                .setColor(type === 'obtained' ? 0x2ecc71 : 0xe74c3c)
                .setTitle(type === 'obtained' ? 'Obtained Badges' : 'Unobtained Badges')
                .setDescription(`### Page ${page}/${pageCount}`);
            const start = (page - 1) * 25;
            for (const b of list.slice(start, start + 25)) {
                const typeLine = b.type.includes('limited') ? `<:limites:1389227936569233458> LIMITED ${b.type.includes('unobtainable') ? '- <:nos:1389227923965476905> Unobtainable' : '- <:yess:1389227929392644218> Obtainable'}` : (b.type.includes('unobtainable') ? '<:nos:1389227923965476905> Unobtainable' : '<:yess:1389227929392644218> Obtainable');

                const perkWithEmojis = (b.perk || '')
                    .replace(/\bcoin\b/gi, `coin ${COIN_BOOST_EMOJI}`)
                    .replace(/\bgem\b/gi, `gem ${GEM_BOOST_EMOJI}`)
                    .replace(/\bxp\b/gi, `xp ${XP_BOOST_EMOJI}`);

                embed.addFields({
                    name: `${b.name} ${b.emoji || ''}`,
                    value: `* **Obtainment:** ${b.obtainment}\n* **Perk:** ${perkWithEmojis}\n**- ${typeLine}**`,
                    inline: false
                });
            }
            embed.setFooter({ text: `You have obtained ${obtainedList.length} out of ${Object.keys(allBadges).length} badges` });
            return { embed, pageCount, page };
        };
        const buildComponents = (type, page, pageCount) => {
            const prev = new ButtonBuilder()
                .setCustomId(`badge_goto_${type}_${page-1}`)
                .setLabel(`⬅️ - ${page-1}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1);
            const next = new ButtonBuilder()
                .setCustomId(`badge_goto_${type}_${page+1}`)
                .setLabel(`${page} - ➡️`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= pageCount);
            const obtainedBtn = new ButtonBuilder()
                .setCustomId(`badge_view_obtained_${page}`)
                .setLabel('obtained')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(type === 'obtained');
            const unobtainedBtn = new ButtonBuilder()
                .setCustomId(`badge_view_unobtained_${page}`)
                .setLabel('unobtained')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(type === 'unobtained');
            return [new ActionRowBuilder().addComponents(prev, obtainedBtn, unobtainedBtn, next)];
        };
        const { embed, pageCount } = buildEmbed('obtained', 1);
        const components = buildComponents('obtained', 1, pageCount);
        await interaction.reply({ embeds: [embed], components, ephemeral: false });
    }
};
