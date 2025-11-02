const DIG_AREAS = [
  {
    name: 'Jungle',
    key: 'Jungle',
    emoji: '<:SBDigJungle:1434094035403931658>',
    image: 'https://i.ibb.co/3gqnGzL/Jungle.png',
    deathMessages: [
      {
        description:
          'You dug into a root-tangled patch and split a hornet nest—thousands erupted and stung you into shock 🐝😖',
        cause: '-# You died from [Anaphylaxis] 💀',
      },
      {
        description:
          'Your shovel punctured a buried gas pocket; a spark lit it like a torch 💥🔥',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'You tugged a vine—tripwire! A spiked log swung from the canopy and flattened you 🪵⚠️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description:
          'You tore open a mound of fire ants; they flooded your boots and kept biting 🐜🥵',
        cause: '-# You died from [Envenomation] 💀',
      },
      {
        description: 'The ground collapsed into a bamboo spike pit beneath your feet 🎋⬇️',
        cause: '-# You died from [Impaled] 💀',
      },
      {
        description: 'That “stick” blinked—eyelash viper to the wrist 🐍⚡',
        cause: '-# You died from [Venom] 💀',
      },
      {
        description: 'Your shovel rattled an old mine; it clicked… then silence, then not 💣💥',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'You freed a boulder from its root cage. It rolled once. That was enough 🪨😵',
        cause: '-# You died from [Crushed] 💀',
      },
      {
        description:
          'A snapped vine triggered darts from the undergrowth—pffft pffft pffft 🌿🎯',
        cause: '-# You died from [Trap] 💀',
      },
      {
        description: 'The mud grabbed your legs; the more you fought, the deeper you sank 🪤🫠',
        cause: '-# You died from [Suffocation] 💀',
      },
      {
        description: 'You split a rotten log—bullet ants taught you new meanings of pain 🐜💢',
        cause: '-# You died from [Shock] 💀',
      },
      {
        description: 'Your shovel sparked on old ordnance; the jungle finished the job 💣⚡',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'You cracked a mossy hive; a storm of wasps chased you until your heart gave out 🐝🌪️',
        cause: '-# You died from [Cardiac Arrest] 💀',
      },
      {
        description: 'A razor-leaf vine snapped back across your throat 🌿🩸',
        cause: '-# You died from [Bleeding] 💀',
      },
      {
        description: 'You lifted a stone idol; the ceiling dropped its opinion on you 🗿⬇️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description:
          'You churned a stagnant pool and inhaled swamp gas and spores 🦠🫁',
        cause: '-# You died from [Asphyxiation] 💀',
      },
      {
        description:
          'A spring-snare yanked you skyward; the branch snapped on the way down 🌳🪢',
        cause: '-# You died from [Neck Trauma] 💀',
      },
      {
        description:
          'You cracked a dart-frog cluster and wiped your brow with the same hand 🐸🧪',
        cause: '-# You died from [Toxin] 💀',
      },
      {
        description: 'You pulled a “root” that was a constrictor. It pulled harder 🐍🔁',
        cause: '-# You died from [Constriction] 💀',
      },
      {
        description:
          'A termite cathedral collapsed and buried you in choking grit 🐜🏚️',
        cause: '-# You died from [Suffocation] 💀',
      },
      {
        description:
          'You undercut a slick slope; the landslide rode you all the way down 🏔️🪨',
        cause: '-# You died from [Blunt Trauma] 💀',
      },
      {
        description:
          'You unearthed a rusted punji board and fell spine-first onto it 🔩⬇️',
        cause: '-# You died from [Impaled] 💀',
      },
      {
        description:
          'Sap sprayed from a pocket, blinding you long enough to miss the second trap 🌿🧴➡️⚠️',
        cause: '-# You died from [Trap] 💀',
      },
      {
        description: 'Your lamp ignited resin vapors seeping from a wounded tree 🔥🌲',
        cause: '-# You died from [Burns] 💀',
      },
      {
        description:
          'You cracked a stone seal; fetid water rushed in and pinned you under roots 💧🌿',
        cause: '-# You died from [Drowning] 💀',
      },
      {
        description: 'A leech bloom found every cut you forgot you had 🩸🪱',
        cause: '-# You died from [Exsanguination] 💀',
      },
      {
        description: 'You severed a strangler-fig root; splinters launched like arrows 🌳🏹',
        cause: '-# You died from [Piercing] 💀',
      },
      {
        description:
          'You punched through rotten flooring into a ring of spike vines below 🧱🌿🗡️',
        cause: '-# You died from [Impaled] 💀',
      },
      {
        description:
          'You cut the last root of an ancient giant; the tree answered with gravity 🌲⬇️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description: 'You stepped onto a sleepy sand patch—quicksand woke first 🏜️🫠',
        cause: '-# You died from [Quicksand] 💀',
      },
    ],
  },
  {
    name: 'Beach',
    key: 'Beach',
    emoji: '<:SBDigBeach:1434094032581300254>',
    image: 'https://i.ibb.co/HTFGS4d4/Beach.png',
    deathMessages: [
      {
        description:
          'You tunneled under a dune; the sand roof collapsed and smothered you 🏖️⏳',
        cause: '-# You died from [Suffocation] 💀',
      },
      {
        description:
          'Your shovel hit a rusted sea mine buried since wartime 💣🌊',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'You cracked a pocket of pressurized sand; it avalanched and pinned you 🎢🏝️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description:
          'You reached into a shell cluster—cone snail said hello with a dart 🐌🧪',
        cause: '-# You died from [Venom] 💀',
      },
      {
        description:
          'You split driftwood and woke a blue-ringed octopus hiding inside 🐙💍',
        cause: '-# You died from [Neurotoxin] 💀',
      },
      {
        description:
          'A box jellyfish washed into your excavation pool and brushed your legs 🪼⚡',
        cause: '-# You died from [Cardiotoxic Venom] 💀',
      },
      {
        description:
          'You popped a methane pocket under the wet sand; your lamp turned it into fire 💥🔥',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'You dug through a crab colony; they swarmed and shredded your ankles 🦀🩸',
        cause: '-# You died from [Exsanguination] 💀',
      },
      {
        description:
          'Your trench filled fast with a sneaky tide; the rip pulled you out while buried 🌊🌀',
        cause: '-# You died from [Drowning] 💀',
      },
      {
        description:
          'A palm you undercut dropped a coconut like a meteor on your skull 🥥⬇️',
        cause: '-# You died from [Blunt Trauma] 💀',
      },
      {
        description:
          'You pried a rock; a moray eel launched from the hole and latched on 🐍🌊',
        cause: '-# You died from [Hemorrhage] 💀',
      },
      {
        description:
          'You knelt on a stonefish hidden in your pit’s puddle 🐟🗡️',
        cause: '-# You died from [Envenomation] 💀',
      },
      {
        description:
          'Your shovel shattered a glass bottle; the shards opened your femoral artery 🍾🩸',
        cause: '-# You died from [Bleeding] 💀',
      },
      {
        description:
          'A buried fishing net cinched around your legs; the surf finished the knot 🕸️🌊',
        cause: '-# You died from [Entrapment] 💀',
      },
      {
        description:
          'You disturbed a Portuguese man o’ war tangle under the kelp 🪼🌬️',
        cause: '-# You died from [Anaphylaxis] 💀',
      },
      {
        description: 'A sand boil erupted under you from a hidden spring; you vanished with it 💧⏳',
        cause: '-# You died from [Suffocation] 💀',
      },
      {
        description:
          'You uncovered a rusted hook and line; it ripped deep and infection raged later 🎣🦠',
        cause: '-# You died from [Sepsis] 💀',
      },
      {
        description:
          'Your pit undercut a rotted pier piling; the beam dropped on your spine 🪵⬇️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description:
          'You levered a coral chunk; razor edges carved you to ribbons 🪸🩸',
        cause: '-# You died from [Lacerations] 💀',
      },
      {
        description:
          'Sun hammered you while digging nonstop; you never felt the last wave ☀️🥵',
        cause: '-# You died from [Heatstroke] 💀',
      },
      {
        description:
          'You freed a buried aerosol can from a beach fire pit; it cooked off in your hands 🥫💥',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'Your tunnel intersected a sand wasp nest; they made their point swiftly 🐝🏝️',
        cause: '-# You died from [Shock] 💀',
      },
      {
        description:
          'You dug into a tar seep; every breath got heavier until none came 🫧🕳️',
        cause: '-# You died from [Asphyxiation] 💀',
      },
      {
        description:
          'A collapsing dune rolled you with hidden drift logs like a tumbler 🌬️🪵',
        cause: '-# You died from [Blunt Trauma] 💀',
      },
      {
        description:
          'You lifted a “shell” that was a live urchin; spines snapped off deep 🧽🦔',
        cause: '-# You died from [Toxin] 💀',
      },
      {
        description:
          'Your spade clipped a CO₂ cartridge; the spark and pressure did the rest 🔧💥',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'A stingray buried in the shallows whipped your calf as you stepped back 🐟🗡️',
        cause: '-# You died from [Envenomation] 💀',
      },
      {
        description:
          'You cracked a sealed ammo crate; the contents were unstable and angry 📦💣',
        cause: '-# You died from [Detonation] 💀',
      },
      {
        description:
          'The tide undercut your trench wall; it sheared and folded you inside 🌊🏗️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description:
          'You grabbed a rope to pull treasure; it was a trigger line—bolts fired from a chest ⚓🎯',
        cause: '-# You died from [Trap] 💀',
      },
    ],
  },
  {
    name: 'Aurora Tundra',
    key: 'AuroraTundra',
    emoji: '<:SBDigAuroraTundra:1434094030169575424>',
    image: 'https://i.ibb.co/vnL0BXQ/Aurora-Tundra.png',
    deathMessages: [
      {
        description:
          'You tunneled under a wind-carved cornice; it fractured and buried you in blue ice ❄️🧊',
        cause: '-# You died from [Suffocation] 💀',
      },
      {
        description:
          'Your spade thinned a snow bridge over a crevasse; it sighed, then swallowed you 🌬️🕳️',
        cause: '-# You died from [Fall Trauma] 💀',
      },
      {
        description:
          'You chipped an ice lens supporting a boulder; it dropped like judgment 🪨⬇️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description:
          'You broke into a hibernation den; a wolverine objected at close range 🐾🗡️',
        cause: '-# You died from [Lacerations] 💀',
      },
      {
        description:
          'Your lantern warmed trapped gases in permafrost; the pocket flashed 💥🧊',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'You tunneled beneath a drift; your air thinned to crystal silence 🌫️🫁',
        cause: '-# You died from [Asphyxiation] 💀',
      },
      {
        description:
          'You hacked at black ice, slipped, and met a forest of icicles point-first 🧊🗡️',
        cause: '-# You died from [Impaled] 💀',
      },
      {
        description:
          'You disturbed a snow cornice that avalanched your trench shut ⛏️🏔️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description:
          'You pried a frozen crate; the spring trap inside still remembered its job 📦🎯',
        cause: '-# You died from [Trap] 💀',
      },
      {
        description:
          'You dug into a brine channel; super-cold water soaked your gear and heart rate ⛏️🥶',
        cause: '-# You died from [Hypothermia] 💀',
      },
      {
        description:
          'Your shovel cracked a hollow drift; you fell, neck first, onto an ice shelf 🧊⚠️',
        cause: '-# You died from [Neck Trauma] 💀',
      },
      {
        description:
          'You chipped a shimmering shard; razor-ice spray shredded your face ✨🩸',
        cause: '-# You died from [Lacerations] 💀',
      },
      {
        description:
          'You opened a snow cave roof for “light”; it pancaked you in silence 🕳️❄️',
        cause: '-# You died from [Suffocation] 💀',
      },
      {
        description:
          'You unearthed an old flare canister; friction lit a star under your chin 🎆💥',
        cause: '-# You died from [Burns] 💀',
      },
      {
        description:
          'You split a frost-locked boulder; shards flew like knives across the gale 🪨💨',
        cause: '-# You died from [Piercing] 💀',
      },
      {
        description:
          'You cracked vein ice above a frozen river; the current took you under 🧊🌊',
        cause: '-# You died from [Drowning] 💀',
      },
      {
        description:
          'You dug into a polar bear cache; the owner arrived mid-swing 🐻‍❄️🩸',
        cause: '-# You died from [Mauling] 💀',
      },
      {
        description:
          'You pierced a CO₂ pocket; the heavier air pooled in your trench until you slept 😵‍💫🫙',
        cause: '-# You died from [Asphyxiation] 💀',
      },
      {
        description:
          'You pried at a relic frozen in place; the tension wire finally snapped 🎛️🪢',
        cause: '-# You died from [Decapitation] 💀',
      },
      {
        description:
          'Your pick struck ice-cemented shrapnel; one spark and then white noise 💣❄️',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'You cleared hoarfrost from a ledge; the cornice calved—and so did you 🧗‍♂️⬇️',
        cause: '-# You died from [Fall Trauma] 💀',
      },
      {
        description: 'You dug bare-handed; frostbite climbed your fingers to your core 🧤🖐️',
        cause: '-# You died from [Hypothermia] 💀',
      },
      {
        description:
          'You tunneled toward a faint glow; the aurora in the ice blinded you into a step too far ✨🕳️',
        cause: '-# You died from [Fall Trauma] 💀',
      },
      {
        description:
          'You opened an old snow pit and breathed in mold and cold; lungs quit together 🦠🫁',
        cause: '-# You died from [Asphyxiation] 💀',
      },
      {
        description:
          'You levered a frozen sled runner; it snapped and a metal edge opened your thigh 🛷🩸',
        cause: '-# You died from [Bleeding] 💀',
      },
      {
        description:
          'You chipped at a glittering wall—needle ice cascaded like glass rain 🧊🌧️',
        cause: '-# You died from [Piercing] 💀',
      },
      {
        description:
          'You freed a buried fuel can; pressure and static finished the plan ⛽⚡',
        cause: '-# You died from [Explosion] 💀',
      },
      {
        description:
          'You cut into a snow pillow over a cliff; the whole pillow exhaled you outward 🛏️🏔️',
        cause: '-# You died from [Fall Trauma] 💀',
      },
      {
        description:
          'You broke a vent in a steam fumarole disguised as frost; scalding fog filled your trench 🌋🌫️',
        cause: '-# You died from [Burns] 💀',
      },
      {
        description:
          'You followed a glittering vein under the ice; it sighed and you vanished 🌌🧊',
        cause: '-# You died from [Drowning] 💀',
      },
      {
        description:
          'You carved steps in rime; the wall sheared and your rope cut across an ice fin 🧗‍♀️🗡️',
        cause: '-# You died from [Lacerations] 💀',
      },
      {
        description:
          'You unearthed a metal snare meant for foxes; it found a larger prize 🦊🪤',
        cause: '-# You died from [Trap] 💀',
      },
      {
        description:
          'You dug through sastrugi into a void; the roof compacted your ribs like snow bricks 🧱❄️',
        cause: '-# You died from [Crushing] 💀',
      },
      {
        description:
          'You chipped at aurora glass; it rang, shattered, and the edge did the rest ✨🔪',
        cause: '-# You died from [Bleeding] 💀',
      },
      {
        description:
          'You struck a pressure ridge; the ice heaved and pinned you at the hips 🧊🗜️',
        cause: '-# You died from [Crush Injury] 💀',
      },
      {
        description:
          'You opened a snow tunnel to daylight; spindrift poured in and never stopped 🌬️⏳',
        cause: '-# You died from [Suffocation] 💀',
      },
      {
        description:
          'You kicked free a frozen anchor; the buried sled shot forward through you 🛷🎯',
        cause: '-# You died from [Impaled] 💀',
      },
      {
        description:
          'You unearthed a sealed flare cache; one misfire, endless night 🎇🌌',
        cause: '-# You died from [Detonation] 💀',
      },
      {
        description:
          'You rested inside your dig without venting; your stove ate all the oxygen 🔥🫗',
        cause: '-# You died from [Asphyxiation] 💀',
      },
      {
        description:
          'You chased a shimmering echo under the ice; it was a lake, and it was thin 🌌🕳️',
        cause: '-# You died from [Drowning] 💀',
      },
    ],
  },
];

const DIG_AREA_BY_KEY = Object.fromEntries(DIG_AREAS.map(area => [area.key, area]));
const DIG_AREA_BY_NAME = Object.fromEntries(DIG_AREAS.map(area => [area.name, area]));

module.exports = { DIG_AREAS, DIG_AREA_BY_KEY, DIG_AREA_BY_NAME };
