const {
  MessageFlags,
  ButtonStyle,
  RESTJSONErrorCodes,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require('@discordjs/builders');
const { setSafeTimeout } = require('./utils');

const LUNAR_EVENT_CHANNEL_ID = '1428060582095093974';
const LUNAR_EVENT_ROLE_ID = '1428070619311767593';
const LUNAR_EVENT_BUTTON_ID = 'lunar-event-participate';
const ANNOUNCEMENT_COLOR = 0x57f287;
const DM_COLOR = 0x57f287;
const LUNAR_EVENT_CLOSE_DATE = new Date(Date.UTC(2026, 0, 31, 17, 0, 0));
const LUNAR_EVENT_CLOSE_TIMESTAMP = Math.floor(LUNAR_EVENT_CLOSE_DATE.getTime() / 1000);

let closeRefreshTimeout = null;

function isEventClosed(now = new Date()) {
  return now.getTime() >= LUNAR_EVENT_CLOSE_DATE.getTime();
}

function buildAnnouncementContainer(now = new Date()) {
  const lines = [
    '## Lunar New Year Event Entrance',
    '* Wanna participate? If yes, then press the button below!',
    `-# The application close <t:${LUNAR_EVENT_CLOSE_TIMESTAMP}:R>`,
  ];
  const container = new ContainerBuilder()
    .setAccentColor(ANNOUNCEMENT_COLOR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

  const button = new ButtonBuilder()
    .setCustomId(LUNAR_EVENT_BUTTON_ID)
    .setLabel('Participate!')
    .setStyle(ButtonStyle.Success)
    .setDisabled(isEventClosed(now));

  container.addActionRowComponents(new ActionRowBuilder().addComponents(button));
  return container;
}

function buildDirectMessageContainer(userMention) {
  const lines = [
    `## Hey ${userMention}!`,
    '* You have participated the **Lunar New Year Event**! Be sure to read all information in https://discord.com/channels/1372572233930903592/1428060582095093974 before playing!',
    '-# Note: we will announce these information soon: Start Date, Game Start Date. So be sure to check those info when we announce! Goodluck, the 100$ giftcard is waiting for the chosen.',
  ];
  return new ContainerBuilder()
    .setAccentColor(DM_COLOR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
}

function buildInteractionResponseContainer({ alreadyJoined, roleApplied, roleError, dmSuccess, dmError }) {
  const lines = [];
  if (alreadyJoined) {
    lines.push('* You are already participating in the Lunar New Year Event.');
  } else if (roleApplied) {
    lines.push('* You have been enrolled in the Lunar New Year Event.');
  } else {
    lines.push('* Unable to confirm your enrollment.');
  }

  if (roleError) {
    lines.push(`-# I could not update your roles: ${roleError}`);
  }

  if (dmSuccess) {
    lines.push('* Check your DMs for more information.');
  }
  if (dmError) {
    lines.push(`-# I could not DM you: ${dmError}`);
  }

  const container = new ContainerBuilder()
    .setAccentColor(ANNOUNCEMENT_COLOR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

  return container;
}

async function fetchAnnouncementChannel(client) {
  try {
    const channel = await client.channels.fetch(LUNAR_EVENT_CHANNEL_ID);
    if (!channel || typeof channel.send !== 'function') {
      return null;
    }
    return channel;
  } catch (error) {
    console.warn('Failed to fetch Lunar New Year announcement channel:', error.message);
    return null;
  }
}

function scheduleCloseRefresh(client, resources) {
  if (closeRefreshTimeout) {
    clearTimeout(closeRefreshTimeout);
    closeRefreshTimeout = null;
  }
  const delay = LUNAR_EVENT_CLOSE_DATE.getTime() - Date.now();
  if (delay <= 0) {
    setImmediate(() => {
      ensureAnnouncementMessage(client, resources, { forceUpdate: true }).catch(() => {});
    });
    return;
  }
  closeRefreshTimeout = setSafeTimeout(() => {
    closeRefreshTimeout = null;
    ensureAnnouncementMessage(client, resources, { forceUpdate: true }).catch(() => {});
  }, delay);
}

async function ensureAnnouncementMessage(client, resources, { forceUpdate = false } = {}) {
  const channel = await fetchAnnouncementChannel(client);
  if (!channel) return;

  const now = new Date();
  const container = buildAnnouncementContainer(now);
  const eventClosed = isEventClosed(now);
  const messageId = resources.getLunarNewYearEventMessageId();

  if (messageId) {
    try {
      const message = await channel.messages.fetch(messageId);
      await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
      if (!eventClosed) {
        scheduleCloseRefresh(client, resources);
      }
      return;
    } catch (error) {
      if (error.code === RESTJSONErrorCodes.UnknownMessage) {
        resources.clearLunarNewYearEventMessageId();
        resources.saveData();
      } else if (!forceUpdate) {
        console.warn('Failed to update Lunar New Year announcement message:', error.message);
        return;
      }
    }
  }

  try {
    const sentMessage = await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    resources.setLunarNewYearEventMessageId(sentMessage.id);
    resources.saveData();
    if (!eventClosed) {
      scheduleCloseRefresh(client, resources);
    }
  } catch (error) {
    console.warn('Failed to send Lunar New Year announcement message:', error.message);
  }
}

async function handleParticipation(interaction, client, resources) {
  if (isEventClosed()) {
    await ensureAnnouncementMessage(client, resources, { forceUpdate: true });
    const container = new ContainerBuilder()
      .setAccentColor(ANNOUNCEMENT_COLOR)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('* Applications are now closed.')
      );
    await interaction.reply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
    return;
  }

  let dmSuccess = false;
  let dmError = null;
  try {
    const dmContainer = buildDirectMessageContainer(interaction.user.toString());
    await interaction.user.send({
      components: [dmContainer],
      flags: MessageFlags.IsComponentsV2,
    });
    dmSuccess = true;
  } catch (error) {
    dmError = error.message || 'unknown error';
  }

  let roleApplied = false;
  let alreadyJoined = false;
  let roleError = null;
  if (interaction.guild) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(LUNAR_EVENT_ROLE_ID)) {
        alreadyJoined = true;
      } else {
        await member.roles.add(LUNAR_EVENT_ROLE_ID, 'Lunar New Year Event participation');
        roleApplied = true;
      }
    } catch (error) {
      roleError = error.message || 'unknown error';
      console.warn('Failed to assign Lunar New Year role:', error.message);
    }
  } else {
    roleError = 'unable to determine the server context';
  }

  const responseContainer = buildInteractionResponseContainer({
    alreadyJoined,
    roleApplied,
    roleError,
    dmSuccess,
    dmError,
  });

  await interaction.reply({
    components: [responseContainer],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

function setup(client, resources) {
  client.once('ready', async () => {
    await ensureAnnouncementMessage(client, resources);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== LUNAR_EVENT_BUTTON_ID) return;

    try {
      await handleParticipation(interaction, client, resources);
    } catch (error) {
      console.error('Failed to process Lunar New Year participation:', error);
      if (!interaction.replied) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('An error occurred while processing your participation.')
          );
        await interaction.reply({
          components: [container],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }
    }
  });
}

module.exports = {
  setup,
  ensureAnnouncementMessage,
};
