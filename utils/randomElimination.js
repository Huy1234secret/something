const { EmbedBuilder } = require('discord.js');

const BLACK = '⬛';
const RED = '<:sno:1392188104202387647>';

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

function buildDescription(players) {
    return players
        .map(p => {
            if (p.red >= 5) {
                return `~~${p.member}~~ \`eliminated\``;
            }
            return `${p.member} ${RED.repeat(p.red)}${BLACK.repeat(5 - p.red)}`;
        })
        .join('\n');
}

async function startRandomElimination(channel, members, prize) {
    const players = members
        .filter(m => !m.user.bot)
        .map(m => ({ member: m.toString(), id: m.id, red: 0 }));

    if (players.length < 2) {
        await channel.send({ content: 'Not enough players to start the game.' });
        return;
    }

    let embed = new EmbedBuilder()
        .setTitle('Random Elimination')
        .setDescription(buildDescription(players))
        .setFooter({ text: `Prize: ${prize}` })
        .setColor('#ff0000');

    const message = await channel.send({ embeds: [embed] });

    while (players.filter(p => p.red < 5).length > 1) {
        await sleep(3000);
        const alive = players.filter(p => p.red < 5);
        const random = alive[Math.floor(Math.random() * alive.length)];
        random.red++;
        embed.setDescription(buildDescription(players));
        await message.edit({ embeds: [embed] });
    }

    const winner = players.find(p => p.red < 5);
    if (winner) {
        const winEmbed = new EmbedBuilder()
            .setTitle('We have a winner!')
            .setDescription(`${winner.member} wins ${prize}!`)
            .setColor('#00ff00');
        await channel.send({ embeds: [winEmbed] });
    } else {
        await channel.send({ content: 'No winner determined.' });
    }
}

module.exports = {
    startRandomElimination
};
