const fs = require('fs');

// FICHIERS
const INPUT_FILE = 'data/lexique_filtre.json';
const OUTPUT_FILE = 'data/dictionnaire_dys.json';

function indexerDictionnaire() {
    console.time("Indexation");
    console.log("📂 Chargement de lexique_filtre.json...");

    // 1. Charger les données
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`   ${data.length} entrées chargées`);

    // 2. Trier par lemme puis par ortho
    console.log("📊 Tri par lemme...");
    data.sort((a, b) => {
        const lemmeCompare = a.lemme.localeCompare(b.lemme, 'fr');
        if (lemmeCompare !== 0) return lemmeCompare;
        return a.ortho.localeCompare(b.ortho, 'fr');
    });

    // 3. Ajouter les IDs et préparer les index
    console.log("🔧 Création des index...");
    
    const index_ortho = {};
    const index_lemme = {};
    const index_phon = {};
    const index_phon_dys = {};
    const index_conjugaison = {};
    
    // Nouveaux index par préfixe pour recherche O(1)
    const idx_ortho_prefix = {};  // préfixe 2 lettres → IDs
    const idx_dys_prefix = {};    // préfixe 2 caractères DYS → IDs

    data.forEach((entry, id) => {
        // Ajouter l'ID
        entry.id = id;

        // Index par ortho
        if (!index_ortho[entry.ortho]) {
            index_ortho[entry.ortho] = [];
        }
        index_ortho[entry.ortho].push(id);

        // Index par lemme
        if (!index_lemme[entry.lemme]) {
            index_lemme[entry.lemme] = [];
        }
        index_lemme[entry.lemme].push(id);

        // Index par phon
        if (entry.phon) {
            if (!index_phon[entry.phon]) {
                index_phon[entry.phon] = [];
            }
            index_phon[entry.phon].push(id);
        }

        // Index par phon_dys
        if (entry.phon_dys) {
            if (!index_phon_dys[entry.phon_dys]) {
                index_phon_dys[entry.phon_dys] = [];
            }
            index_phon_dys[entry.phon_dys].push(id);
        }

        // Index conjugaison (pour les verbes)
        if (entry.cgram === 'VER' && entry.infover) {
            const cle = `VER:${entry.infover}`;
            if (!index_conjugaison[cle]) {
                index_conjugaison[cle] = [];
            }
            index_conjugaison[cle].push(id);
        }
        
        // Index par préfixe orthographique (2 lettres)
        const orthoLower = entry.ortho.toLowerCase();
        if (orthoLower.length >= 2) {
            const prefix2 = orthoLower.substring(0, 2);
            if (!idx_ortho_prefix[prefix2]) {
                idx_ortho_prefix[prefix2] = [];
            }
            idx_ortho_prefix[prefix2].push(id);
        }
        
        // Index par préfixe DYS (2 caractères)
        if (entry.phon_dys && entry.phon_dys.length >= 2) {
            const dysPrefix2 = entry.phon_dys.substring(0, 2);
            if (!idx_dys_prefix[dysPrefix2]) {
                idx_dys_prefix[dysPrefix2] = [];
            }
            idx_dys_prefix[dysPrefix2].push(id);
        }
    });

    // 4. Construire le fichier final
    console.log("💾 Construction du fichier final...");
    
    const dictionnaire = {
        meta: {
            version: "2.0",
            date: new Date().toISOString().split('T')[0],
            total_entries: data.length,
            index_stats: {
                ortho: Object.keys(index_ortho).length,
                lemme: Object.keys(index_lemme).length,
                phon: Object.keys(index_phon).length,
                phon_dys: Object.keys(index_phon_dys).length,
                conjugaison: Object.keys(index_conjugaison).length,
                ortho_prefix: Object.keys(idx_ortho_prefix).length,
                dys_prefix: Object.keys(idx_dys_prefix).length
            }
        },
        index_ortho,
        index_lemme,
        index_phon,
        index_phon_dys,
        index_conjugaison,
        idx_ortho_prefix,
        idx_dys_prefix,
        entries: data
    };

    // 5. Sauvegarder
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dictionnaire, null, 2), 'utf8');

    console.log("\n" + "=".repeat(40));
    console.log("✅ Indexation terminée !");
    console.log("=".repeat(40));
    console.log(`📊 Entrées : ${data.length}`);
    console.log(`📇 Index ortho : ${Object.keys(index_ortho).length} clés`);
    console.log(`📇 Index lemme : ${Object.keys(index_lemme).length} clés`);
    console.log(`📇 Index phon : ${Object.keys(index_phon).length} clés`);
    console.log(`📇 Index phon_dys : ${Object.keys(index_phon_dys).length} clés`);
    console.log(`📇 Index conjugaison : ${Object.keys(index_conjugaison).length} clés`);
    console.log(`⚡ Index ortho_prefix (O(1)) : ${Object.keys(idx_ortho_prefix).length} préfixes`);
    console.log(`⚡ Index dys_prefix (O(1)) : ${Object.keys(idx_dys_prefix).length} préfixes`);
    console.log(`💾 Fichier créé : ${OUTPUT_FILE}`);
    console.timeEnd("Indexation");
}

indexerDictionnaire();


