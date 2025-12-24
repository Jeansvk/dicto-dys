const fs = require('fs');

const INPUT = 'data/Lexique383.tsv';
const OUTPUT = 'data/Lexique383.json';

const lines = fs.readFileSync(INPUT, 'utf8').split('\n');
const headers = lines[0].split('\t');

const data = [];
for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split('\t');
    const row = {};
    headers.forEach((h, idx) => row[h] = cols[idx]);
    data.push(row);
}

fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
console.log(`✅ ${data.length} entrées converties → ${OUTPUT}`);




