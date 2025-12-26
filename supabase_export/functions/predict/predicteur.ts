/**
 * PREDICTEUR DYS - Version Supabase Edge Function
 * Adapté de predicteur.js pour TypeScript/Deno
 */

import {
    PATTERNS,
    CHARS,
    FINAL_VOWEL_EXPANSIONS,
    ORTHO_EQUIVALENTS,
    CONTEXT,
    SEGMENTATION,
    REGEX_NASAL_DETECTION, // <--- Import de la nouvelle Regex
    type ContextRule,
  } from "./rules.ts";
  
  export interface DictEntry {
    id: number;
    ortho: string;
    phon: string;
    phon_dys: string;
    lemme: string;
    cgram: string;
    genre?: string;
    nombre?: string;
    infover?: string;
    freq: number;
  }
  
  export interface DictData {
    meta: {
      total_entries: number;
    };
    entries: DictEntry[];
    index_phon_dys: Record<string, number[]>;
    idx_ortho_prefix: Record<string, number[]>;
    idx_dys_prefix: Record<string, number[]>;
  }
  
  export interface PredictOptions {
    level?: string;
    limit?: number;
    usePhonetic?: boolean;
    minPrefixLength?: number;
    prevWord?: string;
  }
  
  export interface PredictResult extends DictEntry {
    score: number;
    matchType: string;
    emoji?: string | null;
    segmentation?: string | null;
    contextMatch?: boolean;
    fallback?: boolean;
  }
  
  export class PredicteurDys {
    private entries: DictEntry[];
    private indexPhonDys: Record<string, number[]>;
    private idxOrthoPrefix: Record<string, number[]>;
    private idxDysPrefix: Record<string, number[]>;
    private indexEmojis: Record<string, string>;
    public meta: { total_entries: number };
  
    constructor(dictData: DictData, emojisData: Record<string, string> = {}) {
      this.entries = dictData.entries;
      this.indexPhonDys = dictData.index_phon_dys;
      this.idxOrthoPrefix = dictData.idx_ortho_prefix;
      this.idxDysPrefix = dictData.idx_dys_prefix;
      this.meta = dictData.meta;
      this.indexEmojis = emojisData;
    }
  
    getEmoji(lemme: string): string | null {
      if (!lemme) return null;
      return this.indexEmojis[lemme.toLowerCase()] || null;
    }
  
    getContextFilter(prevWord: string): ContextRule | null {
      if (!prevWord) return null;
      return CONTEXT.get(prevWord.toLowerCase()) || null;
    }
  
    matchesContext(item: DictEntry, contextRule: ContextRule): boolean {
      if (!contextRule?.filter) return false;
      const f = contextRule.filter;
  
      if (f.cgram && !f.cgram.includes(item.cgram)) return false;
      if (f.genre && item.genre !== f.genre) return false;
      if (f.nombre && item.nombre !== f.nombre) return false;
  
      if (f.infover_match && item.infover) {
        const infover = item.infover.toLowerCase();
        const matchFound = f.infover_match.some((p) => infover.includes(p));
        if (!matchFound) return false;
      }
  
      if (f.infover_exclude && item.infover) {
        const infover = item.infover.toLowerCase();
        const excludeFound = f.infover_exclude.some((p) => infover.includes(p));
        if (excludeFound) return false;
      }
  
      return true;
    }
  
    shouldPenalize(item: DictEntry, contextRule: ContextRule): boolean {
      if (!contextRule?.filter || !contextRule.penalty) return false;
      const f = contextRule.filter;
  
      if (f.cgram?.includes("VER") && item.cgram === "VER") {
        if (f.infover_match && item.infover) {
          const infover = item.infover.toLowerCase();
          const matchFound = f.infover_match.some((p) => infover.includes(p));
          if (!matchFound) return true;
        }
      }
      return false;
    }
  
    transcode(input: string): string {
      const str = input.toLowerCase();
      let code = "";
      let i = 0;
      const len = str.length;
  
      while (i < len) {
        let matched = false;
        for (const p of PATTERNS) {
          if (str.startsWith(p.src, i)) {
            code += p.code;
            i += p.src.length;
            matched = true;
            break;
          }
        }
        if (matched) continue;
  
        const char = str[i];
        if (CHARS[char] !== undefined) {
          code += CHARS[char];
        } else {
          code += char;
        }
        i++;
      }
      return code;
    }
  
    /**
     * NOUVEAU : Génère les clés phonétiques multiples.
     * Utilise la Regex de rules.ts et la fonction transcode pour déterminer
     * dynamiquement le code des nasales sans hardcoder de symboles ($/€/@).
     */
    private getPhoneticKeys(input: string): string[] {
      const keys = new Set<string>();
      
      // 1. Clé A (Littérale) : Lecture directe (ex: "komm" -> &o€)
      keys.add(this.transcode(input));
  
      // 2. Clé B (Nasale Forcée) : Utilisation de la Regex importée
      const nasalMatch = input.match(REGEX_NASAL_DETECTION);
  
      if (nasalMatch) {
        const [fullSuffix, vowels] = nasalMatch;
        
        const prefix = input.substring(0, input.length - fullSuffix.length);
        const prefixCode = this.transcode(prefix);
        
        // Reconstruction de la syllabe nasale théorique (Voyelle + n)
        // Ex: "o" -> "on", "ai" -> "ain"
        const syntheticNasal = vowels + "n";
        
        // On demande à transcode le "vrai" code de rules.ts pour cette nasale
        const nasalCode = this.transcode(syntheticNasal);
  
        // Si c'est un code court (symbole spécial comme $), on valide la clé
        if (nasalCode.length <= 2) {
          keys.add(prefixCode + nasalCode);
        }
      }
  
      return Array.from(keys);
    }
  
    private isPhoneticMatch(userCode: string, targetCode: string): boolean {
      if (targetCode.startsWith(userCode)) return true;
  
      const areFinalSoundsCompatible = (userFinal: string, targetFinal: string): boolean => {
        const expansions = FINAL_VOWEL_EXPANSIONS[userFinal];
        if (!expansions) return false;
        return expansions.includes(targetFinal);
      };
  
      if (userCode.length >= 2 && targetCode.length >= userCode.length) {
        const userWithoutLast = userCode.slice(0, -1);
        const lastUserChar = userCode.slice(-1);
  
        if (targetCode.startsWith(userWithoutLast)) {
          const targetAtPos = targetCode[userWithoutLast.length];
          if (areFinalSoundsCompatible(lastUserChar, targetAtPos)) {
            return true;
          }
        }
      }
      return false;
    }
  
    private generateSegmentations(input: string, prevWord: string): Array<{ text: string; isSegmentation: boolean; rule?: string }> {
      const variants: Array<{ text: string; isSegmentation: boolean; rule?: string }> = [
        { text: input, isSegmentation: false },
      ];
  
      if (input.length < 2) return variants;
  
      const firstChar = input.charAt(0).toLowerCase();
      const rest = input.slice(1);
      const prevLower = prevWord.toLowerCase();
  
      for (const rule of SEGMENTATION) {
        if (!rule.prefixes.includes(firstChar)) continue;
        if (rest.length < rule.minRestLength) continue;
  
        if (rule.triggers) {
          if (!prevLower || !rule.triggers.has(prevLower)) continue;
        }
  
        if (rule.action === "remove_first") {
          variants.push({ text: rest, isSegmentation: true, rule: rule.name });
        }
      }
      return variants;
    }
  
    private generateOrthoVariants(prefix: string): string[] {
      const variants = new Set([prefix]);
      const lowerPrefix = prefix.toLowerCase();
  
      for (const [pattern, equivalents] of Object.entries(ORTHO_EQUIVALENTS)) {
        if (lowerPrefix.endsWith(pattern)) {
          const base = lowerPrefix.slice(0, -pattern.length);
          for (const equiv of equivalents) {
            variants.add(base + equiv);
          }
        }
  
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
  
    private searchByOrthoPrefix(prefix: string): DictEntry[] {
      const results: DictEntry[] = [];
      const seenIds = new Set<number>();
      prefix = prefix.toLowerCase();
  
      const variants = this.generateOrthoVariants(prefix);
      const candidateIds = new Set<number>();
  
      for (const variant of variants) {
        if (variant.length >= 2) {
          const prefix2 = variant.substring(0, 2);
          const ids = this.idxOrthoPrefix[prefix2];
          if (ids) {
            for (const id of ids) candidateIds.add(id);
          }
        }
      }
  
      for (const id of candidateIds) {
        if (seenIds.has(id)) continue;
        const entry = this.entries[id];
        const orthoLower = entry.ortho.toLowerCase();
  
        for (const variant of variants) {
          if (orthoLower.startsWith(variant)) {
            seenIds.add(id);
            results.push({ ...entry });
            break;
          }
        }
      }
      return results;
    }
  
    private searchByPhonDys(userCode: string): DictEntry[] {
      const results: DictEntry[] = [];
      const seenIds = new Set<number>();
  
      if (userCode.length >= 2 && Object.keys(this.idxDysPrefix).length > 0) {
        const dysPrefix2 = userCode.substring(0, 2);
        const candidateIds = this.idxDysPrefix[dysPrefix2];
  
        if (candidateIds) {
          for (const id of candidateIds) {
            if (seenIds.has(id)) continue;
            const entry = this.entries[id];
            if (this.isPhoneticMatch(userCode, entry.phon_dys)) {
              seenIds.add(id);
              results.push(entry);
            }
          }
        }
  
        const lastChar = userCode.slice(-1);
        const expansions = FINAL_VOWEL_EXPANSIONS[lastChar];
        if (expansions && userCode.length === 2) {
          const firstChar = userCode[0];
          for (const altCode of expansions) {
            if (altCode === lastChar) continue;
            const altPrefix = firstChar + altCode;
            const altIds = this.idxDysPrefix[altPrefix];
            if (altIds) {
              for (const id of altIds) {
                if (seenIds.has(id)) continue;
                const entry = this.entries[id];
                if (this.isPhoneticMatch(userCode, entry.phon_dys)) {
                  seenIds.add(id);
                  results.push(entry);
                }
              }
            }
          }
        }
      } else {
        for (const [dysCode, ids] of Object.entries(this.indexPhonDys)) {
          if (this.isPhoneticMatch(userCode, dysCode)) {
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
  
    predict(input: string, options: PredictOptions = {}): PredictResult[] {
      const {
        level = "cp_cm2",
        limit = 10,
        usePhonetic = true,
        minPrefixLength = 2,
        prevWord = "",
      } = options;
  
      if (!input?.trim()) return [];
  
      const originalInput = input.trim().toLowerCase();
      const candidatesMap = new Map<number, PredictResult>();
      let usedSegmentation: { text: string; rule?: string } | null = null;
  
      const segmentations = this.generateSegmentations(originalInput, prevWord);
  
      for (const seg of segmentations) {
        let searchInput = seg.text;
        let localFallback = false;
  
        while (searchInput.length >= minPrefixLength) {
          
          // MODIFIÉ : Récupération des clés multiples
          const userDysCodes = this.getPhoneticKeys(searchInput);
          
          let foundResults = false;
  
          const orthoResults = this.searchByOrthoPrefix(searchInput);
          for (const item of orthoResults) {
            if (!candidatesMap.has(item.id)) {
              const entry: PredictResult = {
                ...item,
                score: 0,
                matchType: "ortho",
                segmentation: seg.isSegmentation ? seg.rule : undefined,
                fallback: localFallback || undefined,
              };
              candidatesMap.set(item.id, entry);
              foundResults = true;
            }
          }
  
          if (usePhonetic) {
            // MODIFIÉ : Boucle sur les clés générées
            for (const dysCode of userDysCodes) {
              const phonResults = this.searchByPhonDys(dysCode);
              for (const item of phonResults) {
                if (!candidatesMap.has(item.id)) {
                  const entry: PredictResult = {
                    ...item,
                    score: 0,
                    matchType: "phon_dys",
                    segmentation: seg.isSegmentation ? seg.rule : undefined,
                    fallback: localFallback || undefined,
                  };
                  candidatesMap.set(item.id, entry);
                  foundResults = true;
                }
              }
            }
          }
  
          if (foundResults) {
            if (seg.isSegmentation) usedSegmentation = seg;
            break;
          }
  
          searchInput = searchInput.slice(0, -1);
          localFallback = true;
        }
      }
  
      const effectiveInput = usedSegmentation?.text || originalInput;
      
      // MODIFIÉ : Récupération des clés pour le scoring
      const userDysCodes = this.getPhoneticKeys(effectiveInput);
      
      const contextRule = this.getContextFilter(prevWord);
  
      let results = Array.from(candidatesMap.values());
      const maxFreq = Math.max(...results.map((r) => r.freq || 0), 1);
  
      results = results.map((item) => {
        let score = 0;
        const freq = item.freq || 0;
  
        if (freq > 0) {
          const logFreq = Math.log10(freq + 1);
          const logMax = Math.log10(maxFreq + 1);
          score += (logFreq / logMax) * 60;
        }
  
        if (freq > 100) score += 15;
        if (freq > 300) score += 10;
        if (item.matchType === "ortho") score += 25;
  
        if (item.ortho.toLowerCase() === effectiveInput) {
          score += 40;
        } else if (item.ortho.toLowerCase().startsWith(effectiveInput)) {
          const matchRatio = effectiveInput.length / item.ortho.length;
          score += matchRatio * 20;
        }
  
        // MODIFIÉ : Scoring sur la meilleure clé trouvée
        const bestPhonMatch = userDysCodes.find(code => 
          item.phon_dys === code || item.phon_dys?.startsWith(code)
        );
  
        if (bestPhonMatch) {
          if (item.phon_dys === bestPhonMatch) {
            score += 10;
          } else {
            const dysMatchRatio = bestPhonMatch.length / item.phon_dys.length;
            score += dysMatchRatio * 8;
          }
        }
  
        if (item.ortho.length <= 6) score += 8;
        else if (item.ortho.length <= 8) score += 4;
  
        const lengthDiff = item.ortho.length - effectiveInput.length;
        if (lengthDiff > 4) score -= (lengthDiff - 4) * 3;
  
        let contextMatch = false;
        if (contextRule) {
          if (this.matchesContext(item, contextRule)) {
            score += contextRule.boost;
            contextMatch = true;
          } else if (this.shouldPenalize(item, contextRule)) {
            score -= contextRule.penalty;
          }
        }
  
        return { ...item, score, contextMatch, emoji: this.getEmoji(item.lemme) };
      });
  
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    }
  }