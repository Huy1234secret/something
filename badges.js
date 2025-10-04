const { ITEMS } = require('./items');
const { ANIMALS } = require('./animals');

const BADGES = [
  {
    id: 'MasterZoologist',
    name: 'Master Zoologist',
    emoji: '<:SBMasterZoologist:1423871125997224010>',
    description: 'Discover every single animal in hunting.',
    thumbnail: 'https://i.ibb.co/gZg2wqhn/Master-Zoologist.png',
    progress: stats => {
      const total = ANIMALS.length;
      const discovered = Array.isArray(stats.hunt_discover)
        ? stats.hunt_discover.length
        : 0;
      return { current: Math.min(discovered, total), max: total };
    },
    prizes: [
      {
        type: 'currency',
        currency: 'deluxe_coins',
        amount: 1000,
        name: 'Deluxe Coins',
        emoji: '<:CRDeluxeCoin:1405595587780280382>',
      },
      {
        type: 'currency',
        currency: 'diamonds',
        amount: 2500,
        name: 'Diamonds',
        emoji: '<:CRDiamond:1405595593069432912>',
      },
      { type: 'item', itemId: 'VerdantLures', amount: 10 },
      { type: 'item', itemId: 'SunprideLures', amount: 10 },
      { type: 'item', itemId: 'SnowglassLures', amount: 10 },
      { type: 'item', itemId: 'MarshlightLures', amount: 10 },
      { type: 'item', itemId: 'AnimalDetector', amount: 5 },
    ],
  },
];

const BADGE_MAP = new Map(BADGES.map(badge => [badge.id, badge]));

function getBadgeById(id) {
  return BADGE_MAP.get(id);
}

function getBadgeProgress(badge, stats) {
  if (!badge || typeof badge.progress !== 'function') {
    return { current: 0, max: 0 };
  }
  const progress = badge.progress(stats) || { current: 0, max: 0 };
  return {
    current: Number.isFinite(progress.current) ? progress.current : 0,
    max: Number.isFinite(progress.max) ? progress.max : 0,
  };
}

function formatBadgeRewards(badge) {
  if (!badge) return '';
  return badge.prizes
    .map(prize => {
      if (prize.type === 'currency') {
        const emoji = prize.emoji ? ` ${prize.emoji}` : '';
        return `${prize.amount} ${prize.name}${emoji}`.trim();
      }
      const item = ITEMS[prize.itemId] || { name: prize.itemId, emoji: '' };
      const emoji = item.emoji ? ` ${item.emoji}` : '';
      return `${prize.amount} ${item.name}${emoji}`.trim();
    })
    .join(', ');
}

function formatBadgeRewardLines(badge) {
  if (!badge) return [];
  return badge.prizes.map(prize => {
    if (prize.type === 'currency') {
      const emoji = prize.emoji ? ` ${prize.emoji}` : '';
      return `-# ${prize.amount} ${prize.name}${emoji}`.trim();
    }
    const item = ITEMS[prize.itemId] || { name: prize.itemId, emoji: '' };
    const emoji = item.emoji ? ` ${item.emoji}` : '';
    return `-# ${prize.amount} ${item.name}${emoji}`.trim();
  });
}

module.exports = {
  BADGES,
  getBadgeById,
  getBadgeProgress,
  formatBadgeRewards,
  formatBadgeRewardLines,
};
