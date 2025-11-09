const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SectionBuilder,
  ThumbnailBuilder,
} = require('@discordjs/builders');
const { applyComponentEmoji } = require('../utils');

const CHAT_THUMB = 'https://i.ibb.co/6RGR6jYf/Chat-badge-normal.png';
const CHAT_THUMB_MAX = 'https://ibb.co/jFHRrQ4';
const HUNT_THUMB = 'https://i.ibb.co/tw7x9WvN/Hunting-Mastery-Normal.png';
const HUNT_THUMB_MAX = 'https://i.ibb.co/chv2L8H7/Hunting-Mastery-Gold.png';
const FARM_THUMB = 'https://i.ibb.co/Hp7hHDYm/Farm-Mastery-normal.png';
const FARM_THUMB_MAX = 'https://i.ibb.co/DDw5mzcy/Farm-Mastery-Gold.png';

function buildBar(current, needed) {
  if (needed <= 0) return '░'.repeat(20);
  const filled = Math.min(20, Math.round((current / needed) * 20));
  return '▓'.repeat(filled) + '░'.repeat(20 - filled);
}

function buildMasterySelect(active) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('mastery-select')
    .setPlaceholder('Mastery')
    .addOptions(
      applyComponentEmoji(
        new StringSelectMenuOptionBuilder()
          .setLabel('Chat Mastery')
          .setValue('chat')
          .setDefault(active === 'chat'),
        '<:SBMChat:1414143736488788089>',
      ),
      applyComponentEmoji(
        new StringSelectMenuOptionBuilder()
          .setLabel('Hunting Mastery')
          .setValue('hunt')
          .setDefault(active === 'hunt'),
        '🏹',
      ),
      applyComponentEmoji(
        new StringSelectMenuOptionBuilder()
          .setLabel('Farm Mastery')
          .setValue('farm')
          .setDefault(active === 'farm'),
        '🌾',
      ),
    );
  return select;
}

function buildChatPerks(level) {
  const perks = [
    { level: 10, text: '+50% more coin from chat and voice chat', initial:'<:SBE1:1414145519462387752>', current:'<:SBF1:1414145589465190501>', done:'<:SBF4:1414145601737588839>' },
    { level: 20, text: 'every 1h in voice award some diamonds', initial:'<:SBE2:1414145551087177839>', current:'<:SBF2:1414145565436149790>', done:'<:SBF:1414145617512366120>' },
    { level: 30, text: '+100% more coin from chat and voice chat', initial:'<:SBE2:1414145551087177839>', current:'<:SBF2:1414145565436149790>', done:'<:SBF:1414145617512366120>' },
    { level: 40, text: 'every 100 message you send give some diamonds', initial:'<:SBE2:1414145551087177839>', current:'<:SBF2:1414145565436149790>', done:'<:SBF:1414145617512366120>' },
    { level: 50, text: '+150% more coin from chat and voice chat', initial:'<:SBE2:1414145551087177839>', current:'<:SBF2:1414145565436149790>', done:'<:SBF:1414145617512366120>' },
    { level: 60, text: 'Small chance to earn item when chatting and voice chatting', initial:'<:SBE2:1414145551087177839>', current:'<:SBF2:1414145565436149790>', done:'<:SBF:1414145617512366120>' },
    { level: 70, text: 'Every 1 chat level give 10% more coin earn from chat and voice chat', initial:'<:SBE2:1414145551087177839>', current:'<:SBF2:1414145565436149790>', done:'<:SBF:1414145617512366120>' },
    { level: 80, text: '+200% more coin from chat and voice chat', initial:'<:SBE2:1414145551087177839>', current:'<:SBF2:1414145565436149790>', done:'<:SBF:1414145617512366120>' },
    { level: 90, text: 'Everytime you leveling up award some diamonds.', initial:'<:SBE2:1414145551087177839>', current:'<:SBF2:1414145565436149790>', done:'<:SBF:1414145617512366120>' },
    { level: 100, text: 'Unlock ability to get secret item in chat and voice chat', initial:'<:SBE3:1414145536696516698>', current:'<:SBF3:1414145576878080132>', done:'<:SBF3:1414145576878080132>' },
  ];
  let unlockedIndex = -1;
  for (let i = 0; i < perks.length; i++) {
    if (level >= perks[i].level) unlockedIndex = i;
  }
  const lines = perks.map((p, idx) => {
    let icon = p.initial;
    let text = p.text;
    if (idx < unlockedIndex) {
      icon = p.done;
      text = `**${text}**`;
    } else if (idx === unlockedIndex && level >= p.level) {
      icon = p.current;
      text = `**${text}**`;
    }
    return `-# ${icon} ${text}`;
  });
  return lines.join('\n');
}

