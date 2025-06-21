const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { initializeTicketHunt } = require('../ticketHunt.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start-hunt')
    .setDescription('Enable the ticket hunt by reacting to all hunt messages.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction, client) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }
    const c = client || interaction.client;
    await interaction.reply({ content: '🔍 Starting the ticket hunt...', ephemeral: true });
    try {
      await initializeTicketHunt(c);
      await interaction.editReply({ content: '✅ Ticket hunt started!' });
    } catch (err) {
      console.error(`[start-hunt] Failed to start hunt: ${err.message}`);
      await interaction.editReply({ content: '❌ Failed to start ticket hunt.' });
    }
  },
};
