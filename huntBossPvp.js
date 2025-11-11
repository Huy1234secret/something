const { MessageFlags, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const {
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require('@discordjs/builders');
const { ITEMS } = require('./items');
const { ANIMALS } = require('./animals');
const {
  normalizeInventory,
  getInventoryCount,
  MAX_ITEMS,
} = require('./utils');
const { handleDeath } = require('./death');

const HEALTH_EMOJI = '<:SBHeart:1432355213922271243>';
const DEFENSE_EMOJI = '<:SBShield:1432375938246774924>';
const ENERGY_EMOJI = '<:SBEnergy:1435599172366766172>';
const DAMAGE_EMOJI = '<:SBDamage:1432427851617013770>';
const WITHERED_EMOJI = '<:SBWithered:1432435198167089282>';
const POISON_EMOJI = '<:SBPoison:1432429255010160680>';
const COLD_EMOJI = '<:SBCold:1432435195302248580>';
const BURN_EMOJI = '<:SBBurn:1432435193129472010>';
const STUN_EMOJI = '<:SBStunned:1435239917730005024>';

const BOSS_IDS = new Set([
  'Krampus',
  'HarpyEagle',
  'GingerbreadBrute',
  'Cerberus',
  'Dragon',
  'Griffin',
]);

const battleStates = new Map();
const ACTION_COOLDOWN_MS = 3000;
const INACTIVITY_TIMEOUT_MS = 60_000;

const RARITY_EMOJIS = {
  Common: '<:SBRCommon:1409932856762826862>',
  Rare: '<:SBRRare:1409932954037387324>',
  Epic: '<:SBREpic:1409933003269996674>',
  Legendary: '<a:SBRLegendary:1409933036568449105>',
  Mythical: '<a:SBRMythical:1409933097176268902>',
  Godly: '<a:SBRGodly:1409933130793750548>',
  Prismatic: '<a:SBRPrismatic:1409933176276521010>',
  Secret: '<a:SBRSecret:1409933447220297791>',
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const RIFLE_DAMAGE = {
  HuntingRifleT1: 5,
  HuntingRifleT2: 20,
  HuntingRifleT3: 50,
  HuntingRifleT4: 75,
  HuntingRifleT5: 100,
};

const MAX_PLAYER_HEALTH = 250;
const BASE_PLAYER_DEFENSE = 20;
const BASE_PLAYER_DAMAGE = 20;
const BASE_PLAYER_ENERGY = 100;

const STATUS_KEYS = ['withered', 'poison', 'cold', 'burn', 'stun'];
const DEFAULT_SECTION_THUMB_URL = 'https://cdn.discordapp.com/embed/avatars/0.png';

function emojiToUrl(emoji) {
  if (!emoji) return null;
  const match = emoji.match(/^<(?:(a):)?[^:]+:(\d+)>$/);
  if (!match) return null;
  const animated = Boolean(match[1]);
  const id = match[2];
  return `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=240&quality=lossless`;
}

function isBossAnimal(id) {
  return BOSS_IDS.has(id);
}

function buildHealthBar(current, max, segments = 30) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(pct * segments);
  return '█'.repeat(filled) + '░'.repeat(segments - filled);
}

function appendActionLog(state, entries) {
  if (!state) return;
  const lines = Array.isArray(entries) ? entries : [entries];
  const filtered = [];
  for (const line of lines) {
    if (!line) continue;
    filtered.push(line);
  }
  if (!filtered.length) return;
  state.actionMessage = filtered.join('\n');
}

function isActionOnCooldown(state) {
  return Boolean(state?.cooldowns?.actionUntil && state.cooldowns.actionUntil > Date.now());
}

function isBattleActive(state) {
  return Boolean(state && battleStates.get(state.messageId) === state);
}

function scheduleActionCooldownUpdate(state) {
  if (!state) return;
  if (!state.cooldownTimeouts) state.cooldownTimeouts = {};
  if (state.cooldownTimeouts.action) {
    clearTimeout(state.cooldownTimeouts.action);
    state.cooldownTimeouts.action = null;
  }
  if (!isActionOnCooldown(state)) return;
  const remaining = Math.max(0, state.cooldowns.actionUntil - Date.now());
  state.cooldownTimeouts.action = setTimeout(() => {
    if (!battleStates.has(state.messageId) || battleStates.get(state.messageId) !== state) return;
    state.cooldownTimeouts.action = null;
    if (isActionOnCooldown(state)) {
      scheduleActionCooldownUpdate(state);
      return;
    }
    updateBattleMessage(state).catch(err => {
      if (!err || (err.code !== 10008 && err.code !== 10062)) {
        console.error(err);
      }
    });
  }, remaining);
}

function setActionCooldown(state, durationMs = ACTION_COOLDOWN_MS) {
  if (!state) return;
  if (!state.cooldowns) state.cooldowns = {};
  state.cooldowns.actionUntil = Date.now() + durationMs;
  scheduleActionCooldownUpdate(state);
}

function scheduleInactivityTimeout(state) {
  if (!state) return;
  if (state.inactivityTimeout) {
    clearTimeout(state.inactivityTimeout);
    state.inactivityTimeout = null;
  }
  const lastInteraction = state.lastInteractionAt || Date.now();
  const delay = Math.max(0, lastInteraction + INACTIVITY_TIMEOUT_MS - Date.now());
  state.inactivityTimeout = setTimeout(() => {
    if (!battleStates.has(state.messageId) || battleStates.get(state.messageId) !== state) return;
    handleBattleDespawn(state).catch(err => {
      if (!err || (err.code !== 10008 && err.code !== 10062)) {
        console.error(err);
      }
    });
  }, delay);
}

function refreshInactivityTimer(state) {
  if (!state) return;
  state.lastInteractionAt = Date.now();
  scheduleInactivityTimeout(state);
}

function clearBattleTimeouts(state) {
  if (!state) return;
  if (state.inactivityTimeout) {
    clearTimeout(state.inactivityTimeout);
    state.inactivityTimeout = null;
  }
  if (state.cooldownTimeouts) {
    for (const key of Object.keys(state.cooldownTimeouts)) {
      const timeout = state.cooldownTimeouts[key];
      if (timeout) clearTimeout(timeout);
    }
    state.cooldownTimeouts = {};
  }
}

function createPlayerState(user, stats) {
  const rifle = stats.hunt_gun;
  const attacks = [];
  if (rifle && RIFLE_DAMAGE[rifle]) {
    const damage = RIFLE_DAMAGE[rifle];
    attacks.push({
      id: 'shoot',
      name: 'Shoot Bullet',
      energyCost: 0,
      damage,
      shieldDamage: 1,
      description:
        `Use your rifle and shoot out a bullet toward the enemy, dealing ${damage} damage and nerfing defense by 1.`,
    });
  }
  return {
    id: user.id,
    name: user.username,
    maxHealth: MAX_PLAYER_HEALTH,
    health: MAX_PLAYER_HEALTH,
    baseDefense: BASE_PLAYER_DEFENSE,
    defense: BASE_PLAYER_DEFENSE,
    baseDamage: BASE_PLAYER_DAMAGE,
    damageBuff: 0,
    energy: BASE_PLAYER_ENERGY,
    attacks,
    statuses: {},
    immunities: [],
  };
}

function createKrampusState(animal) {
  return {
    id: 'Krampus',
    name: animal.name,
    emoji: animal.emoji,
    rarity: animal.rarity,
    maxHealth: 1000,
    health: 1000,
    baseDefense: 0,
    defense: 0,
    baseDamage: 35,
    damageBuff: 0,
    energy: 0,
    statuses: {},
    immunities: ['Stun', 'Magic'],
    flags: {
      usedNightOfChains: false,
      usedIntoTheSack: false,
    },
  };
}

function createDefaultEnemy(animal) {
  if (animal.id === 'Krampus') return createKrampusState(animal);
  const maxHealth = 500;
  return {
    id: animal.id,
    name: animal.name,
    emoji: animal.emoji,
    rarity: animal.rarity,
    maxHealth,
    health: maxHealth,
    baseDefense: 10,
    defense: 10,
    baseDamage: 25,
    damageBuff: 0,
    energy: 0,
    statuses: {},
    immunities: [],
    flags: {},
  };
}

function formatDebuffLine(entity) {
  const entries = [];
  for (const key of STATUS_KEYS) {
    const status = entity.statuses[key];
    if (!status || !status.tier) continue;
    const tier = status.tier;
    if (key === 'withered') entries.push(`${WITHERED_EMOJI} ${tier}`);
    else if (key === 'poison') entries.push(`${POISON_EMOJI} ${tier}`);
    else if (key === 'cold') entries.push(`${COLD_EMOJI} ${tier}`);
    else if (key === 'burn') entries.push(`${BURN_EMOJI} ${tier}`);
    else if (key === 'stun') entries.push(`${STUN_EMOJI} ${tier}`);
  }
  return entries.length ? entries.join(', ') : 'None';
}

function getColdMultiplier(tier) {
  const map = [1, 0.9, 0.8, 0.7, 0.6, 0.5];
  return map[Math.max(0, Math.min(5, tier || 0))];
}

function getEffectiveDefense(entity) {
  const base = Math.max(0, entity.defense);
  const tier = entity.statuses.cold?.tier || 0;
  return base * getColdMultiplier(tier);
}

function getEffectiveDamage(entity) {
  const base = entity.baseDamage + entity.damageBuff;
  const tier = entity.statuses.cold?.tier || 0;
  return base * getColdMultiplier(tier);
}

function applyDamage(target, amount) {
  const effectiveDefense = getEffectiveDefense(target);
  const reduction = Math.max(0, Math.min(0.95, effectiveDefense / 100));
  const finalDamage = Math.max(1, Math.round(amount * (1 - reduction)));
  target.health = Math.max(0, target.health - finalDamage);
  return finalDamage;
}

function reduceDefense(target, amount) {
  target.defense = Math.max(0, target.defense - amount);
}

function applyWithered(target, tier = 1) {
  const status = target.statuses.withered || { tier: 0, remaining: 0 };
  status.tier = Math.min(5, status.tier + tier);
  status.remaining = 3;
  target.statuses.withered = status;
  return tickWithered(target, status);
}

function applyPoison(target, tier = 1) {
  const status = target.statuses.poison || { tier: 0, remaining: 0 };
  status.tier = Math.min(5, status.tier + tier);
  status.remaining = 3;
  target.statuses.poison = status;
  return tickPoison(target, status);
}

function applyBurn(target, tier = 1) {
  const status = target.statuses.burn || { tier: 0, remaining: 0 };
  status.tier = Math.min(5, status.tier + tier);
  status.remaining = 5;
  target.statuses.burn = status;
  return tickBurn(target, status);
}

function applyCold(target, tier = 1) {
  const status = target.statuses.cold || { tier: 0, dropTimer: 2 };
  status.tier = Math.min(5, status.tier + tier);
  status.dropTimer = (status.dropTimer || 0) + 2;
  target.statuses.cold = status;
}

function applyStun(target, rounds = 1) {
  if (target.immunities.includes('Stun')) {
    return {
      applied: false,
      reason: 'immune',
      message: `-# ${target.name} is immune to Stun.`,
    };
  }
  const status = target.statuses.stun || { tier: 0, remaining: 0 };
  status.tier = (status.tier || 0) + rounds;
  status.remaining = (status.remaining || 0) + rounds;
  target.statuses.stun = status;
  return { applied: true, rounds };
}

function tickWithered(target, status) {
  if (!status) return [];
  const logs = [];
  const tier = Math.max(1, Math.min(5, status.tier));
  const hpPct = [0, 0.05, 0.1, 0.15, 0.2, 0.25][tier];
  const defPct = [0, 0.1, 0.2, 0.3, 0.4, 0.5][tier];
  const hpLoss = Math.max(1, Math.round(target.maxHealth * hpPct));
  target.health = Math.max(0, target.health - hpLoss);
  const defLoss = target.defense * defPct;
  target.defense = Math.max(0, target.defense - defLoss);
  logs.push(`-# ${target.name} loses ${hpLoss} ${HEALTH_EMOJI} due to Withered ${tier}.`);
  status.remaining -= 1;
  if (status.remaining <= 0) delete target.statuses.withered;
  return logs;
}

function tickPoison(target, status) {
  if (!status) return [];
  const logs = [];
  const tier = Math.max(1, Math.min(5, status.tier));
  const hpPct = [0, 0.1, 0.2, 0.3, 0.4, 0.5][tier];
  const hpLoss = Math.max(1, Math.round(target.maxHealth * hpPct));
  if (target.health > 1) target.health = Math.max(1, target.health - hpLoss);
  logs.push(`-# ${target.name} suffers ${hpLoss} ${HEALTH_EMOJI} from Poison ${tier}.`);
  status.remaining -= 1;
  if (status.remaining <= 0) delete target.statuses.poison;
  return logs;
}

function tickBurn(target, status) {
  if (!status) return [];
  const logs = [];
  const tier = Math.max(1, Math.min(5, status.tier));
  const pct = [0, 0.02, 0.04, 0.06, 0.08, 0.1][tier];
  const hpLoss = Math.max(1, Math.round(target.maxHealth * pct));
  const defLoss = target.baseDefense * pct;
  target.health = Math.max(0, target.health - hpLoss);
  target.defense = Math.max(0, target.defense - defLoss);
  logs.push(`-# ${target.name} is burned for ${hpLoss} ${HEALTH_EMOJI} (Burn ${tier}).`);
  status.remaining -= 1;
  if (status.remaining <= 0) delete target.statuses.burn;
  return logs;
}

function tickCold(target, status) {
  if (!status) return [];
  const logs = [];
  status.dropTimer = (status.dropTimer || 0) - 1;
  if (status.dropTimer <= 0) {
    status.tier = Math.max(0, status.tier - 1);
    status.dropTimer = 2;
  }
  if (status.tier <= 0) delete target.statuses.cold;
  return logs;
}

function tickStun(target, status) {
  if (!status) return [];
  const logs = [];
  status.remaining = (status.remaining || 0) - 1;
  if (status.remaining <= 0) delete target.statuses.stun;
  return logs;
}

function tickStatuses(entity) {
  const logs = [];
  if (entity.statuses.withered) logs.push(...tickWithered(entity, entity.statuses.withered));
  if (entity.statuses.poison) logs.push(...tickPoison(entity, entity.statuses.poison));
  if (entity.statuses.burn) logs.push(...tickBurn(entity, entity.statuses.burn));
  if (entity.statuses.cold) logs.push(...tickCold(entity, entity.statuses.cold));
  if (entity.statuses.stun) logs.push(...tickStun(entity, entity.statuses.stun));
  return logs;
}

function buildBattleContainers(state) {
  const { player, enemy } = state;
  const enemyThumb = enemy.emoji ? emojiToUrl(enemy.emoji) : null;
  const enemyHealthBar = buildHealthBar(enemy.health, enemy.maxHealth);
  const playerHealthBar = buildHealthBar(player.health, player.maxHealth);
  const rarityEmoji = enemy.rarity ? RARITY_EMOJIS[enemy.rarity] || '' : '';
  const actionMessage = state.actionMessage || 'Selecting an action...';

  const enemySection = new SectionBuilder().setThumbnailAccessory(
    new ThumbnailBuilder().setURL(enemyThumb ?? DEFAULT_SECTION_THUMB_URL),
  );
  enemySection.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${state.userMention}, you are trying to hunt ${enemy.name} ${enemy.emoji || ''}` +
        (enemy.rarity
          ? `\n-# Rarity: ${enemy.rarity} ${rarityEmoji}`
          : '') +
        `\n-# Health: ${enemyHealthBar} \`${enemy.health} / ${enemy.maxHealth}\` ${HEALTH_EMOJI}`,
    ),
  );

  const container1 = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addSectionComponents(enemySection);

  const container2 = new ContainerBuilder()
    .setAccentColor(0x000000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${state.username} / ${enemy.name} turn` +
          `\n-# Round ${state.round}` +
          `\n${actionMessage}`,
      ),
    );

  const playerSection = new SectionBuilder()
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(state.userAvatar))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${state.username} Stat:` +
          `\n-# Health: ${playerHealthBar} \`${player.health} / ${player.maxHealth}\` ${HEALTH_EMOJI}` +
          `\n-# Defense: ${getEffectiveDefense(player).toFixed(2)} ${DEFENSE_EMOJI}` +
          `\n-# Energy: ${player.energy} ${ENERGY_EMOJI}` +
          `\n-# Damage buff: ${player.damageBuff >= 0 ? '+' : ''}${player.damageBuff.toFixed(2)} ${DAMAGE_EMOJI}` +
          `\n-# Debuff: ${formatDebuffLine(player)}`,
      ),
    );

  const container3 = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addSectionComponents(playerSection)
    .addSeparatorComponents(new SeparatorBuilder());

  const onCooldown = isActionOnCooldown(state) || state.turn !== 'player';
  const statBtn = new ButtonBuilder()
    .setCustomId(`pvp-stat:${state.messageId}`)
    .setLabel('Check stat')
    .setStyle(ButtonStyle.Secondary);
  const attackBtn = new ButtonBuilder()
    .setCustomId(`pvp-attack:${state.messageId}`)
    .setLabel('attack')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(onCooldown);
  const itemBtn = new ButtonBuilder()
    .setCustomId(`pvp-item:${state.messageId}`)
    .setLabel('Item')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(onCooldown);

  container3.addActionRowComponents(new ActionRowBuilder().addComponents(statBtn, attackBtn, itemBtn));

  return [container1, container2, container3];
}

