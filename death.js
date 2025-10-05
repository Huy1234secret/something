const {
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require('@discordjs/builders');
const { ITEMS } = require('./items');
const { normalizeInventory } = require('./utils');

const RARITY_ORDER = [
  ['Common', 0.5],
  ['Rare', 0.35],
  ['Epic', 0.25],
  ['Legendary', 0.125],
  ['Mythical', 0.075],
  ['Godly', 0.04],
  ['Prismatic', 0.01],
];

async function handleDeath(user, action, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  normalizeInventory(stats);

  // Seraphic Heart check
  const heart = stats.inventory.find(i => i.id === 'SeraphicHeart');
  if (heart && heart.amount > 0) {
    heart.amount -= 1;
    if (heart.amount <= 0) {
      stats.inventory = stats.inventory.filter(i => i !== heart);
    }
    normalizeInventory(stats);
    resources.userStats[user.id] = stats;
    resources.saveData();
    const btn = new ButtonBuilder()
      .setCustomId('heart-left')
      .setEmoji(ITEMS.SeraphicHeart.emoji)
      .setLabel(`You have ${heart.amount} ${ITEMS.SeraphicHeart.name} left!`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
    const container = new ContainerBuilder()
      .setAccentColor(0xff0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## Your ${ITEMS.SeraphicHeart.name} protected you!`),
        new TextDisplayBuilder().setContent(
          `You died while ${action}, but you have ${ITEMS.SeraphicHeart.name} in your inventory which prevented you from dying.`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
    try {
      await user.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch {}
    return { prevented: true };
  }

  // Real death
  const lost = {};
  stats.coins = 0;
  stats.diamonds = 0;

  for (const [rarity, chance] of RARITY_ORDER) {
    const itemsOfRarity = () => stats.inventory.filter(i => i.rarity === rarity);
    while (itemsOfRarity().length && Math.random() < chance) {
      const arr = itemsOfRarity();
      const item = arr[Math.floor(Math.random() * arr.length)];
      item.amount -= 1;
      lost[item.id] = (lost[item.id] || 0) + 1;
      if (item.amount <= 0) {
        stats.inventory = stats.inventory.filter(i => i !== item);
      }
    }
  }

  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  resources.saveData();

  const container = new ContainerBuilder()
    .setAccentColor(0x000000)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## You have died!'))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `You died while ${action}, you lose all your money and diamond in the wallet! Luckily, your **Deluxe Coin** still there.`,
      ),
    );

  const lostIds = Object.keys(lost);
  if (lostIds.length) {
    const parts = lostIds.map(id => {
      const base = ITEMS[id];
      return `×${lost[id]} ${base.name} ${base.emoji}`;
    });
    container
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`You also lose: ${parts.join(', ')}`),
      );
  }

  try {
    await user.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch {}

  return { prevented: false, lost };
}

module.exports = { handleDeath };