function buildHuntPerks(level) {
  const perks = [
    {
      level: 10,
      text: 'Increase hunt success chance by 5%',
      initial: '<:SBE1:1414145519462387752>',
      current: '<:SBF1:1414145589465190501>',
      done: '<:SBF4:1414145601737588839>',
    },
    {
      level: 20,
      text: '25% chance to refund bullets when hunting',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 30,
      text: 'Animal sell value increased by 25%',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 40,
      text: 'Hunting cooldown reduced to 20s',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 50,
      text: '10% chance to find a random item while hunting',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 60,
      text: 'Additional 15% success chance when hunting',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 70,
      text: '10% chance to duplicate hunted animals',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 80,
      text: 'Every 10th hunt has doubled rare luck',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 90,
      text: 'Hunting cooldown reduced to 10s',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 100,
      text: 'Unlock secret animals',
      initial: '<:SBE3:1414145536696516698>',
      current: '<:SBF3:1414145576878080132>',
      done: '<:SBF3:1414145576878080132>',
    },
  ];
  let unlockedIndex = -1;
  for (let i = 0; i < perks.length; i++) {
    if (level >= perks[i].level) unlockedIndex = i;
  }
  const lines = perks.map((p, idx) => {
    let icon = p.initial;
    let text = p.text;
    if (idx < unlockedIndex) {
      icon = p.done;
      text = `**${text}**`;
    } else if (idx === unlockedIndex && level >= p.level) {
      icon = p.current;
      text = `**${text}**`;
    }
    return `-# ${icon} ${text}`;
  });
  return lines.join('\n');
}

function buildFarmPerks(level) {
  const perks = [
    {
      level: 10,
      text: 'All crops grow 10% faster',
      initial: '<:SBE1:1414145519462387752>',
      current: '<:SBF1:1414145589465190501>',
      done: '<:SBF4:1414145601737588839>',
    },
    {
      level: 20,
      text: 'All crops worth 30% more',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 30,
      text: 'Unlock White Cabbage and Pumpkin seeds',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 40,
      text: '15% chance to replant harvested crops',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 50,
      text: 'All crops grow 25% faster',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 60,
      text: 'Unlock Melon and Starfruit seeds',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 70,
      text: 'Harvesting can drop a random item',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 80,
      text: 'All crops worth 100% more',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 90,
      text: 'All crops grow 50% faster',
      initial: '<:SBE2:1414145551087177839>',
      current: '<:SBF2:1414145565436149790>',
      done: '<:SBF:1414145617512366120>',
    },
    {
      level: 100,
      text: 'Unlock secret seed',
      initial: '<:SBE3:1414145536696516698>',
      current: '<:SBF3:1414145576878080132>',
      done: '<:SBF3:1414145576878080132>',
    },
  ];
  let unlockedIndex = -1;
  for (let i = 0; i < perks.length; i++) {
    if (level >= perks[i].level) unlockedIndex = i;
  }
  const lines = perks.map((p, idx) => {
    let icon = p.initial;
    let text = p.text;
    if (idx < unlockedIndex) {
      icon = p.done;
      text = `**${text}**`;
    } else if (idx === unlockedIndex && level >= p.level) {
      icon = p.current;
      text = `**${text}**`;
    }
    return `-# ${icon} ${text}`;
  });
  return lines.join('\n');
}

