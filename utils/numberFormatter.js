function formatNumber(value) {
    const scales = [
        ['K', 1e3],
        ['M', 1e6],
        ['B', 1e9],
        ['T', 1e12],
        ['Qa', 1e15],
        ['Qi', 1e18],
        ['Sx', 1e21],
        ['Sp', 1e24],
        ['Oc', 1e27],
        ['No', 1e30],
        ['Dc', 1e33],
        ['Ud', 1e36],
        ['Dd', 1e39],
        ['Td', 1e42],
        ['Qad', 1e45],
        ['Qid', 1e48],
        ['Sxd', 1e51],
        ['Spd', 1e54],
        ['Ocd', 1e57],
        ['Nod', 1e60],
        ['Vg', 1e63],
        ['Uvg', 1e66],
        ['Dvg', 1e69],
        ['Tvg', 1e72],
        ['Qavg', 1e75],
        ['Qivg', 1e78],
        ['Sxvg', 1e81],
        ['Spvg', 1e84],
        ['Ocvg', 1e87],
        ['Novg', 1e90]
    ];
    const absValue = Math.abs(value);
    for (let i = scales.length - 1; i >= 0; i--) {
        const [abbr, factor] = scales[i];
        if (absValue >= factor) {
            return (value / factor).toFixed(2).replace(/\.00$/, '') + abbr;
        }
    }
    return value.toLocaleString();
}

function parseAbbreviatedNumber(str) {
    if (typeof str !== 'string') return NaN;
    const cleaned = str.replace(/,/g, '').trim().toLowerCase();
    const match = cleaned.match(/^(-?\d+(?:\.\d+)?)([a-z]*)$/i);
    if (!match) return NaN;
    let [, numStr, suffix] = match;
    let num = parseFloat(numStr);
    if (isNaN(num)) return NaN;
    const multipliers = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
    if (suffix && multipliers[suffix]) num *= multipliers[suffix];
    return Math.floor(num);
}

module.exports = { formatNumber, parseAbbreviatedNumber };
