// Use @napi-rs/canvas for better compatibility with recent Node versions
const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * Generate a level card image for a user.
 * @param {Object} data - Card data
 * @param {string} data.username - Username to display
 * @param {string} data.avatarURL - Avatar URL
 * @param {number} data.level - Current level
 * @param {number} data.xp - Current XP
 * @param {number} data.xpNeeded - XP needed for next level
 * @param {string} data.xpToNextDisplay - Display string for XP to next level
 * @param {number} data.rank - User's rank
 * @param {string} [data.highestRoleName] - Highest level role name
 * @param {number} data.progressPercentage - Progress percentage towards next level
 * @param {string} [data.levelIconUrl] - Optional URL for level icon
 * @returns {Promise<Buffer>} PNG buffer
 */
function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

async function generateLevelCard(data) {
    const width = 900;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Vibrant background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#4e54c8');
    gradient.addColorStop(1, '#8f94fb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Semi-transparent inner panel for smoother look
    ctx.save();
    drawRoundedRect(ctx, 20, 20, width - 40, height - 40, 25);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.restore();

    // Optional level icon in top-right
    if (data.levelIconUrl) {
        try {
            const levelImg = await loadImage(data.levelIconUrl);
            const iconSize = 90;
            ctx.drawImage(levelImg, width - iconSize - 40, 40, iconSize, iconSize);
        } catch (e) {
            // Ignore loading errors
        }
    }

    // Avatar with circular crop and outline
    try {
        const avatar = await loadImage(data.avatarURL);
        const avatarSize = 170;
        const avatarX = 60;
        const avatarY = height / 2 - avatarSize / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Outline ring
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();
    } catch (e) {
        // ignore avatar load errors
    }

    const textX = 260;

    // Username and stats
    ctx.font = 'bold 40px Sans';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(data.username, textX, 80);

    ctx.font = '28px Sans';
    ctx.fillStyle = '#cce2ff';
    ctx.fillText(`Level ${data.level}`, textX, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Sans';
    ctx.fillText(`Rank #${data.rank}`, textX, 160);
    if (data.highestRoleName) ctx.fillText(`Role: ${data.highestRoleName}`, textX, 200);
    ctx.fillText(`To Next: ${data.xpToNextDisplay}`, textX, 240);

    // Progress bar with rounded edges
    const barX = textX;
    const barWidth = width - barX - 60;
    const barHeight = 30;
    const barY = height - 60;
    ctx.save();
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();
    ctx.restore();

    const progress = Math.min(1, Math.max(0, data.progressPercentage / 100));
    ctx.save();
    drawRoundedRect(ctx, barX, barY, barWidth * progress, barHeight, barHeight / 2);
    const barGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    barGradient.addColorStop(0, '#00c6ff');
    barGradient.addColorStop(1, '#0072ff');
    ctx.fillStyle = barGradient;
    ctx.fill();
    ctx.restore();

    const progressText = `${data.xp.toLocaleString()} / ${data.xpNeeded > 0 ? data.xpNeeded.toLocaleString() : '-'} (${data.progressPercentage.toFixed(1)}%)`;
    ctx.font = '20px Sans';
    ctx.fillStyle = '#ffffff';
    const textWidth = ctx.measureText(progressText).width;
    ctx.fillText(progressText, barX + (barWidth - textWidth) / 2, barY + barHeight / 1.7);

    return canvas.toBuffer('image/png');
}

module.exports = { generateLevelCard };
