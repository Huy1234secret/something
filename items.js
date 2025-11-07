const { ANIMAL_ITEMS } = require('./animals');
const { DIG_AREAS, DIG_AREA_BY_NAME } = require('./digData');
const XLSX = require('xlsx');

const RARITY_PRIORITY = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Mythical: 5,
  Godly: 6,
  Prismatic: 7,
  Secret: 8,
};

function normalizeItemId(name) {
  if (!name) return '';
  return String(name).replace(/[^a-zA-Z0-9]/g, '');
}

function normalizeTypes(cells = []) {
  const values = cells
    .filter(Boolean)
    .map(value => String(value).trim())
    .filter(Boolean)
    .map(value => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase());
  return Array.from(new Set(values));
}

function rarityScore(rarity) {
  return RARITY_PRIORITY[String(rarity)] ?? -1;
}

function loadDigItems() {
  const workbook = XLSX.readFile('biome_items.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const aggregated = new Map();
  const areaItems = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const areaName = row[0] ? String(row[0]).trim() : '';
    const itemName = row[1] ? String(row[1]).trim() : '';
    if (!areaName || !itemName) continue;
    const area = DIG_AREA_BY_NAME[areaName];
    if (!area) continue;

    let id = normalizeItemId(itemName);
    if (/arcs of resurgence/i.test(itemName)) id = 'ArcsOfResurgence';
    if (!id) continue;

    const emoji = row[2] ? String(row[2]).trim() : '';
    const rarity = row[3] ? String(row[3]).trim() : 'Common';
    const value = Number(row[4]) || 0;
    const sellPriceRaw = Number(row[5]);
    const sellPrice = Number.isFinite(sellPriceRaw) && sellPriceRaw > 0 ? sellPriceRaw : null;
    const types = normalizeTypes([row[6], row[7], row[8]]);
    const chance = Number(row[9]) || 0;

    const baseItem = {
      id,
      name: itemName,
      emoji,
      rarity,
      value,
      useable: false,
      types,
      note: '',
      image: '',
      price: '',
      sellPrice,
    };

    const areaList = areaItems.get(area.key) || [];
    areaList.push({ ...baseItem, chance, areaKey: area.key });
    areaItems.set(area.key, areaList);

    const existing = aggregated.get(id);
    if (!existing) {
      aggregated.set(id, {
        ...baseItem,
        chance,
        areas: {
          [area.key]: {
            chance,
            rarity,
            value,
            sellPrice,
          },
        },
      });
      continue;
    }

    existing.types = Array.from(new Set([...(existing.types || []), ...types]));
    if (!existing.emoji && emoji) existing.emoji = emoji;
    const existingScore = rarityScore(existing.rarity);
    const newScore = rarityScore(rarity);
    if (newScore > existingScore) {
      existing.rarity = rarity;
      existing.value = value;
      existing.sellPrice = sellPrice;
    } else if (newScore === existingScore) {
      if (value > (existing.value || 0)) existing.value = value;
      if (sellPrice && (!existing.sellPrice || sellPrice > existing.sellPrice)) {
        existing.sellPrice = sellPrice;
      }
    }
    existing.chance = Math.max(existing.chance || 0, chance || 0);
    existing.areas[area.key] = {
      chance,
      rarity,
      value,
      sellPrice,
    };
  }

  const items = Array.from(aggregated.values()).map(item => ({
    ...item,
    types: Array.isArray(item.types) ? item.types : [],
  }));
  items.sort((a, b) => a.name.localeCompare(b.name));

  const itemsByArea = {};
  for (const area of DIG_AREAS) {
    const list = (areaItems.get(area.key) || []).map(entry => ({
      ...entry,
      types: Array.isArray(entry.types) ? entry.types : [],
    }));
    list.sort((a, b) => {
      if (b.chance !== a.chance) return b.chance - a.chance;
      return a.name.localeCompare(b.name);
    });
    itemsByArea[area.key] = list;
  }

  return { items, itemsByArea };
}

const { items: DIG_ITEMS, itemsByArea: DIG_ITEMS_BY_AREA } = loadDigItems();

