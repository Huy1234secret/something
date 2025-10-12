// image-shop-christmas.js
// Node.js image script for a 3-card Christmas Shop using node-canvas
// Install: npm i canvas
// Usage (Discord.js v14+ example):
// const buffer = await renderChristmasShop([ {name:"", price:"", info:"", stock:"", img:"" }, {}, {} ]);
// await interaction.reply({ files: [{ attachment: buffer, name: 'christmas-shop.png' }] });

const { createCanvas, loadImage /*, registerFont*/ } = require('canvas');
const { loadEmojiImage } = require('./imageCache');

// (Optional) register your custom fonts if you have .ttf files:
// registerFont('./fonts/LuckiestGuy-Regular.ttf', { family: 'Luckiest' });
// registerFont('./fonts/NunitoSans-Regular.ttf', { family: 'Nunito' });

/**
 * Renders a Christmas-themed shop image with 3 cards.
 * Pass up to 3 items. Leave fields empty; you will fill them in your bot.
 * @param {Array<{name?:string, price?:string|number, info?:string, stock?:string|number, img?:string|Buffer}>} items
 * @returns {Promise<Buffer>}
 */
async function renderChristmasShop(items = []) {
  const W = 1400, H = 620;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ---------- Helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toMoney = (v) => (v === undefined || v === null || v === '') ? '' :
    (typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g,'')))
      .toLocaleString();

  function roundedRect(x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function drawShadow(fn, blur=18, color='rgba(0,0,0,.28)', offsetY=6, offsetX=0) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = offsetY;
    ctx.shadowOffsetX = offsetX;
    fn();
    ctx.restore();
  }

  function wrapText(text, x, y, maxWidth, lineHeight, maxLines=3) {
    if (!text) return 0;
    const words = String(text).split(/\s+/);
    let line = '', lines = 0, cy = y;
    for (let n=0; n<words.length; n++) {
      const test = line ? line + ' ' + words[n] : words[n];
      const w = ctx.measureText(test).width;
      if (w > maxWidth && n>0) {
        ctx.fillText(line, x, cy);
        lines++; cy += lineHeight;
        if (lines >= maxLines-1 && n < words.length-1) {
          const rest = words.slice(n).join(' ');
          let clipped = rest;
          while (ctx.measureText(clipped + '…').width > maxWidth && clipped.length>0) {
            clipped = clipped.slice(0, -1);
          }
          ctx.fillText(clipped + '…', x, cy);
          return lines+1;
        }
        line = words[n];
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, cy);
    return lines+1;
  }

  async function drawImageFit(src, x, y, w, h) {
    if (!src) return false;
    try {
      if (typeof src === 'string') {
        const emojiImg = await loadEmojiImage(src);
        if (emojiImg) {
          const iw = emojiImg.width, ih = emojiImg.height;
          const scale = Math.min(w/iw, h/ih);
          const dw = iw*scale, dh = ih*scale;
          const dx = x + (w - dw)/2;
          const dy = y + (h - dh)/2;
          ctx.drawImage(emojiImg, dx, dy, dw, dh);
          return true;
        }
      }
      const img = await loadImage(src);
      const iw = img.width, ih = img.height;
      const scale = Math.min(w/iw, h/ih);
      const dw = iw*scale, dh = ih*scale;
      const dx = x + (w - dw)/2;
      const dy = y + (h - dh)/2;
      ctx.drawImage(img, dx, dy, dw, dh);
      return true;
    } catch {
      return false;
    }
  }

  // ---------- Background (Night sky gradient + vignette) ----------
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a1a2b');
  grad.addColorStop(1, '#16324f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Snowy ground
  ctx.fillStyle = '#e9f6ff';
  roundedRect(-20, H-140, W+40, 200, 70);
  ctx.fill();

  // Falling snow particles
  ctx.save();
  for (let i=0;i<200;i++){
    const r = Math.random()*2.2+0.6;
    ctx.globalAlpha = Math.random()*0.7+0.2;
    ctx.beginPath();
    ctx.arc(Math.random()*W, Math.random()*H, r, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  ctx.restore();

  // String lights at top
  const strandY = 70;
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#2a3e57';
  ctx.beginPath();
  ctx.moveTo(20, strandY);
  for (let x=20; x<W-20; x+=140) {
    ctx.quadraticCurveTo(x+70, strandY+30, x+140, strandY);
  }
  ctx.stroke();

  const bulbColors = ['#ff3b3b','#ffd93b','#7cf37c','#5ad1ff','#ff6ad5'];
  for (let x=40; x<W-40; x+=55) {
    const y = strandY + (Math.sin(x/80)*22) + 6;
    const c = bulbColors[(Math.floor(x/55))%bulbColors.length];
    drawShadow(()=>{
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI*2);
      ctx.fillStyle = c;
      ctx.fill();
    }, 12, c, 0, 0);
  }

  // Title ribbon
  drawShadow(()=>{
    roundedRect(W/2-280, 18, 560, 64, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
  }, 18, 'rgba(0,0,0,.35)', 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Segoe UI", "Nunito", Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎄 Christmas Shop 🎁', W/2, 60);

  // Garland dividers
  const garlandY = 108;
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2e5a3a';
  ctx.beginPath();
  ctx.moveTo(40, garlandY);
  ctx.lineTo(W-40, garlandY);
  ctx.stroke();
  for (let x=50; x<W-50; x+=32) {
    ctx.beginPath();
    ctx.moveTo(x, garlandY);
    ctx.lineTo(x-8, garlandY+16);
    ctx.lineTo(x+8, garlandY+16);
    ctx.closePath();
    ctx.fillStyle = '#3b7f4c';
    ctx.fill();
  }

  // ---------- Cards layout ----------
  const CARD_W = 400, CARD_H = 420, GAP = 40;
  const startX = (W - (CARD_W*3 + GAP*2)) / 2;
  const startY = 150;

  // Decorative corner candy canes
  function candyCane(x,y,scale=1,flip=false){
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1,1);
    ctx.scale(scale, scale);
    // hook
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 26, Math.PI*0.15, Math.PI*1.2);
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#ff4b4b';
    for(let a=0;a<Math.PI*1.2;a+=Math.PI/6){
      ctx.beginPath();
      ctx.arc(0,0,26, a, a+Math.PI/12);
      ctx.stroke();
    }
    // stick
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(25,15);
    ctx.lineTo(25, 90);
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#ff4b4b';
    for(let y=26;y<90;y+=18){
      ctx.beginPath();
      ctx.moveTo(19,y);
      ctx.lineTo(31,y+10);
      ctx.stroke();
    }
    ctx.restore();
  }
  candyCane(36, 28, 0.9, false);
  candyCane(W-36, 28, 0.9, true);

  // Draw the three cards
  ctx.textAlign = 'left';
  for (let i=0;i<3;i++){
    const x = startX + i*(CARD_W + GAP);
    const y = startY;

    // Card container with frosty glass
    drawShadow(()=>{
      roundedRect(x, y, CARD_W, CARD_H, 26);
      const g = ctx.createLinearGradient(x, y, x, y+CARD_H);
      g.addColorStop(0, 'rgba(255,255,255,0.22)');
      g.addColorStop(1, 'rgba(255,255,255,0.08)');
      ctx.fillStyle = g;
      ctx.fill();
    }, 20, 'rgba(0,0,0,.35)', 10);

    // Frosted border
    roundedRect(x+3, y+3, CARD_W-6, CARD_H-6, 22);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.stroke();

    // Header strip (red/green gradient)
    roundedRect(x+12, y+12, CARD_W-24, 56, 14);
    const hg = ctx.createLinearGradient(x, y, x+CARD_W, y);
    hg.addColorStop(0, '#c21f32');
    hg.addColorStop(1, '#167a3a');
    ctx.fillStyle = hg;
    ctx.fill();

    // Item name (placeholder)
    const item = items[i] || {};
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Segoe UI", "Nunito", Arial';
    const name = item.name && String(item.name).trim().length ? String(item.name) : 'Item Name';
    const nameMax = CARD_W - 24*2;
    let displayName = name;
    while (ctx.measureText(displayName).width > nameMax && displayName.length > 0) {
      displayName = displayName.slice(0,-1);
    }
    ctx.fillText(displayName, x+24, y+48);

    // Image area
    const IMG_X = x+40, IMG_Y = y+88, IMG_W = CARD_W-80, IMG_H = 190;

    // snowy shelf under image
    ctx.fillStyle = '#ffffff';
    drawShadow(()=>{
      roundedRect(IMG_X-10, IMG_Y+IMG_H+10, IMG_W+20, 16, 8);
      ctx.fill();
    }, 10, 'rgba(0,0,0,.18)', 3);

    // Try to draw item image; else draw placeholder frame
    /* eslint-disable no-await-in-loop */
    const drew = await drawImageFit(item.img, IMG_X, IMG_Y, IMG_W, IMG_H);
    if (!drew) {
      ctx.save();
      roundedRect(IMG_X, IMG_Y, IMG_W, IMG_H, 16);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.setLineDash([10,8]);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = 'italic 20px "Segoe UI", Arial';
      const ph = 'Place item image here';
      const tw = ctx.measureText(ph).width;
      ctx.fillText(ph, IMG_X + (IMG_W-tw)/2, IMG_Y + IMG_H/2 + 8);
      ctx.restore();
    }

    // Info block
    const INFO_X = x+24, INFO_Y = IMG_Y + IMG_H + 46, INFO_W = CARD_W - 48;

    // Price + stock row
    ctx.font = 'bold 26px "Segoe UI", "Nunito", Arial';
    ctx.fillStyle = '#fff';
    const currencyLabel = item.currency ? String(item.currency).trim() : '';
    const priceValue =
      item.price !== undefined && item.price !== null && item.price !== ''
        ? toMoney(item.price)
        : '';
    const priceSuffix = priceValue && currencyLabel ? ` ${currencyLabel}` : currencyLabel;
    const priceStr = priceValue ? `${priceValue}${priceSuffix}` : currencyLabel || 'Price';
    ctx.fillText(`💰 ${priceStr}`, INFO_X, INFO_Y);

    ctx.textAlign = 'right';
    const stockStr = item.stock !== undefined && item.stock !== null && item.stock !== '' ? `Stock: ${item.stock}` : 'Stock: —';
    ctx.fillText(stockStr, INFO_X + INFO_W, INFO_Y);

    // Info text
    ctx.textAlign = 'left';
    ctx.font = '20px "Segoe UI", "Nunito", Arial';
    ctx.fillStyle = '#eaf7ff';
    const info = item.info && String(item.info).trim().length ? String(item.info) : 'Short item information goes here.';
    wrapText(info, INFO_X, INFO_Y + 30, INFO_W, 26, 3);

    // Snowflake sticker
    ctx.save();
    ctx.translate(x+CARD_W-44, y+20);
    ctx.globalAlpha = 0.9;
    drawSnowflake(ctx, 0, 0, 16);
    ctx.restore();
  }

  // Footer note
  ctx.textAlign = 'center';
  ctx.font = '18px "Segoe UI", Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Tip: You can customize name, image, price, info, and stock in your command.', W/2, H-16);

  return canvas.toBuffer('image/png');

  // ---------- Snowflake helper ----------
  function drawSnowflake(ctx, cx, cy, r){
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    for (let a=0; a<6; a++){
      const angle = a * Math.PI/3;
      const x = cx + Math.cos(angle)*r;
      const y = cy + Math.sin(angle)*r;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      // branches
      const bx1 = cx + Math.cos(angle+0.25)* (r*0.55);
      const by1 = cy + Math.sin(angle+0.25)* (r*0.55);
      const bx2 = cx + Math.cos(angle-0.25)* (r*0.55);
      const by2 = cy + Math.sin(angle-0.25)* (r*0.55);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx1, by1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx2, by2); ctx.stroke();
    }
    ctx.restore();
  }
}

module.exports = { renderChristmasShop };
