const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ThumbnailBuilder,
  SectionBuilder,
} = require('@discordjs/builders');
const { setSafeTimeout } = require('./utils');

const EVENT_ROLE_ID = '1374410305991610520';
const PARTICIPANT_CHANNEL_ID = '1372572234949853367';
const JOIN_BUTTON_ID = 'spooky-hunt-join';
const SUBMIT_BUTTON_ID = 'spooky-hunt-submit';
const MODAL_ID = 'spooky-hunt-answer';
const DELUXE_EMOJI = '<:CRDeluxeCoin:1405595587780280382>';
const CORRECT_ANSWER = normalizeAnswer('NEVER BLOW OUT THE SEVENTH CANDLE');
const DECAY_DURATION = 24 * 60 * 60 * 1000;
const MAX_HEARTS = 7;
// Automatically remove staff notification messages shortly after they are sent
// so the channel stays tidy when participants join repeatedly.
const PARTICIPANT_NOTIFICATION_TTL = 60 * 1000;

function normalizeAnswer(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureState(state) {
  if (!state) return;
  state.message_id = state.message_id || null;
  state.channel_id = state.channel_id || null;
  state.guild_id = state.guild_id || null;
  state.parent_id = state.parent_id || null;
  state.participants = state.participants || {};
  state.ended = Boolean(state.ended);
  state.winner_id = state.winner_id || null;
  for (const entry of Object.values(state.participants)) {
    if (!entry || typeof entry !== 'object') continue;
    entry.channel_id = entry.channel_id || null;
    entry.hearts = typeof entry.hearts === 'number' ? entry.hearts : MAX_HEARTS;
    entry.next_decay_at = entry.next_decay_at || null;
    entry.eliminated = Boolean(entry.eliminated);
    entry.notified = Boolean(entry.notified);
  }
}

function buildEventContainer(state) {
  const disabled = state.ended;
  const joinButton = new ButtonBuilder()
    .setCustomId(JOIN_BUTTON_ID)
    .setLabel('Sell your soul to the Reaper')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disabled);

  const container = new ContainerBuilder()
    .setAccentColor(0xffa500)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('@here'))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '### The old manor opens once a year. Seven candles are lit, seven rooms unlock, and one truth waits at the end. Recover the Key, open the Door, then trace the Path. Fail, and the last candle goes out.\nAre you ready for halloween puzzle solving? You only have 7 candles equal your 7 hearts.\n* Submit wrong answer will lose 1 heart.\n* Not submitting CORRECT answer after 24h will lose 1 heart.\n* Losing all hearts will be eliminated, your soul won\'t be back to your body until the event ends or someone won.\n-# Means you will forever be muted \n* Submitting CORRECT answer will win = event ends.\n-# Participate? Simply press the button below!'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(joinButton));

  if (state.ended) {
    const winnerText = state.winner_id
      ? `Winner: <@${state.winner_id}>`
      : 'Event concluded.';
    container
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${winnerText}`)
      );
  }

  return container;
}

async function sendEventMessage(channel, state) {
  const container = buildEventContainer(state);
  return channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: ['everyone'] },
  });
}

function scheduleDecay(state, userId, client, saveData, decayTimers) {
  const entry = state.participants[userId];
  if (!entry || entry.eliminated || state.ended) return;
  if (!entry.next_decay_at) {
    entry.next_decay_at = Date.now() + DECAY_DURATION;
    saveData();
  }
  if (entry.next_decay_at <= Date.now()) {
    clearTimeout(decayTimers.get(userId));
    decayTimers.delete(userId);
    handleDecay(state, userId, client, saveData, decayTimers).catch(() => {});
    return;
  }
  clearTimeout(decayTimers.get(userId));
  const delay = Math.max(0, entry.next_decay_at - Date.now());
  const timeout = setSafeTimeout(() => {
    decayTimers.delete(userId);
    handleDecay(state, userId, client, saveData, decayTimers).catch(() => {});
  }, delay);
  decayTimers.set(userId, timeout);
}

async function handleDecay(state, userId, client, saveData, decayTimers) {
  const entry = state.participants[userId];
  if (!entry || entry.eliminated || state.ended) return;
  entry.hearts = Math.max(0, (entry.hearts || MAX_HEARTS) - 1);
  entry.next_decay_at = Date.now() + DECAY_DURATION;
  saveData();

  const channel = await fetchChannel(entry.channel_id, client);
  if (channel) {
    const container = new ContainerBuilder()
      .setAccentColor(0xffa500)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### A candle flickers out...\nYou lost a heart for not solving the manor in time. Hearts remaining: ${entry.hearts}/${MAX_HEARTS}.`
        )
      );
    channel
      .send({ components: [container], flags: MessageFlags.IsComponentsV2 })
      .catch(() => {});
  }

  if (entry.hearts <= 0) {
    await eliminateParticipant(state, userId, client, saveData, decayTimers, 'All seven candles have gone dark. The manor rejects you.');
    return;
  }
  scheduleDecay(state, userId, client, saveData, decayTimers);
}

