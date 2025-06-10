const express = require('express');
const crypto = require('crypto');

function verifySignature(secret, payload, signature) {
    if (!secret || !signature) return false;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const digest = 'sha256=' + hmac.digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
        return false;
    }
}

function startGitHubWebhookServer(client, options = {}) {
    const app = express();
    const port = options.port || process.env.GITHUB_WEBHOOK_PORT || 3001;
    const secret = options.secret || process.env.GITHUB_WEBHOOK_SECRET;
    const channelId = options.channelId || process.env.GITHUB_CHANNEL_ID;

    app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

    app.post('/github-webhook', (req, res) => {
        const signature = req.headers['x-hub-signature-256'];
        if (!verifySignature(secret, req.rawBody, signature)) {
            return res.status(401).send('Invalid signature');
        }

        if (req.headers['x-github-event'] === 'push') {
            const { pusher, repository, commits, ref } = req.body;
            const commitMessages = commits.map(c => `[\`${c.id.substring(0,7)}\`](${c.url}) - ${c.message.split('\n')[0]} (by ${c.author.name})`).join('\n');
            const content = `**${pusher.name}** pushed to **${repository.name}** (${ref}):\n${commitMessages}`;
            if (client && channelId) {
                client.channels.fetch(channelId).then(ch => ch.send(content)).catch(console.error);
            }
        }
        res.sendStatus(200);
    });

    app.listen(port, () => {
        console.log(`GitHub webhook server listening on port ${port}`);
    });
}

module.exports = { startGitHubWebhookServer };
