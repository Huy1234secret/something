const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const { formatNumber, normalizeInventory } = require('../utils');
const { ITEMS } = require('../items');

const NAMES = [
  'jake', 'mia', 'liam', 'ava', 'noah', 'emma', 'oliver', 'sophia', 'elijah', 'isabella',
  'lucas', 'amelia', 'mason', 'charlotte', 'ethan', 'scarlett', 'logan', 'harper', 'james',
  'lily', 'ben', 'zoe', 'leo', 'chloe', 'owen', 'aria', 'jack', 'ellie', 'henry',
  'grace', 'aiden', 'maya', 'luke', 'nora', 'wyatt', 'ella', 'daniel', 'aurora', 'carter',
  'violet', 'grayson', 'layla', 'sebastian', 'mila', 'jackson', 'elena', 'david', 'riley',
  'sam', 'leah', 'jose', 'ruby', 'nathan', 'bella', 'julian', 'ivy', 'caleb', 'stella',
  'isaac', 'lucy', 'dylan', 'alice', 'anthony', 'hailey', 'ezra', 'skylar', 'thomas',
  'sadie', 'charlie', 'penelope', 'hudson', 'elise', 'jonah', 'piper', 'isaiah', 'natalie',
  'adam', 'faith', 'parker', 'julia', 'cooper', 'autumn', 'carmen', 'finn', 'nina', 'roman',
  'trinity', 'arlo', 'ada', 'theo', 'zoey', 'jay', 'erin', 'bryce', 'eden', 'ryan',
  'sara', 'omar', 'brooke', 'felix', 'hope', 'arthur', 'norah', 'miles', 'lola', 'simon',
  'cecilia', 'axel', 'paige', 'emilio', 'june', 'colin', 'salma', 'asher', 'dana', 'mateo',
  'maria', 'reid', 'heidi', 'ruben', 'diana', 'amir', 'selena'
];

const SUCCESS_MESSAGES = [
  'sure here you go', 'yeah I can help', 'take this', 'here have some', 'I got you',
  'no problem take it', 'happy to help', 'passing a little your way', 'here is a small gift',
  'keep this for now', 'hope it helps', 'you deserve a break', 'spreading some kindness',
  'this should help', 'here is something', 'a small boost for you', 'I can spare a bit',
  'take a little', 'I can share this', 'a tiny tip for you', 'here you go friend',
  'I will help today', 'I got some change', 'take my spare', 'let me chip in',
  'you can have this', 'a small hand today', 'yes I can donate', 'I believe in you',
  'sending good vibes and cash', 'take care with this', 'you are not alone',
  'here is lunch money', 'I saved this for you', 'sharing is caring',
  'you asked nicely here', 'I appreciate your honesty', 'you got this here',
  'this is for you', 'have a better day', 'take a little kindness',
  'I will support you', 'yes take it', 'here take my tip', 'bless you take this',
  'good luck out there', 'let me help you', 'I can spare this', 'here is a coffee',
  'for your next meal', 'keep pushing here', 'be well take this', 'I heard you here',
  'a gift for you', 'small help big heart', 'I am paying it forward',
  'you caught me on a good day', 'take care friend', 'I can do that',
  'let this help', 'one step at a time', 'passing this to you',
  'because I can today', 'you asked I answered', 'take my extra',
  'here is a little love', 'from me to you', 'I want to help',
  'take this and smile', 'I see you here', 'you matter take this',
  'your courage moved me', 'this is on me', 'I will cover you a bit',
  'yes absolutely', 'sure why not', 'ok here', 'I got a spare',
  'I can give a hand', 'you can count on me', 'adding to your jar',
  'take this safely', 'good luck today', 'stay warm take this',
  'grab this please', 'a quick boost', 'a tiny kindness',
  'lightening your load a bit', 'here is bus fare', 'here is train fare',
  'a snack on me', 'a drink on me', 'that took guts take this',
  'thanks for asking here', 'I am with you', 'I will help a little',
  'you got my support', 'a little something for you',
  'take what I can give', 'best wishes with this'
];