const ITEMS = {
  Padlock: {
    id: 'Padlock',
    name: 'Padlock',
    emoji: '<:ITPadlock:1410243142640336977>',
    rarity: 'Common',
    value: 100,
    useable: true,
    types: ['Consumable', 'Tool'],
    note: 'Locks your wallet against robberies for 24 hours.',
    image: 'https://i.ibb.co/bjm9Mbr5/Padlock.png',
    price: 35000,
    sellPrice: null,
  },
  SeraphicHeart: {
    id: 'SeraphicHeart',
    name: 'Seraphic Heart',
    emoji: '<:ITSeraphicheart:1410243519372853401>',
    rarity: 'Rare',
    value: 500,
    useable: false,
    types: ['Consumable', 'Collectible'],
    note: '',
    image: 'https://i.ibb.co/45pFNnY/Seraphic-Heart.png',
    price: 300000,
    sellPrice: null,
  },
  Landmine: {
    id: 'Landmine',
    name: 'Landmine',
    emoji: '<:ITLandmine:1410243453140336692>',
    rarity: 'Rare',
    value: 350,
    useable: true,
    types: ['Consumable', 'Tool'],
    note: 'Protects your wallet for 24 hours with a 50% chance to eliminate robbers.',
    image: 'https://i.ibb.co/239w692Y/Landmine.png',
    price: 200000,
    sellPrice: null,
  },
  AnimalDetector: {
    id: 'AnimalDetector',
    name: 'Animal Detector',
    emoji: '<:ITAnimalDetector:1423678926215188700>',
    rarity: 'Godly',
    value: 0,
    useable: true,
    types: ['Consumable', 'Tool'],
    note: 'Activates 20 guaranteed successful hunts per detector used.',
    image: 'https://i.ibb.co/ks5qVpB6/Animal-Detector.png',
    price: 15000000,
    sellPrice: null,
  },
  VerdantLures: {
    id: 'VerdantLures',
    name: 'Verdant Lures',
    emoji: '<:ITVerdantLure:1423868583896944771>',
    rarity: 'Mythical',
    value: 500,
    useable: false,
    types: ['Consumable', 'Tool'],
    note: 'Doubles rare animal odds in the Temperate Forest for 20 successful hunts.',
    image: 'https://i.ibb.co/FqkdH7jq/Verdant-Lure.png',
    price: 500000,
    sellPrice: null,
  },
  SunprideLures: {
    id: 'SunprideLures',
    name: 'Sunpride Lures',
    emoji: '<:ITSunprideLure:1423868570529431713>',
    rarity: 'Mythical',
    value: 500,
    useable: false,
    types: ['Consumable', 'Tool'],
    note: 'Doubles rare animal odds in the Savannah for 20 successful hunts.',
    image: 'https://i.ibb.co/jPhwHF3r/Sunpride-Lure.png',
    price: 500000,
    sellPrice: null,
  },
  MarshlightLures: {
    id: 'MarshlightLures',
    name: 'Marshlight Lures',
    emoji: '<:ITMarshlightLure:1423868599860465786>',
    rarity: 'Mythical',
    value: 500,
    useable: false,
    types: ['Consumable', 'Tool'],
    note: 'Doubles rare animal odds in the Swamp for 20 successful hunts.',
    image: 'https://i.ibb.co/Vcn0BbXN/Marshlight-Lure.png',
    price: 500000,
    sellPrice: null,
  },
  SnowglassLures: {
    id: 'SnowglassLures',
    name: 'Snowglass Lures',
    emoji: '<:ITSnowglassLure:1423868557057458266>',
    rarity: 'Mythical',
    value: 500,
    useable: false,
    types: ['Consumable', 'Tool'],
    note: 'Doubles rare animal odds in the Arctic Tundra for 20 successful hunts.',
    image: 'https://i.ibb.co/TB77BzTz/Snowglass-Lure.png',
    price: 500000,
    sellPrice: null,
  },
  Magnet: {
    id: 'Magnet',
    name: 'Magnet',
    emoji: '<:ITMagnet:1433097181346267266>',
    rarity: 'Epic',
    value: 500,
    useable: false,
    types: ['Tool', 'Gear'],
    note: 'Equip in /dig gear to increase item drop chance by 15% for 10 successful digs.',
    image: '',
    price: 100000,
    sellPrice: null,
    durability: 10,
  },
  ItemScanner: {
    id: 'ItemScanner',
    name: 'Item Scanner',
    emoji: '<:ITItemScanner:1433097183875567666>',
    rarity: 'Godly',
    value: 6000,
    useable: false,
    types: ['Tool', 'Gear'],
    note: 'Equip in /dig gear to boost item drops by 65% and grant +25% dig luck for 20 successful digs.',
    image: '',
    price: 5000000,
    sellPrice: null,
    durability: 20,
  },
  XPSoda: {
    id: 'XPSoda',
    name: 'XP Soda',
    emoji: '<:ITXPSoda:1414252478257561701>',
    rarity: 'Godly',
    value: 800,
    useable: true,
    types: ['Consumable', 'Material'],
    note: 'Doubles XP gains for 3 hours per soda used (duration stacks).',
    image: 'https://i.ibb.co/wNSPTskT/XP-Soda.png',
    price: 1300000,
    sellPrice: null,
  },
  CoinPotion: {
    id: 'CoinPotion',
    name: 'Coin Potion',
    emoji: '<:ITCoinPotion:1426940279533076480>',
    rarity: 'Legendary',
    value: 650,
    useable: true,
    types: ['Consumable', 'Material'],
    note: 'Boosts coin earnings by 50% for 30 minutes per potion.',
    image: '',
    price: null,
    sellPrice: null,
  },
  LuckyPotion: {
    id: 'LuckyPotion',
    name: 'Lucky Potion',
    emoji: '<:ITLuckyPotion:1426940297694150697>',
    rarity: 'Legendary',
    value: 650,
    useable: true,
    types: ['Consumable', 'Material'],
    note: 'Increases luck by 30% for 30 minutes.',
    image: '',
    price: null,
    sellPrice: null,
  },
  UltraLuckyPotion: {
    id: 'UltraLuckyPotion',
    name: 'Ultra Lucky Potion',
    emoji: '<:ITUltraLuckyPotion:1426940321643892927>',
    rarity: 'Mythical',
    value: 800,
    useable: true,
    types: ['Consumable', 'Material'],
    note: 'Boosts luck by 100% for 10 minutes and maxes hunt/dig/beg success chances.',
    image: '',
    price: null,
    sellPrice: null,
  },
  RobberBag: {
    id: 'RobberBag',
    name: 'Robber Bag',
    emoji: '<:ITRobberBag:1426940417206915184>',
    rarity: 'Mythical',
    value: 750,
    useable: true,
    types: ['Consumable'],
    note: 'Guarantees at least 25% loot on successful robs for the next 10 attempts.',
    image: '',
    price: null,
    sellPrice: null,
  },
  BoltCutter: {
    id: 'BoltCutter',
    name: 'Bolt Cutter',
    emoji: '<:ITBoltCutter:1426940456306212915>',
    rarity: 'Mythical',
    value: 800,
    useable: true,
    types: ['Consumable', 'Tool'],
    note: 'Snaps an active padlock instantly.',
    image: '',
    price: null,
    sellPrice: null,
  },
  GingerbreadMan: {
    id: 'GingerbreadMan',
    name: 'Gingerbread Man',
    emoji: '<:ITGingerbreadMan:1425135669025570826>',
    rarity: 'Mythical',
    value: 550,
    useable: true,
    types: ['Material', 'Consumable'],
    note: 'Chomp for an instant chat level surge—sometimes tenfold!',
    image: '',
    price: '',
    sellPrice: null,
  },
  CupOfMilk: {
    id: 'CupOfMilk',
    name: 'Cup of Milk',
    emoji: '<:ITCupofMilk:1425137379525525735>',
    rarity: 'Legendary',
    value: 400,
    useable: true,
    types: ['Material', 'Consumable'],
    note: 'Cooldowns melt away by 10% for 20 minutes per cup.',
    image: '',
    price: '',
    sellPrice: null,
  },
  Cookie: {
    id: 'Cookie',
    name: 'Cookie',
    emoji: '<:ITCookie:1425137805616484403>',
    rarity: 'Rare',
    value: 250,
    useable: true,
    types: ['Material', 'Consumable'],
    note: 'A sweet bite that grants +100 chat XP.',
    image: '',
    price: '',
    sellPrice: null,
  },
  CandyCane: {
    id: 'CandyCane',
    name: 'Candy Cane',
    emoji: '<:ITCandyCane:1425138309893587088>',
    rarity: 'Epic',
    value: 320,
    useable: true,
    types: ['Material', 'Consumable'],
    note: '2500 chat XP per cane with a tiny chance to jump a level instead.',
    image: '',
    price: '',
    sellPrice: null,
  },
  SnowBall: {
    id: 'SnowBall',
    name: 'Snow Ball',
    emoji: '<:ITSnowBall:1425138786123124858>',
    rarity: 'Epic',
    value: 370,
    useable: true,
    types: ['Consumable', 'Material'],
    note: 'Pelt someone to doom their hunts, digs, and begs for 30 seconds.',
    image: '',
    price: '',
    sellPrice: null,
  },
  GoodList: {
    id: 'GoodList',
    name: 'Good List',
    emoji: '<:ITGoodList:1425139683947581492>',
    rarity: 'Godly',
    value: 1000,
    useable: true,
    types: ['Consumable'],
    note: 'Bless someone with +69% luck for a full day. 30h personal cooldown.',
    image: '',
    price: '',
    sellPrice: null,
  },
  NaughtyList: {
    id: 'NaughtyList',
    name: 'Naughty List',
    emoji: '<:ITNaughtyList:1425140373839155310>',
    rarity: 'Secret',
    value: 1300,
    useable: true,
    types: ['Consumable'],
    note: 'Crush boosts, luck, and harvest speed for 24 hours. 30h personal cooldown.',
    image: '',
    price: '',
    sellPrice: null,
  },
  WhiteCabbageSeed: {
    id: 'WhiteCabbageSeed',
    name: 'White Cabbage seed package',
    emoji: '<:ITWhiteCabbageSeedPackage:1424391380980994058>',
    rarity: 'Epic',
    value: 400,
    useable: false,
    types: ['Consumable', 'Material'],
    note: 'Unlocked at Farm Mastery Lv.30',
    image: 'https://i.ibb.co/Pvc27CM1/White-Cabbage-seed-package.png',
    price: 250000,
    sellPrice: null,
  },
  PumpkinSeed: {
    id: 'PumpkinSeed',
    name: 'Pumpkin seed package',
    emoji: '<:ITPumpkinSeedPackage:1424684470396518430>',
    rarity: 'Legendary',
    value: 700,
    useable: false,
    types: ['Consumable', 'Material'],
    note: 'Unlocked at Farm Mastery Lv.30',
    image: 'https://i.ibb.co/5gsKxXjg/Pumpkin-Seed-Package.png',
    price: 2500000,
    sellPrice: null,
  },
  WhiteCabbage: {
    id: 'WhiteCabbage',
    name: 'White Cabbage',
    emoji: '<:ITWhiteCabbage:1424393105679061133>',
    rarity: 'Epic',
    value: 500,
    useable: false,
    types: ['Sellable', 'Material'],
    note: '',
    image: 'https://i.ibb.co/5xBDQrZ7/Cabbage-6.png',
    price: null,
    sellPrice: 400000,
  },
  Pumpkin: {
    id: 'Pumpkin',
    name: 'Pumpkin',
    emoji: '<:ITPumpkin:1424684551224950804>',
    rarity: 'Legendary',
    value: 750,
    useable: false,
    types: ['Sellable', 'Material'],
    note: '',
    image: 'https://i.ibb.co/k6hNJnLW/Pumpkin-7.png',
    price: null,
    sellPrice: 4500000,
  },
  MelonSeed: {
    id: 'MelonSeed',
    name: 'Melon seed package',
    emoji: '<:ITMelonSeedPackage:1424684458531098655>',
    rarity: 'Mythical',
    value: 850,
    useable: false,
    types: ['Consumable', 'Material'],
    note: 'Unlocked at Farm Mastery Lv.60',
    image: 'https://i.ibb.co/k2kxFhVj/Melon-Seed-Package.png',
    price: 15000000,
    sellPrice: null,
  },
  Melon: {
    id: 'Melon',
    name: 'Melon',
    emoji: '<:ITMelon:1424684529045733408>',
    rarity: 'Mythical',
    value: 900,
    useable: false,
    types: ['Sellable', 'Material'],
    note: '',
    image: 'https://i.ibb.co/PGQ2YQ1Q/Melon-7.png',
    price: null,
    sellPrice: 25000000,
  },
  StarFruitSeed: {
    id: 'StarFruitSeed',
    name: 'Star Fruit seed package',
    emoji: '<:ITStarFruitSeedPackage:1424684914422448248>',
    rarity: 'Godly',
    value: 1000,
    useable: false,
    types: ['Consumable', 'Material'],
    note: 'Unlocked at Farm Mastery Lv.60',
    image: 'https://i.ibb.co/pjCDCry8/Star-Fruit-Seed-Package.png',
    price: 69000000,
    sellPrice: null,
  },
  StarFruit: {
    id: 'StarFruit',
    name: 'Star Fruit',
    emoji: '<:ITStarFruit:1424684901613047881>',
    rarity: 'Godly',
    value: 1200,
    useable: false,
    types: ['Sellable', 'Material'],
    note: '',
    image: 'https://i.ibb.co/G3B2vdKZ/Star-Fruit-7.png',
    price: null,
    sellPrice: 100000000,
  },
  OrnamentBerrySeed: {
    id: 'OrnamentBerrySeed',
    name: 'Ornament Berry Seed',
    emoji: '<:ITOrnamentBerrySeed:1426950392633360466>',
    rarity: 'Legendary',
    value: 500,
    useable: false,
    types: ['Consumable'],
    note: 'Limited to the Christmas season.',
    image: 'https://i.ibb.co/SDQCpRg5/Ornament-Berry-1.png',
    price: null,
    sellPrice: null,
  },
  OrnamentBerry: {
    id: 'OrnamentBerry',
    name: 'Ornament Berry',
    emoji: '<:ITOrnamentBerry:1426951265685999648>',
    rarity: 'Legendary',
    value: 600,
    useable: false,
    types: ['Sellable', 'Material'],
    note: '',
    image: 'https://i.ibb.co/Z6Bg2YD6/Ornament-Berry-5.png',
    price: null,
    sellPrice: { currency: 'snowflakes', amount: 1000 },
  },
  WheatSeed: {
    id: 'WheatSeed',
    name: 'Wheat seed',
    emoji: '<:ITWheatseed:1410241406206873753>',
    rarity: 'Common',
    value: 50,
    useable: false,
    types: ['Consumable', 'Material'],
    note: '',
    image: 'https://i.ibb.co/hRpZsFyX/Wheat-seed-package.png',
    price: 10000,
    sellPrice: null,
  },
  PotatoSeed: {
    id: 'PotatoSeed',
    name: 'Potato seed package',
    emoji: '<:ITPotatoseed:1413869045429571614>',
    rarity: 'Rare',
    value: 150,
    useable: false,
    types: ['Consumable', 'Material'],
    note: '',
    image: 'https://i.ibb.co/ywBxrJh/Potato-seed.png',
    price: 75000,
    sellPrice: null,
  },
  HarvestScythe: {
    id: 'HarvestScythe',
    name: 'Harvest Scythe',
    emoji: '<:ITHarvestscythe:1410243487965777950>',
    rarity: 'Rare',
    value: 500,
    useable: false,
    types: ['Equipment', 'Tool'],
    note: '',
    image: 'https://i.ibb.co/vCjYnjPS/Harvest-scythe.png',
    price: 120000,
    sellPrice: null,
    durability: 25,
  },
  Sheaf: {
    id: 'Sheaf',
    name: 'Sheaf',
    emoji: '<:ITSheaf:1410243260689027172>',
    rarity: 'Rare',
    value: 250,
    useable: false,
    types: ['Material', 'Sellable'],
    note: '',
    image: 'https://i.ibb.co/60mfbHqp/Wheat.png',
    price: 0,
    sellPrice: 5000,
  },
  Potato: {
    id: 'Potato',
    name: 'Potato',
    emoji: '<:ITPotato:1413869500046119005>',
    rarity: 'Rare',
    value: 50,
    useable: false,
    types: ['Sellable', 'Material'],
    note: '',
    image: '',
    price: null,
    sellPrice: 40000,
  },
  WateringCan: {
    id: 'WateringCan',
    name: 'Watering Can',
    emoji: '<:ITWateringcan:1410243468634099723>',
    rarity: 'Common',
    value: 150,
    useable: false,
    types: ['Tool', 'Equipment'],
    note: '',
    image: 'https://i.ibb.co/vv65JBH8/Watering-Can.png',
    price: 70000,
    sellPrice: null,
    durability: 10,
  },
  DiamondBag: {
    id: 'DiamondBag',
    name: 'Diamond Bag',
    emoji: '<:ITDiamondbag:1409940957700292669>',
    rarity: 'Prismatic',
    value: 7500,
    useable: true,
    types: ['Container', 'Consumable', 'Collectible'],
    note: 'Give 10k Diamonds',
    image: 'https://i.ibb.co/fYXHjr13/Bag-of-Diamond.png',
    price: 100,
    sellPrice: null,
  },
  DiamondCrate: {
    id: 'DiamondCrate',
    name: 'Diamond Crate',
    emoji: '<:ITDiamondcrate:1409940970287661096>',
    rarity: 'Prismatic',
    value: 8000,
    useable: true,
    types: ['Container', 'Consumable', 'Collectible'],
    note: 'Give 135k Diamonds',
    image: 'https://i.ibb.co/5xLZZ25K/Crate-of-Diamond.png',
    price: 900,
    sellPrice: null,
  },
  DiamondChest: {
    id: 'DiamondChest',
    name: 'Diamond Chest',
    emoji: '<:ITDiamondcrate:1409940982853537832>',
    rarity: 'Prismatic',
    value: 9000,
    useable: true,
    types: ['Container', 'Consumable', 'Collectible'],
    note: 'Give 980k Diamonds',
    image: 'https://i.ibb.co/4nJR1ZnC/Chest-of-Diamond.png',
    price: 4900,
    sellPrice: null,
  },
  BanHammer: {
    id: 'BanHammer',
    name: 'Ban Hammer',
    emoji: '<:ITBanhammer:1410315855233028258>',
    rarity: 'Secret',
    value: 0,
    useable: true,
    types: ['Tool', 'Collectible', 'Cosmetic', 'ADMIN'],
    note: 'Admin only item',
    image: '',
    price: 0,
    sellPrice: null,
  },
  HuntingRifleT1: {
    id: 'HuntingRifleT1',
    name: 'Rifle Gun Tier 1',
    emoji: '<:ITRifle1:1410892503007105024>',
    rarity: 'Common',
    value: 200,
    useable: false,
    types: ['Equipment', 'Tool'],
    note: '',
    image: 'https://i.ibb.co/3mbdZLv3/rifle.png',
    price: 50000,
    sellPrice: null,
    durability: 50,
  },
  HuntingRifleT2: {
    id: 'HuntingRifleT2',
    name: 'Rifle Gun Tier 2',
    emoji: '<:ITRifle2:1426859581023453306>',
    rarity: 'Epic',
    value: 600,
    useable: false,
    types: ['Equipment', 'Tool'],
    note: 'Allows hunting epic and legendary animals. Durability 250. Hunting cooldown -10%.',
    image: '',
    price: null,
    sellPrice: null,
    durability: 250,
  },
  HuntingRifleT3: {
    id: 'HuntingRifleT3',
    name: 'Rifle Gun Tier 3',
    emoji: '<:ITRifle3:1426859594654683166>',
    rarity: 'Legendary',
    value: 850,
    useable: false,
    types: ['Equipment', 'Tool'],
    note: 'Allows hunting mythical, godly, and secret animals (secret at hunt mastery 100). Durability 500. Hunting cooldown -25%.',
    image: '',
    price: null,
    sellPrice: null,
    durability: 500,
  },
  BulletBox: {
    id: 'BulletBox',
    name: 'Bullet box',
    emoji: '<:ITBulletbox:1410481932629971014>',
    rarity: 'Common',
    value: 100,
    useable: true,
    types: ['Container', 'Material', 'Consumable'],
    note: 'A bullet box gives 6 bullets.',
    image: 'https://i.ibb.co/TM3NStHG/Bullet-Box.png',
    price: 30000,
    sellPrice: null,
  },
  Shovel: {
    id: 'Shovel',
    name: 'Shovel',
    emoji: '<:ITShovel:1412067842303594567>',
    rarity: 'Common',
    value: 225,
    useable: true,
    types: ['Tool', 'Equipment'],
    note: '',
    image: 'https://i.ibb.co/PGDZzsG3/Shovel.png',
    price: 50000,
    sellPrice: null,
    durability: 50,
  },
  Bullet: {
    id: 'Bullet',
    name: 'Bullet',
    emoji: '<:ITBullet:1410481944252252221>',
    rarity: 'Common',
    value: 20,
    useable: false,
    types: ['Consumable', 'Material'],
    note: '',
    image: '',
    price: 0,
    sellPrice: null,
  },
  ElfHat: {
    id: 'ElfHat',
    name: 'Elf Hat',
    emoji: '<:ITElfHat:1425752757112934440>',
    rarity: 'Legendary',
    value: 600,
    useable: false,
    types: ['Cosmetic', 'Collectible'],
    note: 'Equip via /my-cosmetic to double your coin earnings.',
    image: '',
    price: '',
    sellPrice: null,
  },
  ...Object.fromEntries(DIG_ITEMS.map(it => [it.id, it])),
  ...ANIMAL_ITEMS,
};

module.exports = { ITEMS, DIG_ITEMS, DIG_ITEMS_BY_AREA };
