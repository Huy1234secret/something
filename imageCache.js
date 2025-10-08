const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, 'image-cache');

async function loadCachedImage(url) {
  if (!url) return null;
  const fsPromises = fs.promises;
  const hash = crypto.createHash('md5').update(url).digest('hex');
  let ext = '.png';
  try {
    const pathname = new URL(url).pathname;
    const extname = path.extname(pathname);
    if (extname) ext = extname;
  } catch {
    // ignore
  }
  const filePath = path.join(CACHE_DIR, `${hash}${ext}`);
  try {
    await fsPromises.access(filePath);
    return loadImage(filePath);
  } catch {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      await fsPromises.mkdir(CACHE_DIR, { recursive: true });
      await fsPromises.writeFile(filePath, Buffer.from(arrayBuffer));
      return loadImage(filePath);
    } catch {
      return loadImage(url);
    }
  }
}

const DISCORD_EMOJI_REGEX = /^<(a?):[a-zA-Z0-9_]+:(\d+)>$/;

async function loadEmojiImage(emoji) {
  if (typeof emoji !== 'string') return null;
  const match = emoji.trim().match(DISCORD_EMOJI_REGEX);
  if (!match) return null;
  const [, animatedFlag, id] = match;
  const ext = animatedFlag === 'a' ? 'gif' : 'png';
  const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=128&quality=lossless`;
  return loadCachedImage(url);
}

module.exports = { loadCachedImage, loadEmojiImage };
