const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { ITEMS } = require('../items');
const { normalizeInventory } = require('../utils');

const CANVAS_SIZE = 500;
const FARM_BG = 'https://i.ibb.co/NnG9tLD4/Flower-Garden.png';
const SELECT_IMG = 'https://i.ibb.co/yFCBLCfB/Select-pattern.png';
const WATERED_PLOT = 'https://i.ibb.co/tpyMJL5G/Watered-plot.png';

const WARNING = '<:SBWarning:1404101025849147432>';

const SEED_POSITIONS = {
  1: { x: 150, y: 200 },
  2: { x: 250, y: 200 },
  3: { x: 350, y: 200 },
  4: { x: 150, y: 300 },
  5: { x: 250, y: 300 },
  6: { x: 350, y: 300 },
  7: { x: 150, y: 400 },
  8: { x: 250, y: 400 },
  9: { x: 350, y: 400 },
};

const WHEAT_IMAGES = [
  'https://i.ibb.co/8LBQZB4H/Wheat-1.png',
  'https://i.ibb.co/NdB89b8d/Wheat-2.png',
  'https://i.ibb.co/zHTGhRgD/Wheat-3.png',
  'https://i.ibb.co/1fnGd4Yw/Wheat-4.png',
  'https://i.ibb.co/20pVfJgq/Wheat-5.png',
  'https://i.ibb.co/tTc1PRsK/Wheat-6.png',
];
const WHEAT_DEAD = 'https://i.ibb.co/rSZ27dp/Wheat-died.png';

const WHEAT_GROW_TIME = 4 * 60 * 60 * 1000; // 4h
const WHEAT_STAGE_TIME = WHEAT_GROW_TIME / 5; // 48m per stage
const WHEAT_DRY_DEATH_TIME = 2 * 60 * 60 * 1000; // 2h without water
const WHEAT_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 1d after grown
const WATER_DURATION = 60 * 60 * 1000; // 1h water on empty plot

const PLOT_POSITIONS = {
  1: { x: 100, y: 100 },
  2: { x: 200, y: 100 },
  3: { x: 300, y: 100 },
  4: { x: 100, y: 200 },
  5: { x: 200, y: 200 },
  6: { x: 300, y: 200 },
  7: { x: 100, y: 300 },
  8: { x: 200, y: 300 },
  9: { x: 300, y: 300 },
};

function isPlotWatered(plot) {
  if (!plot || !plot.watered) return false;
  if (plot.wateredExpires && plot.wateredExpires < Date.now()) {
    plot.watered = false;
    delete plot.wateredExpires;
    return false;
  }
  return true;
}

function cleanupExpiredWater(farm) {
  Object.values(farm || {}).forEach(plot => isPlotWatered(plot));
}

function getPlotStatus(plot) {
  if (!plot || !plot.seedId) return { grown: false, dead: false };
  const elapsed = Date.now() - (plot.plantedAt || 0);
  const grown = elapsed >= WHEAT_GROW_TIME;
  const watered = isPlotWatered(plot);
  const deadEarly = !watered && elapsed >= WHEAT_DRY_DEATH_TIME && !grown;
  const deadLate = grown && elapsed >= WHEAT_GROW_TIME + WHEAT_EXPIRE_TIME;
  return { grown, dead: deadEarly || deadLate };
}

async function getPlantImage(plot) {
  if (plot.seedId === 'WheatSeed') {
    const status = getPlotStatus(plot);
    if (status.dead) return loadImage(WHEAT_DEAD);
    const elapsed = Date.now() - plot.plantedAt;
    const stage = Math.min(Math.floor(elapsed / WHEAT_STAGE_TIME), 5);
    return loadImage(WHEAT_IMAGES[stage]);
  }
  return null;
}

