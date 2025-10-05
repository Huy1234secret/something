const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { ITEMS } = require('../items');
const { ANIMALS } = require('../animals');
const { HUNT_LURES, AREA_BY_KEY, RARE_RARITIES } = require('../huntData');
const { normalizeInventory, setSafeTimeout } = require('../utils');

const WARNING = '<:SBWarning:1404101025849147432>';
const DIAMOND_EMOJI = '<:CRDiamond:1405595593069432912>';
const RARITY_COLORS = {
  Common: 0xffffff,
  Rare: 0x00ffff,
  Epic: 0xff00ff,
  Legendary: 0xffff00,
  Mythical: 0xff4500,
  Godly: 0x800080,
  Prismatic: 0x00ff00,
  Secret: 0x000000,
};

const AREA_BY_LURE = Object.fromEntries(
  Object.entries(HUNT_LURES).map(([areaKey, data]) => [data.itemId, areaKey]),
);

const RARITY_ORDER = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Mythical',
  'Godly',
  'Prismatic',
  'Secret',
];

function padlockEmbed(user, amountLeft, expiresAt) {
  const btn = new ButtonBuilder()
    .setCustomId('padlock-left')
    .setLabel(`You have ×${amountLeft} Padlock left!`)
    .setEmoji(ITEMS.Padlock.emoji)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  return new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[ITEMS.Padlock.rarity])
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(ITEMS.Padlock.image),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## WALLET LOCKED'),
          new TextDisplayBuilder().setContent(
            `Hey ${user}, you have used ×1 Padlock ${ITEMS.Padlock.emoji}, your wallet will be temporary protected from being robbed!`,
          ),
          new TextDisplayBuilder().setContent(
            `-# Padlock will expire in <t:${Math.floor(expiresAt / 1000)}:R>`,
          ),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function landmineEmbed(user, amountLeft, expiresAt) {
  const btn = new ButtonBuilder()
    .setCustomId('landmine-left')
    .setLabel(`You have ×${amountLeft} Landmine left!`)
    .setEmoji(ITEMS.Landmine.emoji)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  return new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[ITEMS.Landmine.rarity])
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(ITEMS.Landmine.image))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## WALLET PROTECTED'),
          new TextDisplayBuilder().setContent(
            `Hey ${user}, you have placed down ×1 Landmine ${ITEMS.Landmine.emoji}, anyone who tries to rob your wallet has 50% chance to die.`,
          ),
          new TextDisplayBuilder().setContent(
            `-# Landmine will expire in <t:${Math.floor(expiresAt / 1000)}:R>`,
          ),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function banHammerEmbed(user, targetId) {
  return new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[ITEMS.BanHammer.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user.username} has used **${ITEMS.BanHammer.name} ${ITEMS.BanHammer.emoji}** onto <@${targetId}>\n-# they are now not be able to use any command within 24h`,
      ),
    );
}

