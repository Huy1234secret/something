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

const WARNING = '<:SBWarning:1404101025849147432>';

function padlockEmbed(user) {
  return new ContainerBuilder()
    .setAccentColor(0x00ff00)
    .addSectionComponents(
      new SectionBuilder()
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(ITEMS.padlock.image),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### WALLET LOCKET'),
          new TextDisplayBuilder().setContent(
            `Hey ${user}, you have used **×1 Padlock ${ITEMS.padlock.emoji}**, your wallet will be temporary protected from being robbed!`,
          ),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Padlock last 24h'));
}

function expiredPadlockContainer(user, disable = false) {
  const btn = new ButtonBuilder()
    .setCustomId('padlock-use-again')
    .setStyle(ButtonStyle.Success)
    .setLabel('Use ×1 Padlock')
    .setEmoji(ITEMS.padlock.emoji);
  if (disable) btn.setDisabled(true);
  return new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Padlock broke\n* ${user}, your **Padlock ${ITEMS.padlock.emoji}** is broken after 24h. Your wallet is no longer protected.`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(btn));
}

function schedulePadlock(user, expiresAt, resources) {
  const delay = expiresAt - Date.now();
  setTimeout(async () => {
    const stats = resources.userStats[user.id];
    if (stats) {
      stats.padlock_until = 0;
      resources.saveData();
    }
    try {
      await user.send({ components: [expiredPadlockContainer(user)], flags: MessageFlags.IsComponentsV2 });
    } catch {}
  }, Math.max(delay, 0));
}

function usePadlock(user, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  stats.inventory = stats.inventory || [];
  const entry = stats.inventory.find(i => i.id === 'padlock');
  if (!entry || entry.amount < 1) {
    return { error: `${WARNING} You need at least 1 Padlock to use.` };
  }
  if (stats.padlock_until && stats.padlock_until > Date.now()) {
    return { error: `${WARNING} Padlock is already active.` };
  }
  entry.amount -= 1;
  if (entry.amount <= 0) stats.inventory = stats.inventory.filter(i => i !== entry);
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  stats.padlock_until = expires;
  resources.userStats[user.id] = stats;
  resources.saveData();
  schedulePadlock(user, expires, resources);
  return { component: padlockEmbed(user) };
}

async function handleUseItem(user, itemId, amount, send, resources) {
  let result;
  if (itemId === 'padlock') {
    result = usePadlock(user, resources);
  } else {
    result = { error: `${WARNING} Cannot use this item.` };
  }
  if (result.error) {
    await send({ content: result.error, ephemeral: true });
  } else {
    await send({ components: [result.component], flags: MessageFlags.IsComponentsV2 });
  }
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
      await interaction.reply({ content: res.error, ephemeral: true });
    } else {
      await interaction.update({ components: [expiredPadlockContainer(interaction.user, true)], flags: MessageFlags.IsComponentsV2 });
      await interaction.followUp({ components: [res.component], flags: MessageFlags.IsComponentsV2 });
    }
  });
}

module.exports = { setup, handleUseItem };
