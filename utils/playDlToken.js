const play = require('play-dl');

// Fallback cookie used when YT_COOKIE env variable is not provided
const defaultCookie = 'SID=g.a000zQj5D7Z0Z9x037QE_AGNEDAdp1OnrypLt_nPpCMegw9mi92hbcaNrPINuN6Opp2zcF4MbQACgYKAYwSARASFQHGX2MiE9BUhbiTBZigYlJStP-C_BoVAUF8yKr0807F-t93GI11s9qSd_Ig0076; HSID=Axzqy65PdufuUx4vv; SSID=AYH3ihpBSNN9fIhya; APISID=6Hr7gb24i8afWjS3/ASqFfWrxnhzyGjZts; SAPISID=Toi2BQEtoKzsPKsb/A3VXYHQ8523zxcZ6y; LOGIN_INFO=AFmmF2swRQIhAIPH1aoDEzX-cv1lIztu2DmCana9HHgRTU7Y8LFHWVuHAiB_RG6kH3FS20-0g2RkUZYxphvWgPlnYODS1Hpw3qG20A:QUQ3MjNmeGVUc2tJMW9BVm5qOUg4RmRFOU5HaF9IUGZpNHk1SFFYTlVBLUtxS1JFekl4b1hzNk9KSjFsMjcxcEM4RFFFQkpYZk55cWRfTTFTODdSOHY3Tng5aUVhOF9LODRpbmFIZjJ2RmZSanpXQnBlemRXNDZ1YlpHdVdXT2g1aWRrTXVLT0hYbk54SUtoREV6TWprb0NRZ0xvR2Ezdkd3;';

function applyPlayDlCookie() {
    const cookie = process.env.YT_COOKIE || defaultCookie;
    if (cookie) {
        try {
            play.setToken({ youtube: { cookie } });
            console.log('play-dl cookie applied');
        } catch (err) {
            console.error('Failed to apply play-dl cookie:', err);
        }
    }
}

module.exports = { applyPlayDlCookie };
