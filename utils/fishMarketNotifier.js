const fs = require('node:fs/promises');
const path = require('node:path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DATA_FILE = path.join(__dirname, '../data/fishMarketMessage.json');
// Allow overriding the fish market channel via environment variable
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

function buildFishMarketEmbed() {
  const embed = new EmbedBuilder()
    .setAuthor({ name: 'FISH MARKET' })
    .setColor('#ffffff')
    .setTitle('Welcome!')
    .setDescription('**🎩 Welcome to the Fin-tastic Fish Market!**\nSwap your dazzling catches for gleaming coins or peek at their true market value—cast off and start reeling in rewards!');
  embed.setThumbnail('https://i.ibb.co/wZspz0pF/A-nh1.png');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fish_market_sell').setLabel('SELL').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('fish_market_value').setLabel('VALUE-CHECK').setStyle(ButtonStyle.Primary),
  );
  return { embed, row };
}

async function initFishMarket(client) {
  const data = await loadData();
  const channel = await client.channels
    .fetch(FISH_STORE_CHANNEL_ID)
    .catch((e) => {
      console.warn(`[FishMarket] Could not fetch channel ${FISH_STORE_CHANNEL_ID}: ${e.message}`);
      return null;
    });
  if (!channel || !channel.isTextBased()) {
    console.warn('[FishMarket] Fish store channel not found or not text based.');
    return;
  }
  if (data.messageId) {
    const msg = await channel.messages.fetch(data.messageId).catch(() => null);
    if (msg) return;
    console.log('[FishMarket] Stored message missing, sending new embed.');
  }
  const { embed, row } = buildFishMarketEmbed();
  const sent = await channel
    .send({ embeds: [embed], components: [row] })
    .catch((e) => {
      console.error('[FishMarket] Failed to send fish market embed:', e.message);
      return null;
    });
  if (sent) {
    data.messageId = sent.id;
    await saveData(data);
  }
}

module.exports = { initFishMarket, buildFishMarketEmbed };
