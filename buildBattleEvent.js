const fs = require('node:fs/promises');
const path = require('node:path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DATA_FILE = path.join(__dirname, 'data', 'buildBattle.json');
const CHANNEL_ID = '1390743854487044136';
const COUNTDOWN_END = 1753938000; // July 31 2025 05:00 UTC
const SIGNUP_END = 1754240400; // Aug 3 2025 17:00 UTC
const ROLE_ID = '1389139329762332682';

const THEME_CLOSE_TS = 1754542800; // Aug 7 2025 05:00 UTC

const THEMES = [
  'Steampunk Sky City',
  'Ancient Atlantis Ruins',
  'Cyberpunk Megatower',
  "Dragon’s Volcanic Lair",
  'Clockwork Cathedral',
  'Floating Crystal Isles',
  'Post-Apocalyptic Sanctuary',
  'Mystic Enchanted Forest',
  'Interdimensional Portal Hub',
  'Futuristic Spaceport',
  'Submerged Bio-Dome Colony',
  'Norse Valhalla Hall',
  'Titanic Airship Armada',
  'Deserted Alien Planet Base',
  'Gothic Haunted Manor',
  'Underworld River Styx Crossing',
  'Galactic Council Chamber',
  'Quantum Particle-Accelerator Lab',
  'Ancient Egyptian Stargate',
  'Pirate Cove Fortress',
  'Celestial Observatory Temple',
  'Dwarven Underground Metropolis',
  'Jurassic Jungle Park',
  'Samurai Shogun Castle',
  'Arctic Ice Palace',
  'Giant Mythic Kraken Attack',
  'Elven Tree-Top City',
  'Solar-Powered Mega Farm',
  'Roman Colosseum Siege',
  'Sci-Fi Hologram Arcade',
  'Fairy-Tale Storybook Village',
  'Neo-Tokyo Skyline',
  "Wizard’s Arcane Library",
  'Titanic Mecha Battle',
  'Babylonian Hanging Gardens',
  'Time-Travel Train Station',
  'Coral Reef Kingdom',
  'Industrial-Revolution Factory',
  'Demon Realm Citadel',
  'Gothic Clocktower Plaza',
  'Dragon-Rider Arena',
  'Alien Hive-Queen Chamber',
  'Modern Sustainable Eco-City',
  'Mysterious Labyrinth Maze',
  'Space Elevator Terminal',
  'Victorian Haunted Carnival',
  'Cybernetic Wildlife Preserve',
  'Floating Lantern-Festival Harbor',
  'Lost Mayan Sun Temple',
  'Robotic Underwater Mining Rig',
  'Colossal Tree of Life',
  'Mount Olympus Palace',
  'Shadow-Realm Mirror City',
  'Solar-Eclipse Ritual Site',
  'Medieval Tournament Grounds',
  'Quantum Computer Core',
  'Volcanic Forge of the Titans',
  'Abandoned Lunar Research Outpost',
  'Sky-Whale Sanctuary',
  'Bio-Luminescent Mushroom Forest',
  'Helm’s-Deep-Style Fortress Siege',
  'Ice-Age Mammoth Valley',
  'Atlantis Racing Hippodrome',
  'Ruined Skyscraper Garden',
  'Celestial Dragon River Parade',
  'Interstellar Cargo Shipyard',
  'Steampunk Chessboard Arena',
  'Nebula Observation Station',
  'Haunted Ghost-Ship Armada',
  'Kraken-Infested Lighthouse',
  'Jurassic Volcano Laboratory',
  'Mystic Crystal Cavern',
  'Cyberpunk Night Market',
  'Subterranean Lava City',
  'Phoenix Rebirth Shrine',
  'Roman Aqueduct Metropolis',
  'Star-Forged Weapon Foundry',
  'Portal-Linked Floating Islands',
  "Witch’s Enchanted Swamp Hut",
  'Digital Metaverse Hub',
  'Heavenly Cloud Palace',
  'Drowned Viking Longhouse Village',
  'Space-Time Rift Facility',
  'Rune-Carved Arcane Monolith',
  'Futuristic Hover-Train Station',
  'Clockwork Dragon Parade Float',
  'Snow-Covered Nordic Harbor',
  'Overgrown Lost Pyramid',
  'Alien Biodiversity Sanctuary',
  'Sandworm Skeleton Excavation',
  'Celestial Zodiac Garden',
  'Mecha Repair Dock',
  'Black-Hole Research Observatory',
  'Shattered Moon Settlement',
  'Trans-Dimensional Fairground',
  'Abyssal Deep-Sea Trench Base',
  'Legendary Sword-in-Stone Plaza',
  'Bio-Engineered Sky Orchard',
  "Alchemist’s Elemental Lab",
  'Infinite Library of Worlds'
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

async function ensureCountdownMessage(client, channel, data) {
  if (data.countdownMessageId) {
    const msg = await channel.messages.fetch(data.countdownMessageId).catch(() => null);
    if (msg) return;
  }
  const embed = new EmbedBuilder()
    .setTitle('Build Battle Countdown ⛏️')
    .setDescription('Blocks at the ready—⏰ the arena drops in <t:1753938000:R>! Who’s claiming the crown?')
    .setColor('Black');
  const message = await channel.send({ embeds: [embed] });
  data.countdownMessageId = message.id;
  await saveData(data);
}

async function disableJoinButton(message, data) {
  if (!message) return;
  const row = new ActionRowBuilder().addComponents(
    ButtonBuilder.from(message.components[0].components[0]).setDisabled(true)
  );
  await message.edit({ components: [row] }).catch(() => {});
  data.buttonDisabled = true;
  await saveData(data);
}

async function scheduleDisable(message, data) {
  const now = Math.floor(Date.now() / 1000);
  const delay = SIGNUP_END - now;
  if (delay <= 0) return disableJoinButton(message, data);
  setTimeout(() => disableJoinButton(message, data).catch(() => {}), delay * 1000);
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
      return;
    }
  }
  const embed = new EmbedBuilder()
    .setTitle('📝⚒️ Sign In for the Build Battle! 🚀')
    .setDescription('Ready to unleash your inner architect? Tap the button below ⬇️ to lock in your spot! The moment you click, a mystery theme materializes 🪄—and your countdown ⏱️ to creative glory begins.\n🏆 Build big, think bold, leave judges speechless!')
    .setColor('Yellow')
    .setFooter({ text: 'this request ends in 3 days!' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('join_build_battle').setLabel('JOIN EVENT').setStyle(ButtonStyle.Success)
  );

  const message = await channel.send({ content: '@everyone', embeds: [embed], components: [row] });
  data.signUpMessageId = message.id;
  data.buttonDisabled = false;
  await saveData(data);
  await scheduleDisable(message, data);
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

  if (!data.userThemes) data.userThemes = {};

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasRole = member.roles.cache.has(ROLE_ID);

  if (hasRole || data.userThemes[interaction.user.id]) {
    await interaction.reply({ content: 'You have already joined! Check your DMs.', ephemeral: true });
    return;
  }

  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  data.userThemes[interaction.user.id] = theme;
  await saveData(data);
  await member.roles.add(ROLE_ID).catch(() => {});

  await interaction.reply({ content: 'Check your DMs for your theme!', ephemeral: true });
  const embed = new EmbedBuilder()
    .setTitle('PSST')
    .setDescription(`${interaction.user}, you have got a theme!\n# ${theme}\n* You should start your building now! The submit ticket will be closed on <t:${THEME_CLOSE_TS}:F>!\n* Besure to screenshot some of your building progress!! Trust me you gonna need it!. Also if you have done building, please create a submit ticket by using command </submit-ticket:1392510566945525781>\n* Also read the rules in https://discord.com/channels/1372572233930903592/1390743854487044136 before submitting!`)
    .setFooter({ text: 'have fun!' });
  await interaction.user.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { initBuildBattleEvent, handleJoinInteraction };
