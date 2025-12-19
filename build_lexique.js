const fs = require('fs');
const readline = require('readline');

// FICHIERS
const INPUT_LEXIQUE = 'data/Lexique383.tsv';
const INPUT_FILTRE = 'data/manulex_full.json';
const OUTPUT_FILE = 'data/lexique_filtre.json';

// TABLE DE CORRESPONDANCE STRICTE (Lexique383 -> Manulex)
const correspondance = {
    "ADJ": "ADJ",
    "ART:def": "DET", "ART:ind": "DET", "ADJ:pos": "DET", "ADJ:dem": "DET",
    "NOM": "NC",
    "PRO:per": "PRO", "PRO:dem": "PRO", "PRO:pos": "PRO", "PRO:rel": "PRO",
    "VER": "VER",
    // "AUX": "VER", // Toujours supprimé selon votre demande précédente
    "ADV": "ADV",
    "PRE": "PRE",
    "CON": "CON"
};

// TABLE DE CONVERSION : LEXIQUE3 -> FRANÇAIS INTUITIF
const mapPhonFr = {
    // Voyelles
    'a': 'a',
    'i': 'i',
    'e': 'é',  // blé
    'E': 'è',  // mer
    'o': 'o',  // mot
    'O': 'o',  // botte
    'u': 'ou', // genou
    'y': 'u',  // tu
    '°': 'e',  // le (schwa)
    '2': 'eu', // peu
    '9': 'eu', // peur

    // Nasales
    '@': 'an', // an
    '1': 'in', // un/in
    '§': 'on', // on
    '5': 'un', // un (brun)

    // Consonnes spéciales
    'S': 'ch', // chat
    'Z': 'j',  // je
    'R': 'r',
    'N': 'gn', // agneau
    'G': 'ng', // parking
    
    // Semi-voyelles
    'j': 'y',  // yeux
    '8': 'u',  // huit
    'w': 'ou', // oui

    // Consonnes standards
    'b':'b', 'd':'d', 'f':'f', 'g':'g', 'k':'k', 'l':'l', 
    'm':'m', 'n':'n', 'p':'p', 's':'s', 't':'t', 'v':'v', 'z':'z'
};

// Fonction de conversion SAMPA -> Français intuitif
function convertPhon(sampa) {
    if (!sampa) return '';
    return [...sampa].map(c => mapPhonFr[c] || c).join('');
}

async function processLexique() {
    console.time("Traitement");
    console.log("1. Chargement de Manulex...");

    // Chargement du JSON Manulex
    const manulexRaw = JSON.parse(fs.readFileSync(INPUT_FILTRE, 'utf8'));

    // Indexation intelligente : Map<ortho, Array<Objets>>
    // On stocke TOUTES les versions du mot (ex: 'orange' -> [ {synt:NC, ...}, {synt:ADJ, ...} ])
    const manulexMap = new Map();
    manulexRaw.forEach(item => {
        if (!manulexMap.has(item.ortho)) {
            manulexMap.set(item.ortho, []);
        }
        manulexMap.get(item.ortho).push(item);
    });

    console.log("2. Lecture de Lexique383 et croisement des données...");

    const fileStream = fs.createReadStream(INPUT_LEXIQUE);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const results = [];
    let headers = [];
    let isFirstLine = true;

    for await (const line of rl) {
        const columns = line.split('\t');

        if (isFirstLine) {
            headers = columns;
            isFirstLine = false;
            continue;
        }

        // Mapping des colonnes
        const row = {};
        headers.forEach((h, i) => row[h] = columns[i]);

        const motLexique = row['ortho'];
        const catLexique = row['cgram'];

        // 1. Si c'est un AUX, on saute (règle précédente)
        if (catLexique === 'AUX') continue;

        // 2. Vérifie si le mot existe dans Manulex
        if (manulexMap.has(motLexique)) {
            const candidatsManulex = manulexMap.get(motLexique);
            
            // 3. RECUPERATION DE LA BONNE CATEGORIE
            // On traduit la catégorie Lexique (ex: NOM) en catégorie Manulex (ex: NC)
            const catCible = correspondance[catLexique];

            // Si la catégorie n'est pas dans notre table (ex: ONO), on ignore
            if (!catCible) continue;

            // 4. LE MATCHING PRÉCIS
            // On cherche dans la liste Manulex l'entrée qui a EXACTEMENT la bonne catégorie (synt)
            // Cela garantit que 'orange' (NOM) ne prendra pas la fréquence de 'orange' (ADJ)
            const match = candidatsManulex.find(cand => cand.synt === catCible);

            if (match) {
                // Si on trouve le couple (Orthographe + Catégorie), on garde l'entrée
                results.push({
                    ortho: row['ortho'],
                    phon: convertPhon(row['phon']),
                    lemme: row['lemme'],
                    cgram: row['cgram'], // On garde la nomenclature Lexique
                    genre: row['genre'],
                    nombre: row['nombre'],
                    infover: row['infover'],
                    freq: match.freq_u, // On injecte la fréquence SPECIFIQUE à cette catégorie
                    orthosyll: row['orthosyll']
                });
            }
        }
    }

    console.log("3. Sauvegarde...");
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Terminé : ${results.length} mots générés.`);
    console.timeEnd("Traitement");
}

processLexique();

