const XLSX = require('xlsx');

const AURORA_TUNDRA_KEY = 'AuroraTundra';

function loadAnimals() {
  const workbook = XLSX.readFile('Animal data.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const animals = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const id = row[17];
    if (!id) continue;
    animals.push({
      id,
      name: row[0],
      emoji: row[1],
      rarity: row[2],
      value: Number(row[3]) || 0,
      sellPrice: Number(row[4]) || 0,
      chances: {
        TemperateForest: [row[5], row[6], row[7]].map(Number),
        ArcticTundra: [row[8], row[9], row[10]].map(Number),
        Swamp: [row[11], row[12], row[13]].map(Number),
        Savannah: [row[14], row[15], row[16]].map(Number),
      },
    });
    animals[animals.length - 1].chances[AURORA_TUNDRA_KEY] = [0, 0, 0];
  }
  return animals;
}

const ANIMALS = loadAnimals();

const AURORA_TUNDRA_ANIMALS = [
  {
    id: 'FestiveSquirrel',
    name: 'Festive Squirrel',
    emoji: '<:ITFestiveSquirrel:1426945744803467435>',
    rarity: 'Common',
    value: 150,
    sellPrice: { currency: 'snowflakes', amount: 50 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [32, 23.5, 20],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'SnowyHare',
    name: 'Snowy Hare',
    emoji: '<:ITSnowyHare:1426945828936880279>',
    rarity: 'Common',
    value: 100,
    sellPrice: { currency: 'snowflakes', amount: 30 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [30, 18, 17],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'ReindeerCalf',
    name: 'Reindeer Calf',
    emoji: '<:ITReindeerCalf:1426945804224167956>',
    rarity: 'Rare',
    value: 450,
    sellPrice: { currency: 'snowflakes', amount: 90 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [20, 16, 14.25],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'SnowyOwl',
    name: 'Snowy Owl',
    emoji: '<:ITSnowyOwl:1426945840257171669>',
    rarity: 'Rare',
    value: 550,
    sellPrice: { currency: 'snowflakes', amount: 110 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [18, 12, 12.5],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'NutcrackerGuard',
    name: 'Nutcracker Guard',
    emoji: '<:ITNutcrackerGuard:1426945794392461392>',
    rarity: 'Epic',
    value: 1200,
    sellPrice: { currency: 'snowflakes', amount: 240 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [0, 11, 10],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'ToySoldier',
    name: 'Toy Soldier',
    emoji: '<:ITToySoldier:1426945853444194345>',
    rarity: 'Epic',
    value: 1350,
    sellPrice: { currency: 'snowflakes', amount: 275 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [0, 9, 9.5],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'SnowGolem',
    name: 'Snow Golem',
    emoji: '<:ITSnowGolem:1426945818241531954>',
    rarity: 'Legendary',
    value: 2250,
    sellPrice: { currency: 'snowflakes', amount: 450 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [0, 6, 8],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'FrostlightWisp',
    name: 'Frostlight Wisp',
    emoji: '<:ITFrostlightWisp:1426945756048265308>',
    rarity: 'Legendary',
    value: 2500,
    sellPrice: { currency: 'snowflakes', amount: 500 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [0, 4.5, 6],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'GingerbreadBrute',
    name: 'Gingerbread Brute',
    emoji: '<:ITGingerbreadBrute:1426945769000407181>',
    rarity: 'Mythical',
    value: 5000,
    sellPrice: { currency: 'snowflakes', amount: 760 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [0, 0, 2.5],
    },
    types: ['Sellable', 'Collectible'],
  },
  {
    id: 'Krampus',
    name: 'Krampus',
    emoji: '<:ITKrampus:1426945781159690372>',
    rarity: 'Godly',
    value: 15000,
    sellPrice: { currency: 'snowflakes', amount: 900 },
    chances: {
      TemperateForest: [0, 0, 0],
      ArcticTundra: [0, 0, 0],
      Swamp: [0, 0, 0],
      Savannah: [0, 0, 0],
      [AURORA_TUNDRA_KEY]: [0, 0, 0.25],
    },
    types: ['Sellable', 'Collectible'],
  },
];

ANIMALS.push(...AURORA_TUNDRA_ANIMALS);

const ANIMAL_ITEMS = Object.fromEntries(
  ANIMALS.map(a => [
    a.id,
    {
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      rarity: a.rarity,
      value: a.value,
      useable: false,
      types:
        Array.isArray(a.types) && a.types.length ? a.types.slice() : ['Sellable'],
      note: '',
      image: '',
      price: 0,
      sellPrice: a.sellPrice,
    },
  ]),
);

module.exports = { ANIMALS, ANIMAL_ITEMS };
