const AREAS = [
  {
    name: 'Temperate Forest',
    key: 'TemperateForest',
    emoji: '<:SBTemperateForest:1410883390739054703>',
    image: 'https://i.ibb.co/PzN2mTKj/Temperate-Forest.png',
  },
  {
    name: 'Swamp',
    key: 'Swamp',
    emoji: '<:SBSwamp:1410883405087768587>',
    image: 'https://i.ibb.co/fGV7ftKn/Swamp.png',
  },
  {
    name: 'Savannah',
    key: 'Savannah',
    emoji: '<:SBSavannah:1410883416135569408>',
    image: 'https://i.ibb.co/s9y7mN4L/Savannah.png',
  },
  {
    name: 'Arctic Tundra',
    key: 'ArcticTundra',
    emoji: '<:SBArcticTundra:1410883429813452872>',
    image: 'https://i.ibb.co/21pKKfNN/Arctic-Tundra.png',
  },
];

const AREA_BY_KEY = Object.fromEntries(AREAS.map(area => [area.key, area]));
const AREA_BY_NAME = Object.fromEntries(AREAS.map(area => [area.name, area]));

const HUNT_LURES = {
  TemperateForest: { itemId: 'VerdantLures' },
  Swamp: { itemId: 'MarshlightLures' },
  Savannah: { itemId: 'SunprideLures' },
  ArcticTundra: { itemId: 'SnowglassLures' },
};

const RARE_RARITIES = new Set([
  'Rare',
  'Epic',
  'Legendary',
  'Mythical',
  'Godly',
  'Prismatic',
  'Secret',
]);

module.exports = { AREAS, AREA_BY_KEY, AREA_BY_NAME, HUNT_LURES, RARE_RARITIES };