function xpSodaEmbed(user, used, amountLeft, expiresAt) {
  const btn = new ButtonBuilder()
    .setCustomId('xpsoda-left')
    .setLabel(`You have ×${amountLeft} XP Soda left!`)
    .setEmoji(ITEMS.XPSoda.emoji)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  return new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[ITEMS.XPSoda.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## XP BOOSTED'),
      new TextDisplayBuilder().setContent(
        `Hey ${user}, you have used **×${used} XP Soda ${ITEMS.XPSoda.emoji}**, your XP will be doubled for <t:${Math.floor(expiresAt / 1000)}:R>!`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function expiredPadlockContainer(user, disable = false) {
  const btn = new ButtonBuilder()
    .setCustomId('padlock-use-again')
    .setStyle(ButtonStyle.Success)
    .setLabel('Use ×1 Padlock')
    .setEmoji(ITEMS.Padlock.emoji);
  if (disable) btn.setDisabled(true);
  return new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Padlock broke\n* ${user}, your **Padlock ${ITEMS.Padlock.emoji}** is broken after 24h. Your wallet is no longer protected.`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function schedulePadlock(user, expiresAt, resources) {
  const delay = expiresAt - Date.now();
  setSafeTimeout(async () => {
    const stats = resources.userStats[user.id];
    if (stats && stats.padlock_until === expiresAt) {
      stats.padlock_until = 0;
      resources.saveData();
    }
    try {
      await user.send({ components: [expiredPadlockContainer(user)], flags: MessageFlags.IsComponentsV2 });
    } catch {}
  }, delay);
}

function scheduleLandmine(user, expiresAt, resources) {
  const delay = expiresAt - Date.now();
  setSafeTimeout(() => {
    const stats = resources.userStats[user.id];
    if (stats && stats.landmine_until === expiresAt) {
      stats.landmine_until = 0;
      resources.saveData();
    }
  }, delay);
}

async function restoreActiveItemTimers(client, resources) {
  const now = Date.now();
  for (const [userId, stats] of Object.entries(resources.userStats)) {
    let user;
    if (stats.padlock_until && stats.padlock_until > now) {
      try {
        user = user || await client.users.fetch(userId);
        schedulePadlock(user, stats.padlock_until, resources);
      } catch {}
    }
    if (stats.landmine_until && stats.landmine_until > now) {
      try {
        user = user || await client.users.fetch(userId);
        scheduleLandmine(user, stats.landmine_until, resources);
      } catch {}
    }
  }
}

function usePadlock(user, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'Padlock');
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 Padlock to use.` };
  }
  if (stats.padlock_until && stats.padlock_until > Date.now()) {
    return { error: `${WARNING} Padlock is already active.` };
  }
  entry.amount -= 1;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  stats.padlock_until = expires;
  resources.userStats[user.id] = stats;
  resources.saveData();
  schedulePadlock(user, expires, resources);
  return { component: padlockEmbed(user, remaining, expires) };
}

function useLandmine(user, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'Landmine');
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 Landmine to use.` };
  }
  if (stats.landmine_until && stats.landmine_until > Date.now()) {
    return { error: `${WARNING} Landmine is already placed.` };
  }
  entry.amount -= 1;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  stats.landmine_until = expires;
  resources.userStats[user.id] = stats;
  resources.saveData();
  scheduleLandmine(user, expires, resources);
  return { component: landmineEmbed(user, remaining, expires) };
}

function useXPSoda(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'XPSoda');
  const item = ITEMS.XPSoda;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  const remaining = entry.amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  const base = Math.max(Date.now(), stats.xp_boost_until || 0);
  const expires = base + 6 * 60 * 60 * 1000 * amount;
  stats.xp_boost_until = expires;
  resources.userStats[user.id] = stats;
  resources.saveData();
  return { component: xpSodaEmbed(user, amount, remaining, expires) };
}

function useBanHammer(user, targetId, resources) {
  if (targetId === user.id) {
    return {
      error: `${WARNING} You cannot use the ${ITEMS.BanHammer.name} on yourself.`,
    };
  }
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'BanHammer');
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 Ban Hammer to use.` };
  }
  entry.amount -= 1;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  resources.commandBans[targetId] = expires;
  resources.saveData();
  return { component: banHammerEmbed(user, targetId) };
}

async function handleUseItem(user, itemId, amount, send, resources) {
  let result;
  if (itemId === 'Padlock') {
    result = usePadlock(user, resources);
  } else if (itemId === 'Landmine') {
    result = useLandmine(user, resources);
  } else if (itemId === 'XPSoda') {
    result = useXPSoda(user, amount, resources);
  } else if (itemId === 'DiamondBag') {
    result = useDiamondItem(user, 'DiamondBag', amount, 10000, resources);
  } else if (itemId === 'DiamondCrate') {
    result = useDiamondItem(user, 'DiamondCrate', amount, 135000, resources);
  } else if (itemId === 'DiamondChest') {
    result = useDiamondItem(user, 'DiamondChest', amount, 980000, resources);
  } else if (itemId === 'BulletBox') {
    result = useBulletBox(user, amount, resources);
  } else if (itemId === 'AnimalDetector') {
    result = useAnimalDetector(user, amount, resources);
  } else if (AREA_BY_LURE[itemId]) {
    result = {
      error: `${WARNING} You can now activate hunting lures from the hunt equipment menu.`,
    };
  } else {
    result = { error: `${WARNING} Cannot use this item.` };
  }
  if (result.error) {
    await send({ content: result.error });
  } else {
    await send({ components: [result.component], flags: MessageFlags.IsComponentsV2 });
  }
}

