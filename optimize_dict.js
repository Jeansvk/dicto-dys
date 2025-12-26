/**
 * Script d'optimisation du dictionnaire pour Supabase
 * - Arrondit les fréquences à 1 décimale
 * - Garde seulement freq.cp_cm2 → freq (nombre simple)
 * - Supprime orthosyll et infover vides
 * - Minifie le JSON
 */

const fs = require('fs');

const INPUT = 'supabase_export/functions/predict/data/dictionnaire_dys.json';
const OUTPUT = 'supabase_export/functions/predict/data/dictionnaire_dys_optimized.json';

console.log('📂 Chargement du dictionnaire...');
const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

console.log(`📊 Entrées: ${data.entries.length}`);

// Optimiser les entrées
console.log('🔧 Optimisation des entrées...');
const optimizedEntries = data.entries.map(entry => {
  const optimized = {
    id: entry.id,
    ortho: entry.ortho,
    phon: entry.phon,
    phon_dys: entry.phon_dys,
    lemme: entry.lemme,
    cgram: entry.cgram,
  };
  
  // Genre et nombre seulement si présents
  if (entry.genre) optimized.genre = entry.genre;
  if (entry.nombre) optimized.nombre = entry.nombre;
  
  // Infover seulement si non vide (pour les verbes)
  if (entry.infover && entry.infover.trim()) {
    optimized.infover = entry.infover;
  }
  
  // Fréquence: garder seulement cp_cm2, arrondir à 1 décimale
  const freq = entry.freq?.cp_cm2 || 0;
  optimized.freq = Math.round(freq * 10) / 10;
  
  return optimized;
});

// Construire le nouveau dictionnaire
const optimizedData = {
  meta: {
    version: "2.1-optimized",
    date: new Date().toISOString().split('T')[0],
    total_entries: optimizedEntries.length,
  },
  // Garder les index par préfixe (essentiels pour la perf)
  idx_ortho_prefix: data.idx_ortho_prefix,
  idx_dys_prefix: data.idx_dys_prefix,
  // Index phon_dys pour la recherche phonétique
  index_phon_dys: data.index_phon_dys,
  // Entrées optimisées
  entries: optimizedEntries,
};

// Sauvegarder en JSON minifié (sans indentation)
console.log('💾 Sauvegarde du fichier optimisé...');
fs.writeFileSync(OUTPUT, JSON.stringify(optimizedData));

// Statistiques
const originalSize = fs.statSync(INPUT).size;
const optimizedSize = fs.statSync(OUTPUT).size;

console.log('\n✅ Optimisation terminée !');
console.log(`📁 Original: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`📁 Optimisé: ${(optimizedSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`📉 Réduction: ${((1 - optimizedSize / originalSize) * 100).toFixed(0)}%`);

