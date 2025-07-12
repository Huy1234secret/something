const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { buildFishMarketEmbed } = require('../utils/fishMarketNotifier');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish-store')
        .setDescription('Send the fishing shop embed'),
    async execute(interaction) {
        const rod = interaction.client.levelSystem.gameConfig.items['fishing_rod_tier1'];
        const bait = interaction.client.levelSystem.gameConfig.items['worm'];
        const embed = new EmbedBuilder()
            .setTitle('Fishing Shop')
            .setColor('#95a5a6')
            .addFields(
                { name: `${rod.name} ${rod.emoji}`, value: `Cost: 10,000 coins`, inline: false },
                { name: `${bait.name} ${bait.emoji}`, value: `Cost: 100 coins each`, inline: false }
            );
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_fishrod').setLabel('Buy').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('buy_bait').setLabel('Buy').setStyle(ButtonStyle.Primary)
        );
        const channel = await interaction.client.channels.fetch('1393515441296773191').catch(()=>null);
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds:[embed], components:[row] }).catch(()=>{});
            const market = buildFishMarketEmbed();
            await channel.send({ embeds:[market.embed], components:[market.row] }).catch(()=>{});
        }
        await interaction.reply({ content:'Fish shop sent.', ephemeral:true });
    }
};
