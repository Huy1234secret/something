const { PermissionsBitField } = require('discord.js');

const WARNING_EMOJI = '<:warning:1404101025849147432> ';

async function addRoleCommand(message, args) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return message.reply(`${WARNING_EMOJI}Missing permissions.`);
  }
  const target = message.mentions.members.first();
  const role = message.mentions.roles.first();
  if (!target || !role) {
    return message.reply(`${WARNING_EMOJI}Usage: !add-role @user @role`);
  }
  try {
    await target.roles.add(role);
    await message.channel.send(`Added ${role} to ${target}.`);
  } catch (err) {
    await message.reply(`${WARNING_EMOJI}Failed to assign the role.`);
  }
}

module.exports = { addRoleCommand };
