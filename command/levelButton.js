const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, TextDisplayBuilder } = require('discord.js');

function setup(client, { userStats }) {
  const command = new SlashCommandBuilder().setName('level-button').setDescription('Show your level with a button');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'level-button') return;
    const stats = userStats[interaction.user.id] || { level:1 };
    const button = new ButtonBuilder().setCustomId('get-level').setLabel('Get Level').setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);
    await interaction.reply({
      components: [
        new TextDisplayBuilder().setContent(`# Your Level\nYou are level **${stats.level}**!`),
        row,
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== 'get-level') return;
    const stats = userStats[interaction.user.id] || { level:1 };
    await interaction.reply({
      components: [new TextDisplayBuilder().setContent(`You are level ${stats.level}`)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  });
}

module.exports = { setup };
