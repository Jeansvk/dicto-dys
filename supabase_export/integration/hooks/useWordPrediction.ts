/**
 * useWordPrediction - Hook de prédiction de mots DYS
 * 
 * Remplace l'ancien hook avec base locale par un appel à l'Edge Function Supabase
 * qui contient 42K mots avec support phonétique DYS complet.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import debounce from 'lodash/debounce';

// Types
export interface PredictionResult {
  mot: string;
  lemme: string;
  emoji: string | null;
  phon: string;
  phon_dys: string;
  cgram: string;
  genre: string;
  nombre: string;
  freq: string;
  score: string;
  match: 'ortho' | 'phon_dys';
  segmentation: string | null;
  contextMatch: boolean;
}

export interface PredictionResponse {
  input: string;
  code_dys: string;
  prevWord: string | null;
  count: number;
  results: PredictionResult[];
}

export interface UseWordPredictionOptions {
  /** Délai de debounce en ms (défaut: 350) */
  debounceMs?: number;
  /** Nombre max de suggestions (défaut: 8) */
  limit?: number;
  /** Longueur minimale pour déclencher la prédiction (défaut: 2) */
  minLength?: number;
  /** Activer le cache local (défaut: true) */
  useCache?: boolean;
  /** Taille max du cache (défaut: 100) */
  maxCacheSize?: number;
}

export interface UseWordPredictionReturn {
  /** Liste des suggestions */
  suggestions: PredictionResult[];
  /** État de chargement */
  isLoading: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Code DYS du dernier input */
  codeDys: string | null;
  /** Déclencher une prédiction */
  predict: (input: string, prevWord?: string) => void;
  /** Vider les suggestions */
  clear: () => void;
  /** Sélectionner une suggestion */
  select: (result: PredictionResult) => void;
  /** Suggestion actuellement sélectionnée (navigation clavier) */
  selectedIndex: number;
  /** Naviguer vers le haut */
  navigateUp: () => void;
  /** Naviguer vers le bas */
  navigateDown: () => void;
}

// Cache global (persiste entre les re-renders)
const globalCache = new Map<string, PredictionResult[]>();

export function useWordPrediction(
  options: UseWordPredictionOptions = {}
): UseWordPredictionReturn {
  const {
    debounceMs = 350,
    limit = 8,
    minLength = 2,
    useCache = true,
    maxCacheSize = 100,
  } = options;

  // State
  const [suggestions, setSuggestions] = useState<PredictionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeDys, setCodeDys] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>('');

  // Cache helper
  const cacheSet = useCallback((key: string, value: PredictionResult[]) => {
    if (!useCache) return;
    
    if (globalCache.size >= maxCacheSize) {
      // Supprimer la plus ancienne entrée (FIFO)
      const firstKey = globalCache.keys().next().value;
      if (firstKey) globalCache.delete(firstKey);
    }
    globalCache.set(key, value);
  }, [useCache, maxCacheSize]);

  const cacheGet = useCallback((key: string): PredictionResult[] | undefined => {
    if (!useCache) return undefined;
    return globalCache.get(key);
  }, [useCache]);

  // Fonction de prédiction interne
  const fetchPredictions = useCallback(async (
    input: string,
    prevWord: string = ''
  ): Promise<void> => {
    const trimmedInput = input.trim().toLowerCase();
    
    // Validation
    if (trimmedInput.length < minLength) {
      setSuggestions([]);
      setCodeDys(null);
      setError(null);
      return;
    }

    // Clé de cache
    const cacheKey = `${trimmedInput}|${prevWord}`;
    
    // Vérifier le cache
    const cached = cacheGet(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setSelectedIndex(-1);
      return;
    }

    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke<PredictionResponse>(
        'predict',
        {
          body: { 
            query: trimmedInput, 
            prevWord: prevWord || undefined,
            limit 
          },
        }
      );

      // Vérifier si la requête a été annulée
      if (lastQueryRef.current !== trimmedInput) {
        return;
      }

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data) {
        const results = data.results || [];
        setSuggestions(results);
        setCodeDys(data.code_dys || null);
        setSelectedIndex(-1);
        
        // Mettre en cache
        cacheSet(cacheKey, results);
      }
    } catch (err) {
      // Ignorer les erreurs d'annulation
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      console.warn('Prédiction DYS indisponible:', err);
      setError('Prédiction temporairement indisponible');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [minLength, limit, cacheGet, cacheSet]);

  // Debounced predict
  const debouncedPredict = useMemo(
    () => debounce((input: string, prevWord: string = '') => {
      lastQueryRef.current = input.trim().toLowerCase();
      fetchPredictions(input, prevWord);
    }, debounceMs),
    [fetchPredictions, debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedPredict.cancel();
      abortControllerRef.current?.abort();
    };
  }, [debouncedPredict]);

  // Public methods
  const predict = useCallback((input: string, prevWord?: string) => {
    debouncedPredict(input, prevWord || '');
  }, [debouncedPredict]);

  const clear = useCallback(() => {
    debouncedPredict.cancel();
    setSuggestions([]);
    setCodeDys(null);
    setError(null);
    setSelectedIndex(-1);
  }, [debouncedPredict]);

  const select = useCallback((result: PredictionResult) => {
    // Le composant parent gérera l'insertion du mot
    clear();
  }, [clear]);

  const navigateUp = useCallback(() => {
    setSelectedIndex((prev) => 
      prev <= 0 ? suggestions.length - 1 : prev - 1
    );
  }, [suggestions.length]);

  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) => 
      prev >= suggestions.length - 1 ? 0 : prev + 1
    );
  }, [suggestions.length]);

  return {
    suggestions,
    isLoading,
    error,
    codeDys,
    predict,
    clear,
    select,
    selectedIndex,
    navigateUp,
    navigateDown,
  };
}

// Export par défaut
export default useWordPrediction;