async function renderFarm(farm, selected = []) {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');
  const bg = await loadImage(FARM_BG);
  ctx.drawImage(bg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const wateredImg = await loadImage(WATERED_PLOT);
  Object.entries(farm).forEach(([id, plot]) => {
    if (isPlotWatered(plot)) {
      const pos = PLOT_POSITIONS[id];
      if (pos) ctx.drawImage(wateredImg, pos.x, pos.y);
    }
  });

  for (const [id, plot] of Object.entries(farm)) {
    if (!plot.seedId) continue;
    const pos = SEED_POSITIONS[id];
    if (!pos) continue;
    const img = await getPlantImage(plot);
    if (img) ctx.drawImage(img, pos.x - img.width / 2, pos.y - img.height);
  }

  if (selected.length) {
    const overlay = await loadImage(SELECT_IMG);
    selected.forEach(id => {
      const pos = PLOT_POSITIONS[id];
      if (pos) ctx.drawImage(overlay, pos.x, pos.y);
    });
  }
  return canvas.toBuffer('image/png');
}

const farmStates = new Map();

function buildFarmContainer(user, selected = [], farm = {}) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('farm-select')
    .setPlaceholder('Plot Selection')
    .setMinValues(0)
    .setMaxValues(9)
    .addOptions(
      Array.from({ length: 9 }, (_, i) => ({
        label: `${i + 1}`,
        value: `${i + 1}`,
        default: selected.includes(i + 1),
      }))
    );

  const harvestable = Object.values(farm).some(plot => {
    const status = getPlotStatus(plot);
    return status.grown || status.dead;
  });

  const plantBtn = new ButtonBuilder()
    .setCustomId('farm-plant')
    .setLabel('Plant')
    .setEmoji('<:SBPlant:1410244118222999685>')
    .setStyle(ButtonStyle.Success)
    .setDisabled(selected.length === 0);

  const harvestBtn = new ButtonBuilder()
    .setCustomId('farm-harvest')
    .setLabel('Harvest')
    .setEmoji(ITEMS.HarvestScythe.emoji)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!harvestable);

  const waterBtn = new ButtonBuilder()
    .setCustomId('farm-water')
    .setLabel('Watering')
    .setEmoji(ITEMS.WateringCan.emoji)
    .setStyle(ButtonStyle.Primary);

  const progressLines = [];
  for (const [id, plot] of Object.entries(farm)) {
    if (!plot.seedId) continue;
    const status = getPlotStatus(plot);
    const plant = ITEMS.Wheat;
    if (status.grown && !status.dead)
      progressLines.push(
        `* **#${id} - ${plant.emoji} ${plant.name} is ready to harvest!**`,
      );
    else if (status.dead)
      progressLines.push(`* #${id} - ${plant.emoji} ${plant.name} has died`);
    else {
      const readyAt = Math.round((plot.plantedAt + WHEAT_GROW_TIME) / 1000);
      progressLines.push(
        `* #${id} - ${plant.emoji} ${plant.name} will be ready <t:${readyAt}:R>`,
      );
    }
  }

  const progressText =
    `## ${user.username}'s Farm\n### Progress:` +
    (progressLines.length ? `\n${progressLines.join('\n')}` : '');

  return new ContainerBuilder()
    .setAccentColor(0x2b2d31)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(progressText),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://farm.png'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(select),
      new ActionRowBuilder().addComponents(plantBtn, harvestBtn, waterBtn),
    );
}

