const fs = require('fs');
const path = require('path');
const RuleRepository = require('./rules/RuleRepository');

/**
 * PREDICTEUR DE MOTS DYS
 * Basé sur dictionnaire_dys.json et les règles du RuleRepository
 */

// Charger les règles depuis le repository
const ruleRepo = new RuleRepository(path.join(__dirname, 'rules'));

class PredicteurDys {
  /**
   * @param {string} jsonPath - Chemin vers dictionnaire_dys.json
   */
  constructor(jsonPath) {
    console.log("📂 Chargement du dictionnaire...");
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Utiliser les index déjà construits
    this.entries = data.entries;
    this.indexOrtho = data.index_ortho;
    this.indexPhonDys = data.index_phon_dys;
    this.meta = data.meta;
    
    // Nouveaux index par préfixe pour recherche O(1)
    this.idxOrthoPrefix = data.idx_ortho_prefix || {};
    this.idxDysPrefix = data.idx_dys_prefix || {};
    
    // Référence aux règles compilées
    this.rules = ruleRepo.getMappings();
    
    // Charger l'index emoji (fichier séparé)
    this.indexEmojis = this.loadEmojis(jsonPath);
    
    console.log(`✅ ${this.meta.total_entries} mots chargés`);
    console.log(`🎨 ${Object.keys(this.indexEmojis).length} emojis chargés`);
  }

  /**
   * Charge l'index des emojis depuis un fichier séparé
   * @param {string} dictPath - Chemin du dictionnaire (pour trouver le dossier data)
   * @returns {object} - Index lemme -> emoji
   */
  loadEmojis(dictPath) {
    const emojiPath = path.join(path.dirname(dictPath), 'index_emojis.json');
    if (fs.existsSync(emojiPath)) {
      console.log("🎨 Chargement des emojis...");
      return JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
    }
    console.log("⚠️ Fichier index_emojis.json non trouvé");
    return {};
  }

  /**
   * Récupère l'emoji associé à un lemme
   * @param {string} lemme - Le lemme à chercher
   * @returns {string|null} - L'emoji ou null
   */
  getEmoji(lemme) {
    if (!lemme) return null;
    return this.indexEmojis[lemme.toLowerCase()] || null;
  }

  /**
   * Recharge les règles à chaud (pour le développement)
   */
  reloadRules() {
    ruleRepo.reload();
    this.rules = ruleRepo.getMappings();
  }

  /**
   * Récupère la règle de contexte grammatical pour un mot précédent
   * @param {string} prevWord - Le mot précédent
   * @returns {object|null} - La règle de contexte ou null
   */
  getContextFilter(prevWord) {
    if (!prevWord) return null;
    const contextMap = this.rules.CONTEXT;
    if (!contextMap) return null;
    return contextMap.get(prevWord.toLowerCase()) || null;
  }

  /**
   * Vérifie si un item correspond au filtre de contexte
   * @param {object} item - L'entrée du dictionnaire
   * @param {object} contextRule - La règle de contexte
   * @returns {boolean}
   */
  matchesContext(item, contextRule) {
    if (!contextRule || !contextRule.filter) return false;
    const f = contextRule.filter;
    
    // Vérifier la catégorie grammaticale
    if (f.cgram) {
      if (!f.cgram.includes(item.cgram)) return false;
    }
    
    // Vérifier le genre (m/f)
    if (f.genre) {
      if (item.genre !== f.genre) return false;
    }
    
    // Vérifier le nombre (s/p)
    if (f.nombre) {
      if (item.nombre !== f.nombre) return false;
    }
    
    // Vérifier la conjugaison (pour les verbes)
    if (f.infover_match && item.infover) {
      const infover = item.infover.toLowerCase();
      const matchFound = f.infover_match.some(pattern => infover.includes(pattern));
      if (!matchFound) return false;
    }
    
    // Vérifier les exclusions (ex: exclure les infinitifs)
    if (f.infover_exclude && item.infover) {
      const infover = item.infover.toLowerCase();
      const excludeFound = f.infover_exclude.some(pattern => infover.includes(pattern));
      if (excludeFound) return false;
    }
    
    return true;
  }
  
