const {
  SlashCommandBuilder,
  MessageFlags,
  ButtonStyle,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require('@discordjs/builders');
const { formatNumber } = require('../utils');

const EVENT_YEAR = 2025;
const ANNOUNCEMENT_CHANNEL_ID = '1372572234949853367';
const ANNOUNCEMENT_INTERVAL_MS = 5 * 60 * 1000;
const COUNTDOWN_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;
const QUEST_BUTTON_ID = 'cquest:main';
const QUEST_ANNOUNCEMENT_COLOR = 0x00ffff;
const QUEST_PROGRESS_COLOR = 0xffffff;

const QUESTS = [
  {
    id: 'holly-jolly-1',
    title: 'Holly Jolly 1 🎄',
    buttonLabel: 'Quest 1#',
    tasks: [
      { id: 'aurora-digs', description: 'Dig 1000 times in Aurora Tundra', target: 1000 },
      {
        id: 'aurora-common',
        description: 'Dig up 100 Common items Aurora Tundra',
        target: 100,
      },
      {
        id: 'aurora-rare',
        description: 'Dig up 60 Rare items Aurora Tundra',
        target: 60,
      },
      {
        id: 'aurora-epic',
        description: 'Dig up 25 Epic items Aurora Tundra',
        target: 25,
      },
      {
        id: 'aurora-legendary',
        description: 'Dig up 5 Legendary items Aurora Tundra',
        target: 5,
      },
      {
        id: 'aurora-sell-coins',
        description: 'Earn 5 million coins by selling item in dig',
        target: 5_000_000,
      },
      {
        id: 'consume-magnets',
        description: 'Consume 10 Magnets',
        target: 10,
      },
      {
        id: 'aurora-shards',
        description: 'Dig up 50 Aurora Shards',
        target: 50,
      },
      {
        id: 'snowglobe',
        description: 'Dig up 1 Enchanted Snowglobe',
        target: 1,
      },
    ],
    rewardLines: [
      '-# 5 Christmas Gift',
      '-# 25 Magnets',
      '-# 5 Metal detectors',
      '-# 2500 Diamonds',
      '-# 100 Shovels',
      '-# 1 Holly Jolly Shovel [skin]',
    ],
  },
  {
    id: 'holly-jolly-2',
    title: 'Holly Jolly 2🎄',
    buttonLabel: 'Quest 2#',
    tasks: [
      { id: 'hunts', description: 'Hunt 1000 times', target: 1000 },
      { id: 'hunt-common', description: 'Hunt 777 Common animals', target: 777 },
      { id: 'hunt-rare', description: 'Hunt 222 Rare animals', target: 222 },
      { id: 'hunt-epic', description: 'Hunt 67 Epic animals', target: 67 },
      { id: 'hunt-legendary', description: 'Hunt 22 Legendary animals', target: 22 },
      { id: 'hunt-mythical', description: 'Hunt 5 Mythical animals', target: 5 },
      { id: 'obtain-rifle-t3', description: 'Obtain a tier 3 rifle', target: 1 },
      { id: 'obtain-rifle-t2', description: 'Obtain a tier 2 rifle', target: 1 },
      { id: 'use-verdant-lure', description: 'Use 44 Verdant Lures', target: 44 },
      { id: 'use-snowglass-lure', description: 'Use 44 Snowglass Lures', target: 44 },
      { id: 'use-sunpride-lure', description: 'Use 44 Sunpride Lures', target: 44 },
      { id: 'use-marshlight-lure', description: 'Use 44 Marshlight Lures', target: 44 },
      { id: 'krampus', description: 'successfully hunt 1 Krampus', target: 1 },
      { id: 'gingerbread-brute', description: 'successfully hunt 6 Gingerbread Brutes', target: 6 },
    ],
    rewardLines: [
      '-# 5 Christmas Gift',
      '-# 50 Bullet boxes',
      '-# 100 Verdant Lures',
      '-# 100 Snowglass Lures',
      '-# 100 Marshlight lures',
      '-# 100 Sunpride lures',
      '-# 10 Animal detectors',
      '-# 2500 Diamonds',
      '-# 1 Pyreheart lure',
      '-# 1 Holly Frosty Rifle tier 1 [skin]',
      '-# 1 Holly Jolly Rifle tier 2 [skin]',
      '-# 1 Holly Jolly Rifle tier 3 [skin]',
    ],
  },
  {
    id: 'holly-jolly-3',
    title: 'Holly Jolly 3🎄',
    buttonLabel: 'Quest 3#',
    tasks: [
      { id: 'beg', description: 'Beg 1000 times', target: 1000 },
      { id: 'beg-success', description: 'Successfully Beg 500 times', target: 500 },
      { id: 'beg-fail', description: 'Fail Beg 500 times', target: 500 },
      { id: 'beg-coins', description: 'Earn 5 million coins from beg', target: 5_000_000 },
      { id: 'rob', description: 'Rob 100 times', target: 100 },
      { id: 'rob-success', description: 'Successfully rob 40 times', target: 40 },
      {
        id: 'rob-landmine',
        description: 'Successfully rob someone when they have their landmine active 10 times',
        target: 10,
      },
      { id: 'rob-full', description: 'Do a 100% wallet rob once', target: 1 },
    ],
    rewardLines: [
      '-# 5 Christmas Gift',
      '-# 10 Coin potions',
      '-# 10 Luck potions',
      '-# 10 Robber bags',
      '-# 10 bolt cutters',
    ],
  },
  {
    id: 'holly-jolly-4',
    title: 'Holly Jolly 4🎄',
    buttonLabel: 'Quest 4#',
    tasks: [
      { id: 'harvest-ornament-berry', description: 'Harvest 55 Ornament Berries', target: 55 },
      { id: 'harvest-sheaf', description: 'Harvest 9 Sheafs', target: 9 },
      { id: 'harvest-potato', description: 'Harvest 9 Potatoes', target: 9 },
      { id: 'harvest-pumpkin', description: 'Harvest 9 Pumpkins', target: 9 },
      { id: 'harvest-white-cabbage', description: 'Harvest 9 White Cabbages', target: 9 },
      { id: 'harvest-melon', description: 'Harvest 4 Melons', target: 4 },
      { id: 'harvest-star-fruit', description: 'Harvest 1 Star Fruits', target: 1 },
      { id: 'water', description: 'Do watering 100 times', target: 100 },
      {
        id: 'farm-coins',
        description: 'Earn 300 millions coins from farming',
        target: 300_000_000,
      },
    ],
    rewardLines: [
      '-# 5 Christmas Gift',
      '-# 5 Star Fruits Seed Packages',
      '-# 10 Melons Seed Packages',
      '-# 10 Watering Can',
      '-# 1 Holly Jolly Watering can [skin]',
      '-# 1 Frostlight Garden [farm skin]',
    ],
  },
  {
    id: 'holly-jolly-finale',
    title: 'Holly Jolly Finale 🎄',
    buttonLabel: 'Finale',
    tasks: [
      { id: 'chat-xp', description: 'Earn 1 million chat XP', target: 1_000_000 },
      { id: 'snowballs', description: 'Throw 100 Snowballs', target: 100 },
      { id: 'cookies', description: 'Consume 200 Cookies', target: 200 },
      { id: 'milk', description: 'Consume 100 Cups of milk', target: 100 },
      { id: 'candy-canes', description: 'Consume 75 Candy Canes', target: 75 },
      { id: 'gingerbread', description: 'Consume 50 Gingerbread mans', target: 50 },
      { id: 'good-list', description: 'Consume 1 Good List', target: 1 },
      { id: 'snowflakes', description: 'Earn 100k snowflakes', target: 100_000 },
    ],
    rewardLines: [
      '-# 25 Christmas Gift',
      '-# 1 Bag of Diamond',
      '-# 5 Ultra Lucky Potions',
      '-# 25 Lucky Potions',
      '-# 25 Coin potions',
      '-# 30 XP Sodas',
      '-# 1 Elf Hat and 1 Santa Clause Hat',
      '-# 30$ Gift card [or 20$ and 10$]',
      '-# 5555 Deluxe Coins',
    ],
  },
];

let resourcesRef = null;
let clientRef = null;
let watcherStarted = false;
let watcherRunning = false;

function getEventStartDate(year) {
  const targetYear = Math.max(EVENT_YEAR, year);
  return new Date(Date.UTC(targetYear, 11, 1, -7, 0, 0, 0));
}

function getNextQuestIndex(stats) {
  const questState = stats.christmas_quests?.quests || {};
  for (let i = 0; i < QUESTS.length; i += 1) {
    const quest = QUESTS[i];
    const entry = questState[quest.id];
    if (!entry || !entry.completedAt) return i;
  }
  return QUESTS.length;
}

function ensureUserQuestData(stats) {
  if (!stats.christmas_quests || stats.christmas_quests.year !== EVENT_YEAR) {
    stats.christmas_quests = {
      year: EVENT_YEAR,
      quests: {},
    };
  }
  return stats.christmas_quests;
}

function initializeQuestTasks(quest) {
  const tasks = {};
  for (const task of quest.tasks) {
    tasks[task.id] = { current: 0, target: task.target };
  }
  return tasks;
}

function getQuestState(stats, questIndex, { create = false } = {}) {
  const data = ensureUserQuestData(stats);
  const quest = QUESTS[questIndex];
  if (!quest) return null;
  if (!data.quests[quest.id] && create) {
    data.quests[quest.id] = {
      startedAt: Date.now(),
      completedAt: 0,
      tasks: initializeQuestTasks(quest),
    };
  }
  return data.quests[quest.id] || null;
}

function isQuestComplete(quest, questState) {
  if (!questState || !questState.tasks) return false;
  return quest.tasks.every(task => {
    const entry = questState.tasks[task.id];
    return entry && Number(entry.current) >= task.target;
  });
}

function buildProgressBar(current, target, size = 20) {
  const cappedTarget = target > 0 ? target : 1;
  const ratio = Math.max(0, Math.min(1, current / cappedTarget));
  const filled = Math.round(ratio * size);
  const empty = size - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function computeSummaryPercent(quest, questState) {
  if (!questState || !questState.tasks || quest.tasks.length === 0) return 0;
  let total = 0;
  for (const task of quest.tasks) {
    const entry = questState.tasks[task.id] || { current: 0 };
    const pct = Math.max(0, Math.min(1, entry.current / (task.target || 1)));
    total += pct;
  }
  return Math.round((total / quest.tasks.length) * 100);
}

function buildQuestProgressContainer(user, questIndex, quest, questState) {
  const summary = computeSummaryPercent(quest, questState);
  const lines = [`## Christmas Quest ${questIndex + 1}#🎄`, `* ${quest.title}`, `-# Summary Progress: \`${summary}%\``];
  for (const task of quest.tasks) {
    const entry = questState?.tasks?.[task.id] || { current: 0 };
    const current = Number(entry.current) || 0;
    const target = Number(task.target) || 0;
    const percent = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
    const progressBar = buildProgressBar(current, target);
    lines.push(`* ${task.description}`);
    lines.push(`-# ${progressBar} \`${formatNumber(current)} / ${formatNumber(target)} - ${percent}%\``);
  }
  const content = lines.join('\n');
  return new ContainerBuilder()
    .setAccentColor(QUEST_PROGRESS_COLOR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function getQuestButtonState() {
  const data = resourcesRef?.christmasEventData || {};
  if (!data.questButtonState) {
    data.questButtonState = { questIndex: 0, started: false };
  }
  return data.questButtonState;
}

function buildAnnouncementContainer() {
  const data = resourcesRef?.christmasEventData || {};
  const state = getQuestButtonState();
  const questIndex = Math.min(state.questIndex ?? 0, QUESTS.length - 1);
  const container = new ContainerBuilder()
    .setAccentColor(QUEST_ANNOUNCEMENT_COLOR)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Christmas Quest ${Math.min(questIndex + 1, QUESTS.length)}#🎄\n-# Click the button below to start quest and view your quest progress!`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder());

  let label;
  let style;
  let disabled = false;
  if ((state.questIndex ?? 0) >= QUESTS.length) {
    label = 'All Quests Completed';
    style = ButtonStyle.Secondary;
    disabled = true;
  } else if (state.started) {
    label = `View Quest ${state.questIndex + 1} Progress`;
    style = ButtonStyle.Secondary;
  } else {
    label = `Start Quest ${state.questIndex + 1}#`;
    style = ButtonStyle.Success;
  }

  const button = new ButtonBuilder()
    .setCustomId(QUEST_BUTTON_ID)
    .setLabel(label)
    .setStyle(style)
    .setDisabled(disabled);

  container.addActionRowComponents(new ActionRowBuilder().addComponents(button));
  return container;
}

async function updateAnnouncementMessage() {
  if (!clientRef || !resourcesRef) return;
  const data = resourcesRef.christmasEventData || {};
  if (!data.questMessageId || !data.questMessageChannelId) return;
  try {
    const channel = await clientRef.channels.fetch(data.questMessageChannelId);
    if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) return;
    const message = await channel.messages.fetch(data.questMessageId);
    const container = buildAnnouncementContainer();
    await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (error) {
    if (error.code === 10008 || error.code === 10062) {
      data.questMessageId = null;
      data.questMessageChannelId = null;
      if (resourcesRef.saveData) resourcesRef.saveData();
    } else {
      console.error('Failed to update Christmas quest announcement message:', error);
    }
  }
}

function setQuestButtonState(updates) {
  if (!resourcesRef) return;
  const data = resourcesRef.christmasEventData || {};
  data.questButtonState = {
    questIndex: Math.max(0, Math.min(updates.questIndex ?? 0, QUESTS.length)),
    started: Boolean(updates.started),
  };
  if (resourcesRef.saveData) resourcesRef.saveData();
  updateAnnouncementMessage();
}

async function ensureQuestMessage(channel) {
  const data = resourcesRef.christmasEventData || {};
  if (data.questMessageId && data.questMessageChannelId === channel.id) {
    try {
      const existing = await channel.messages.fetch(data.questMessageId);
      if (existing) return existing;
    } catch {
      data.questMessageId = null;
      data.questMessageChannelId = null;
    }
  }

  if (!data.questButtonState) {
    data.questButtonState = { questIndex: 0, started: false };
  }

  const container = buildAnnouncementContainer();
  const message = await channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  data.questMessageId = message.id;
  data.questMessageChannelId = channel.id;
  if (resourcesRef.saveData) resourcesRef.saveData();
  return message;
}

async function deleteCountdownMessage() {
  const data = resourcesRef.christmasEventData || {};
  if (!clientRef) return;
  if (!data.countdownMessageId || !data.countdownTargetTimestamp) return;
  try {
    const channel = await clientRef.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
    if (channel && typeof channel.isTextBased === 'function' && channel.isTextBased()) {
      const message = await channel.messages.fetch(data.countdownMessageId);
      await message.delete().catch(() => {});
    }
  } catch {}
  data.countdownMessageId = null;
  data.countdownTargetTimestamp = 0;
  if (resourcesRef.saveData) resourcesRef.saveData();
}

async function sendCountdownMessage(channel, targetTimestamp) {
  const data = resourcesRef.christmasEventData || {};
  const unix = Math.floor(targetTimestamp / 1000);
  const content = `🎁Christmas Battle 2025🎁\nStart <t:${unix}:R>`;
  const message = await channel.send({ content });
  data.countdownMessageId = message.id;
  data.countdownTargetTimestamp = targetTimestamp;
  if (resourcesRef.saveData) resourcesRef.saveData();
}

async function processEventState() {
  if (!clientRef || !resourcesRef) return;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const startThisYear = getEventStartDate(currentYear);
  const data = resourcesRef.christmasEventData || {};
  const channel = await clientRef.channels.fetch(ANNOUNCEMENT_CHANNEL_ID).catch(() => null);

  if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) return;

  if (now < startThisYear) {
    const diff = startThisYear.getTime() - now.getTime();
    if (diff <= COUNTDOWN_WINDOW_MS) {
      if (data.countdownTargetTimestamp !== startThisYear.getTime()) {
        await sendCountdownMessage(channel, startThisYear.getTime());
      }
    }
    return;
  }

  if (data.countdownMessageId) {
    await deleteCountdownMessage();
  }

  await ensureQuestMessage(channel);
}

function startWatcher() {
  if (watcherStarted) return;
  watcherStarted = true;

  const run = async () => {
    if (watcherRunning) return;
    watcherRunning = true;
    try {
      await processEventState();
    } catch (error) {
      console.error('Failed to process Christmas quest announcements:', error);
    } finally {
      watcherRunning = false;
    }
  };

  run();
  setInterval(run, ANNOUNCEMENT_INTERVAL_MS);
}

function isEventActive(now = new Date()) {
  const start = getEventStartDate(now.getUTCFullYear());
  if (now >= start) return true;
  const prevStart = getEventStartDate(now.getUTCFullYear() - 1);
  return now >= prevStart && now < start;
}

async function replyWithQuest(interaction) {
  const stats = resourcesRef.userStats[interaction.user.id] || {};
  resourcesRef.userStats[interaction.user.id] = stats;
  const questIndex = getNextQuestIndex(stats);
  if (questIndex >= QUESTS.length) {
    await interaction.reply({
      content: 'You have completed all available Christmas quests. 🎄',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const quest = QUESTS[questIndex];
  const questState = getQuestState(stats, questIndex, { create: true });
  const container = buildQuestProgressContainer(
    interaction.user,
    questIndex,
    quest,
    questState,
  );
  if (resourcesRef.saveData) resourcesRef.saveData();
  await interaction.reply({
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
  setQuestButtonState({ questIndex, started: true });
}

function registerInteractions(client) {
  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'christmas-quest') {
        if (!isEventActive()) {
          await interaction.reply({
            content:
              'The Christmas quests unlock on December 1st at 00:00 (UTC+7). Please check back then!',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await replyWithQuest(interaction);
        return;
      }

      if (interaction.isButton() && interaction.customId === QUEST_BUTTON_ID) {
        if (!isEventActive()) {
          await interaction.reply({
            content:
              'The Christmas quests unlock on December 1st at 00:00 (UTC+7). Please check back then!',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await replyWithQuest(interaction);
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

async function registerCommand(client) {
  const command = new SlashCommandBuilder()
    .setName('christmas-quest')
    .setDescription('View your Christmas quest progress.');
  try {
    await client.application.commands.create(command);
  } catch (error) {
    console.error('Failed to register /christmas-quest command:', error);
  }
}

function setup(client, resources) {
  resourcesRef = resources;
  clientRef = client;
  registerInteractions(client);
  client.once('ready', () => {
    startWatcher();
    registerCommand(client).catch(() => {});
  });
}

module.exports = { setup };
