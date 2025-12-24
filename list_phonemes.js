const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/lexique_filtre.json', 'utf8'));

const allChars = new Set();

data.forEach(entry => {
    if (entry.phon) {
        for (const char of entry.phon) {
            allChars.add(char);
        }
    }
});

const sorted = [...allChars].sort();
console.log(`${sorted.length} caractères phonétiques trouvés :\n`);
console.log(sorted.join('  '));




