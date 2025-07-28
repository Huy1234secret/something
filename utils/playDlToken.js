const play = require('play-dl');

function applyPlayDlCookie() {
    const cookie = process.env.YT_COOKIE;
    if (cookie) {
        try {
            play.setToken({ yt: { cookie } });
            console.log('play-dl cookie applied');
        } catch (err) {
            console.error('Failed to apply play-dl cookie:', err);
        }
    }
}

module.exports = { applyPlayDlCookie };
