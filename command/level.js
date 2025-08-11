const { xpNeeded } = require('../util');

async function sendLevelCard(user, send, data) {
  const stats = data.user_stats[user.id] || { level: 1, xp: 0, total_xp: 0 };
  await send(`Level: ${stats.level} (XP: ${stats.xp}/${xpNeeded(stats.level)})`);
}

module.exports = { sendLevelCard };