function buildChatResponse(user, stats, chatMasteryXpNeeded) {
  const level = stats.chat_mastery_level || 0;
  const xp = stats.chat_mastery_xp || 0;
  const next = level >= 100 ? 0 : chatMasteryXpNeeded(level + 1);
  const bar = buildBar(xp, next);
  const thumbUrl = level >= 100 ? CHAT_THUMB_MAX : CHAT_THUMB;
  const header = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Chat Mastery - Level ${level}\n-# ${bar} [${xp} / ${next || 'MAX'}]`,
      ),
    );
  const perks = buildChatPerks(level);
  const container = new ContainerBuilder().setAccentColor(level >= 100 ? 0xffff00 : 0xffffff);
  container.addSectionComponents(header);
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('* Mastery perks, every 10 levels unlock 1 perk.'))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(perks))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '* Mastery Level 100 Rewards:\n-# 1500 Deluxe Coins <:CRDeluxeCoin:1405595587780280382>\n-# 3000 Diamonds <:CRDiamond:1405595593069432912>\n-# 4M Coins <:CRCoin:1405595571141480570>\n-# 25 XP Soda <:ITXPSoda:1414252478257561701>'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder());

  const select = buildMasterySelect('chat');
  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
  return container;
}

function buildHuntResponse(user, stats, huntMasteryXpNeeded) {
  const level = stats.hunt_mastery_level || 0;
  const xp = stats.hunt_mastery_xp || 0;
  const next = level >= 100 ? 0 : huntMasteryXpNeeded(level + 1);
  const bar = buildBar(xp, next);
  const thumbUrl = level >= 100 ? HUNT_THUMB_MAX : HUNT_THUMB;
  const header = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Hunting Mastery - Level ${level}\n-# ${bar} [${xp} / ${next || 'MAX'}]`,
      ),
    );
  const perks = buildHuntPerks(level);
  const container = new ContainerBuilder().setAccentColor(level >= 100 ? 0xffff00 : 0xffffff);
  container.addSectionComponents(header);
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('* Mastery perks, every 10 levels unlock 1 perk.'))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(perks))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '* Mastery Level 100 Rewards:\n-# 3000 Deluxe Coins <:CRDeluxeCoin:1405595587780280382>\n-# 7500 Diamonds <:CRDiamond:1405595593069432912>\n-# 12.5M Coins <:CRCoin:1405595571141480570>\n-# 20 Animal Detectors <:ITAnimalDetector:1423678926215188700>'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder());
  const select = buildMasterySelect('hunt');
  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
  return container;
}

function buildFarmResponse(user, stats, farmMasteryXpNeeded) {
  const level = stats.farm_mastery_level || 0;
  const xp = stats.farm_mastery_xp || 0;
  const next = level >= 100 ? 0 : farmMasteryXpNeeded(level + 1);
  const bar = buildBar(xp, next);
  const thumbUrl = level >= 100 ? FARM_THUMB_MAX : FARM_THUMB;
  const header = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Farm Mastery - Level ${level}\n-# ${bar} [${xp} / ${next || 'MAX'}]`,
      ),
    );
  const perks = buildFarmPerks(level);
  const container = new ContainerBuilder().setAccentColor(level >= 100 ? 0xffff00 : 0xffffff);
  container.addSectionComponents(header);
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('* Mastery perks, every 10 levels unlock 1 perk.'))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '* Mastery Level 100 Rewards:\n-# 2000 Deluxe Coins <:CRDeluxeCoin:1405595587780280382>\n-# 6000 Diamonds <:CRDiamond:1405595593069432912>\n-# 1M Coins <:CRCoin:1405595571141480570>\n-# Gold Watering Can Skin <:ITGoldWateringCan:1433097178779484302>',
      ),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(perks))
    .addSeparatorComponents(new SeparatorBuilder());
  const select = buildMasterySelect('farm');
  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
  return container;
}

function setup(client, resources) {
  const command = new SlashCommandBuilder().setName('mastery').setDescription('Show your mastery levels');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'mastery') return;
      const select = buildMasterySelect('chat');
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${interaction.user}, select a mastery to check the level and perks!`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(select));
      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isStringSelectMenu() || interaction.customId !== 'mastery-select') return;
      const stats = resources.userStats[interaction.user.id] || {};
      let container;
      if (interaction.values[0] === 'chat') {
        container = buildChatResponse(
          interaction.user,
          stats,
          resources.chatMasteryXpNeeded,
        );
      } else if (interaction.values[0] === 'hunt') {
        container = buildHuntResponse(
          interaction.user,
          stats,
          resources.huntMasteryXpNeeded,
        );
      } else if (interaction.values[0] === 'farm') {
        container = buildFarmResponse(
          interaction.user,
          stats,
          resources.farmMasteryXpNeeded,
        );
      } else {
        return;
      }
      await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };
