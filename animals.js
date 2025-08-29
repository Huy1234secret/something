const XLSX = require('xlsx');

function loadAnimals() {
  const workbook = XLSX.readFile('Animal data.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const animals = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const id = row[17] || String(row[0]).replace(/\s+/g, '');
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
  }
  return animals;
}

const ANIMALS = loadAnimals();

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
      type: 'Animal',
      note: '',
      image: '',
      price: 0,
      sellPrice: a.sellPrice,
    },
  ]),
);

module.exports = { ANIMALS, ANIMAL_ITEMS };