function buildAttackMenu(state, index = 0) {
  const attacks = state.player.attacks || [];
  if (!attacks.length) {
    return new ContainerBuilder()
      .setAccentColor(0x808080)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## You do not have any attacks available.'));
  }
  const total = attacks.length;
  const wrappedIndex = ((index % total) + total) % total;
  state.attackMenuIndex = wrappedIndex;
  const attack = attacks[wrappedIndex];
  const description = attack.description || 'No description provided.';
  const energyCost = attack.energyCost ?? 0;
  const header =
    `## ${state.userMention} Choose an action!` +
    `\n### ${attack.name} - ${energyCost} ${ENERGY_EMOJI}` +
    `\n-# ${description}`;
  const container = new ContainerBuilder()
    .setAccentColor(0x808080)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header));

  const useBtn = new ButtonBuilder()
    .setCustomId(`pvp-attack-use:${state.messageId}:${wrappedIndex}`)
    .setLabel('Use')
    .setStyle(ButtonStyle.Success);
  const prevBtn = new ButtonBuilder()
    .setCustomId(`pvp-attack-nav:${state.messageId}:prev`)
    .setLabel('previous')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(total <= 1);
  const nextBtn = new ButtonBuilder()
    .setCustomId(`pvp-attack-nav:${state.messageId}:next`)
    .setLabel('next')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(total <= 1);

  container.addActionRowComponents(new ActionRowBuilder().addComponents(useBtn));
  container.addActionRowComponents(new ActionRowBuilder().addComponents(prevBtn, nextBtn));
  return container;
}

async function clearInteractionComponents(interaction) {
  await interaction.update({
    components: [],
  });
}

async function updateBattleMessage(state) {
  const containers = buildBattleContainers(state);
  await state.message.edit({
    components: containers,
    flags: MessageFlags.IsComponentsV2,
  });
}

function hasStun(entity) {
  const status = entity.statuses.stun;
  return Boolean(status && status.remaining > 0);
}

function getEnemyAttack(state) {
  const { enemy } = state;
  if (enemy.id === 'Krampus') {
    if (!enemy.flags.usedNightOfChains && enemy.health <= enemy.maxHealth * 0.5) {
      enemy.flags.usedNightOfChains = true;
      return 'nightOfChains';
    }
    if (!enemy.flags.usedIntoTheSack && enemy.health <= enemy.maxHealth * 0.1) {
      enemy.flags.usedIntoTheSack = true;
      return 'intoTheSack';
    }
    const attacks = ['naughtyList', 'chainLash', 'hoofStomp', 'bellsOfDread'];
    return attacks[Math.floor(Math.random() * attacks.length)];
  }
  return 'basic';
}

function performEnemyAttack(state, attackId) {
  const { enemy, player } = state;
  const logs = [];
  switch (attackId) {
    case 'naughtyList': {
      const dealt = applyDamage(player, 25);
      logs.push(
        `${enemy.name} has used Naughty List on ${player.name}, dealing ${dealt} ${HEALTH_EMOJI} and inflicting Withered!`,
      );
      logs.push(...applyWithered(player, 1));
      break;
    }
    case 'chainLash': {
      const dealt = applyDamage(player, 10);
      logs.push(`${enemy.name} lashes ${player.name} with chains, dealing ${dealt} ${HEALTH_EMOJI}.`);
      const stunResult = applyStun(player, 1);
      if (stunResult.applied) {
        logs.push(`-# ${player.name} is stunned for 1 round.`);
      } else if (stunResult.reason === 'immune') {
        logs.push(stunResult.message || `-# ${player.name} is immune to Stun.`);
      }
      break;
    }
    case 'hoofStomp': {
      const damage = 10 + Math.floor(Math.random() * 11);
      const dealt = applyDamage(player, damage);
      logs.push(`${enemy.name} stomps ${player.name}, dealing ${dealt} ${HEALTH_EMOJI}.`);
      if (Math.random() < 0.25) {
        const stunResult = applyStun(player, 1);
        if (stunResult.applied) {
          logs.push(`-# ${player.name} is stunned for 1 round.`);
        } else if (stunResult.reason === 'immune') {
          logs.push(stunResult.message || `-# ${player.name} is immune to Stun.`);
        }
      }
      break;
    }
    case 'bellsOfDread': {
      const heal = Math.round(enemy.health * 0.05);
      enemy.health = Math.min(enemy.maxHealth, enemy.health + heal);
      enemy.defense += 5;
      logs.push(
        `${enemy.name} rings the Bells of Dread, restoring ${heal} ${HEALTH_EMOJI} and gaining 5 defense.`,
      );
      break;
    }
    case 'nightOfChains': {
      const dealt = applyDamage(player, 35);
      logs.push(
        `${enemy.name} unleashes Night of Chains on ${player.name}, dealing ${dealt} ${HEALTH_EMOJI}.`,
      );
      const stunResult = applyStun(player, 1);
      if (stunResult.applied) {
        logs.push(`-# ${player.name} is stunned for 1 round.`);
      } else if (stunResult.reason === 'immune') {
        logs.push(stunResult.message || `-# ${player.name} is immune to Stun.`);
      }
      logs.push(...applyWithered(player, 1));
      break;
    }
    case 'intoTheSack': {
      const dealt = applyDamage(player, 50);
      logs.push(
        `${enemy.name} hurls ${player.name} Into the Sack, dealing ${dealt} ${HEALTH_EMOJI}.`,
      );
      const stunResult = applyStun(player, 2);
      if (stunResult.applied) {
        logs.push(`-# ${player.name} is stunned for 2 rounds.`);
      } else if (stunResult.reason === 'immune') {
        logs.push(stunResult.message || `-# ${player.name} is immune to Stun.`);
      }
      break;
    }
    default: {
      const damage = Math.max(5, Math.round(getEffectiveDamage(enemy)));
      const dealt = applyDamage(player, damage);
      logs.push(`${enemy.name} attacks ${player.name}, dealing ${dealt} ${HEALTH_EMOJI}.`);
      break;
    }
  }
  return logs;
}

