const fs = require('node:fs/promises');
const path = require('node:path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DATA_FILE = path.join(__dirname, 'data', 'buildBattle.json');
const CHANNEL_ID = '1390743854487044136';
// Countdown ends on July 24th 24:00 UTC+7 (July 24th 17:00 UTC)
const COUNTDOWN_END = 1753376400;
// Signups close 2 days after the countdown finishes
const SIGNUP_END = COUNTDOWN_END + 2 * 24 * 60 * 60;
// Build battle ends 2 weeks after the countdown ends
const BUILD_BATTLE_END = COUNTDOWN_END + 14 * 24 * 60 * 60;
const ANNOUNCE_CHANNEL_ID = '1372572234949853367';

const PARTICIPANT_ROLE_ID = '1389139329762332682';
const LOG_CHANNEL_ID = '1383481711651721307';

const THEME_CLOSE_TS = 1754542800; // Aug 7 2025 05:00 UTC

const THEMES = [
  'Steampunk Airship Dock',
  'Atlantis in Ruins',
  'Cyberpunk Street Market at Night',
  "Dragon’s Skeleton Fossil Site",
  'Upside-Down Library',
  "Giant’s Abandoned Toy Room",
  'Lunar Research Outpost (Year 3050)',
  "Time-Traveler’s Portal Hub",
  'Overgrown Botanical Lab After Apocalypse',
  'Floating Samurai Dojo',
  'Crystal Cavern Concert Hall',
  'Dwarven Forge Powered by Lava',
  'Neon-Lit Underwater Metropolis',
  'Haunted Carnival on a Cliff',
  'Library of Impossible Geometry (Escher-style)',
  'Desert Oasis Run by Robots',
  'Victorian Submarine Expedition',
  'Colossal Clockwork Golem Awakening',
  'Elven Tree-Top University',
  'Quantum Computer Shrine in a Jungle',
  'Alien Coral Reef Sanctuary',
  'Giant Chessboard Battle Frozen in Time',
  'Sky Whale Migration Scene',
  'Hidden Temple Inside a Volcanic Crater',
  'Arctic Bioluminescent Ice Caves',
  'Pirate Mech-Ship Taking Off',
  'Post-Human Overgrown Skyscraper Farm',
  'Mirror-World Castle (Left ≠ Right)',
  'Festival of Lanterns on Floating Islands',
  'Gargantuan Kraken vs. Airship',
  'Ancient Library Guarded by Living Statues',
  "Wizard’s Alchemical Greenhouse",
  'Deserted Cyber-Train Station in a Sandstorm',
  'Mechanical Dragon Factory Floor',
  'Celestial Observatory on a Comet',
  'Haunted Mansion Caught Between Seasons',
  'Under-Construction Space Elevator Base',
  'Goblin Market Hidden in Sewers',
  'Lost City Inside a Massive Tree Trunk',
  'Interdimensional Bazaar (Stalls from Different Worlds)',
  'Post-War Mech Graveyard',
  'Ice Palace Melting into a Waterfall',
  'Bio-Engineered Dinosaur Sanctuary',
  'Dreamscape Playground (Surreal, Floating Shapes)',
  'Ancient Colosseum Repurposed as Spaceport',
  'Mermaid Royal Wedding Procession',
  'Fairy-Light Mushroom Metropolis',
  'Futuristic Venice with Hover-Gondolas',
  'Library Spaceship Docked at Asteroid',
  'Time-Dilated Battlefield (Past, Present, Future Collide)'
];

async function loadData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { userThemes: {} };
  }
}

async function saveData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

let countdownInterval;

async function updateCountdownMessage(channel, data) {
  if (!data.countdownMessageId) return;
  const message = await channel.messages.fetch(data.countdownMessageId).catch(() => null);
  if (!message) return;
  const embed = EmbedBuilder.from(message.embeds[0] ?? {})
    .setTitle('Build Battle Countdown ⛏️')
    .setDescription(`Blocks at the ready—⏰ the arena drops in <t:${COUNTDOWN_END}:R>! Who’s claiming the crown?`)
    .setColor('#000000');
  await message.edit({ embeds: [embed] }).catch(() => {});
}

