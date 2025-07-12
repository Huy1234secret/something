const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
        const pageCount = Math.max(1, Math.ceil(fishData.length / pageSize));
        const page = 1;
        const embed = new EmbedBuilder()
            .setTitle('Fish Index')
            .setColor('#3498DB')
            .setDescription(`Page ${page}/${pageCount}`);
        for (const fish of fishData.slice(0, pageSize)) {
            const known = discovered.has(fish.name);
            const name = known ? `${fish.name} ${fish.emoji || ''}` : '???';
            const value = known ? `Rarity: ${fish.rarity}\nHighest Weight: ${discovered.get(fish.name).toFixed(2)}` : '???';
            embed.addFields({ name, value, inline: false });
        }
        const replyOpts = { embeds: [embed], ephemeral: false };
        if (interaction.deferred || interaction.replied) return interaction.editReply(replyOpts);
        return interaction.reply(replyOpts);
    }
};
