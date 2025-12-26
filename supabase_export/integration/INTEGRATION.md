# 🔧 Guide d'intégration Facilidys

Ce guide explique comment intégrer le prédicteur DYS dans ton application Facilidys (Lovable + Supabase).

## 📋 Checklist de déploiement

### Étape 1 : Déployer l'Edge Function

```bash
# 1. Copier les fichiers de la fonction
cp -r ../functions/predict ton-projet/supabase/functions/

# 2. Ajouter la config dans supabase/config.toml
cat supabase-config.toml >> ton-projet/supabase/config.toml

# 3. Déployer
cd ton-projet
supabase functions deploy predict
```

### Étape 2 : Installer les dépendances React

```bash
# Si lodash n'est pas installé
npm install lodash
npm install -D @types/lodash
```

### Étape 3 : Copier les fichiers React

```bash
# Copier le hook
cp hooks/useWordPrediction.ts ton-projet/src/hooks/

# Copier les composants
cp components/EditorPredictionPopup.tsx ton-projet/src/components/
cp components/TextEditorWithPrediction.tsx ton-projet/src/components/
```

### Étape 4 : Adapter les imports

Dans les fichiers copiés, ajuster les imports selon ta structure :

```typescript
// Adapter selon ton projet
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
```

---

## 🔄 Migration depuis l'ancien système

### Ancien hook (100 mots locaux)

```typescript
// AVANT
const { predictions } = useLocalPrediction(text);
```

### Nouveau hook (42K mots via API)

```typescript
// APRÈS
const { 
  suggestions,    // Remplace 'predictions'
  isLoading,      // Nouveau : état de chargement
  error,          // Nouveau : gestion d'erreur
  predict,        // Fonction à appeler
  clear,          // Nettoyer les suggestions
} = useWordPrediction();

// Déclencher la prédiction
useEffect(() => {
  predict(currentWord, previousWord);
}, [currentWord, previousWord]);
```

### Mapping des champs

| Ancien | Nouveau | Notes |
|--------|---------|-------|
| `word` | `mot` | Le mot à afficher |
| `pictogram` | `emoji` | Peut être `null` |
| — | `lemme` | Forme de base |
| — | `score` | Score de pertinence |
| — | `match` | `'ortho'` ou `'phon_dys'` |
| — | `cgram` | Catégorie grammaticale |
| — | `contextMatch` | Match contextuel |

---

## 📁 Structure recommandée

```
src/
├── hooks/
│   └── useWordPrediction.ts       ← Hook principal
├── components/
│   ├── EditorPredictionPopup.tsx  ← Popup de suggestions
│   └── TextEditorWithPrediction.tsx  ← Exemple complet
└── integrations/
    └── supabase/
        └── client.ts              ← Client Supabase existant

supabase/
├── config.toml                    ← Ajouter [functions.predict]
└── functions/
    └── predict/                   ← Edge Function
        ├── index.ts
        ├── predicteur.ts
        ├── rules.ts
        └── data/
            ├── dictionnaire_dys.json
            └── index_emojis.json
```

---

## 🎨 Personnalisation du popup

### Styles Tailwind

Le composant `EditorPredictionPopup` utilise Tailwind CSS. Tu peux personnaliser :

```tsx
<EditorPredictionPopup
  // Afficher les détails (lemme, cgram, score)
  showDetails={true}
  
  // Afficher le code DYS
  codeDys={codeDys}
  
  // Classe CSS additionnelle
  className="shadow-lg border-2 border-indigo-200"
/>
```

### Couleurs des badges

```tsx
// Dans EditorPredictionPopup.tsx, ligne ~115
// Match orthographique = vert
'bg-emerald-100 text-emerald-700'

// Match phonétique = orange
'bg-amber-100 text-amber-700'

// Match contextuel = bleu
'bg-blue-100 text-blue-700'
```

---

## ⌨️ Raccourcis clavier

| Touche | Action |
|--------|--------|
| `↑` / `↓` | Naviguer dans les suggestions |
| `Enter` | Sélectionner la suggestion active |
| `Tab` | Sélectionner la première suggestion |
| `Escape` | Fermer le popup |

---

## 🐛 Debugging

### Mode développeur

```tsx
<TextEditorWithPrediction 
  devMode={true}  // Affiche les infos de debug
/>
```

### Logs console

Le hook log les erreurs dans la console :
```
Prédiction DYS indisponible: Error: ...
```

### Tester l'Edge Function directement

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/predict' \
  -H 'Content-Type: application/json' \
  -d '{"query": "bato", "prevWord": "un", "limit": 5}'
```

---

## 📊 Performance

| Métrique | Valeur |
|----------|--------|
| Cold start | ~500ms |
| Warm request | 20-40ms |
| Debounce | 350ms |
| Cache client | 100 entrées max |

### Optimisations appliquées

1. **Debounce 350ms** — Évite les appels excessifs
2. **Cache client** — Réutilise les résultats précédents
3. **Annulation de requête** — Cancel les appels obsolètes
4. **Index préfixe** — Recherche O(1) côté serveur

---

## 🆘 Troubleshooting

### "Prédiction temporairement indisponible"

1. Vérifier que l'Edge Function est déployée : `supabase functions list`
2. Vérifier les logs : `supabase functions logs predict`
3. Tester avec curl (voir section Debugging)

### Le popup ne s'affiche pas

1. Vérifier que `suggestions.length > 0`
2. Vérifier que `showPopup` est `true`
3. Vérifier la position du popup (z-index)

### Les emojis ne s'affichent pas

- Vérifier que `index_emojis.json` est bien copié dans `data/`
- Le champ `emoji` peut être `null` pour certains mots

---

## 📞 Support

Pour toute question, vérifier :
1. Les logs Supabase : `supabase functions logs predict`
2. La console navigateur (erreurs JS)
3. Le Network tab (statut des requêtes)

