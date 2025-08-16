const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
} = require('discord.js');
const { formatNumber } = require('../utils');
const { ITEMS } = require('../items');
const { handleDeath } = require('../death');

const WARNING = '<:SBWarning:1404101025849147432>';
const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
const COOLDOWN = 15 * 60 * 1000;
const MIN_COINS = 10000;

const FAIL_MESSAGES = [
  "{usermention} tried to rob {robbinguser} but got caught by the police.\nYou paid {amount} coin to {robbinguser} as restitution.\n-# police-caught",
  "{usermention} was recorded on CCTV while targeting {robbinguser}.\nYou paid {amount} coin to {robbinguser} for compensation.\n-# cctv-proof",
  "{usermention} set off a security alarm during the attempt on {robbinguser}.\nYou paid {amount} coin to {robbinguser} for damages.\n-# alarm-triggered",
  "{usermention} was detained by a security guard while reaching for {robbinguser}.\nYou paid {amount} coin to {robbinguser} as a settlement.\n-# security-detained",
  "{usermention} was identified by witnesses after trying to rob {robbinguser}.\nYou paid {amount} coin to {robbinguser} as restitution.\n-# witness-report",
  "{usermention} got flagged by an anti-theft tracker linked to {robbinguser}.\nYou paid {amount} coin to {robbinguser} as a penalty.\n-# tracker-flagged",
  "{usermention} signed a confession after failing to rob {robbinguser}.\nYou paid {amount} coin to {robbinguser} as part of the agreement.\n-# confession-deal",
  "{usermention} tried to snatch from {robbinguser} and broke their strap.\nYou paid {amount} coin to {robbinguser} for repairs.\n-# property-damage",
  "{usermention} was stopped by neighborhood watch while targeting {robbinguser}.\nYou paid {amount} coin to {robbinguser} as compensation.\n-# neighborhood-watch",
  "{usermention} failed the pickpocket—{robbinguser} filed a report.\nYou paid {amount} coin to {robbinguser} to settle it.\n-# report-filed",
  "{usermention} triggered a dye pack during the attempt on {robbinguser}.\nYou paid {amount} coin to {robbinguser} for cleaning and damages.\n-# dye-pack",
  "{usermention} lost a quick arbitration after trying to rob {robbinguser}.\nYou paid {amount} coin to {robbinguser} per the ruling.\n-# arbitration",
  "{usermention} faced a civil claim from {robbinguser} after the failed robbery.\nYou paid {amount} coin to {robbinguser} as a settlement.\n-# civil-claim",
  "{usermention} got caught and agreed to make amends to {robbinguser}.\nYou paid {amount} coin to {robbinguser} as restitution.\n-# make-amends",
  "{usermention} attempted to rob {robbinguser} but was tracked by their phone.\nYou paid {amount} coin to {robbinguser} as compensation.\n-# device-tracked",
  "{usermention} was stopped by staff, and {robbinguser} pressed charges.\nYou paid {amount} coin to {robbinguser} to drop the charges.\n-# dropped-charges",
  "{usermention} tried to rob {robbinguser} and caused a scene.\nYou paid {amount} coin to {robbinguser} for inconvenience.\n-# disturbance",
  "{usermention} failed the grab; {robbinguser}'s insurance denied the claim.\nYou paid {amount} coin to {robbinguser} to cover the deductible.\n-# insurance-deductible",
  "{usermention} was caught on bodycam during the attempt on {robbinguser}.\nYou paid {amount} coin to {robbinguser} as restitution.\n-# bodycam",
  "{usermention} faced a court order after trying to rob {robbinguser}.\nYou paid {amount} coin to {robbinguser} by order of the court.\n-# court-order",
  "{usermention} was intercepted by bystanders while targeting {robbinguser}.\nYou paid {amount} coin to {robbinguser} as compensation.\n-# bystander-stop",
  "{usermention} attempted a grab and damaged {robbinguser}'s phone case.\nYou paid {amount} coin to {robbinguser} for replacement costs.\n-# replace-costs",
  "{usermention} got flagged by the bank’s fraud system while targeting {robbinguser}.\nYou paid {amount} coin to {robbinguser} as a chargeback penalty.\n-# bank-penalty",
  "{usermention} failed to rob {robbinguser} and accepted a plea deal.\nYou paid {amount} coin to {robbinguser} as restitution.\n-# plea-deal",
];

