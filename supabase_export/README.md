# 🔮 Prédicteur DYS - Export Supabase Edge Function

## 📁 Structure

```
supabase_export/
└── functions/
    └── predict/
        ├── index.ts           # Point d'entrée Edge Function
        ├── predicteur.ts      # Logique de prédiction
        ├── rules.ts           # Règles DYS compilées
        └── data/
            ├── dictionnaire_dys.json   # 42K mots (~15 MB)
            └── index_emojis.json       # 4620 emojis
```

## 🚀 Déploiement sur Supabase

### 1. Copier dans votre projet Supabase

```bash
# Dans votre projet Supabase existant
cp -r supabase_export/functions/predict supabase/functions/
```

### 2. Déployer

```bash
supabase functions deploy predict
```

### 3. Tester

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/predict' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"query": "chat", "limit": 5}'
```

## 📡 API

### Endpoint

```
POST /functions/v1/predict
```

### Request Body

```json
{
  "query": "bato",        // Requis: ce que l'utilisateur tape
  "prevWord": "un",       // Optionnel: mot précédent (contexte)
  "limit": 10             // Optionnel: nombre de résultats (max 50)
}
```

### Response

```json
{
  "input": "bato",
  "code_dys": "%a#o",
  "prevWord": "un",
  "count": 5,
  "results": [
    {
      "mot": "bateau",
      "lemme": "bateau",
      "emoji": "⛵",
      "phon": "bato",
      "phon_dys": "%a#o",
      "cgram": "NOM",
      "genre": "m",
      "nombre": "s",
      "freq": "257.1",
      "score": "95.3",
      "match": "ortho",
      "segmentation": null,
      "contextMatch": true
    }
  ]
}
```

## 🔗 Utilisation depuis Lovable/React

```typescript
import { supabase } from "@/integrations/supabase/client";

async function predict(query: string, prevWord?: string) {
  const { data, error } = await supabase.functions.invoke('predict', {
    body: { query, prevWord, limit: 10 }
  });
  
  if (error) throw error;
  return data.results;
}

// Avec debounce
import { useMemo, useState } from 'react';
import { debounce } from 'lodash';

function usePrediction() {
  const [suggestions, setSuggestions] = useState([]);
  
  const debouncedPredict = useMemo(
    () => debounce(async (text: string) => {
      if (text.length < 2) {
        setSuggestions([]);
        return;
      }
      const results = await predict(text);
      setSuggestions(results);
    }, 150),
    []
  );
  
  return { suggestions, predict: debouncedPredict };
}
```

## ⚡ Performance

- **Cold start**: ~500ms (chargement du dictionnaire)
- **Warm requests**: ~20-40ms
- **Taille**: ~15 MB (respecte la limite de 50 MB)

## 🔒 Sécurité

Les données (dictionnaire, règles) sont protégées côté serveur.
Seuls les résultats de prédiction sont exposés au client.

