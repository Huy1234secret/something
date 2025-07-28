const { execSync } = require('child_process');

function ensureLatestYtdlCore() {
    try {
        const installedVersion = require('ytdl-core/package.json').version;
        const latestVersion = execSync('npm view ytdl-core version').toString().trim();
        if (installedVersion !== latestVersion) {
            console.log(`Updating ytdl-core from ${installedVersion} to ${latestVersion}...`);
            execSync('npm install ytdl-core@latest', { stdio: 'inherit' });
            console.log('ytdl-core updated successfully.');
        }
    } catch (err) {
        console.error('Failed to update ytdl-core automatically:', err.message);
    }
}

module.exports = { ensureLatestYtdlCore };
