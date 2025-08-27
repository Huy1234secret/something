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

function banHammerEmbed(user, targetId) {
  return new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user.username} has used **${ITEMS.BanHammer.name} ${ITEMS.BanHammer.emoji}** onto <@${targetId}>\n-# they are now not be able to use any command within 24h`,
      ),
    );
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

module.exports = { setup, handleUseItem, restoreActiveItemTimers };
