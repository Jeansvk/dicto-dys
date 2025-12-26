/**
 * Exports pour l'intégration Facilidys
 */

// Hook
export { useWordPrediction, type UseWordPredictionOptions, type UseWordPredictionReturn } from './hooks/useWordPrediction';
export type { PredictionResult, PredictionResponse } from './hooks/useWordPrediction';

// Composants
export { EditorPredictionPopup, type EditorPredictionPopupProps } from './components/EditorPredictionPopup';
export { TextEditorWithPrediction } from './components/TextEditorWithPrediction';