const PADLOCK_FAIL_MESSAGES = [
  "{usermention} tried to rob {robbinguser}, but their wallet is padlocked.\nYou paid {amount} coin to {robbinguser} for tampering with a locked wallet.\n-# padlock",
  "{usermention} tugged at {robbinguser}'s padlocked wallet and set off the lock alarm.\nYou paid {amount} coin to {robbinguser} as a security fee.\n-# lock-alarm",
  "{usermention} couldn’t get past {robbinguser}'s padlock.\nYou paid {amount} coin to {robbinguser} for attempted theft.\n-# access-denied",
  "{usermention} tried the zipper—padlock says no.\nYou paid {amount} coin to {robbinguser} for the trouble.\n-# locked-tight",
  "{usermention} picked at {robbinguser}'s padlock and got flagged by the anti-tamper latch.\nYou paid {amount} coin to {robbinguser} as a penalty.\n-# anti-tamper",
  "{usermention} failed to rob {robbinguser}; the padlock recorded the attempt.\nYou paid {amount} coin to {robbinguser} as restitution.\n-# attempt-logged",
  "{usermention} pulled on {robbinguser}'s wallet, but the padlock held.\nYou paid {amount} coin to {robbinguser} for damages to the strap.\n-# strap-damage",
  "{usermention} tried to crack {robbinguser}'s lock and triggered a security ping.\nYou paid {amount} coin to {robbinguser} as a lock breach fee.\n-# lock-breach",
  "{usermention} couldn’t open {robbinguser}'s padlock; the key never turned.\nYou paid {amount} coin to {robbinguser} for attempting to steal.\n-# key-denied",
  "{usermention} messed with {robbinguser}'s padlock and left scratches.\nYou paid {amount} coin to {robbinguser} for repair costs.\n-# repair-costs",
  "{usermention} tried to bypass {robbinguser}'s padlock, but it auto-notified.\nYou paid {amount} coin to {robbinguser} per the lock policy.\n-# auto-notify",
  "{usermention} rattled {robbinguser}'s padlocked wallet and got noticed.\nYou paid {amount} coin to {robbinguser} for disturbing the peace.\n-# noticed",
  "{usermention} attempted to open {robbinguser}'s wallet; padlock engaged a loud click.\nYou paid {amount} coin to {robbinguser} as compensation.\n-# loud-click",
  "{usermention} tried to force {robbinguser}'s padlock but failed.\nYou paid {amount} coin to {robbinguser} for the failed break-in.\n-# forced-fail",
  "{usermention} thought the padlock was decorative on {robbinguser}'s wallet—it's not.\nYou paid {amount} coin to {robbinguser} as a fine.\n-# not-decorative",
  "{usermention} attempted a quick snatch, but {robbinguser}'s padlock held firm.\nYou paid {amount} coin to {robbinguser} for the attempt.\n-# held-firm",
];

function weightedPercent(min = 1, max = 100) {
  const n = max - min + 1;
  let r = Math.random() * (n * (n + 1) / 2);
  for (let p = min; p <= max; p++) {
    r -= max + 1 - p;
    if (r <= 0) return p;
  }
  return min;
}

function buildEmbed(color, title, desc, thumb) {
  const container = new ContainerBuilder().setAccentColor(color);

  if (thumb) {
    const section = new SectionBuilder()
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${title}`),
        new TextDisplayBuilder().setContent(desc),
      );
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${title}`),
      new TextDisplayBuilder().setContent(desc),
    );
  }

  return container;
}

