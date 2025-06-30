const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameConfig = require('../game_config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('award-badge')
        .setDescription('Award a badge to a user (Owner only)')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(o => {
            o.setName('badge').setDescription('Badge ID').setRequired(true).setAutocomplete(true);
            const badges = gameConfig.badges || {};
            Object.values(badges).slice(0, 25).forEach(b => {
                o.addChoices({ name: b.name, value: b.id });
            });
            return o;
        }),
    async execute(interaction, client) {
        if (interaction.user.id !== '902736357766594611') {
            const replyOpts = { content: 'Owner only.', ephemeral: true };
            if (interaction.deferred || interaction.replied) return interaction.editReply(replyOpts);
            return interaction.reply(replyOpts);
        }
        const badgeId = interaction.options.getString('badge');
        const targetUser = interaction.options.getUser('user');
        const systems = client.levelSystem;
        const badge = systems.getAllBadges()[badgeId];
        if (!badge) {
            const replyOpts = { content: 'Badge not found.', ephemeral: true };
            if (interaction.deferred || interaction.replied) return interaction.editReply(replyOpts);
            return interaction.reply(replyOpts);
        }
        const result = systems.awardBadge(targetUser.id, interaction.guild.id, badgeId);
        if (result.success) {
            try {
                await targetUser.send({ embeds: [
                    new (require('discord.js').EmbedBuilder)()
                        .setColor(0xF1C40F)
                        .setTitle('CONGRATULATION')
                        .setDescription(`hey ${targetUser} you have obtained ${badge.name} ${badge.emoji} badge!`)
                        .addFields({ name: 'perk gained', value: badge.perk })
                ] });
            } catch {}
            const replyOpts = { content: `Badge awarded to ${targetUser.tag}.`, ephemeral: true };
            if (interaction.deferred || interaction.replied) await interaction.editReply(replyOpts);
            else await interaction.reply(replyOpts);
        } else {
            const replyOpts = { content: result.message || 'User already has this badge.', ephemeral: true };
            if (interaction.deferred || interaction.replied) await interaction.editReply(replyOpts);
            else await interaction.reply(replyOpts);
        }
    }
};