function buildLureSummary(areaKey) {
  const baseTotals = [{}, {}, {}];
  const boostedTotals = [{}, {}, {}];
  for (const animal of ANIMALS) {
    const chances = animal.chances[areaKey];
    if (!chances) continue;
    for (let tier = 0; tier < chances.length; tier++) {
      const chance = Number(chances[tier]) || 0;
      if (chance <= 0) continue;
      const rarity = animal.rarity;
      baseTotals[tier][rarity] = (baseTotals[tier][rarity] || 0) + chance;
      const multiplier = RARE_RARITIES.has(rarity) ? 2 : 1;
      boostedTotals[tier][rarity] =
        (boostedTotals[tier][rarity] || 0) + chance * multiplier;
    }
  }
  const summaries = [];
  for (let tier = 0; tier < baseTotals.length; tier++) {
    const base = baseTotals[tier];
    const boosted = boostedTotals[tier];
    const baseSum = Object.values(base).reduce((sum, value) => sum + value, 0);
    const boostedSum = Object.values(boosted).reduce(
      (sum, value) => sum + value,
      0,
    );
    if (baseSum <= 0 || boostedSum <= 0) continue;
    const rarities = Array.from(
      new Set([...Object.keys(base), ...Object.keys(boosted)]),
    ).sort((a, b) => {
      const aIndex = RARITY_ORDER.indexOf(a);
      const bIndex = RARITY_ORDER.indexOf(b);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
    const lines = rarities
      .map(rarity => {
        const baseValue = base[rarity] || 0;
        const boostedValue = boosted[rarity] || 0;
        const basePct = (baseValue / baseSum) * 100;
        const boostedPct = (boostedValue / boostedSum) * 100;
        const delta = boostedPct - basePct;
        const sign = delta >= 0 ? '+' : '';
        return `-# ${rarity}: ${basePct.toFixed(2)}% → ${boostedPct.toFixed(
          2,
        )}% (${sign}${delta.toFixed(2)}%)`;
      })
      .filter(Boolean);
    if (lines.length === 0) continue;
    summaries.push(`### Tier ${tier + 1} rarity shifts\n${lines.join('\n')}`);
  }
  return summaries;
}

function useHuntLure(user, itemId, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === itemId);
  const item = ITEMS[itemId];
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  const areaKey = AREA_BY_LURE[itemId];
  const areaInfo = AREA_BY_KEY[areaKey] || { name: areaKey };
  stats.hunt_lures = stats.hunt_lures || {};
  const state = stats.hunt_lures[areaKey] || { itemId, remaining: 0 };
  state.itemId = itemId;
  state.remaining = (state.remaining || 0) + 20 * amount;
  stats.hunt_lures[areaKey] = state;
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();

  const summary = buildLureSummary(areaKey);
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[item.rarity] || 0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${item.name} activated!`),
      new TextDisplayBuilder().setContent(
        `Hey ${user}, you have used ×${amount} ${item.name} ${item.emoji}!`,
      ),
      new TextDisplayBuilder().setContent(
        `-# Area boosted: ${areaInfo.name}`,
      ),
      new TextDisplayBuilder().setContent(
        `-# Successful hunts remaining: ${state.remaining}`,
      ),
      new TextDisplayBuilder().setContent(
        '-# Rare animal chances are doubled while this lure is active.',
      ),
    );
  if (summary.length) {
    container.addSeparatorComponents(new SeparatorBuilder());
    summary.forEach(block =>
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block)),
    );
  }
  return { component: container };
}

function useDiamondItem(user, itemId, amount, perDiamond, resources) {
  const stats = resources.userStats[user.id] || { inventory: [], diamonds: 0 };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === itemId);
  const item = ITEMS[itemId];
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  stats.diamonds = (stats.diamonds || 0) + perDiamond * amount;
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();
  const total = perDiamond * amount;
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[item.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user}, you have used **×${amount} ${item.name} ${item.emoji}** and got:\n### ${total} Diamonds ${DIAMOND_EMOJI}`,
      ),
    );
  return { component: container };
}

