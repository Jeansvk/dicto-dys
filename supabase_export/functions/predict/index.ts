/**
 * SUPABASE EDGE FUNCTION - Prédicteur DYS
 * 
 * Endpoint: POST /functions/v1/predict
 * Body: { query: string, prevWord?: string, limit?: number }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PredicteurDys, type DictData } from "./predicteur.ts";

// Charger les données au démarrage (cold start)
const dictData: DictData = JSON.parse(
  await Deno.readTextFile(new URL("./data/dictionnaire_dys.json", import.meta.url))
);

const emojisData: Record<string, string> = JSON.parse(
  await Deno.readTextFile(new URL("./data/index_emojis.json", import.meta.url))
);

const predicteur = new PredicteurDys(dictData, emojisData);

console.log(`✅ Prédicteur initialisé: ${dictData.meta.total_entries} mots`);

// Headers CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Vérifier méthode
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { query, prevWord = "", limit = 10 } = body;

    // Validation
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'query' parameter", results: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (query.length < 1) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prédiction
    const results = predicteur.predict(query, {
      limit: Math.min(limit, 50), // Max 50 résultats
      prevWord,
    });

    // Formater la réponse
    const response = {
      input: query,
      code_dys: predicteur.transcode(query),
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
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

