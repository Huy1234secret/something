const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
} = require('@discordjs/builders');
const { ITEMS, DIG_ITEMS } = require('../items');
const { ANIMALS } = require('../animals');

const DIG_ITEM_IDS = new Set(DIG_ITEMS.map(item => item.id));
const ANIMAL_ITEM_IDS = new Set(ANIMALS.map(animal => animal.id));

function formatBaseItems() {
  const baseItems = Object.values(ITEMS)
    .filter(item => !DIG_ITEM_IDS.has(item.id) && !ANIMAL_ITEM_IDS.has(item.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (baseItems.length === 0) return '*None*';
  return baseItems
    .map(item => `- ${item.name}${item.rarity ? ` (${item.rarity})` : ''}`)
    .join('\n');
}

function formatDigItems() {
  if (DIG_ITEMS.length === 0) return '*None*';
  const sorted = [...DIG_ITEMS].sort((a, b) => a.name.localeCompare(b.name));
  return sorted
    .map(item => `${item.name}${item.rarity ? ` (${item.rarity})` : ''}`)
    .join('; ');
}

function formatAnimalItems() {
  if (ANIMALS.length === 0) return '*None*';
  const baseAnimals = ANIMALS.filter(animal =>
    typeof animal.sellPrice === 'number' || animal.sellPrice == null,
  ).sort((a, b) => a.name.localeCompare(b.name));
  const eventAnimals = ANIMALS.filter(animal =>
    animal.sellPrice && typeof animal.sellPrice === 'object',
  ).sort((a, b) => a.name.localeCompare(b.name));

  const sections = [];
  if (baseAnimals.length) {
    sections.push(
      `- Base wildlife pool (available through hunts): ${baseAnimals
        .map(animal => `${animal.name}${animal.rarity ? ` (${animal.rarity})` : ''}`)
        .join(', ')}`,
    );
  }
  if (eventAnimals.length) {
    sections.push(
      `- Aurora Tundra event wildlife: ${eventAnimals
        .map(animal => `${animal.name}${animal.rarity ? ` (${animal.rarity})` : ''}`)
        .join(', ')}`,
    );
  }
  return sections.join('\n');
}

function buildItemListComponents() {
  const components = [];
  components.push(
    new TextDisplayBuilder().setContent(
      `### Core inventory items\n\n${formatBaseItems()}`,
    ),
  );
  components.push(new SeparatorBuilder());
  components.push(
    new TextDisplayBuilder().setContent(
      `### Dig-exclusive finds\n\n${formatDigItems()}`,
    ),
  );
  components.push(new SeparatorBuilder());
  components.push(
    new TextDisplayBuilder().setContent(
      `### Animal items\n${formatAnimalItems()}`,
    ),
  );
  return components;
}

function setup(client) {
  const command = new SlashCommandBuilder()
    .setName('list-items')
    .setDescription('List all bot items grouped by category with their rarities');
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'list-items') return;
    try {
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      const container = new ContainerBuilder()
        .setAccentColor(0xffffff)
        .addTextDisplayComponents(...buildItemListComponents());
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      if (error.code !== 10062) console.error(error);
    }
  });
}

module.exports = { setup };