function startCountdownInterval(channel, data) {
  clearInterval(countdownInterval);
  // Immediately update the countdown message so changes to COUNTDOWN_END
  // are reflected without waiting for the first interval tick
  updateCountdownMessage(channel, data).catch(() => {});
  countdownInterval = setInterval(async () => {
    const now = Math.floor(Date.now() / 1000);
    if (now >= COUNTDOWN_END) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      return;
    }
    await updateCountdownMessage(channel, data).catch(() => {});
  }, 60 * 1000);
}

async function ensureCountdownMessage(client, channel, data) {
  if (data.countdownMessageId) {
    const msg = await channel.messages.fetch(data.countdownMessageId).catch(() => null);
    if (msg) {
      startCountdownInterval(channel, data);
      return;
    }
  }
  const embed = new EmbedBuilder()
    .setTitle('Build Battle Countdown ⛏️')
    .setDescription(`Blocks at the ready—⏰ the arena drops in <t:${COUNTDOWN_END}:R>! Who’s claiming the crown?`)
    .setColor('#000000');
  const message = await channel.send({ embeds: [embed] });
  data.countdownMessageId = message.id;
  await saveData(data);
  startCountdownInterval(channel, data);
}

async function disableJoinButton(message, data) {
  if (!message) return;
  const row = new ActionRowBuilder().addComponents(
    ButtonBuilder.from(message.components[0].components[0]).setDisabled(true)
  );
  const embed = EmbedBuilder.from(message.embeds[0] ?? {});
  const fields = embed.data.fields ?? [];
  const idx = fields.findIndex(f => f.name === 'Limited time only!⏳');
  if (idx !== -1) {
    fields[idx].value = '* The button is disabled';
  } else {
    fields.push({ name: 'Limited time only!⏳', value: '* The button is disabled' });
  }
  embed.setFields(fields);
  await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
  data.buttonDisabled = true;
  await saveData(data);
}

async function scheduleDisable(message, data) {
  const now = Math.floor(Date.now() / 1000);
  const delay = SIGNUP_END - now;
  if (delay <= 0) return disableJoinButton(message, data);
  setTimeout(() => disableJoinButton(message, data).catch(() => {}), delay * 1000);
}

async function endBuildBattle(message, client, data) {
  if (data.eventEnded) return;
  if (message) {
    const embed = EmbedBuilder.from(message.embeds[0] ?? {});
    embed.setDescription('* Build battle has ended');
    await message.edit({ embeds: [embed] }).catch(() => {});
  }
  const announce = await client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);
  if (announce && announce.isTextBased()) {
    const endEmbed = new EmbedBuilder()
      .setTitle('🏁 Build Battle Concluded!')
      .setDescription('Thanks to everyone who participated!')
      .setColor('#00AAFF');
    await announce.send({ content: '@everyone', embeds: [endEmbed] }).catch(() => {});
  }
  data.eventEnded = true;
  await saveData(data);
}

async function scheduleBattleEnd(message, client, data) {
  const now = Math.floor(Date.now() / 1000);
  const delay = BUILD_BATTLE_END - now;
  if (delay <= 0) return endBuildBattle(message, client, data);
  setTimeout(() => endBuildBattle(message, client, data).catch(() => {}), delay * 1000);
}

