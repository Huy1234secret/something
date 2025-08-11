const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

function setup(client, { userStats }) {
  const command = new SlashCommandBuilder().setName('level-button').setDescription('Show your level with a button');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'level-button') return;
    const stats = userStats[interaction.user.id] || { level:1 };
    const embed = new EmbedBuilder().setTitle('Your Level').setDescription(`You are level **${stats.level}**!`);
    const button = new ButtonBuilder().setCustomId('get-level').setLabel('Get Level').setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);
    await interaction.reply({ embeds:[embed], components:[row] });
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== 'get-level') return;
    const stats = userStats[interaction.user.id] || { level:1 };
    await interaction.reply({ content: `You are level ${stats.level}`, ephemeral: true });
  });
}

module.exports = { setup };
