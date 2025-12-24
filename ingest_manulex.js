const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'data/Manulex.xls'; // Ton fichier .xls
const OUTPUT_FILE = 'data/manulex_full.json';

function ingestManulex() {
    console.log(`📂 Ouverture du fichier : ${INPUT_FILE}`);

    // 1. Lecture du fichier .xls
    const workbook = xlsx.readFile(INPUT_FILE);

    // 2. Identification de l'onglet
    // On cherche l'onglet qui contient "FORMES" ou on prend le premier par défaut
    const sheetName = workbook.SheetNames.find(n => n.includes("FORMES")) || workbook.SheetNames[0];
    console.log(`📖 Lecture de l'onglet : ${sheetName}`);
    
    const worksheet = workbook.Sheets[sheetName];

    // 3. Conversion en JSON brut
    // defval: null permet de garder les colonnes même si elles sont vides
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    const rawWords = [];

    console.log("⚙️ Extraction des colonnes en cours...");

    data.forEach((row, index) => {
        // Extraction des champs avec les noms exacts de Manulex
        const ortho = row['FORMES ORTHOGRAPHIQUES'];
        const synt = row['SYNT'] ? row['SYNT'].toString().trim() : 'UNK';
        
        if (ortho) {
            const orthoClean = ortho.toString().trim();
            
            // Filtres : exclure NP, EUPH, mots avec espace
            if (synt === 'NP' || synt === 'EUPH') return;
            if (orthoClean.includes(' ')) return;
            
            rawWords.push({
                ortho: orthoClean,
                nlet: parseInt(row['NLET']) || 0,
                synt: synt,
                freq_u: {
                    cp: parseFloat(row['CP U']) || 0,
                    ce1: parseFloat(row['CE1 U']) || 0,
                    ce2_cm2: parseFloat(row['CE2-CM2 U']) || 0,
                    cp_cm2: parseFloat(row['CP-CM2 U']) || 0
                }
            });
        }
    });

    // 4. Sauvegarde en JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rawWords, null, 2));
    
    console.log(`\n✅ Succès !`);
    console.log(`📊 ${rawWords.length} entrées extraites.`);
    console.log(`💾 Fichier créé : ${OUTPUT_FILE}`);
}

ingestManulex();




