const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const RARITY_MAP = { C: 'Common', U: 'Uncommon', R: 'Rare', E: 'Epic', L: 'Legendary', M: 'Mythical', S: 'Secret' };
const RARITY_REVERSE_MAP = { Common: 'C', Uncommon: 'U', Rare: 'R', Epic: 'E', Legendary: 'L', Mythical: 'M', Secret: 'S' };
const ORDERED_RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical', 'Secret'];
const RARITY_COLORS = {
    Common: '#FFFFFF',
    Uncommon: '#75FF75',
    Rare: '#94CAFF',
    Epic: '#FF94FF',
    Legendary: '#FFFF00',
    Mythical: '#FF4D00',
    Secret: '#B700FF'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish-index')
        .setDescription('View your discovered fish.'),
    async execute(interaction) {
        const client = interaction.client;
        const fishData = client.fishData || [];
        const key = `${interaction.user.id}_${interaction.guild.id}`;
        const inv = client.userFishInventories.get(key) || [];
        const discovered = new Map();
        for (const f of inv) {
            const cur = discovered.get(f.name) || 0;
            if (f.weight > cur) discovered.set(f.name, f.weight);
        }
        const pageSize = 10;
        const page = 1;
        const rarities = ORDERED_RARITIES;
        const list = fishData;
        const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
        const embed = new EmbedBuilder()
            .setTitle('Fish Index')
            .setColor('#3498DB')
            .setDescription(`Page ${page}/${pageCount}`)
            .setFooter({ text: `Total fish: ${fishData.length}` });
        for (const fish of list.slice(0, pageSize)) {
            const known = discovered.has(fish.name);
            const name = known ? `${fish.name} ${fish.emoji || ''}` : '???';
            const rarityName = RARITY_MAP[fish.rarity] || fish.rarity;
            const value = known ? `Rarity: ${rarityName}\nHighest Weight: ${discovered.get(fish.name).toFixed(2)}` : '???';
            embed.addFields({ name, value, inline: false });
        }
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fish_index_prev').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('fish_index_next').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(pageCount === 1)
        );
        const select = new StringSelectMenuBuilder()
            .setCustomId('fish_index_filter')
            .setPlaceholder('choose rarity')
            .addOptions(rarities.map(r => ({ label: r, value: r })));
        const row2 = new ActionRowBuilder().addComponents(select);
        const replyOpts = {
            embeds: [embed],
            components: [row, row2],
            fetchReply: true,
            ephemeral: false,
        };

        const sent = interaction.deferred || interaction.replied
            ? await interaction.editReply(replyOpts)
            : await interaction.reply(replyOpts);

        client.fishIndexSessions.set(sent.id, {
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            page,
            rarity: null,
        });
    }
};
