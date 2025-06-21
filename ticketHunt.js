const fs = require('node:fs/promises');
const path = require('node:path');

const HINT_EMOJI_ID = '1385856492787204147';
const HINT_EMOJI = `<:hintticket:${HINT_EMOJI_ID}>`;
const ALERT_CHANNEL_ID = '1373564899199811625';

const TICKETS = [
  { channelId: '1373564899199811625', messageId: '1383659740974026873' },
  { channelId: '1373578620634665052', messageId: '1377993787200110725' },
  { channelId: '1380898970225606818', messageId: '1382405983963185307' },
  { channelId: '1384209189726851163', messageId: '1384212637516042280' },
  { channelId: '1379861638253121708', messageId: '1385232072523644970' },
  { channelId: '1380834420189298718', messageId: '1380841372814282802' },
  { channelId: '1372572234949853370', messageId: '1384871498258583633' },
  { channelId: '1372572234949853374', messageId: '1385872247490744420' },
  { channelId: '1372572234949853368', messageId: '1382310864375386293' },
  // TODO: Replace with the actual channel and message ID for the final ticket
  { channelId: 'REPLACE_CHANNEL_ID', messageId: 'REPLACE_MESSAGE_ID' }
];

const DATA_FILE = path.join(__dirname, 'data', 'ticket_hunt.json');

async function loadFound() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return new Set(parsed.found || []);
  } catch {
    return new Set();
  }
}

async function saveFound(set) {
  const dir = path.dirname(DATA_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ found: Array.from(set) }, null, 2));
}

async function initializeTicketHunt(client) {
  const found = await loadFound();

  for (const { channelId, messageId } of TICKETS) {
    if (found.has(messageId)) continue;
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) continue;
      const message = await channel.messages.fetch(messageId);
      if (!message.reactions.cache.has(HINT_EMOJI_ID)) {
        await message.react(HINT_EMOJI).catch(() => {});
      }
    } catch (err) {
      console.error(`[TicketHunt] Failed to ensure reaction for ${messageId}:`, err.message);
    }
  }

  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch {
      return;
    }

    if (reaction.emoji.id !== HINT_EMOJI_ID) return;
    const ticket = TICKETS.find(t => t.messageId === reaction.message.id);
    if (!ticket || found.has(ticket.messageId)) return;

    found.add(ticket.messageId);
    await saveFound(found).catch(() => {});

    try {
      await reaction.remove();
    } catch {
      await reaction.users.remove(client.user.id).catch(() => {});
      await reaction.users.remove(user.id).catch(() => {});
    }

    const alertChannel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
    const link = `https://discord.com/channels/${reaction.message.guildId}/${ticket.channelId}/${ticket.messageId}`;
    if (alertChannel && alertChannel.isTextBased()) {
      await alertChannel.send(`\u2728 **${user.tag}** found a hidden ticket! \u2728\n${link}`);
      if (found.size === TICKETS.length) {
        await alertChannel.send('\ud83c\udfc6 **All tickets have been found!**');
      }
    }
  });
}

module.exports = { initializeTicketHunt };
