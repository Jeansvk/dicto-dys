/**
 * EditorPredictionPopup - Popup de suggestions de mots DYS
 * 
 * Affiche les suggestions du prédicteur avec emojis, scores et indicateurs de match.
 * Supporte la navigation clavier (↑/↓/Enter/Escape).
 */

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { PredictionResult } from '../hooks/useWordPrediction';

export interface EditorPredictionPopupProps {
  /** Liste des suggestions à afficher */
  suggestions: PredictionResult[];
  /** Index de la suggestion sélectionnée (-1 = aucune) */
  selectedIndex: number;
  /** État de chargement */
  isLoading?: boolean;
  /** Message d'erreur */
  error?: string | null;
  /** Position du popup */
  position?: { top: number; left: number };
  /** Callback quand une suggestion est cliquée */
  onSelect: (result: PredictionResult) => void;
  /** Callback pour fermer le popup */
  onClose?: () => void;
  /** Afficher les infos détaillées */
  showDetails?: boolean;
  /** Afficher le code DYS */
  codeDys?: string | null;
  /** Classe CSS additionnelle */
  className?: string;
}

export function EditorPredictionPopup({
  suggestions,
  selectedIndex,
  isLoading = false,
  error = null,
  position,
  onSelect,
  onClose,
  showDetails = false,
  codeDys,
  className,
}: EditorPredictionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll vers l'élément sélectionné
  useEffect(() => {
    if (selectedRef.current && popupRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Ne rien afficher si pas de suggestions et pas de chargement
  if (!isLoading && suggestions.length === 0 && !error) {
    return null;
  }

  // Style de position
  const positionStyle = position
    ? { top: position.top, left: position.left, position: 'absolute' as const }
    : {};

  return (
    <div
      ref={popupRef}
      className={cn(
        'z-50 min-w-[280px] max-w-[400px] max-h-[320px] overflow-y-auto',
        'bg-white dark:bg-gray-900 rounded-xl shadow-2xl',
        'border border-gray-200 dark:border-gray-700',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
      style={positionStyle}
      role="listbox"
      aria-label="Suggestions de mots"
    >
      {/* Header avec code DYS */}
      {codeDys && showDetails && (
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Code phonétique : 
          </span>
          <code className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded font-mono text-sm">
            {codeDys}
          </code>
        </div>
      )}

      {/* État de chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 px-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Recherche...</span>
        </div>
      )}

      {/* Message d'erreur */}
      {error && !isLoading && (
        <div className="py-3 px-4 text-center text-sm text-amber-600 dark:text-amber-400">
          {error}
        </div>
      )}

      {/* Liste des suggestions */}
      {!isLoading && suggestions.length > 0 && (
        <ul className="py-1" role="listbox">
          {suggestions.map((result, index) => (
            <li key={`${result.mot}-${index}`} role="option">
              <button
                ref={index === selectedIndex ? selectedRef : null}
                onClick={() => onSelect(result)}
                className={cn(
                  'w-full px-3 py-2.5 flex items-center gap-3 transition-colors',
                  'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                  'focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20',
                  index === selectedIndex && 'bg-indigo-100 dark:bg-indigo-900/40'
                )}
                aria-selected={index === selectedIndex}
              >
                {/* Emoji */}
                <span className="text-2xl w-8 text-center flex-shrink-0">
                  {result.emoji || '📝'}
                </span>

                {/* Contenu principal */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Mot */}
                    <span className="font-semibold text-gray-900 dark:text-white truncate">
                      {result.mot}
                    </span>

                    {/* Badge match type */}
                    <span
                      className={cn(
                        'px-1.5 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0',
                        result.match === 'ortho'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )}
                    >
                      {result.match === 'ortho' ? '📖' : '🔊'}
                    </span>

                    {/* Badge contexte */}
                    {result.contextMatch && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Détails (lemme + catégorie) */}
                  {showDetails && (
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>{result.lemme}</span>
                      <span>•</span>
                      <span>{result.cgram}</span>
                      {result.genre && <span>({result.genre})</span>}
                    </div>
                  )}
                </div>

                {/* Score (optionnel) */}
                {showDetails && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">
                    {parseFloat(result.score).toFixed(0)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Raccourcis clavier */}
      {suggestions.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded ml-1">↓</kbd>
              <span className="ml-1">naviguer</span>
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Entrée</kbd>
              <span className="ml-1">sélectionner</span>
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Échap</kbd>
              <span className="ml-1">fermer</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorPredictionPopup;

