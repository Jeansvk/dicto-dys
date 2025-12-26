/**
 * TextEditorWithPrediction - Exemple d'intégration complète
 * 
 * Montre comment combiner le hook useWordPrediction avec le popup
 * dans un éditeur de texte avec support clavier complet.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWordPrediction, type PredictionResult } from '../hooks/useWordPrediction';
import { EditorPredictionPopup } from './EditorPredictionPopup';

interface TextEditorWithPredictionProps {
  /** Valeur initiale */
  initialValue?: string;
  /** Callback quand le texte change */
  onChange?: (text: string) => void;
  /** Placeholder */
  placeholder?: string;
  /** Mode développeur (affiche les détails) */
  devMode?: boolean;
}

export function TextEditorWithPrediction({
  initialValue = '',
  onChange,
  placeholder = 'Écris ici...',
  devMode = false,
}: TextEditorWithPredictionProps) {
  const [text, setText] = useState(initialValue);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [currentWord, setCurrentWord] = useState('');
  const [prevWord, setPrevWord] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef(0);

  const {
    suggestions,
    isLoading,
    error,
    codeDys,
    predict,
    clear,
    selectedIndex,
    navigateUp,
    navigateDown,
  } = useWordPrediction({
    debounceMs: 350,
    limit: 8,
    minLength: 2,
  });

  // Extraire le mot en cours de frappe
  const extractCurrentWord = useCallback((
    value: string,
    cursorPos: number
  ): { current: string; prev: string; wordStart: number } => {
    // Trouver le début du mot actuel
    let wordStart = cursorPos;
    while (wordStart > 0 && !/\s/.test(value[wordStart - 1])) {
      wordStart--;
    }

    const currentWord = value.slice(wordStart, cursorPos);

    // Trouver le mot précédent
    let prevEnd = wordStart - 1;
    while (prevEnd >= 0 && /\s/.test(value[prevEnd])) {
      prevEnd--;
    }
    let prevStart = prevEnd;
    while (prevStart > 0 && !/\s/.test(value[prevStart - 1])) {
      prevStart--;
    }
    const prevWord = prevStart <= prevEnd ? value.slice(prevStart, prevEnd + 1) : '';

    return { current: currentWord, prev: prevWord, wordStart };
  }, []);

  // Calculer la position du popup
  const calculatePopupPosition = useCallback(() => {
    if (!textareaRef.current) return { top: 0, left: 0 };

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    // Position simplifiée (sous le textarea)
    // Pour une position plus précise, utiliser une lib comme textarea-caret
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    };
  }, []);

  // Gérer les changements de texte
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setText(value);
    cursorPositionRef.current = cursorPos;
    onChange?.(value);

    // Extraire le mot en cours
    const { current, prev, wordStart } = extractCurrentWord(value, cursorPos);
    setCurrentWord(current);
    setPrevWord(prev);

    // Déclencher la prédiction si le mot est assez long
    if (current.length >= 2) {
      predict(current, prev);
      setPopupPosition(calculatePopupPosition());
      setShowPopup(true);
    } else {
      clear();
      setShowPopup(false);
    }
  }, [onChange, extractCurrentWord, predict, clear, calculatePopupPosition]);

  // Insérer une suggestion
  const insertSuggestion = useCallback((result: PredictionResult) => {
    if (!textareaRef.current) return;

    const cursorPos = cursorPositionRef.current;
    const { wordStart } = extractCurrentWord(text, cursorPos);

    // Remplacer le mot en cours par la suggestion
    const before = text.slice(0, wordStart);
    const after = text.slice(cursorPos);
    const newText = before + result.mot + ' ' + after;

    setText(newText);
    onChange?.(newText);

    // Repositionner le curseur après le mot inséré
    const newCursorPos = wordStart + result.mot.length + 1;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        cursorPositionRef.current = newCursorPos;
      }
    }, 0);

    clear();
    setShowPopup(false);
  }, [text, onChange, extractCurrentWord, clear]);

  // Gérer les touches clavier
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showPopup || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateDown();
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault();
          insertSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Tab':
        if (suggestions.length > 0) {
          e.preventDefault();
          insertSuggestion(suggestions[selectedIndex >= 0 ? selectedIndex : 0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        clear();
        setShowPopup(false);
        break;
    }
  }, [showPopup, suggestions, selectedIndex, navigateUp, navigateDown, insertSuggestion, clear]);

  // Fermer le popup si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      {/* Zone de texte */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full min-h-[200px] p-4 text-lg border-2 border-gray-200 dark:border-gray-700 rounded-xl 
                   focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none
                   bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                   resize-none transition-colors"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />

      {/* Debug info (mode dev) */}
      {devMode && currentWord && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
          <div>Mot actuel: "{currentWord}"</div>
          <div>Mot précédent: "{prevWord}"</div>
          <div>Code DYS: "{codeDys}"</div>
          <div>Suggestions: {suggestions.length}</div>
        </div>
      )}

      {/* Popup de suggestions */}
      {showPopup && (
        <EditorPredictionPopup
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          isLoading={isLoading}
          error={error}
          position={popupPosition}
          onSelect={insertSuggestion}
          onClose={() => setShowPopup(false)}
          showDetails={devMode}
          codeDys={codeDys}
          className="mt-2"
        />
      )}
    </div>
  );
}

export default TextEditorWithPrediction;

