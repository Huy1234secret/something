const { execSync } = require('child_process');

function ensureOpus() {
    let opusLoaded = false;
    try {
        require.resolve('@discordjs/opus');
        opusLoaded = true;
    } catch {}
    if (!opusLoaded) {
        try {
            require.resolve('node-opus');
            opusLoaded = true;
        } catch {}
    }
    if (!opusLoaded) {
        try {
            require.resolve('opusscript');
            opusLoaded = true;
        } catch {}
    }
    if (!opusLoaded) {
        try {
            console.log('No Opus library found. Installing opusscript...');
            execSync('npm install opusscript', { stdio: 'inherit' });
            opusLoaded = true;
            console.log('opusscript installed successfully.');
        } catch (err) {
            console.error('Failed to install opusscript automatically:', err.message);
        }
    }
}

module.exports = { ensureOpus };
