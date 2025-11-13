const DIG_PERKS = {
  'rapid-excavator': {
    id: 'rapid-excavator',
    name: 'Rapid Excavator',
    description: 'Reduces the digging cooldown by 50%.',
    summary: 'Rapid Excavator – Dig cooldown reduced by 50%.',
  },
  'prospectors-instinct': {
    id: 'prospectors-instinct',
    name: 'Prospector\u2019s Instinct',
    description: 'Boosts your base chance to find items by 15%.',
    summary: 'Prospector\u2019s Instinct – +15% base dig item chance.',
  },
  'reinforced-gear': {
    id: 'reinforced-gear',
    name: 'Reinforced Gear',
    description: 'Increases all tool and consumable durability for digging by 10.',
    summary: 'Reinforced Gear – +10 bonus durability uses for dig tools & consumables.',
  },
  'resourceful-scavenger': {
    id: 'resourceful-scavenger',
    name: 'Resourceful Scavenger',
    description:
      'After a successful dig, there is a 20% chance that used consumables are returned intact.',
    summary:
      'Resourceful Scavenger – 20% chance to recover consumables after a successful dig.',
  },
  'golden-barter': {
    id: 'golden-barter',
    name: 'Golden Barter',
    description: 'All dig items sell for double their usual price.',
    summary: 'Golden Barter – Dig items sell for 2\u00d7 their value.',
  },
  'mirror-treasure': {
    id: 'mirror-treasure',
    name: 'Mirror Treasure',
    description: '25% chance for every item found to be duplicated.',
    summary: 'Mirror Treasure – 25% chance to duplicate dig finds.',
  },
  'fortune-loop': {
    id: 'fortune-loop',
    name: 'Fortune Loop',
    description: 'When you find an item, you can keep rerolling until you fail (chain of finds).',
    summary: 'Fortune Loop – Chain additional dig finds until a roll fails.',
  },
  'lucky-milestone': {
    id: 'lucky-milestone',
    name: 'Lucky Milestone',
    description: "Every 10th dig grants double Dig's item luck on that dig.",
    summary: "Lucky Milestone – Double dig luck on every 10th dig.",
  },
  'last-chance-dig': {
    id: 'last-chance-dig',
    name: 'Last Chance Dig',
    description: 'Survive one fatal dig roll and re-dig once; if you roll death again, you die.',
    summary: 'Last Chance Dig – Survive one fatal roll per dig (one reroll).',
  },
  'timeless-tools': {
    id: 'timeless-tools',
    name: 'Timeless Tools',
    description: 'Shovels lose no durability on a successful dig.',
    summary: 'Timeless Tools – Successful digs do not consume shovel durability.',
  },
};

const DIG_PERK_LEVELS = {
  20: ['rapid-excavator', 'prospectors-instinct'],
  40: ['reinforced-gear', 'resourceful-scavenger'],
  60: ['golden-barter', 'mirror-treasure'],
  80: ['fortune-loop', 'lucky-milestone'],
  100: ['last-chance-dig', 'timeless-tools'],
};

function getPerkOptionsForLevel(level) {
  const ids = DIG_PERK_LEVELS[level] || [];
  return ids.map(id => DIG_PERKS[id]).filter(Boolean);
}

function ensureDigPerkState(stats) {
  if (!stats || typeof stats !== 'object') return;
  if (!stats.dig_perk_choices || typeof stats.dig_perk_choices !== 'object') {
    stats.dig_perk_choices = {};
  }
  if (!Array.isArray(stats.dig_perks)) stats.dig_perks = [];
  const summaries = getDigPerkSummaries(stats);
  if (summaries.length || Object.keys(stats.dig_perk_choices).length) {
    stats.dig_perks = summaries;
  }
}

function getSelectedDigPerkIds(stats) {
  if (!stats || typeof stats !== 'object') return [];
  const choices = stats.dig_perk_choices;
  if (!choices || typeof choices !== 'object') return [];
  return Object.values(choices).filter(id => typeof id === 'string' && DIG_PERKS[id]);
}

function hasDigPerk(stats, perkId) {
  return getSelectedDigPerkIds(stats).includes(perkId);
}

function getDigPerkSummaries(stats) {
  return getSelectedDigPerkIds(stats).map(id => DIG_PERKS[id]?.summary).filter(Boolean);
}

function selectDigPerk(stats, level, perkId) {
  if (!stats || typeof stats !== 'object') return false;
  const options = getPerkOptionsForLevel(level);
  const choice = options.find(opt => opt.id === perkId);
  if (!choice) return false;
  if (!stats.dig_perk_choices || typeof stats.dig_perk_choices !== 'object') {
    stats.dig_perk_choices = {};
  }
  stats.dig_perk_choices[level] = perkId;
  stats.dig_perks = getDigPerkSummaries(stats);
  return true;
}

function getDigPerkById(perkId) {
  return DIG_PERKS[perkId] || null;
}

module.exports = {
  DIG_PERKS,
  DIG_PERK_LEVELS,
  getPerkOptionsForLevel,
  ensureDigPerkState,
  getSelectedDigPerkIds,
  getDigPerkSummaries,
  hasDigPerk,
  selectDigPerk,
  getDigPerkById,
};
