const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('@discordjs/builders');
const { normalizeInventory } = require('../utils');
const { ITEMS } = require('../items');

const RARITY_EMOJIS = {
  Common: '<:SBRCommon:1409932856762826862>',
  Rare: '<:SBRRare:1409932954037387324>',
  Epic: '<:SBREpic:1409933003269996674>',
  Legendary: '<a:SBRLegendary:1409933036568449105>',
  Mythical: '<a:SBRMythical:1409933097176268902>',
  Godly: '<a:SBRGodly:1409933130793750548>',
  Secret: '<a:SBRSecret:1409933447220297791>',
};

const cosmeticStates = new Map();

function buildContainer(user, stats, state = {}) {
  const equipped = stats.cosmeticSlots || [null, null, null];
  const equippedList = equipped
    .map(id => {
      if (!id) return null;
      const item = ITEMS[id];
      if (!item) return null;
      return `-# ${item.emoji} ${item.name} ${RARITY_EMOJIS[item.rarity] || ''}`;
    })
    .filter(Boolean)
    .join('\n') || '-# None';

  const perks = [];
  if (equipped.includes('ArcsOfResurgence')) {
    perks.push(
      '-# +777% Coin earn',
      '-# +15% Success beg chance',
      '-# +25% Hunting fail chance',
      '-# 1% Owner encounter chance',
    );
  }
  if (equipped.includes('GoldRing')) {
    perks.push('-# +10% Total coin earn');
  }
  if (equipped.includes('ElfHat')) {
    perks.push('-# +100% Coin earn');
  }
  const perkText = perks.join('\n') || '-# None';

  const slotSelect = new StringSelectMenuBuilder()
    .setCustomId('cosmetic-slot')
    .setPlaceholder('Select slot')
    .addOptions(
      equipped.map((_, i) => ({ label: `Slot ${i + 1}`, value: String(i) })),
    );

  const cosmeticOptions = [{ label: 'None', value: 'none' }];
  if (state.slot != null) {
    const equippedSet = new Set(equipped.filter(Boolean));
    for (const item of stats.inventory || []) {
      if (!item.types || !item.types.includes('Cosmetic')) continue;
      if (equippedSet.has(item.id)) continue;
      cosmeticOptions.push({
        label: `${item.emoji} ${item.name}`,
        value: item.id,
        description: `Tier ${item.tier || 1}`,
      });
    }
  }

  const cosmeticSelect = new StringSelectMenuBuilder()
    .setCustomId('cosmetic-select')
    .setPlaceholder('Select cosmetic')
    .setDisabled(state.slot == null)
    .addOptions(cosmeticOptions);

  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(user.displayAvatarURL()),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## Equipped cosmetics:\n${equippedList}`,
          ),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## Perks:\n${perkText}`),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(slotSelect),
      new ActionRowBuilder().addComponents(cosmeticSelect),
    );
}

async function sendCosmetics(user, send, resources, state = {}) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  normalizeInventory(stats);
  stats.cosmeticSlots = stats.cosmeticSlots || [null, null, null];
  resources.userStats[user.id] = stats;
  resources.saveData();
  const container = buildContainer(user, stats, state);
  const message = await send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  cosmeticStates.set(message.id, { userId: user.id, slot: state.slot ?? null });
  return message;
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('my-cosmetic')
    .setDescription('View and equip your cosmetics');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === 'my-cosmetic'
      ) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
        await sendCosmetics(
          interaction.user,
          interaction.editReply.bind(interaction),
          resources,
        );
      } else if (interaction.isStringSelectMenu()) {
        const state = cosmeticStates.get(interaction.message.id);
        if (!state || interaction.user.id !== state.userId) return;
        const stats = resources.userStats[state.userId] || { inventory: [] };
        stats.cosmeticSlots = stats.cosmeticSlots || [null, null, null];
        normalizeInventory(stats);
        if (interaction.customId === 'cosmetic-slot') {
          state.slot = parseInt(interaction.values[0], 10);
          const container = buildContainer(interaction.user, stats, state);
          await interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          });
        } else if (interaction.customId === 'cosmetic-select') {
          const slot = state.slot;
          if (slot == null) return;
          const choice = interaction.values[0];
          const equipped = stats.cosmeticSlots;
          const inv = stats.inventory || [];
          if (choice === 'none') {
            const prev = equipped[slot];
            if (prev) {
              const item = ITEMS[prev];
              const entry = inv.find(i => i.id === prev);
              if (entry) entry.amount += 1;
              else inv.push({ ...item, amount: 1 });
              equipped[slot] = null;
            }
          } else {
            const entry = inv.find(i => i.id === choice);
            if (entry && !equipped.includes(choice)) {
              entry.amount -= 1;
              if (entry.amount <= 0) stats.inventory = inv.filter(i => i !== entry);
              const prev = equipped[slot];
              if (prev) {
                const item = ITEMS[prev];
                const prevEntry = inv.find(i => i.id === prev);
                if (prevEntry) prevEntry.amount += 1;
                else inv.push({ ...item, amount: 1 });
              }
              equipped[slot] = choice;
            }
          }
          state.slot = null;
          normalizeInventory(stats);
          resources.userStats[state.userId] = stats;
          resources.saveData();
          const container = buildContainer(interaction.user, stats);
          await interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, sendCosmetics };