  /**
   * Vérifie si un item doit être pénalisé par le contexte
   * Pénalise les verbes qui ne matchent pas la conjugaison attendue
   */
  shouldPenalize(item, contextRule) {
    if (!contextRule || !contextRule.filter || !contextRule.penalty) return false;
    const f = contextRule.filter;
    
    // Si le contexte attend un verbe et que c'est un verbe
    if (f.cgram && f.cgram.includes('VER') && item.cgram === 'VER') {
      // Pénaliser si ce n'est pas la bonne forme conjuguée
      if (f.infover_match && item.infover) {
        const infover = item.infover.toLowerCase();
        const matchFound = f.infover_match.some(pattern => infover.includes(pattern));
        // Pénaliser si le verbe ne correspond pas à la personne/nombre attendu
        if (!matchFound) return true;
      }
    }
    
    return false;
  }

  /**
   * Transcode l'orthographe utilisateur → Code auditif DYS
   * Ex: "plain" → "%l$"
   */
  transcode(input) {
    let str = input.toLowerCase();
    let code = "";
    let i = 0;
    const len = str.length;
    
    const patterns = this.rules.PATTERNS;
    const chars = this.rules.CHARS;

    while (i < len) {
      let matched = false;

      // A. Patterns (priorité aux plus longs)
      for (const p of patterns) {
        if (str.startsWith(p.src, i)) {
          code += p.code;
          i += p.src.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // B. Lettres simples
      const char = str[i];
      if (chars[char] !== undefined) {
        code += chars[char];
      } else {
        // Caractère inconnu, on le garde tel quel
        code += char;
      }
      i++;
    }
    return code;
  }

  /**
   * Vérifie si le code utilisateur matche le code cible
   * Match strict par préfixe avec tolérance pour voyelles finales
   */
  isPhoneticMatch(userCode, targetCode, rawInput) {
    // Le code cible doit commencer par le code utilisateur
    if (targetCode.startsWith(userCode)) {
      return true;
    }
    
    const finalVowelExpansions = this.rules.FINAL_VOWEL_EXPANSIONS;
    
    // Tolérance basée sur les SONS POSSIBLES de chaque voyelle finale
    const areFinalSoundsCompatible = (userFinalCode, targetFinalCode) => {
      const expansions = finalVowelExpansions[userFinalCode];
      if (!expansions) return false;
      return expansions.includes(targetFinalCode);
    };
    
    if (userCode.length >= 2 && targetCode.length >= userCode.length) {
      const userWithoutLast = userCode.slice(0, -1);
      const lastUserChar = userCode.slice(-1);
      
      // Le début doit matcher
      if (targetCode.startsWith(userWithoutLast)) {
        const targetAtPos = targetCode[userWithoutLast.length];
        
        // Vérifier si la voyelle finale peut représenter le son cible
        if (areFinalSoundsCompatible(lastUserChar, targetAtPos)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Génère des segmentations pour les liaisons françaises
   * Ex: "navion" avec prev="un" → ["navion", "avion"]
   * @param {string} input - Ce que l'utilisateur a tapé
   * @param {string} prevWord - Le mot précédent (optionnel)
   * @returns {Array<{text: string, isSegmentation: boolean}>}
   */
  generateSegmentations(input, prevWord = '') {
    const variants = [{ text: input, isSegmentation: false }];
    
    if (input.length < 2) return variants;
    
    const segmentationRules = this.rules.SEGMENTATION || [];
    const firstChar = input.charAt(0).toLowerCase();
    const rest = input.slice(1);
    const prevLower = prevWord.toLowerCase();
    
    for (const rule of segmentationRules) {
      // Vérifier si la première lettre correspond au préfixe de la règle
      if (!rule.prefixes.includes(firstChar)) continue;
      
      // Vérifier la longueur minimale du reste
      if (rest.length < rule.minRestLength) continue;
      
      // Si la règle a des triggers, vérifier le mot précédent
      if (rule.triggers) {
        if (!prevLower || !rule.triggers.has(prevLower)) continue;
      }
      
      // Ajouter la variante segmentée
      if (rule.action === 'remove_first') {
        variants.push({ text: rest, isSegmentation: true, rule: rule.name });
      }
    }
    
    return variants;
  }

  /**
   * Génère des variantes orthographiques d'un préfixe
   * Ex: "bato" → ["bato", "bateau", "batau"]
   */
  generateOrthoVariants(prefix) {
    const variants = new Set([prefix]);
    const lowerPrefix = prefix.toLowerCase();
    const orthoEquivalents = this.rules.ORTHO_EQUIVALENTS;
    
    // Parcourir les équivalences et générer des variantes
    for (const [pattern, equivalents] of Object.entries(orthoEquivalents)) {
      // Chercher le pattern à la fin du préfixe (c'est souvent là que sont les erreurs)
      if (lowerPrefix.endsWith(pattern)) {
        const base = lowerPrefix.slice(0, -pattern.length);
        for (const equiv of equivalents) {
          variants.add(base + equiv);
        }
      }
      
      // Chercher aussi au milieu/début pour les préfixes plus longs
      const idx = lowerPrefix.indexOf(pattern);
      if (idx !== -1 && idx < lowerPrefix.length - pattern.length) {
        const before = lowerPrefix.slice(0, idx);
        const after = lowerPrefix.slice(idx + pattern.length);
        for (const equiv of equivalents) {
          variants.add(before + equiv + after);
        }
      }
    }
    
    return Array.from(variants);
  }

  /**
   * Recherche par préfixe orthographique (avec variantes)
   * Utilise l'index par préfixe pour une recherche O(1)
   */
  searchByOrthoPrefix(prefix) {
    const results = [];
    const seenIds = new Set();
    prefix = prefix.toLowerCase();
    
    // Générer les variantes du préfixe
    const variants = this.generateOrthoVariants(prefix);
    
    // Collecter les IDs candidats via l'index par préfixe
    const candidateIds = new Set();
    for (const variant of variants) {
      if (variant.length >= 2) {
        const prefix2 = variant.substring(0, 2);
        const ids = this.idxOrthoPrefix[prefix2];
        if (ids) {
          for (const id of ids) {
            candidateIds.add(id);
          }
        }
      }
    }
    
    // Filtrer les candidats qui matchent vraiment
    for (const id of candidateIds) {
      if (seenIds.has(id)) continue;
      
      const entry = this.entries[id];
      const orthoLower = entry.ortho.toLowerCase();
      
      // Vérifier si l'ortho commence par une des variantes
      for (const variant of variants) {
        if (orthoLower.startsWith(variant)) {
          seenIds.add(id);
          const item = { ...entry };
          item.orthoVariant = variant !== prefix ? variant : null;
          results.push(item);
          break;
        }
      }
    }
    
    return results;
  }

  /**
   * Recherche par code phonétique DYS
   * Utilise l'index par préfixe pour une recherche O(1)
   */
  searchByPhonDys(userCode, rawInput) {
    const results = [];
    const seenIds = new Set();
    
    // Utiliser l'index par préfixe DYS pour réduire les candidats
    if (userCode.length >= 2 && Object.keys(this.idxDysPrefix).length > 0) {
      const dysPrefix2 = userCode.substring(0, 2);
      const candidateIds = this.idxDysPrefix[dysPrefix2];
      
      if (candidateIds) {
        for (const id of candidateIds) {
          if (seenIds.has(id)) continue;
          
          const entry = this.entries[id];
          if (this.isPhoneticMatch(userCode, entry.phon_dys, rawInput)) {
            seenIds.add(id);
            results.push(entry);
          }
        }
      }
      
      // Vérifier aussi les préfixes avec tolérance de voyelle finale
      const finalVowelExpansions = this.rules.FINAL_VOWEL_EXPANSIONS || {};
      const lastChar = userCode.slice(-1);
      if (finalVowelExpansions[lastChar]) {
        // Si le code fait 2 caractères, tester les variantes du 2e caractère
        if (userCode.length === 2) {
          const firstChar = userCode[0];
          for (const altCode of finalVowelExpansions[lastChar]) {
            if (altCode === lastChar) continue; // Déjà traité
            const altPrefix = firstChar + altCode;
            const altIds = this.idxDysPrefix[altPrefix];
            if (altIds) {
              for (const id of altIds) {
                if (seenIds.has(id)) continue;
                const entry = this.entries[id];
                if (this.isPhoneticMatch(userCode, entry.phon_dys, rawInput)) {
                  seenIds.add(id);
                  results.push(entry);
                }
              }
            }
          }
        }
      }
    } else {
      // Fallback : parcourir tous les codes DYS (ancien comportement)
      for (const [dysCode, ids] of Object.entries(this.indexPhonDys)) {
        if (this.isPhoneticMatch(userCode, dysCode, rawInput)) {
          for (const id of ids) {
            if (!seenIds.has(id)) {
              seenIds.add(id);
              results.push(this.entries[id]);
            }
          }
        }
      }
    }
    
    return results;
  }

  /**
   * FONCTION PRINCIPALE DE PRÉDICTION
   * @param {string} input - Ce que l'utilisateur a tapé
   * @param {object} options - Options de recherche
   */
  predict(input, options = {}) {
    const {
      level = "cp_cm2",  // Niveau de fréquence à utiliser
      limit = 10,        // Nombre max de résultats
      usePhonetic = true, // Activer la recherche phonétique DYS
      minPrefixLength = 2, // Longueur minimale du préfixe pour le fallback
      prevWord = ''      // Mot précédent pour la segmentation
    } = options;

    if (!input || input.trim().length === 0) return [];
    
    const originalInput = input.trim().toLowerCase();
    let candidatesMap = new Map();
    let isFallback = false;
    let usedSegmentation = null;

    // Générer les segmentations possibles (liaisons françaises)
    const segmentations = this.generateSegmentations(originalInput, prevWord);
    
    // Essayer TOUTES les segmentations et fusionner les résultats
    for (const seg of segmentations) {
      let searchInput = seg.text;
      let localFallback = false;
      
      // Boucle de fallback pour cette segmentation
      while (searchInput.length >= minPrefixLength) {
        const userDysCode = this.transcode(searchInput);
        let foundResults = false;
        
        // 1. Recherche orthographique classique
        const orthoResults = this.searchByOrthoPrefix(searchInput);
        for (const item of orthoResults) {
          if (!candidatesMap.has(item.id)) {
            const entry = { ...item, matchType: 'ortho' };
            if (seg.isSegmentation) {
              entry.segmentation = seg.rule;
            }
            if (localFallback) {
              entry.fallback = true;
            }
            candidatesMap.set(item.id, entry);
            foundResults = true;
          }
        }

        // 2. Recherche phonétique DYS (si activée)
        if (usePhonetic) {
          const phonResults = this.searchByPhonDys(userDysCode, searchInput);
          
          for (const item of phonResults) {
            if (!candidatesMap.has(item.id)) {
              const entry = { ...item, matchType: 'phon_dys' };
              if (seg.isSegmentation) {
                entry.segmentation = seg.rule;
              }
              if (localFallback) {
                entry.fallback = true;
              }
              candidatesMap.set(item.id, entry);
              foundResults = true;
            }
          }
        }
        
        // Si on a trouvé des résultats, on arrête le fallback pour cette segmentation
        if (foundResults) {
          if (seg.isSegmentation) {
            usedSegmentation = seg;
          }
          break;
        }
        
        // Sinon, réduire le préfixe
        searchInput = searchInput.slice(0, -1);
        localFallback = true;
        isFallback = true;
      }
    }
    
    // Utiliser le bon input pour les scores
    const effectiveInput = usedSegmentation ? usedSegmentation.text : originalInput;
    const userDysCode = this.transcode(effectiveInput);
    
    // Récupérer le contexte grammatical
    const contextRule = this.getContextFilter(prevWord);

    // 3. Calcul du score et tri
    let results = Array.from(candidatesMap.values());
    
    // Trouver la fréquence max pour normaliser
    const maxFreq = Math.max(...results.map(r => r.freq?.[level] || 0), 1);
    
    results = results.map(item => {
      let score = 0;
      const freq = item.freq?.[level] || 0;
      
      // A. Score fréquence avec échelle logarithmique (0-60 points)
      // log permet de mieux différencier freq:382 vs freq:0.9
      if (freq > 0) {
        const logFreq = Math.log10(freq + 1);
        const logMax = Math.log10(maxFreq + 1);
        score += (logFreq / logMax) * 60;
      }
      
      // B. Bonus fréquence absolue pour les mots très courants
      if (freq > 100) score += 15;
      if (freq > 300) score += 10;
      
      // C. Bonus match orthographique (+25 points)
      if (item.matchType === 'ortho') {
        score += 25;
      }
      
      // D. Bonus mot exact ou très proche (+40 points)
      if (item.ortho.toLowerCase() === effectiveInput) {
        score += 40;
      } else if (item.ortho.toLowerCase().startsWith(effectiveInput)) {
        // Bonus proportionnel à la longueur du match
        const matchRatio = effectiveInput.length / item.ortho.length;
        score += matchRatio * 20;
      }
      
      // E. Bonus code DYS exact (+10 points)
      if (item.phon_dys === userDysCode) {
        score += 10;
      } else if (item.phon_dys?.startsWith(userDysCode)) {
        const dysMatchRatio = userDysCode.length / item.phon_dys.length;
        score += dysMatchRatio * 8;
      }
      
      // F. Bonus mot court (favorise les mots simples)
      if (item.ortho.length <= 6) {
        score += 8;
      } else if (item.ortho.length <= 8) {
        score += 4;
      }
      
      // G. Pénalité mots trop longs
      const lengthDiff = item.ortho.length - effectiveInput.length;
      if (lengthDiff > 4) {
        score -= (lengthDiff - 4) * 3;
      }
      
      // H. Bonus contexte grammatical
      let contextMatch = false;
      if (contextRule) {
        if (this.matchesContext(item, contextRule)) {
          score += contextRule.boost;
          contextMatch = true;
        } else if (this.shouldPenalize(item, contextRule)) {
          // Pénaliser les formes incorrectes (ex: infinitif quand on attend conjugué)
          score -= contextRule.penalty;
        }
      }
      
      return { ...item, score, contextMatch };
    });
    
    // Tri par score décroissant
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Affiche les résultats de manière lisible
   */
  formatResults(results) {
    return results.map((r, i) => ({
      rank: i + 1,
      mot: r.ortho,
      lemme: r.lemme,
      phon: r.phon,
      cgram: r.cgram,
      genre: r.genre,
      nombre: r.nombre,
      freq: r.freq?.cp_cm2?.toFixed(1) || 0,
      score: r.score?.toFixed(1) || 0,
      match: r.matchType,
      fallback: r.fallback || false,
      segmentation: r.segmentation || null,
      contextMatch: r.contextMatch || false
    }));
  }
}

// ============================================
// MODE CLI - TESTS
// ============================================
if (require.main === module) {
  const predicteur = new PredicteurDys('data/dictionnaire_dys.json');

  console.log("\n" + "=".repeat(50));
  console.log("🔮 TESTS DE PRÉDICTION DYS");
  console.log("=".repeat(50));

  const tests = ["mai", "plai", "plain", "pan", "chat", "cho", "zalu", "bato"];

  for (const test of tests) {
    console.log(`\n📝 Input: "${test}"`);
    console.log(`   Code DYS: "${predicteur.transcode(test)}"`);
    
    const results = predicteur.predict(test, { limit: 5 });
    const formatted = predicteur.formatResults(results);
    
    if (formatted.length > 0 && formatted[0].fallback) {
      console.log(`   ⚠️ FALLBACK: recherche réduite à "${formatted[0].fallbackPrefix}"`);
    }
    console.log("   Suggestions:");
    
    for (const r of formatted) {
      const marker = r.match === 'phon_dys' ? '🔊' : '📖';
      const fallbackMarker = r.fallback ? ' ⚠️' : '';
      console.log(`     ${r.rank}. ${marker} ${r.mot} (${r.lemme}) - freq: ${r.freq}${fallbackMarker}`);
    }
  }
}

module.exports = PredicteurDys;
