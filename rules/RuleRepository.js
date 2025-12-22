const fs = require('fs');
const path = require('path');

/**
 * RULE REPOSITORY
 * Gère le chargement et l'accès aux règles de mapping DYS
 * Les règles sont stockées dans des fichiers JSON séparés pour faciliter l'édition
 */
class RuleRepository {
  constructor(rulesDir = path.join(__dirname)) {
    this.rulesDir = rulesDir;
    this.rules = {};
    this.compiled = null;
    this.load();
  }

  /**
   * Charge tous les fichiers de règles
   */
  load() {
    console.log("📚 Chargement des règles DYS...");
    
    this.rules.patterns = this.loadFile('patterns.json');
    this.rules.chars = this.loadFile('chars.json');
    this.rules.finalVowels = this.loadFile('final_vowels.json');
    this.rules.orthoEquiv = this.loadFile('ortho_equiv.json');
    this.rules.segmentation = this.loadFile('segmentation.json');
    this.rules.context = this.loadFile('context.json');
    
    // Compiler les règles pour un accès rapide
    this.compile();
    
    console.log(`✅ Règles chargées: ${this.countRules()} règles au total`);
  }

  /**
   * Charge un fichier JSON
   */
  loadFile(filename) {
    const filepath = path.join(this.rulesDir, filename);
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error(`❌ Erreur chargement ${filename}:`, err.message);
      return {};
    }
  }

  /**
   * Compile les règles pour un accès rapide
   */
  compile() {
    this.compiled = {
      PATTERNS: this.compilePatterns(),
      CHARS: this.compileChars(),
      FINAL_VOWEL_EXPANSIONS: this.compileFinalVowels(),
      ORTHO_EQUIVALENTS: this.compileOrthoEquiv(),
      SEGMENTATION: this.compileSegmentation(),
      CONTEXT: this.compileContext(),
      NASAL_STARTS: new Set(['a', 'e', 'i', 'o', 'u', 'y'])
    };
  }

  /**
   * Compile les patterns (triés par longueur décroissante)
   */
  compilePatterns() {
    const patterns = [];
    const p = this.rules.patterns;
    
    // Collecter tous les patterns de toutes les catégories
    const categories = ['nasales_complexes', 'nasales_simples', 'digrammes_consonnes', 'digrammes_voyelles'];
    for (const cat of categories) {
      if (p[cat]) {
        for (const rule of p[cat]) {
          patterns.push({ src: rule.src, code: rule.code });
        }
      }
    }
    
    // Trier par longueur décroissante (greedy match)
    patterns.sort((a, b) => b.src.length - a.src.length);
    
    return patterns;
  }

  /**
   * Compile les caractères simples
   */
  compileChars() {
    const chars = {};
    const c = this.rules.chars;
    
    // Fusionner toutes les catégories
    const categories = ['voyelles', 'voyelles_accentuees', 'confusions_consonnes', 'consonnes_distinctes'];
    for (const cat of categories) {
      if (c[cat]) {
        for (const [char, code] of Object.entries(c[cat])) {
          if (!char.startsWith('_')) { // Ignorer les commentaires
            chars[char] = code;
          }
        }
      }
    }
    
    return chars;
  }

  /**
   * Compile les expansions de voyelles finales
   */
  compileFinalVowels() {
    const expansions = {};
    const fv = this.rules.finalVowels?.expansions || {};
    
    for (const [vowel, data] of Object.entries(fv)) {
      expansions[vowel] = data.codes || [vowel];
    }
    
    return expansions;
  }

  /**
   * Compile les équivalences orthographiques
   */
  compileOrthoEquiv() {
    const equiv = {};
    const oe = this.rules.orthoEquiv;
    
    // Fusionner toutes les catégories
    for (const [category, mappings] of Object.entries(oe)) {
      if (category.startsWith('_')) continue; // Ignorer les commentaires
      
      for (const [key, values] of Object.entries(mappings)) {
        equiv[key] = values;
      }
    }
    
    return equiv;
  }

  /**
   * Compile les règles de segmentation (liaisons françaises)
   */
  compileSegmentation() {
    const seg = this.rules.segmentation || {};
    const rules = [];
    
    for (const [ruleName, rule] of Object.entries(seg)) {
      if (ruleName.startsWith('_')) continue; // Ignorer les commentaires
      
      const prefixes = Array.isArray(rule.prefix) ? rule.prefix : [rule.prefix];
      const triggers = rule.triggers ? new Set(rule.triggers) : null;
      
      rules.push({
        name: ruleName,
        triggers: triggers,
        prefixes: prefixes,
        minRestLength: rule.min_rest_length || 1,
        action: rule.action || 'remove_first'
      });
    }
    
    return rules;
  }

  /**
   * Compile les règles de contexte grammatical
   * Crée une Map: mot_trigger → {filter, boost, name}
   */
  compileContext() {
    const ctx = this.rules.context || {};
    const triggerMap = new Map();
    
    for (const [ruleName, rule] of Object.entries(ctx)) {
      if (ruleName.startsWith('_')) continue;
      if (!rule.triggers || !rule.filter) continue;
      
      const compiledRule = {
        name: ruleName,
        filter: {
          cgram: rule.filter.cgram || null,
          genre: rule.filter.genre || null,
          nombre: rule.filter.nombre || null,
          infover_match: rule.filter.infover_match || null,
          infover_exclude: rule.filter.infover_exclude || null
        },
        boost: rule.boost || 20,
        penalty: rule.penalty_non_match || 0
      };
      
      // Associer chaque trigger à cette règle
      for (const trigger of rule.triggers) {
        triggerMap.set(trigger.toLowerCase(), compiledRule);
      }
    }
    
    return triggerMap;
  }

  /**
   * Compte le nombre total de règles
   */
  countRules() {
    let count = 0;
    if (this.compiled) {
      count += this.compiled.PATTERNS.length;
      count += Object.keys(this.compiled.CHARS).length;
      count += Object.keys(this.compiled.FINAL_VOWEL_EXPANSIONS).length;
      count += Object.keys(this.compiled.ORTHO_EQUIVALENTS).length;
      count += this.compiled.SEGMENTATION.length;
      count += this.compiled.CONTEXT.size;
    }
    return count;
  }

  /**
   * Hot reload des règles (pour le développement)
   */
  reload() {
    console.log("🔄 Rechargement des règles...");
    this.load();
  }

  // ============================================
  // GETTERS
  // ============================================
  
  getPatterns() {
    return this.compiled?.PATTERNS || [];
  }

  getChars() {
    return this.compiled?.CHARS || {};
  }

  getFinalVowelExpansions() {
    return this.compiled?.FINAL_VOWEL_EXPANSIONS || {};
  }

  getOrthoEquivalents() {
    return this.compiled?.ORTHO_EQUIVALENTS || {};
  }

  getNasalStarts() {
    return this.compiled?.NASAL_STARTS || new Set();
  }

  getSegmentation() {
    return this.compiled?.SEGMENTATION || [];
  }

  getContext() {
    return this.compiled?.CONTEXT || new Map();
  }

  /**
   * Retourne toutes les règles compilées (format compatible avec l'ancien MAPPINGS)
   */
  getMappings() {
    return this.compiled;
  }
}

module.exports = RuleRepository;