function useBulletBox(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'BulletBox');
  const item = ITEMS.BulletBox;
  if (!entry || entry.amount < amount) {
    return { error: `${WARNING} You need at least ${amount} ${item.name} to use.` };
  }
  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  const bullet = stats.inventory.find(i => i.id === 'Bullet');
  const bulletItem = ITEMS.Bullet;
  const gained = 6 * amount;
  if (bullet) bullet.amount += gained;
  else stats.inventory.push({ ...bulletItem, amount: gained });
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[item.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user}, you have used **×${amount} ${item.name} ${item.emoji}** and got:\n### ×${gained} ${bulletItem.name} ${bulletItem.emoji}`,
      ),
    );
  return { component: container };
}

function useAnimalDetector(user, amount, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);
  const entry = stats.inventory.find(i => i.id === 'AnimalDetector');
  const item = ITEMS.AnimalDetector;
  if (!entry || entry.amount < amount) {
    return {
      error: `${WARNING} You need at least ${amount} ${item.name} to use.`,
    };
  }
  entry.amount -= amount;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  const gained = 25 * amount;
  stats.hunt_detector_charges = Number.isFinite(stats.hunt_detector_charges)
    ? stats.hunt_detector_charges
    : 0;
  stats.hunt_detector_charges += gained;
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[item.rarity])
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user}, you activated **×${amount} ${item.name} ${item.emoji}**!`,
      ),
      new TextDisplayBuilder().setContent(
        `-# Guaranteed hunts remaining: ${stats.hunt_detector_charges}`,
      ),
      new TextDisplayBuilder().setContent(
        '-# Each detector grants 25 guaranteed hunts.',
      ),
    );
  return { component: container };
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('use-item')
    .setDescription('Use an item')
    .addStringOption(opt =>
      opt
        .setName('item')
        .setDescription('Item ID')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setMinValue(1));
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isAutocomplete() || interaction.commandName !== 'use-item') return;
      const stats = resources.userStats[interaction.user.id] || { inventory: [] };
      stats.inventory = stats.inventory || [];
      normalizeInventory(stats);
      const focused = interaction.options.getFocused().toLowerCase();
      const choices = stats.inventory
        .map(entry => ITEMS[entry.id])
        .filter(item => item && item.useable && item.name.toLowerCase().includes(focused))
        .map(item => ({ name: item.name, value: item.id }));
      await interaction.respond(choices.slice(0, 25));
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'use-item') return;
      const itemId = interaction.options.getString('item');
      const amount = interaction.options.getInteger('amount') || 1;
      if (itemId === 'BanHammer') {
        const modal = new ModalBuilder()
          .setCustomId(`banhammer-modal-${interaction.user.id}`)
          .setTitle('Ban Hammer');
        const input = new TextInputBuilder()
          .setCustomId('user')
          .setLabel('User ID')
          .setStyle(TextInputStyle.Short);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }
      await handleUseItem(interaction.user, itemId, amount, interaction.reply.bind(interaction), resources);
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isButton() || interaction.customId !== 'padlock-use-again') return;
      const res = usePadlock(interaction.user, resources);
      if (res.error) {
        await interaction.reply({ content: res.error });
      } else {
        await interaction.update({ components: [expiredPadlockContainer(interaction.user, true)], flags: MessageFlags.IsComponentsV2 });
        await interaction.followUp({ components: [res.component], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isModalSubmit() || !interaction.customId.startsWith('banhammer-modal-')) return;
      const userId = interaction.customId.split('-')[2];
      if (interaction.user.id !== userId) return;
      const targetId = interaction.fields.getTextInputValue('user');
      let target;
      try {
        target = await interaction.client.users.fetch(targetId);
      } catch {
        await interaction.reply({ content: `${WARNING} Invalid user ID.`, flags: MessageFlags.Ephemeral });
        return;
      }
      const res = useBanHammer(interaction.user, target.id, resources);
      if (res.error) {
        await interaction.reply({ content: res.error, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ components: [res.component], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, handleUseItem, restoreActiveItemTimers, useHuntLure };