const FAIL_MESSAGES = [
  'no', 'buzz off', 'hell no', 'not my problem', 'get a job', 'beat it',
  'scram', 'leave me alone', 'back off', 'stop begging', 'seriously', 'no',
  "I’m not your ATM", 'try working', 'not today, kid', 'damn', 'no',
  'quit asking me', 'pick yourself up', 'go ask someone else',
  "I’m broke, okay? move on", 'go away', 'take a hike', 'nope',
  'not happening', 'get lost', 'don’t bug me', 'stop it', 'no',
  'you wish', 'dream on', 'I said no', 'hard pass', 'nope', 'not today',
  'take your sob story elsewhere', 'I’m not buying it', 'cut it out',
  'enough already', 'beat it', 'buddy', 'no cash', 'go', 'nope',
  'not giving you a cent', 'what part of no?', 'not a freaking chance',
  'no way in hell', 'go hustle', 'not me', 'move along', 'piss off',
  'don’t guilt me', 'get your own money', 'you’re not my responsibility',
  'stop pestering me', 'nah', 'try someone else', "you’re kidding, right?",
  'keep walking', 'nope', 'zero', 'not today', 'beat it', 'I owe you nothing',
  'absolutely not', 'go earn it', 'not giving you squat', 'no handouts here',
  'save it', 'don’t try me', 'not falling for that', 'take the hint: no',
  'I’ve got my own problems', 'quit nagging', 'go bother someone else',
  'not another word', 'I’m not your bank', 'stop mooching', 'nope', 'bye',
  'get real', 'no', 'find a job', 'you’re not entitled to my money',
  'don’t push it', 'leave it', 'no', 'nope', 'beat it already',
  'find another target', 'not one coin', 'you’re wasting my time', 'nah',
  'not a chance', 'I said drop it', 'no', 'shove off', 'don’t touch my wallet',
  'not my circus', 'go cry to someone else', 'no', 'not ever', 'I can’t help',
  'deal with it', 'stop playing victim', 'nope', 'I’m not your guy',
  'I’m not interested', 'go', 'get out of my face', 'forget it', 'no',
  'quit it', 'nah', 'beat it pal', 'not today', 'not tomorrow',
  'take your act elsewhere', "you’re barking up the wrong tree", 'no',
  'move', 'not happening', 'period', 'do I look like a charity?', 'nope',
  'jog on', 'that’s a no from me', 'no', 'go away now'
];

const COIN_EMOJI = '<:CRCoin:1405595571141480570>';
const DIAMOND_EMOJI = '<:CRDiamond:1405595593069432912>';
const RARITY_EMOJIS = {
  Common: '<:SBRCommon:1409932856762826862>',
  Rare: '<:SBRRare:1409932954037387324>',
  Epic: '<:SBREpic:1409933003269996674>',
  Legendary: '<a:SBRLegendary:1409933036568449105>',
  Mythical: '<a:SBRMythical:1409933097176268902>',
  Godly: '<a:SBRGodly:1409933130793750548>',
  Secret: '<a:SBRSecret:1409933447220297791>',
};

const RARITY_ORDER = [
  ['Secret', 1 / 1_000_000],
  ['Godly', 1 / 100_000],
  ['Mythical', 1 / 10_000],
  ['Legendary', 1 / 1_000],
  ['Epic', 1 / 100],
  ['Rare', 1 / 10],
  ['Common', 1],
];

function getRandomItem() {
  for (const [rarity, chance] of RARITY_ORDER) {
    if (Math.random() < chance) {
      const items = Object.values(ITEMS).filter(i => i.rarity === rarity);
      if (items.length === 0) continue;
      return items[Math.floor(Math.random() * items.length)];
    }
  }
  return null;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendBeg(user, send, resources) {
  const stats = resources.userStats[user.id] || { inventory: [] };
  normalizeInventory(stats);
  resources.userStats[user.id] = stats;
  const now = Date.now();
  if (stats.beg_cd_until && stats.beg_cd_until > now) {
    const ts = Math.floor(stats.beg_cd_until / 1000);
    const container = new ContainerBuilder()
      .setAccentColor(0xffffff)
      .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `<:SBWarning:1404101025849147432> You can beg again <t:${ts}:R>.`
      ),
    );
    await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    return;
  }

  stats.beg_cd_until = now + 15000;
  const name = pick(NAMES);
  if (Math.random() < 0.5) {
    const successMsg = pick(SUCCESS_MESSAGES);
    let currencyLine;
    if (Math.random() < 0.001) {
      let amount = Math.floor(Math.random() * 10) + 1;
      if (Math.random() < 1 / 1000) amount = 100;
      stats.diamonds = (stats.diamonds || 0) + amount;
      currencyLine = `-# They are so generous, they gifted you **${formatNumber(amount)} Diamonds ${DIAMOND_EMOJI}!!**`;
    } else {
      const amount = Math.floor(Math.random() * 9001) + 1000;
      stats.coins = (stats.coins || 0) + amount;
      currencyLine = `-# You got **${formatNumber(amount)} Coins ${COIN_EMOJI}!**`;
    }
    let itemPart = '';
    if (Math.random() < 0.05) {
      const item = getRandomItem();
      if (item) {
        stats.inventory = stats.inventory || [];
        const entry = stats.inventory.find(i => i.id === item.id);
        if (entry) entry.amount += 1;
        else stats.inventory.push({ ...item, amount: 1 });
        itemPart = ` and also got **×1 ${item.name} ${item.emoji} ${
          RARITY_EMOJIS[item.rarity] || ''
        }!**`;
      }
    }
    resources.saveData();
    const text = `## ${name}\n${successMsg}\n${currencyLine}${itemPart}`;
    const container = new ContainerBuilder()
      .setAccentColor(0x00ff00)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } else {
    const failMsg = pick(FAIL_MESSAGES);
    resources.saveData();
    const text = `## ${name}\n${failMsg}`;
    const container = new ContainerBuilder()
      .setAccentColor(0xff0000)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    await send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
}

function setup(client, resources) {
  const command = new SlashCommandBuilder()
    .setName('beg')
    .setDescription('Beg for some coins');
  client.application.commands.create(command);
  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'beg')
        return;
      await sendBeg(
        interaction.user,
        interaction.reply.bind(interaction),
        resources
      );
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup, sendBeg };
