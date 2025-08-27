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
} = require('discord.js');
const { ITEMS } = require('../items');
const { normalizeInventory } = require('../utils');

const WARNING = '<:SBWarning:1404101025849147432>';
const DIAMOND_EMOJI = '<:CRDiamond:1405595593069432912>';

function padlockEmbed(user, amountLeft, expiresAt) {
  const btn = new ButtonBuilder()
    .setCustomId('padlock-left')
    .setLabel(`You have ×${amountLeft} Padlock left!`)
    .setEmoji(ITEMS.Padlock.emoji)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  return new ContainerBuilder()
    .setAccentColor(0x00ff00)
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
    .setAccentColor(0x00ff00)
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
  setTimeout(async () => {
    const stats = resources.userStats[user.id];
    if (stats && stats.padlock_until === expiresAt) {
      stats.padlock_until = 0;
      resources.saveData();
    }
    try {
      await user.send({ components: [expiredPadlockContainer(user)], flags: MessageFlags.IsComponentsV2 });
    } catch {}
  }, Math.max(delay, 0));
}

function scheduleLandmine(user, expiresAt, resources) {
  const delay = expiresAt - Date.now();
  setTimeout(() => {
    const stats = resources.userStats[user.id];
    if (stats && stats.landmine_until === expiresAt) {
      stats.landmine_until = 0;
      resources.saveData();
    }
  }, Math.max(delay, 0));
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

async function handleUseItem(user, itemId, amount, send, resources) {
  let result;
  if (itemId === 'Padlock') {
    result = usePadlock(user, resources);
  } else if (itemId === 'Landmine') {
    result = useLandmine(user, resources);
  } else if (itemId === 'DiamondBag') {
    result = useDiamondItem(user, 'DiamondBag', amount, 10000, resources);
  } else if (itemId === 'DiamondCrate') {
    result = useDiamondItem(user, 'DiamondCrate', amount, 135000, resources);
  } else if (itemId === 'DiamondChest') {
    result = useDiamondItem(user, 'DiamondChest', amount, 980000, resources);
  } else {
    result = { error: `${WARNING} Cannot use this item.` };
  }
  if (result.error) {
    await send({ content: result.error });
  } else {
    await send({ components: [result.component], flags: MessageFlags.IsComponentsV2 });
  }
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
    .setAccentColor(0x00ffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user}, you have used **×${amount} ${item.name} ${item.emoji}** and got:\n### ${total} Diamonds ${DIAMOND_EMOJI}`,
      ),
    );
  return { component: container };
}

function setup(client, resources) {
  const usable = Object.values(ITEMS).filter(i => i.useable);
  const command = new SlashCommandBuilder()
    .setName('use-item')
    .setDescription('Use an item')
    .addStringOption(opt => {
      opt.setName('item').setDescription('Item ID').setRequired(true);
      usable.forEach(i => opt.addChoices({ name: i.name, value: i.id }));
      return opt;
    })
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setMinValue(1));
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'use-item') return;
    const itemId = interaction.options.getString('item');
    const amount = interaction.options.getInteger('amount') || 1;
    await handleUseItem(interaction.user, itemId, amount, interaction.reply.bind(interaction), resources);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== 'padlock-use-again') return;
    const res = usePadlock(interaction.user, resources);
    if (res.error) {
      await interaction.reply({ content: res.error });
    } else {
      await interaction.update({ components: [expiredPadlockContainer(interaction.user, true)], flags: MessageFlags.IsComponentsV2 });
      await interaction.followUp({ components: [res.component], flags: MessageFlags.IsComponentsV2 });
    }
  });
}

module.exports = { setup, handleUseItem, restoreActiveItemTimers };
