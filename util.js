function xpNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}
module.exports = { xpNeeded };
