const http = require('http');
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
    const port = options.port || process.env.GITHUB_WEBHOOK_PORT || 3001;
    const secret = options.secret || process.env.GITHUB_WEBHOOK_SECRET;
    const channelId = options.channelId || process.env.GITHUB_CHANNEL_ID;

    const server = http.createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== '/github-webhook') {
            res.statusCode = 404;
            return res.end('Not found');
        }

        let data = '';
        req.on('data', chunk => {
            data += chunk;
        });

        req.on('end', () => {
            const signature = req.headers['x-hub-signature-256'];
            if (!verifySignature(secret, data, signature)) {
                res.statusCode = 401;
                return res.end('Invalid signature');
            }

            if (req.headers['x-github-event'] === 'push') {
                try {
                    const body = JSON.parse(data);
                    const { pusher, repository, commits, ref } = body;
                    const commitMessages = commits
                        .map(c => `[\`${c.id.substring(0,7)}\`](${c.url}) - ${c.message.split('\n')[0]} (by ${c.author.name})`)
                        .join('\n');
                    const content = `**${pusher.name}** pushed to **${repository.name}** (${ref}):\n${commitMessages}`;
                    if (client && channelId) {
                        client.channels.fetch(channelId)
                            .then(ch => ch.send(content))
                            .catch(console.error);
                    }
                } catch (err) {
                    console.error('Failed to handle push event:', err);
                }
            }

            res.statusCode = 200;
            res.end('OK');
        });
    });

    server.listen(port, () => {
        console.log(`GitHub webhook server listening on port ${port}`);
    });
}

module.exports = { startGitHubWebhookServer };