async function executeRob(robber, target, send, resources) {
  if (robber.id === target.id) {
    await send({
      content: `${WARNING} You cannot rob yourself.`,
    });
    return;
  }
  const robberStats = resources.userStats[robber.id] || { coins: 0 };
  const targetStats = resources.userStats[target.id] || { coins: 0 };
  const now = Date.now();
  const targetProtected = targetStats.padlock_until && targetStats.padlock_until > now;
  if ((robberStats.coins || 0) < MIN_COINS) {
    await send({
      content: `${WARNING} You need at least ${formatNumber(MIN_COINS)} ${COIN_EMOJI} to rob someone.`,
    });
    return;
  }
  if ((targetStats.coins || 0) < MIN_COINS) {
    await send({
      content: `${WARNING} ${target.username} must have at least ${formatNumber(MIN_COINS)} ${COIN_EMOJI} to be robbed.`,
    });
    return;
  }

  if (robberStats.rob_cooldown_until && robberStats.rob_cooldown_until > now) {
    const timestamp = Math.round(robberStats.rob_cooldown_until / 1000);
    await send({
      content: `${WARNING} You can rob again <t:${timestamp}:R>.`,
    });
    return;
  }

  const landmineActive =
    targetStats.landmine_until && targetStats.landmine_until > now;
  if (landmineActive) {
    targetStats.landmine_until = 0;
    resources.userStats[target.id] = targetStats;
    resources.saveData();
    if (Math.random() < 0.5) {
      const container = new ContainerBuilder()
        .setAccentColor(0x000000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<@${robber.id}>, you accidently stepped on a **Landmine ${ITEMS.Landmine.emoji}** and it exploded, you died!`,
          ),
        );
      await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
      await handleDeath(robber, 'robbing', resources);
      return;
    }
  }

  const fail = targetProtected || Math.random() < 0.65;
  if (fail) {
    const percent = weightedPercent(10, 50);
    let amount = Math.floor((robberStats.coins || 0) * percent / 100);
    if (amount < 1) amount = 1;
    if ((robberStats.coins || 0) < amount) amount = robberStats.coins || 0;
    robberStats.coins = (robberStats.coins || 0) - amount;
    targetStats.coins = (targetStats.coins || 0) + amount;
    robberStats.rob_cooldown_until = now + COOLDOWN;
    resources.userStats[robber.id] = robberStats;
    resources.userStats[target.id] = targetStats;
    resources.saveData();
    const arr = targetProtected ? PADLOCK_FAIL_MESSAGES : FAIL_MESSAGES;
    const msg = arr[Math.floor(Math.random() * arr.length)]
      .replace(/\{usermention\}/g, `<@${robber.id}>`)
      .replace(/\{robbinguser\}/g, target.username)
      .replace(/\{amount\}/g, formatNumber(amount))
      .replace(/coin/g, COIN_EMOJI);
    await send({
      components: [buildEmbed(0xff0000, `Failed robbing ${target.username}`, msg)],
      flags: MessageFlags.IsComponentsV2,
    });
    const alert = buildEmbed(
      0xffffff,
      'Robbing Alert!',
      `Hey, <@${robber.id}> was trying to rob your wallet but failed`,
    );
    try {
      await target.send({ components: [alert], flags: MessageFlags.IsComponentsV2 });
    } catch {}
    return;
  }

  const roll = Math.random() * 100;
  let percent;
  let title;
  if (roll < 60) {
    percent = 10;
    title = `You have robbed ${target.username} a little!`;
  } else if (roll < 95) {
    percent = 25;
    title = `You have robbed a quarter of ${target.username}'s wallet!`;
  } else if (roll < 99.9) {
    percent = 50;
    title = `You have robbed a half of ${target.username}'s wallet! How Greed!!!`;
  } else {
    percent = 100;
    title = 'You have robbed LITERALLY EVERYTHING AS YOU CAN! FR!';
  }
  let amount = Math.floor((targetStats.coins || 0) * percent / 100);
  if ((targetStats.coins || 0) < amount) amount = targetStats.coins || 0;
  targetStats.coins = (targetStats.coins || 0) - amount;
  robberStats.coins = (robberStats.coins || 0) + amount;
  robberStats.rob_cooldown_until = now + COOLDOWN;
  resources.userStats[robber.id] = robberStats;
  resources.userStats[target.id] = targetStats;
  resources.saveData();

  await send({
    components: [
      buildEmbed(
        0x00ff00,
        title,
        `<@${robber.id}> You have successfully robbed ${target.username}, you earned ${formatNumber(amount)} ${COIN_EMOJI}`,
        'https://i.ibb.co/q3mZ8N8T/ef097dbe-8f94-48b2-9a39-e7c8d4cc420b.png',
      ),
    ],
    flags: MessageFlags.IsComponentsV2,
  });
  const alert = buildEmbed(
    0xff0000,
    'You got Robbed!',
    `Hey, <@${robber.id}> has successfully robbed your wallet and stole ${formatNumber(amount)} ${COIN_EMOJI}`,
    'https://i.ibb.co/q3mZ8N8T/ef097dbe-8f94-48b2-9a39-e7c8d4cc420b.png',
  );
  try {
    await target.send({ components: [alert], flags: MessageFlags.IsComponentsV2 });
  } catch {}
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Rob someone')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true));
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'rob') return;
    const target = interaction.options.getUser('user');
    await executeRob(interaction.user, target, interaction.reply.bind(interaction), resources);
  });
}

module.exports = { setup, executeRob };
