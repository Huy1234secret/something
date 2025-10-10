function isChristmasEventActive(now = new Date()) {
  const year = now.getFullYear();
  const seasonStart = new Date(Date.UTC(year, 11, 1, -7, 0, 0, 0));
  return now >= seasonStart;
}

module.exports = { isChristmasEventActive };
