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
async function generateLevelCard(data) {
    const width = 800;
    const height = 270;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#232526');
    gradient.addColorStop(1, '#414345');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Optional level icon in top-right
    if (data.levelIconUrl) {
        try {
            const levelImg = await loadImage(data.levelIconUrl);
            const iconSize = 80;
            ctx.drawImage(levelImg, width - iconSize - 20, 20, iconSize, iconSize);
        } catch (e) {
            // Ignore loading errors
        }
    }

    // Avatar circle
    try {
        const avatar = await loadImage(data.avatarURL);
        const avatarSize = 180;
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarSize / 2 + 30, height / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 30, height / 2 - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
    } catch (e) {
        // ignore avatar load errors
    }

    // Text styling
    ctx.font = 'bold 36px Sans';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(data.username, 240, 60);

    ctx.font = '26px Sans';
    ctx.fillStyle = '#aaccff';
    ctx.fillText(`Level ${data.level}`, 240, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = '22px Sans';
    ctx.fillText(`Rank #${data.rank}`, 240, 140);
    if (data.highestRoleName) ctx.fillText(`Role: ${data.highestRoleName}`, 240, 180);
    ctx.fillText(`To Next: ${data.xpToNextDisplay}`, 240, 220);

    // Progress bar
    const barX = 240;
    const barY = 230;
    const barWidth = 520;
    const barHeight = 25;
    ctx.fillStyle = '#555';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = '#00ff99';
    ctx.fillRect(barX, barY, (Math.min(100, Math.max(0, data.progressPercentage)) / 100) * barWidth, barHeight);

    const progressText = `${data.xp.toLocaleString()} / ${data.xpNeeded > 0 ? data.xpNeeded.toLocaleString() : '-'} (${data.progressPercentage.toFixed(1)}%)`;
    ctx.font = '18px Sans';
    ctx.fillStyle = '#000000';
    const textWidth = ctx.measureText(progressText).width;
    ctx.fillText(progressText, barX + (barWidth - textWidth) / 2, barY + barHeight - 6);

    return canvas.toBuffer('image/png');
}

module.exports = { generateLevelCard };
