const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

function parseDuration(str) {
  const units = { h: 3600, d: 86400, w: 604800, m: 2592000 };
  const amount = parseInt(str.slice(0, -1), 10);
  const unit = str.slice(-1).toLowerCase();
  if (isNaN(amount) || !units[unit]) return null;
  return amount * units[unit];
}

function setup(client, { scheduleRole }) {
  const command = new SlashCommandBuilder()
    .setName('add-role')
    .setDescription('Give a role to a user, optionally for a limited time')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
    .addStringOption(o => o.setName('time').setDescription('Duration like 1h or 7w').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'add-role') return;
    const user = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const time = interaction.options.getString('time');
    await interaction.deferReply({ ephemeral: true });
    try {
      await user.roles.add(role);
      await interaction.editReply(`Added ${role} to ${user}.`);
    } catch (err) {
      await interaction.editReply('Failed to assign the role.');
      return;
    }
    if (time) {
      const seconds = parseDuration(time);
      if (!seconds) {
        await interaction.followUp({ content: 'Invalid time format.', ephemeral: true });
        return;
      }
      const expiresAt = Date.now() / 1000 + seconds;
      scheduleRole(user.id, interaction.guild.id, role.id, expiresAt, true);
    }
  });
}

module.exports = { setup };
