/**
 * SUPABASE EDGE FUNCTION - Prédicteur DYS (Version Fetch Storage)
 * * Ce fichier charge les données volumineuses depuis le Storage Supabase
 * et les garde en cache mémoire pour les requêtes suivantes.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PredicteurDys, type DictData } from "./predicteur.ts";

// Configuration URL
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
// Assurez-vous que ce chemin correspond bien à votre bucket
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/predict-data`;

// --- GESTION DU CACHE GLOBAL ---
// Ces variables survivenet entre les requêtes tant que l'instance n'est pas tuée
let predicteur: PredicteurDys | null = null;
let initPromise: Promise<void> | null = null;

async function initPredicteur(): Promise<void> {
  // 1. Si déjà chargé, on ne fait rien (Vitesse Max)
  if (predicteur) return;

  // 2. Si un chargement est déjà en cours, on l'attend (Anti-Collision)
  if (initPromise) {
    await initPromise;
    return;
  }
  
  // 3. Sinon, on lance le chargement
  initPromise = (async () => {
    try {
      console.log("🔄 Cold Start : Téléchargement du dictionnaire...");
      const startTime = performance.now();
      
      // Téléchargement parallèle pour gagner du temps
      const [dictResponse, emojisResponse] = await Promise.all([
        fetch(`${STORAGE_BASE}/dictionnaire_dys.json`),
        fetch(`${STORAGE_BASE}/index_emojis.json`),
      ]);
      
      if (!dictResponse.ok) throw new Error(`Erreur dico: ${dictResponse.status}`);
      if (!emojisResponse.ok) throw new Error(`Erreur emojis: ${emojisResponse.status}`);
      
      const dictData = await dictResponse.json();
      const emojisData = await emojisResponse.json();
      
      // Initialisation de la nouvelle classe optimisée
      // Le casting 'any' évite les erreurs de typage strict sur le JSON
      predicteur = new PredicteurDys(dictData as any, emojisData as any);
      
      const duration = (performance.now() - startTime).toFixed(0);
      console.log(`✅ Prédicteur prêt : ${dictData.meta.total_entries} mots chargés en ${duration}ms`);
    } catch (error) {
      // En cas d'erreur, on reset la promesse pour pouvoir réessayer plus tard
      initPromise = null;
      console.error("❌ Erreur critique init:", error);
      throw error;
    }
  })();
  
  await initPromise;
}

// Headers CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req: Request) => {
  // 1. Gestion du Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 2. Vérification Méthode
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    // 3. Initialisation (si nécessaire)
    await initPredicteur();
    
    if (!predicteur) throw new Error("Le prédicteur n'a pas pu être initialisé.");

    // 4. Lecture du Body
    const body = await req.json();
    const { query, prevWord = "", limit = 10, level = "cp_cm2" } = body;

    // 5. Validation rapide
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query manquante", results: [] }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (query.trim().length < 1) {
      return new Response(JSON.stringify({ results: [] }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const t0 = performance.now();

    // 6. Appel de l'algorithme "Turbo"
    const results = predicteur.predict(query, {
      limit: Math.min(limit, 50),
      prevWord: prevWord,
      level: level,
      minPrefixLength: 2, // Cherche dès 2 lettres
      usePhonetic: true
    });

    const duration = (performance.now() - t0).toFixed(2);
    console.log(`🔍 "${query}" -> ${results.length} res | ${duration}ms`);

    // 7. Formatage de la réponse (Identique à votre format Front-End)
    const response = {
      input: query,
      code_dys: predicteur.transcode(query), // Utile pour le debug front
      prevWord: prevWord || null,
      count: results.length,
      results: results.map((r) => ({
        mot: r.ortho,
        lemme: r.lemme,
        emoji: r.emoji || null,
        phon: r.phon,
        phon_dys: r.phon_dys,
        cgram: r.cgram,
        genre: r.genre,
        nombre: r.nombre,
        freq: r.freq?.toFixed(1) || "0",
        score: r.score?.toFixed(1) || "0",
        match: r.matchType,
        segmentation: r.segmentation || null,
        contextMatch: r.contextMatch || false,
      })),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erreur Handler:", error);
    return new Response(
      JSON.stringify({ error: "Internal Error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});