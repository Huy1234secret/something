const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('today-fish')
        .setDescription('View fish available this season'),
    async execute(interaction) {
        const client = interaction.client;
        if (typeof client.getCurrentSeasonIndex !== 'function') return interaction.reply({ content: 'Season data unavailable.', ephemeral: true });
        const seasonIdx = client.getCurrentSeasonIndex();
        const keyName = ['springChance','summerChance','autumnChance','winterChance'][seasonIdx];
        const fishData = client.fishData || [];
        const key = `${interaction.user.id}_${interaction.guild.id}`;
        const inv = client.userFishInventories.get(key) || [];
        const discovered = new Set(inv.map(f => f.name));
        const list = fishData.filter(f => (f[keyName] || 0) > 0 && f.rarity !== 'S');
        const embed = new EmbedBuilder()
            .setTitle('Today Fish')
            .setColor('#2ecc71');
        for (const fish of list) {
            const known = discovered.has(fish.name);
            const name = known ? `${fish.name} ${fish.emoji || ''}` : '???';
            embed.addFields({ name, value: known ? fish.rarity : '???', inline: false });
        }
        await interaction.reply({ embeds:[embed], ephemeral:false });
    }
};
