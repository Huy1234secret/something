const cp = require('child_process');

function loadFishData(xlsxPath) {
    const shared = cp.execSync(`unzip -p "${xlsxPath}" xl/sharedStrings.xml`).toString('utf8');
    const sheet = cp.execSync(`unzip -p "${xlsxPath}" xl/worksheets/sheet1.xml`).toString('utf8');
    const htmlDecode = str => str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    const strings = [...shared.matchAll(/<t>(.*?)<\/t>/g)].map(m => htmlDecode(m[1]));
    const rowRegex = /<row r="(\d+)"[^>]*>(.*?)<\/row>/gs;
    const data = [];
    for (const match of sheet.matchAll(rowRegex)) {
        const num = parseInt(match[1]);
        if (num === 1) continue; // skip header
        const rowXml = match[2];
        const cellRegex = new RegExp(`<c r="([A-Z]+)${num}"([^>]*)>(?:<v>([^<]+)<\\/v>)?`, 'g');
        const row = {};
        let cell;
        while ((cell = cellRegex.exec(rowXml)) !== null) {
            const col = cell[1];
            const attrs = cell[2];
            let val = cell[3];
            if (/t="s"/.test(attrs)) val = strings[parseInt(val)];
            row[col] = val ? htmlDecode(val) : val;
        }
        if (row.A) {
            data.push({
                name: row.A,
                rarity: row.C,
                idPrefix: row.D,
                springChance: parseFloat(row.E) || 0,
                summerChance: parseFloat(row.F) || 0,
                autumnChance: parseFloat(row.G) || 0,
                winterChance: parseFloat(row.H) || 0,
                minWeight: parseFloat(row.K) || 0,
                maxWeight: parseFloat(row.L) || 0,
                durabilityLoss: parseFloat(row.N) || 0,
                powerReq: parseFloat(row.O) || 0,
                emoji: row.P
            });
        }
    }
    return data;
}
module.exports = { loadFishData };