async function fetchChannel(channelId, client) {
  if (!channelId) return null;
  const cached = client.channels.cache.get(channelId);
  if (cached) return cached;
  try {
    return await client.channels.fetch(channelId);
  } catch {
    return null;
  }
}

async function sendParticipantRequestNotification(client, user, participantChannel) {
  const requestChannel = await fetchChannel(
    PARTICIPANT_CHANNEL_ID,
    client
  );
  if (!requestChannel || !requestChannel.isTextBased()) {
    console.warn('Spooky hunt participant request channel unavailable');
    return false;
  }

  const container = new ContainerBuilder()
    .setAccentColor(0xffa500)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('### Spooky Hunt participant request')
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user} has stepped into the manor.`
      )
    );

  if (participantChannel?.isTextBased?.() || participantChannel?.toString) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Relic chamber: ${participantChannel}`
      )
    );
  }

  try {
    const message = await requestChannel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    if (PARTICIPANT_NOTIFICATION_TTL > 0) {
      setSafeTimeout(() => {
        message.delete().catch(() => {});
      }, PARTICIPANT_NOTIFICATION_TTL);
    } else {
      message.delete().catch(() => {});
    }
    return true;
  } catch (error) {
    console.error('Failed to send spooky hunt participant notification', error);
    return false;
  }
}

async function eliminateParticipant(state, userId, client, saveData, decayTimers, reason) {
  const entry = state.participants[userId];
  if (!entry) return;
  clearTimeout(decayTimers.get(userId));
  decayTimers.delete(userId);
  entry.eliminated = true;
  saveData();

  const guild = client.guilds.cache.get(state.guild_id || '') || null;
  if (guild) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      member.roles.remove(EVENT_ROLE_ID).catch(() => {});
    }
    if (entry.channel_id) {
      const channel = await fetchChannel(entry.channel_id, client);
      if (channel && channel.isTextBased()) {
        await channel.permissionOverwrites
          .edit(guild.roles.everyone, { ViewChannel: false })
          .catch(() => {});
        await channel.permissionOverwrites
          .edit(userId, { ViewChannel: false, SendMessages: false })
          .catch(() => {});
        const container = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ${reason}\n-# You may remain until the event ends, but you cannot continue.`
            )
          );
        channel
          .send({ components: [container], flags: MessageFlags.IsComponentsV2 })
          .catch(() => {});
      }
    }
  }
}

async function ensureEventMessage(state, client, saveData) {
  const channel = await fetchChannel(PARTICIPANT_CHANNEL_ID, client);
  if (!channel || !channel.isTextBased()) return;

  let dirty = false;
  if (state.channel_id !== channel.id) {
    state.channel_id = channel.id;
    dirty = true;
  }
  const guildId = channel.guildId || channel.guild?.id || null;
  if (state.guild_id !== guildId) {
    state.guild_id = guildId;
    dirty = true;
  }
  const parentId = channel.parentId || null;
  if (state.parent_id !== parentId) {
    state.parent_id = parentId;
    dirty = true;
  }
  if (dirty) {
    saveData();
  }

  let message = null;
  if (state.message_id) {
    message = await channel.messages.fetch(state.message_id).catch(() => null);
  }

  if (!message) {
    const sent = await sendEventMessage(channel, state).catch(() => null);
    if (sent) {
      state.message_id = sent.id;
      saveData();
    }
    return;
  }

  const container = buildEventContainer(state);
  message
    .edit({ components: [container], flags: MessageFlags.IsComponentsV2 })
    .catch(() => {});
}