async function executeEnemyTurn(state) {
  state.turn = 'enemy';
  await updateBattleMessage(state);

  await delay(ACTION_COOLDOWN_MS);
  if (!isBattleActive(state)) return;

  const statusLogs = tickStatuses(state.enemy);
  if (statusLogs.length) {
    appendActionLog(state, statusLogs);
    await updateBattleMessage(state);
    if (!isBattleActive(state)) return;
  }
  if (state.enemy.health <= 0) {
    await handleBattleVictory(state);
    return;
  }
  if (hasStun(state.enemy)) {
    appendActionLog(state, `${state.enemy.name} is stunned and cannot move!`);
    await updateBattleMessage(state);
  } else {
    const attackId = getEnemyAttack(state);
    const logs = performEnemyAttack(state, attackId);
    appendActionLog(state, logs);
    if (state.player.health <= 0) {
      await updateBattleMessage(state);
      await handleBattleDefeat(state);
      return;
    }
    await updateBattleMessage(state);
  }

  if (!isBattleActive(state)) return;

  setActionCooldown(state, ACTION_COOLDOWN_MS);
  state.turn = 'player';
  state.round += 1;

  await delay(ACTION_COOLDOWN_MS);
  if (!isBattleActive(state)) return;

  state.actionMessage = 'Selecting an action...';
  await updateBattleMessage(state);
}

function createBattleState({ interaction, user, stats, animal, resources }) {
  const player = createPlayerState(user, stats);
  const enemy = createDefaultEnemy(animal);
  const message = interaction.message;
  return {
    message,
    messageId: message.id,
    channelId: message.channelId,
    userId: user.id,
    username: user.username,
    userMention: `${user}`,
    userAvatar: user.displayAvatarURL(),
    player,
    enemy,
    round: 1,
    actionMessage: 'Selecting an action...',
    attackMenuIndex: 0,
    turn: 'player',
    animal,
    resources,
    stats,
    cooldowns: {},
    cooldownTimeouts: {},
    inactivityTimeout: null,
    lastInteractionAt: Date.now(),
  };
}

async function startBossBattle({ interaction, user, stats, animal, resources }) {
  const state = createBattleState({ interaction, user, stats, animal, resources });
  battleStates.set(state.messageId, state);
  refreshInactivityTimer(state);
  const containers = buildBattleContainers(state);
  await interaction.update({
    components: containers,
    flags: MessageFlags.IsComponentsV2,
  });
}

function getRarityXpMultiplier(rarity) {
  switch (rarity) {
    case 'Common':
      return 1;
    case 'Rare':
      return 1.1;
    case 'Epic':
      return 1.4;
    case 'Legendary':
      return 2;
    case 'Mythical':
      return 3.5;
    case 'Godly':
      return 6;
    case 'Secret':
      return 10;
    default:
      return 1;
  }
}

async function handleBattleDespawn(state) {
  clearBattleTimeouts(state);
  const { animal } = state;
  const thumb = emojiToUrl(animal.emoji) ?? DEFAULT_SECTION_THUMB_URL;
  const section = new SectionBuilder().setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb));
  section.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${animal.name} despawned...`),
  );
  const container = new ContainerBuilder()
    .setAccentColor(0x000000)
    .addSectionComponents(section);
  await state.message.edit({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  battleStates.delete(state.messageId);
}

async function handleBattleVictory(state) {
  clearBattleTimeouts(state);
  const { resources, userId, stats, animal } = state;
  const user = await resources.client.users.fetch(userId);
  normalizeInventory(stats);
  stats.hunt_success = (stats.hunt_success || 0) + 1;
  if (!stats.hunt_discover) stats.hunt_discover = [];
  if (!stats.hunt_discover.includes(animal.id)) stats.hunt_discover.push(animal.id);
  const inv = stats.inventory || (stats.inventory = []);
  const willExceed = getInventoryCount(stats) + 1 > MAX_ITEMS;
  if (!willExceed) {
    const existing = inv.find(entry => entry.id === animal.id);
    const baseItem = ITEMS[animal.id] || {
      id: animal.id,
      name: animal.name,
      emoji: animal.emoji,
    };
    if (existing) existing.amount += 1;
    else inv.push({ ...baseItem, amount: 1 });
  }
  const xp = Math.floor(100 * getRarityXpMultiplier(animal.rarity));
  await resources.addXp(user, xp, resources.client);
  resources.saveData();
  const container = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${user}, you have hunted a **${animal.name} ${animal.emoji || ''}** after a fierce battle!` +
          `\n-# You gained **${xp} XP**` +
          (willExceed
            ? '\n-# Your inventory was full, the reward could not be added.'
            : ''),
      ),
    );
  await state.message.edit({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  battleStates.delete(state.messageId);
}

async function handleBattleDefeat(state) {
  clearBattleTimeouts(state);
  const { resources, userId, animal } = state;
  const user = await resources.client.users.fetch(userId);
  const thumb = emojiToUrl(animal.emoji) ?? DEFAULT_SECTION_THUMB_URL;
  const section = new SectionBuilder().setThumbnailAccessory(
    new ThumbnailBuilder().setURL(thumb),
  );
  section.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${user} you have failed to fight agaisnt ${animal.name}!\n-# You died`,
    ),
  );
  const container = new ContainerBuilder()
    .setAccentColor(0x000000)
    .addSectionComponents(section);
  await state.message.edit({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  battleStates.delete(state.messageId);
  await resources.saveData();
  await handleDeath(user, 'hunting', resources);
}

async function handleAttack(interaction) {
  const [, messageId] = interaction.customId.split(':');
  const state = battleStates.get(messageId);
  if (!state || state.userId !== interaction.user.id) return;
  refreshInactivityTimer(state);
  if (isActionOnCooldown(state)) {
    await interaction.reply({
      content: 'You must wait before taking another action.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const statusLogs = tickStatuses(state.player);
  if (statusLogs.length) {
    appendActionLog(state, statusLogs);
    await updateBattleMessage(state);
  }
  if (state.player.health <= 0) {
    await handleBattleDefeat(state);
    await interaction.reply({ content: 'You succumbed to your debuffs!', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!state.player.attacks.length) {
    await interaction.reply({
      content: 'You do not have any attacks available.',
      flags: MessageFlags.Ephemeral,
    });
    appendActionLog(state, `${state.username} has no attacks available.`);
    await updateBattleMessage(state);
    await executeEnemyTurn(state);
    return;
  }
  if (hasStun(state.player)) {
    appendActionLog(state, `${state.username} tried to attack but failed.`);
    await updateBattleMessage(state);
    await interaction.reply({
      content: 'You are stunned and cannot move!',
      flags: MessageFlags.Ephemeral,
    });
    await executeEnemyTurn(state);
    return;
  }
  const menu = buildAttackMenu(state, state.attackMenuIndex || 0);
  await interaction.reply({
    components: [menu],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  });
}

async function handleAttackNavigation(interaction) {
  const [, messageId, direction] = interaction.customId.split(':');
  const state = battleStates.get(messageId);
  if (!state || state.userId !== interaction.user.id) return;
  refreshInactivityTimer(state);
  const attacks = state.player.attacks || [];
  if (!attacks.length) {
    await clearInteractionComponents(interaction);
    return;
  }
  const total = attacks.length;
  const current = state.attackMenuIndex || 0;
  if (direction === 'prev') {
    state.attackMenuIndex = (current - 1 + total) % total;
  } else {
    state.attackMenuIndex = (current + 1) % total;
  }
  const menu = buildAttackMenu(state, state.attackMenuIndex);
  await interaction.update({ components: [menu], flags: MessageFlags.IsComponentsV2 });
}

async function handleAttackUse(interaction) {
  const [, messageId, indexStr] = interaction.customId.split(':');
  const state = battleStates.get(messageId);
  if (!state || state.userId !== interaction.user.id) return;
  refreshInactivityTimer(state);
  if (isActionOnCooldown(state)) {
    await interaction.reply({
      content: 'You must wait before taking another action.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const index = Number.parseInt(indexStr, 10);
  if (Number.isNaN(index)) return;
  const attacks = state.player.attacks || [];
  const attack = attacks[index];
  if (!attack) {
    await clearInteractionComponents(interaction);
    return;
  }
  if (hasStun(state.player)) {
    appendActionLog(state, `${state.username} tried to attack but failed.`);
    await clearInteractionComponents(interaction);
    await updateBattleMessage(state);
    await executeEnemyTurn(state);
    return;
  }
  const energyCost = attack.energyCost ?? 0;
  if (state.player.energy < energyCost) {
    await interaction.reply({
      content: 'You do not have enough energy to use this attack.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  state.player.energy -= energyCost;
  state.attackMenuIndex = index;
  setActionCooldown(state, ACTION_COOLDOWN_MS);
  const baseDamage = Math.max(1, attack.damage + state.player.damageBuff);
  const dealt = applyDamage(state.enemy, baseDamage);
  const shieldDamage = attack.shieldDamage || 0;
  if (shieldDamage) reduceDefense(state.enemy, shieldDamage);
  const logs = [`${state.username} has used ${attack.name} and dealt ${dealt} ${HEALTH_EMOJI}.`];
  if (shieldDamage) {
    logs.push(`-# ${state.enemy.name} loses ${shieldDamage} defense.`);
  }
  appendActionLog(state, logs);
  await clearInteractionComponents(interaction);
  await updateBattleMessage(state);
  if (state.enemy.health <= 0) {
    await handleBattleVictory(state);
    return;
  }
  await executeEnemyTurn(state);
}

async function handleStat(interaction) {
  const [, messageId] = interaction.customId.split(':');
  const state = battleStates.get(messageId);
  if (!state || state.userId !== interaction.user.id) return;
  refreshInactivityTimer(state);
  const enemy = state.enemy;
  const immune = enemy.immunities.length ? enemy.immunities.join(', ') : 'None';
  const container = new ContainerBuilder()
    .setAccentColor(0x808080)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${enemy.name} Status:\n-# Defese: ${getEffectiveDefense(enemy).toFixed(2)} ${DEFENSE_EMOJI}` +
          `\n-# Damage buff: ${enemy.damageBuff >= 0 ? '+' : ''}${enemy.damageBuff.toFixed(2)} ${DAMAGE_EMOJI}` +
          `\n-# Debuff: ${formatDebuffLine(enemy)}\n-# Immune: ${immune}`,
      ),
    );
  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  });
}

async function handleItem(interaction) {
  const [, messageId] = interaction.customId.split(':');
  const state = battleStates.get(messageId);
  if (!state || state.userId !== interaction.user.id) return;
  refreshInactivityTimer(state);
  if (isActionOnCooldown(state)) {
    await interaction.reply({
      content: 'You must wait before taking another action.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const container = new ContainerBuilder()
    .setAccentColor(0x808080)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## You have no usable items.'));
  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  });
}

function setup(client, resources) {
  const bossAnimals = ANIMALS.filter(a => BOSS_IDS.has(a.id));
  const command = new SlashCommandBuilder()
    .setName('pvp-start')
    .setDescription('Start a boss battle for testing')
    .addStringOption(option => {
      option.setName('monster').setDescription('Boss to fight').setRequired(false);
      for (const animal of bossAnimals) {
        option.addChoices({ name: animal.name, value: animal.id });
      }
      return option;
    });
  client.application.commands.create(command);

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId.startsWith('pvp-attack-use:')) {
          await handleAttackUse(interaction);
        } else if (interaction.customId.startsWith('pvp-attack-nav:')) {
          await handleAttackNavigation(interaction);
        } else if (interaction.customId.startsWith('pvp-attack:')) {
          await handleAttack(interaction);
        } else if (interaction.customId.startsWith('pvp-stat:')) {
          await handleStat(interaction);
        } else if (interaction.customId.startsWith('pvp-item:')) {
          await handleItem(interaction);
        }
      } else if (interaction.isChatInputCommand() && interaction.commandName === 'pvp-start') {
        const monster = interaction.options.getString('monster');
        const selected = bossAnimals.find(a => a.id === monster) || bossAnimals[0];
        const stats =
          resources.userStats[interaction.user.id] || (resources.userStats[interaction.user.id] = { inventory: [] });
        const message = await interaction.reply({ content: 'Starting battle...', fetchReply: true });
        await startBossBattle({
          interaction: {
            message,
            update: options => message.edit(options),
          },
          user: interaction.user,
          stats,
          animal: selected,
          resources,
        });
      }
    } catch (err) {
      if (err.code !== 10062) console.error(err);
    }
  });
}

module.exports = { isBossAnimal, startBossBattle, setup };