async function ensureSignupMessage(client, channel, data) {
  if (data.countdownMessageId) {
    const old = await channel.messages.fetch(data.countdownMessageId).catch(() => null);
    if (old && old.deletable) await old.delete().catch(() => {});
    data.countdownMessageId = null;
  }
  if (data.signUpMessageId) {
    const existing = await channel.messages.fetch(data.signUpMessageId).catch(() => null);
    if (existing) {
      if (!data.buttonDisabled) await scheduleDisable(existing, data);
      await scheduleBattleEnd(existing, client, data);
      const embed = EmbedBuilder.from(existing.embeds[0] ?? {});
      const hasField = (embed.data.fields || []).some(f => f.name === 'Limited time only!⏳');
      if (!hasField) {
        const value = data.buttonDisabled
          ? '* The button is disabled'
          : `* The button disable <t:${SIGNUP_END}:R>\n* Build battle ends <t:${BUILD_BATTLE_END}:R>`;
        embed.addFields({ name: 'Limited time only!⏳', value });
        await existing.edit({ embeds: [embed] }).catch(() => {});
      }
      return;
    }
  }
  const embed = new EmbedBuilder()
    .setTitle('📝⚒️ Sign In for the Build Battle! 🚀')
    .setDescription('Ready to unleash your inner architect? Tap the button below ⬇️ to lock in your spot! The moment you click, a mystery theme materializes 🪄—and your countdown ⏱️ to creative glory begins.\n🏆 Build big, think bold, leave judges speechless!')
    .setColor('#FFFF00')
    .setFooter({ text: 'this request ends in 2 days!' })
    .addFields({
      name: 'Limited time only!⏳',
      value: `* The button disable <t:${SIGNUP_END}:R>\n* Build battle ends <t:${BUILD_BATTLE_END}:R>`
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('join_build_battle').setLabel('JOIN EVENT').setStyle(ButtonStyle.Success)
  );

  const message = await channel.send({ content: '@everyone', embeds: [embed], components: [row] });
  data.signUpMessageId = message.id;
  data.buttonDisabled = false;
  await saveData(data);
  await scheduleDisable(message, data);
  await scheduleBattleEnd(message, client, data);
}

async function initBuildBattleEvent(client) {
  const data = await loadData();
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  const now = Math.floor(Date.now() / 1000);
  if (now < COUNTDOWN_END) {
    await ensureCountdownMessage(client, channel, data);
    setTimeout(() => ensureSignupMessage(client, channel, data).catch(console.error), (COUNTDOWN_END - now) * 1000);
  } else {
    await ensureSignupMessage(client, channel, data);
  }
}

async function handleJoinInteraction(interaction) {
  const data = await loadData();
  const now = Math.floor(Date.now() / 1000);
  if (now >= SIGNUP_END) {
    return interaction.reply({ content: 'Sign ups have closed.', ephemeral: true });
  }
  const member = interaction.member;
  if (!member) {
    return interaction.reply({ content: 'This button can only be used in a server.', ephemeral: true });
  }
  if (!data.userThemes) data.userThemes = {};
  if (data.userThemes[interaction.user.id] || member.roles.cache.has(PARTICIPANT_ROLE_ID)) {
    await interaction.reply({ content: 'You have already joined! Check your DMs.', ephemeral: true });
  } else {
    await member.roles.add(PARTICIPANT_ROLE_ID).catch(() => {});
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    data.userThemes[interaction.user.id] = theme;
    await saveData(data);
    await interaction.reply({ content: 'Check your DMs for your theme!', ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle('PSST')
      .setDescription(`${interaction.user}, you have got a theme!\n# ${theme}\n* You should start your building now! The submit ticket will be closed on <t:${THEME_CLOSE_TS}:F>!\n* Besure to screenshot some of your building progress!! Trust me you gonna need it!. Also if you have done building, please create a submit ticket by using command </submit-ticket:1392510566945525781>\n* Also read the rules in https://discord.com/channels/1372572233930903592/1390743854487044136 before submitting!`)
      .setFooter({ text: 'have fun!' });
    await interaction.user.send({ embeds: [embed] }).catch(() => {});
    const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ content: `Username: ${interaction.user}\nTheme picked: ${theme}` }).catch(() => {});
    }
  }
}

module.exports = { initBuildBattleEvent, handleJoinInteraction };