function buildParticipantContainer(user) {
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user} Claim your three relics—somewhere in the third, the answer stirs awake 🎃`
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# only 1 answer, use 3 relics to solve')
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(SUBMIT_BUTTON_ID)
          .setLabel('Submit Answer')
          .setStyle(ButtonStyle.Secondary)
      )
    );
}

async function sendRelicSet(channel, user) {
  await channel.send({
    components: [buildParticipantContainer(user)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { users: [user.id] },
  });

  const relics = [
    {
      title: 'Relic 1',
      url: 'https://i.ibb.co/23Jk7T8T/relicA.png',
    },
    {
      title: 'Relic 2',
      url: 'https://i.ibb.co/hxzKHR7G/h.png',
    },
    {
      title: 'Relic 3',
      url: 'https://i.ibb.co/ympdrH10/Screenshot-2025-10-04-215050.png',
    },
  ];

  for (const relic of relics) {
    await channel
      .send({
        content: relic.title,
        embeds: [
          {
            image: { url: relic.url },
          },
        ],
      })
      .catch(() => {});
  }
}

async function createParticipantChannel(state, interaction, saveData) {
  const guild = interaction.guild;
  if (!guild) throw new Error('Guild unavailable');
  const user = interaction.user;

  const baseName = `relic-${user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 60)
    .replace(/-{2,}/g, '-');
  const name = baseName.length ? baseName : `relic-${user.id}`;

  const overwrites = [
    {
      id: guild.roles.everyone,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: guild.members.me?.id || interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: state.parent_id || undefined,
    permissionOverwrites: overwrites,
    reason: 'Spooky Hunt participation channel',
  });

  await sendRelicSet(channel, user);

  return channel;
}

