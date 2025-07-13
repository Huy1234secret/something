const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

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
        // Filter out any invalid or empty rarity values before using them in
        // the select menu options. Invalid values were causing runtime errors
        // when adding the options to the StringSelectMenuBuilder.
        const rarities = [...new Set(
            fishData
                .map(f => f.rarity)
                .filter(r => typeof r === 'string' && r.trim())
        )];
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
            const value = known ? `Rarity: ${fish.rarity}\nHighest Weight: ${discovered.get(fish.name).toFixed(2)}` : '???';
            embed.addFields({ name, value, inline: false });
        }
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fish_index_prev').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('fish_index_next').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(pageCount === 1)
        );
        const select = new StringSelectMenuBuilder().setCustomId('fish_index_filter').setPlaceholder('choose rarity').addOptions(rarities.map(r => ({ label: r, value: r })));
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