async function sendFarmView(user, send, resources) {
  const stats = resources.userStats[user.id] || { inventory: [], farm: {} };
  stats.farm = stats.farm || {};
  for (let i = 1; i <= 9; i++) if (!stats.farm[i]) stats.farm[i] = {};
  cleanupExpiredWater(stats.farm);
  resources.userStats[user.id] = stats;

  const buffer = await renderFarm(stats.farm, []);
  const attachment = new AttachmentBuilder(buffer, { name: 'farm.png' });
  const container = buildFarmContainer(user, [], stats.farm);

  const farmMsg = await send({
    files: [attachment],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  farmStates.set(farmMsg.id, { userId: user.id, farmMsg, selected: [] });
  resources.saveData();
}

async function updateFarmMessage(state, user, stats, resources) {
  cleanupExpiredWater(stats.farm);
  const buffer = await renderFarm(stats.farm, state.selected || []);
  const attachment = new AttachmentBuilder(buffer, { name: 'farm.png' });
  const container = buildFarmContainer(user, state.selected || [], stats.farm);
  await state.farmMsg.edit({ files: [attachment], components: [container] });
  if (resources) resources.saveData();
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('farm-view')
    .setDescription('View your farm');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'farm-view') {
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
        }
        await sendFarmView(
          interaction.user,
          interaction.editReply.bind(interaction),
          resources,
        );
      } catch (err) {
        if (err.code !== 10062) throw err;
      }
      return;
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'farm-select') {
      const state = farmStates.get(interaction.message.id);
      if (!state || interaction.user.id !== state.userId) return;
      await interaction.deferUpdate({ flags: MessageFlags.IsComponentsV2 });
      state.selected = interaction.values.map(v => parseInt(v, 10));
      const stats = resources.userStats[state.userId] || { farm: {} };
      await updateFarmMessage(state, interaction.user, stats, resources);
      return;
    }
    if (interaction.isButton() && interaction.customId === 'farm-plant') {
      const state = farmStates.get(interaction.message.id);
      if (!state || interaction.user.id !== state.userId) return;
      const stats = resources.userStats[state.userId] || { inventory: [], farm: {} };
      const seeds = (stats.inventory || []).filter(
        i => /seed/i.test(i.name) && i.type === 'Material',
      );
      if (seeds.length === 0) {
        await interaction.reply({
          content: `${WARNING} You have no seeds.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
        const select = new StringSelectMenuBuilder()
          .setCustomId(`farm-plant-select:${interaction.message.id}`)
          .setPlaceholder('Seed')
          .addOptions(
            seeds.map(s => {
              const option = new StringSelectMenuOptionBuilder()
                .setLabel(`${s.name} - ${s.amount}`)
                .setValue(s.id);
              if (s.id === 'WheatSeed') {
                const match = /<(a?):(\w+):(\d+)>/.exec(ITEMS.WheatSeed.emoji);
                if (match)
                  option.setEmoji({ id: match[3], name: match[2], animated: Boolean(match[1]) });
              } else if (s.emoji) {
                const match = /<(a?):(\w+):(\d+)>/.exec(s.emoji);
                option.setEmoji(
                  match
                    ? { id: match[3], name: match[2], animated: Boolean(match[1]) }
                    : s.emoji,
                );
              }
              return option;
            }),
          );
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### What seed you want to plant?'),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(select));
      await interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('farm-plant-select:')) {
      const farmMsgId = interaction.customId.split(':')[1];
      const state = farmStates.get(farmMsgId);
      if (!state || interaction.user.id !== state.userId) return;
      await interaction.deferUpdate({ flags: MessageFlags.IsComponentsV2 });
      const seedId = interaction.values[0];
      const stats = resources.userStats[state.userId] || { inventory: [], farm: {} };
      const seed = (stats.inventory || []).find(i => i.id === seedId);
      const required = state.selected.length;
      if (!seed || seed.amount < required) {
        const msg = `${WARNING} You need ${required} ${seed ? seed.name : 'seed'} ${
          seed ? seed.emoji : ''
        } to plant, you only have ${seed ? seed.amount : 0}`;
        const container = new ContainerBuilder()
          .setAccentColor(0xffffff)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(msg));
        await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
      const farm = stats.farm;
      const occupied = state.selected.filter(id => farm[id].seedId);
      const plantable = state.selected.filter(id => !farm[id].seedId);
      plantable.forEach(id => {
        const plot = farm[id] || {};
        const wasWatered = isPlotWatered(plot);
        farm[id] = {
          seedId,
          plantedAt: Date.now(),
          watered: wasWatered,
        };
        if (wasWatered) delete farm[id].wateredExpires;
      });
      seed.amount -= plantable.length;
      normalizeInventory(stats);
      resources.userStats[state.userId] = stats;
      resources.saveData();
      state.selected = [];
      await updateFarmMessage(state, interaction.user, stats, resources);
      let content = 'Planted!';
      if (occupied.length) {
        content = `${WARNING} The plot ${occupied.join(', ')} already has a plant on it. The seed won't be planted on that plot.\n${content}`;
      }
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }
    if (interaction.isButton() && interaction.customId === 'farm-harvest') {
      const state = farmStates.get(interaction.message.id);
      if (!state || interaction.user.id !== state.userId) return;
      const stats = resources.userStats[state.userId] || { farm: {} };
      const harvestable = Object.entries(stats.farm)
        .filter(([id, plot]) => {
          const status = getPlotStatus(plot);
          return status.grown || status.dead;
        })
        .map(([id]) => id);
      if (harvestable.length === 0) {
        await interaction.reply({
          content: `${WARNING} Nothing to harvest.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const select = new StringSelectMenuBuilder()
        .setCustomId(`farm-harvest-select:${interaction.message.id}`)
        .setPlaceholder('Plot to harvest')
        .setMinValues(1)
        .setMaxValues(harvestable.length)
        .addOptions(harvestable.map(id => ({ label: `${id}`, value: `${id}` })));
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Plot to harvest'))
        .addActionRowComponents(new ActionRowBuilder().addComponents(select));
      await interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('farm-harvest-select:')) {
      const farmMsgId = interaction.customId.split(':')[1];
      const state = farmStates.get(farmMsgId);
      if (!state || interaction.user.id !== state.userId) return;
      await interaction.deferUpdate({ flags: MessageFlags.IsComponentsV2 });
      const plots = interaction.values.map(v => parseInt(v, 10));
      const stats = resources.userStats[state.userId] || { inventory: [], farm: {} };
      const farm = stats.farm;
      let harvested = 0;
      let returnedSeeds = 0;
      let deadNote = false;
      plots.forEach(id => {
        const plot = farm[id];
        const status = getPlotStatus(plot);
        if (!plot.seedId) return;
        if (status.dead) deadNote = true;
        else if (status.grown) {
          const amount = Math.floor(Math.random() * 4) + 2;
          harvested += amount;
          const inv = stats.inventory;
          let entry = inv.find(i => i.id === ITEMS.Wheat.id);
          if (entry) entry.amount = (entry.amount || 0) + amount;
          else inv.push({ ...ITEMS.Wheat, amount });

          const roll = Math.random();
          let seeds = 0;
          if (roll < 0.05) seeds = 2;
          else if (roll < 0.8) seeds = 1;
          if (seeds > 0) {
            returnedSeeds += seeds;
            let seedEntry = inv.find(i => i.id === ITEMS.WheatSeed.id);
            if (seedEntry) seedEntry.amount = (seedEntry.amount || 0) + seeds;
            else inv.push({ ...ITEMS.WheatSeed, amount: seeds });
          }
        }
        farm[id] = {};
      });
      normalizeInventory(stats);
      resources.userStats[state.userId] = stats;
      resources.saveData();
      state.selected = [];
      await updateFarmMessage(state, interaction.user, stats, resources);
      let content = '';
      if (harvested > 0)
        content += `You harvested ${harvested} ${ITEMS.Wheat.emoji} ${ITEMS.Wheat.name}.`;
      if (returnedSeeds > 0)
        content += `${content ? '\n' : ''}You received ${returnedSeeds} ${ITEMS.WheatSeed.emoji} ${ITEMS.WheatSeed.name}${
          returnedSeeds > 1 ? 's' : ''
        }.`;
      if (deadNote) content += `\n-# Your wheat died...`;
      if (!content) content = 'Nothing harvested.';
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }
    if (interaction.isButton() && interaction.customId === 'farm-water') {
      const state = farmStates.get(interaction.message.id);
      if (!state || interaction.user.id !== state.userId) return;
      const stats = resources.userStats[state.userId] || { inventory: [], farm: {} };
      const canItem = (stats.inventory || []).find(i => i.id === 'WateringCan');
      if (!canItem) {
        await interaction.reply({
          content: `${WARNING} You need a Watering Can to water.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const unwatered = Object.entries(stats.farm)
        .filter(([id, plot]) => !isPlotWatered(plot))
        .map(([id]) => id);
      if (unwatered.length === 0) {
        await interaction.reply({
          content: `${WARNING} All plots already watered.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const select = new StringSelectMenuBuilder()
        .setCustomId(`farm-water-select:${interaction.message.id}`)
        .setPlaceholder('Plot to water')
        .setMinValues(1)
        .setMaxValues(unwatered.length)
        .addOptions(unwatered.map(id => ({ label: `${id}`, value: `${id}` })));
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Plot to water'))
        .addActionRowComponents(new ActionRowBuilder().addComponents(select));
      await interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('farm-water-select:')) {
      const farmMsgId = interaction.customId.split(':')[1];
      const state = farmStates.get(farmMsgId);
      if (!state || interaction.user.id !== state.userId) return;
      await interaction.deferUpdate({ flags: MessageFlags.IsComponentsV2 });
      const plots = interaction.values.map(v => parseInt(v, 10));
      const stats = resources.userStats[state.userId] || { farm: {} };
      const farm = stats.farm;
      plots.forEach(id => {
        const plot = farm[id] || {};
        plot.watered = true;
        if (plot.seedId) {
          delete plot.wateredExpires;
        } else {
          plot.wateredExpires = Date.now() + WATER_DURATION;
        }
        farm[id] = plot;
      });
      resources.userStats[state.userId] = stats;
      resources.saveData();
      await updateFarmMessage(state, interaction.user, stats, resources);
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Watered!'));
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }
  });
}

module.exports = { setup, sendFarmView };