async function finalizeEvent(state, client, saveData, decayTimers, winner) {
  if (!state.channel_id) return;
  const channel = await fetchChannel(state.channel_id, client);
  if (!channel || !channel.isTextBased()) return;

  state.ended = true;
  state.winner_id = winner.id;
  saveData();

  const winnerAvatar = winner.displayAvatarURL();
  const container = new ContainerBuilder()
    .setAccentColor(0x00aa5b)
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(winnerAvatar))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## Congratulation ${winner}!\nYou have solved and found the answer`
          ),
          new TextDisplayBuilder().setContent(
            '-# the answer was **NEVER BLOW OUT THE SEVENTH CANDLE**'
          )
        )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `You earned:\n* 1000 Deluxe Coins ${DELUXE_EMOJI}\n* 10$ giftcard`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Bonus prizes for others: 100 Deluxe Coins ${DELUXE_EMOJI}`
      )
    );

  channel
    .send({ components: [container], flags: MessageFlags.IsComponentsV2 })
    .catch(() => {});

  const participantEntries = Object.entries(state.participants || {});
  state.participants = {};
  saveData();

  for (const [, timeout] of decayTimers.entries()) {
    clearTimeout(timeout);
  }
  decayTimers.clear();

  const guild = client.guilds.cache.get(state.guild_id || '') || null;
  if (guild) {
    await Promise.allSettled(
      participantEntries.map(async ([userId, entry]) => {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          await member.roles.remove(EVENT_ROLE_ID).catch(() => {});
        }
        if (entry.channel_id) {
          const priv = await fetchChannel(entry.channel_id, client);
          if (priv) {
            await priv.delete('Spooky Hunt concluded').catch(() => {});
          }
        }
      })
    );
  }

  await Promise.allSettled(
    participantEntries.map(async ([userId]) => {
      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) return;
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '### The Spooky Hunt has come to an end!'
          )
        );
      await user
        .send({ components: [container], flags: MessageFlags.IsComponentsV2 })
        .catch(() => {});
    })
  );

  await ensureEventMessage(state, client, saveData);
}

function setup(client, resources) {
  const { spookyHuntState, saveData } = resources;
  ensureState(spookyHuntState);
  const decayTimers = new Map();

  const command = new SlashCommandBuilder()
    .setName('spooky-hunt-event')
    .setDescription('Post or restore the Spooky Hunt event message in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  client.application.commands.create(command).catch(() => {});

  for (const userId of Object.keys(spookyHuntState.participants)) {
    scheduleDecay(spookyHuntState, userId, client, saveData, decayTimers);
  }

  ensureEventMessage(spookyHuntState, client, saveData).catch(() => {});

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName !== 'spooky-hunt-event') return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!interaction.inGuild()) {
          await interaction.editReply('This command can only be used in a server channel.');
          return;
        }
        const channel = await fetchChannel(PARTICIPANT_CHANNEL_ID, client);
        if (!channel || !channel.isTextBased()) {
          await interaction.editReply(
            'The Spooky Hunt participant channel is unavailable. Please confirm the bot can access it.'
          );
          return;
        }

        spookyHuntState.channel_id = channel.id;
        spookyHuntState.guild_id = channel.guildId || channel.guild?.id || null;
        spookyHuntState.parent_id = channel.parentId || null;
        saveData();

        await ensureEventMessage(spookyHuntState, client, saveData);
        if (!spookyHuntState.message_id) {
          await interaction.editReply('Failed to send the event message.');
          return;
        }
        await interaction.editReply(
          `The Spooky Hunt message is active: ${channel}`
        );
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId === JOIN_BUTTON_ID) {
          if (!interaction.inGuild()) {
            await interaction.reply({
              content: 'This button can only be used inside a server.',
              ephemeral: true,
            });
            return;
          }

          if (spookyHuntState.ended) {
            await interaction.reply({
              content: 'The Spooky Hunt has already concluded.',
              ephemeral: true,
            });
            return;
          }

          const userId = interaction.user.id;
          const guildId = interaction.guildId;
          spookyHuntState.guild_id = guildId;
          spookyHuntState.parent_id = interaction.channel?.parentId || spookyHuntState.parent_id;
          saveData();

          let entry = spookyHuntState.participants[userId];
          if (!entry) {
            entry = {
              channel_id: null,
              hearts: MAX_HEARTS,
              next_decay_at: Date.now() + DECAY_DURATION,
              eliminated: false,
              notified: false,
            };
            spookyHuntState.participants[userId] = entry;
            saveData();
          }

          if (entry.eliminated) {
            await interaction.reply({
              content: 'Your candles have gone dark. Wait until the event ends.',
              ephemeral: true,
            });
            return;
          }

          let channel = await fetchChannel(entry.channel_id, client);
          let createdNewChannel = false;
          if (!channel) {
            channel = await createParticipantChannel(spookyHuntState, interaction, saveData).catch(() => null);
            if (!channel) {
              await interaction.reply({
                content: 'Unable to prepare your relic chamber. Please contact staff.',
                ephemeral: true,
              });
              return;
            }
            entry.channel_id = channel.id;
            entry.next_decay_at = Date.now() + DECAY_DURATION;
            entry.hearts = entry.hearts || MAX_HEARTS;
            saveData();
            createdNewChannel = true;
          }

          scheduleDecay(spookyHuntState, userId, client, saveData, decayTimers);

          const member = interaction.member;
          if (member && member.manageable) {
            member.roles.add(EVENT_ROLE_ID).catch(() => {});
          } else if (member) {
            member.roles.add(EVENT_ROLE_ID).catch(() => {});
          }

          await interaction.reply({
            content: `Your relic chamber awaits: ${channel}`,
            ephemeral: true,
          });

          const shouldNotify = createdNewChannel || !entry.notified;
          if (shouldNotify) {
            try {
              const notified = await sendParticipantRequestNotification(
                client,
                interaction.user,
                channel
              );
              if (notified) {
                entry.notified = true;
                saveData();
              }
            } catch (error) {
              console.error('Failed to notify spooky hunt staff', error);
            }
          }
          return;
        }
        if (interaction.customId === SUBMIT_BUTTON_ID) {
          if (!interaction.inGuild()) {
            await interaction.reply({
              content: 'Submissions are only accepted inside the manor.',
              ephemeral: true,
            });
            return;
          }
          const entry = spookyHuntState.participants[interaction.user.id];
          if (!entry || entry.eliminated) {
            await interaction.reply({
              content: 'You are not part of the hunt.',
              ephemeral: true,
            });
            return;
          }
          const modal = new ModalBuilder()
            .setCustomId(MODAL_ID)
            .setTitle('Submit Answer')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('answer')
                  .setLabel('Whisper your answer')
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(true)
              )
            );
          await interaction.showModal(modal);
          return;
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId !== MODAL_ID) return;
        const userId = interaction.user.id;
        const entry = spookyHuntState.participants[userId];
        if (!entry || entry.eliminated) {
          await interaction.reply({
            content: 'The manor hears nothing from you.',
            ephemeral: true,
          });
          return;
        }
        if (spookyHuntState.ended) {
          await interaction.reply({
            content: 'The hunt has already ended.',
            ephemeral: true,
          });
          return;
        }

        const answer = normalizeAnswer(
          interaction.fields.getTextInputValue('answer') || ''
        );

        if (answer === CORRECT_ANSWER) {
          await interaction.reply({
            content:
              'The manor doors swing wide. Prepare for the final proclamation...',
            ephemeral: true,
          });
          await finalizeEvent(
            spookyHuntState,
            client,
            saveData,
            decayTimers,
            interaction.user
          );
          return;
        }

        entry.hearts = Math.max(0, (entry.hearts || MAX_HEARTS) - 1);
        entry.next_decay_at = Date.now() + DECAY_DURATION;
        saveData();

        if (entry.hearts <= 0) {
          await interaction.reply({
            content:
              'The manor rejects your answer. Your final candle has been snuffed out.',
            ephemeral: true,
          });
          await eliminateParticipant(
            spookyHuntState,
            userId,
            client,
            saveData,
            decayTimers,
            'All seven candles have gone dark. The manor rejects you.'
          );
          return;
        }

        scheduleDecay(spookyHuntState, userId, client, saveData, decayTimers);

        await interaction.reply({
          content: `The answer was not accepted. Hearts remaining: ${entry.hearts}/${MAX_HEARTS}.`,
          ephemeral: true,
        });
        const channel = await fetchChannel(entry.channel_id, client);
        if (channel) {
          const container = new ContainerBuilder()
            .setAccentColor(0xffa500)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `${interaction.user} tried a path that leads astray. Hearts remaining: ${entry.hearts}/${MAX_HEARTS}.`
              )
            );
          channel
            .send({ components: [container], flags: MessageFlags.IsComponentsV2 })
            .catch(() => {});
        }
        return;
      }
    } catch (error) {
      if (error?.code !== 10062) {
        console.error(error);
      }
    }
  });

  client.on('messageDelete', message => {
    if (message.id === spookyHuntState.message_id) {
      spookyHuntState.message_id = null;
      saveData();
      ensureEventMessage(spookyHuntState, client, saveData).catch(() => {});
    }
  });

  client.on('channelDelete', channel => {
    if (channel.id === spookyHuntState.channel_id) {
      spookyHuntState.channel_id = null;
      spookyHuntState.message_id = null;
      saveData();
    }
    for (const [userId, entry] of Object.entries(spookyHuntState.participants)) {
      if (entry.channel_id === channel.id) {
        entry.channel_id = null;
        saveData();
        clearTimeout(decayTimers.get(userId));
        decayTimers.delete(userId);
      }
    }
  });
}

module.exports = { setup };
