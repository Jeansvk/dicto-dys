const express = require('express');
const path = require('path');
const PredicteurDys = require('./predicteur');

const app = express();
const PORT = 3000;

// Charger le prédicteur
console.log("🚀 Démarrage du serveur...");
const predicteur = new PredicteurDys('data/dictionnaire_dys.json');

// Servir les fichiers statiques
app.use(express.static('public'));

// API de prédiction
app.get('/api/predict', (req, res) => {
    const input = req.query.q || '';
    const prevWord = req.query.prev || '';
    const limit = parseInt(req.query.limit) || 10;
    
    if (input.length < 1) {
        return res.json({ results: [] });
    }
    
    const results = predicteur.predict(input, { limit, prevWord });
    
    // Récupérer le contexte détecté
    const contextRule = predicteur.getContextFilter(prevWord);
    const contextInfo = contextRule ? {
        name: contextRule.name,
        boost: contextRule.boost
    } : null;
    
    const formatted = results.map(r => ({
        mot: r.ortho,
        lemme: r.lemme,
        emoji: predicteur.getEmoji(r.lemme),
        phon: r.phon,
        phon_dys: r.phon_dys,
        cgram: r.cgram,
        genre: r.genre,
        nombre: r.nombre,
        freq: r.freq?.cp_cm2?.toFixed(1) || '0',
        score: r.score?.toFixed(1) || '0',
        match: r.matchType,
        segmentation: r.segmentation || null,
        contextMatch: r.contextMatch || false
    }));
    
    res.json({
        input,
        prevWord: prevWord || null,
        code_dys: predicteur.transcode(input),
        context: contextInfo,
        count: formatted.length,
        results: formatted
    });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`\n✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log("📝 Ouvre ton navigateur pour tester le prédicteur DYS !\n");
});

