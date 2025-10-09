const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const {
  TextDisplayBuilder,
  ContainerBuilder,
} = require('@discordjs/builders');

const WARN = '<:SBWarning:1404101025849147432> ';

function createContainer(content) {
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function setup(client) {
  const command = new SlashCommandBuilder()
    .setName('purge-message')
    .setDescription('Delete recent messages in this channel')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User whose messages to delete')
        .setRequired(false),
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (max 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false);

  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'purge-message') return;
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased() || typeof channel.bulkDelete !== 'function') {
        await interaction.reply({
          components: [
            createContainer(`${WARN}This command can only be used in text channels.`),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      const amount = interaction.options.getInteger('amount');
      const user = interaction.options.getUser('user');

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      let deletedCount = 0;
      if (user) {
        const fetched = await channel.messages.fetch({ limit: 100 });
        const matching = Array.from(
          fetched.filter(message => message.author.id === user.id).values(),
        ).slice(0, amount);

        if (!matching.length) {
          await interaction.editReply({
            components: [
              createContainer(
                `${WARN}No recent messages from ${user} could be found to delete.`,
              ),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return;
        }

        const deleted = await channel
          .bulkDelete(matching, true)
          .catch(() => null);
        if (!deleted) {
          await interaction.editReply({
            components: [
              createContainer(
                `${WARN}Failed to delete messages. Messages older than 14 days cannot be deleted.`,
              ),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return;
        }
        deletedCount = deleted.size;
      } else {
        const deleted = await channel.bulkDelete(amount, true).catch(() => null);
        if (!deleted) {
          await interaction.editReply({
            components: [
              createContainer(
                `${WARN}Failed to delete messages. Messages older than 14 days cannot be deleted.`,
              ),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return;
        }
        deletedCount = deleted.size;
      }

      await interaction.editReply({
        components: [
          createContainer(
            deletedCount
              ? `Deleted ${deletedCount} message${deletedCount === 1 ? '' : 's'}${
                  user ? ` from ${user}.` : '.'
                }`
              : `${WARN}No messages were deleted. They may be older than 14 days or already removed.`,
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };
