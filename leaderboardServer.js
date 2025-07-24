const path = require('path');
const express = require('express');
const { SystemsManager } = require('./systems.js');

const app = express();
const port = process.env.LEADERBOARD_WEB_PORT || 3000;
const dbFile = path.resolve(__dirname, 'database.db');

const systems = new SystemsManager(dbFile);

function getLeaderboardData(guildId, limit = 10) {
  try {
    return systems.getLeaderboard(guildId, limit);
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    return [];
  }
}

app.get('/', (req, res) => {
  res.redirect('/leaderboard');
});

app.get('/leaderboard', (req, res) => {
  const guildId = req.query.guildId || process.env.DEFAULT_LEADERBOARD_GUILD_ID;
  if (!guildId) {
    return res.status(400).send('No guildId specified.');
  }
  const data = getLeaderboardData(guildId, 10);
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Leaderboard</title>';
  html += '<style>body{font-family:Arial, sans-serif;}table{border-collapse:collapse;width:60%;margin:auto;}th,td{border:1px solid #ccc;padding:8px;text-align:center;}th{background:#f0f0f0;}h1{text-align:center;}</style>';
  html += '</head><body>';
  html += '<h1>Server Leaderboard</h1>';
  html += '<table><tr><th>Rank</th><th>User ID</th><th>Level</th><th>XP</th></tr>';
  data.forEach((row, idx) => {
    html += `<tr><td>${idx + 1}</td><td>${row.userId}</td><td>${row.level}</td><td>${row.xp}</td></tr>`;
  });
  html += '</table></body></html>';
  res.send(html);
});

app.listen(port, () => {
  console.log(`Leaderboard website running on port ${port}`);
});
