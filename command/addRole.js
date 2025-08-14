const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, TextDisplayBuilder } = require('discord.js');

const WARN = '<:SBWarning:1404101025849147432> ';

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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    try {
      await user.roles.add(role);
      await interaction.editReply({
        components: [new TextDisplayBuilder().setContent(`Added ${role} to ${user}.`)],
      });
    } catch (err) {
      await interaction.editReply({
        components: [new TextDisplayBuilder().setContent(`${WARN}Failed to assign the role.`)],
      });
      return;
    }
    if (time) {
      const seconds = parseDuration(time);
      if (!seconds) {
        await interaction.followUp({
          components: [new TextDisplayBuilder().setContent(`${WARN}Invalid time format.`)],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }
      const expiresAt = Date.now() / 1000 + seconds;
      scheduleRole(user.id, interaction.guild.id, role.id, expiresAt, true);
    }
  });
}

async function handleTextCommand(message, args, { scheduleRole }) {
  if (args.length < 2) {
    await message.channel.send({
      components: [
        new TextDisplayBuilder().setContent(
          `${WARN}Usage: a. add role [userID] [roleID] [time]`,
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const [userId, roleId, time] = args;
  const guild = message.guild;
  const member = await guild.members.fetch(userId).catch(() => null);
  const role = guild.roles.cache.get(roleId);
  if (!member || !role) {
    await message.channel.send({
      components: [new TextDisplayBuilder().setContent(`${WARN}Invalid user or role ID.`)],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  try {
    await member.roles.add(role);
    await message.channel.send({
      components: [new TextDisplayBuilder().setContent(`Added ${role} to <@${userId}>.`)],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch {
    await message.channel.send({
      components: [new TextDisplayBuilder().setContent(`${WARN}Failed to assign the role.`)],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (time) {
    const seconds = parseDuration(time);
    if (!seconds) {
      await message.channel.send({
        components: [new TextDisplayBuilder().setContent(`${WARN}Invalid time format.`)],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }
    const expiresAt = Date.now() / 1000 + seconds;
    scheduleRole(userId, guild.id, roleId, expiresAt, true);
  }
}

module.exports = { setup, handleTextCommand };
