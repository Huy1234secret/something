const fs = require('node:fs/promises');
const path = require('node:path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DATA_FILE = path.join(__dirname, '../data/fishStoreMessage.json');
const FISH_STORE_CHANNEL_ID = process.env.FISH_STORE_CHANNEL_ID || '1393515441296773191';

async function loadData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { messageId: null };
  }
}

async function saveData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function buildFishStoreEmbed() {
  const embed = new EmbedBuilder()
    .setAuthor({ name: 'FISH STORE' })
    .setColor('#ffffff')
    .setTitle('Fishing Supplies Shop')
    .setDescription('Purchase your fishing gear with coins.');
  embed.addFields(
    { name: '<:fishingrod1:1391068186409042001> Fishing Rod', value: 'ID: `fishing_rod_tier1`\nPrice: 10,000 coins' },
    { name: '🪱 Bait', value: 'ID: `worm`\nPrice: 100 coins' }
  );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fish_store_purchase').setLabel('Purchase').setStyle(ButtonStyle.Primary),
  );
  return { embed, row };
}

async function initFishStore(client) {
  const data = await loadData();
  const channel = await client.channels
    .fetch(FISH_STORE_CHANNEL_ID)
    .catch((e) => {
      console.warn(`[FishStore] Could not fetch channel ${FISH_STORE_CHANNEL_ID}: ${e.message}`);
      return null;
    });
  if (!channel || !channel.isTextBased()) {
    console.warn('[FishStore] Channel not found or not text based.');
    return;
  }
  if (data.messageId) {
    const msg = await channel.messages.fetch(data.messageId).catch(() => null);
    if (msg) return;
    console.log('[FishStore] Stored message missing, sending new embed.');
  }
  const { embed, row } = buildFishStoreEmbed();
  const sent = await channel
    .send({ embeds: [embed], components: [row] })
    .catch((e) => {
      console.error('[FishStore] Failed to send fish store embed:', e.message);
      return null;
    });
  if (sent) {
    data.messageId = sent.id;
    await saveData(data);
  }
}

module.exports = { initFishStore, buildFishStoreEmbed };
