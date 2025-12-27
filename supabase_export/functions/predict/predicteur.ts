/**
 * PREDICTEUR DYS - VERSION FINALE RÉCURSIVE
 */

import { PATTERNS, CHARS, FINAL_VOWEL_EXPANSIONS, ORTHO_EQUIVALENTS, START_EQUIVALENTS, CONTEXT, SEGMENTATION, SILENT_FINAL_LETTERS, type ContextRule } from "./rules.ts";

export interface DictEntry { id: number; ortho: string; phon: string; phon_dys: string; lemme: string; cgram: string; genre?: string; nombre?: string; infover?: string; freq: number; }
export interface DictData { meta: { total_entries: number; }; entries: DictEntry[]; index_phon_dys: Record<string, number[]>; idx_ortho_prefix: Record<string, number[]>; idx_dys_prefix: Record<string, number[]>; }
export interface PredictOptions { level?: string; limit?: number; usePhonetic?: boolean; minPrefixLength?: number; prevWord?: string; }
export interface PredictResult extends DictEntry { score: number; matchType: string; emoji?: string | null; segmentation?: string | null; contextMatch?: boolean; fallback?: boolean; }

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

  getEmoji(lemme: string): string | null { if (!lemme) return null; return this.indexEmojis[lemme.toLowerCase()] || null; }
  getContextFilter(prevWord: string): ContextRule | null { if (!prevWord) return null; return CONTEXT.get(prevWord.toLowerCase()) || null; }

  matchesContext(item: DictEntry, contextRule: ContextRule): boolean {
    if (!contextRule?.filter) return false;
    const f = contextRule.filter;
    if (f.cgram && !f.cgram.includes(item.cgram)) return false;
    if (f.genre && item.genre !== f.genre) return false;
    if (f.nombre && item.nombre !== f.nombre) return false;
    if (f.infover_match && item.infover) { if (!f.infover_match.some((p) => item.infover!.toLowerCase().includes(p))) return false; }
    if (f.infover_exclude && item.infover) { if (f.infover_exclude.some((p) => item.infover!.toLowerCase().includes(p))) return false; }
    return true;
  }

  shouldPenalize(item: DictEntry, contextRule: ContextRule): boolean {
    if (!contextRule?.filter || !contextRule.penalty) return false;
    const f = contextRule.filter;
    if (f.cgram?.includes("VER") && item.cgram === "VER") {
      if (f.infover_match && item.infover) { if (!f.infover_match.some((p) => item.infover!.toLowerCase().includes(p))) return true; }
    }
    return false;
  }

  /**
   * TRANSCODEUR RÉCURSIF (Avec Gestion des Lettres Muettes Finales)
   * Génère automatiquement les variantes nasales et non-nasales.
   * Ex: "komen" -> ["&$$", "&o€$"]
   */
  private transcodePolyvalent(input: string, cache = new Map<string, string[]>(), depth = 0): string[] {
    if (input.length === 0) return [""];
    if (cache.has(input)) return cache.get(input)!;
    if (depth > 20) return []; 

    const results = new Set<string>();
    const str = input.toLowerCase();

    // 1. Branche Patterns (ex: "om" -> "$")
    for (const p of PATTERNS) {
      if (str.startsWith(p.src)) {
        const suffixes = this.transcodePolyvalent(str.slice(p.src.length), cache, depth + 1);
        for (const s of suffixes) {
          results.add(p.code + s);
        }
      }
    }

    // 2. Branche Littérale (fallback)
    if (str.length > 0) {
      const char = str[0];
      const charCode = CHARS[char] !== undefined ? CHARS[char] : char;
      const suffixes = this.transcodePolyvalent(str.slice(1), cache, depth + 1);
      
      for (const s of suffixes) {
        results.add(charCode + s);
      }

      // --- UTILISATION DE LA RÈGLE IMPORTÉE ---
      // Si c'est la dernière lettre et qu'elle est dans la liste des muettes possibles
      if (str.length === 1 && SILENT_FINAL_LETTERS.has(char)) {
        results.add(""); // On ajoute l'option "silence"
      }
    }

    const resArray = Array.from(results);
    cache.set(input, resArray);
    return resArray;
  }

  /**
   * Utilitaire simple pour le scoring (prend le premier code)
   */
  transcode(input: string): string {
     const codes = this.transcodePolyvalent(input);
     return codes.length > 0 ? codes[0] : "";
  }

  /**
   * Génère toutes les clés phonétiques possibles (limitées à 10)
   */
  private getPhoneticKeys(input: string): string[] {
    const codes = this.transcodePolyvalent(input);
    return Array.from(new Set(codes)).slice(0, 10);
  }

  private generateOrthoVariants(prefix: string): string[] {
    const variants = new Set([prefix]);
    const lowerPrefix = prefix.toLowerCase();
    
    // C'est ici que START_EQUIVALENTS donne le bonus orthographique
    for (const [startChar, replacements] of Object.entries(START_EQUIVALENTS)) {
      if (lowerPrefix.startsWith(startChar)) {
        const rest = lowerPrefix.slice(startChar.length);
        for (const replacement of replacements) variants.add(replacement + rest);
      }
    }
    
    for (const [pattern, equivalents] of Object.entries(ORTHO_EQUIVALENTS)) {
      if (lowerPrefix.endsWith(pattern)) {
        const base = lowerPrefix.slice(0, -pattern.length);
        for (const equiv of equivalents) variants.add(base + equiv);
      }
      const idx = lowerPrefix.indexOf(pattern);
      if (idx !== -1 && idx < lowerPrefix.length - pattern.length) {
        const before = lowerPrefix.slice(0, idx);
        const after = lowerPrefix.slice(idx + pattern.length);
        for (const equiv of equivalents) variants.add(before + equiv + after);
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
        if (ids) for (const id of ids) candidateIds.add(id);
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
        if (areFinalSoundsCompatible(lastUserChar, targetAtPos)) return true;
      }
    }
    return false;
  }

  private generateSegmentations(input: string, prevWord: string): Array<{ text: string; isSegmentation: boolean; rule?: string }> {
    const variants: Array<{ text: string; isSegmentation: boolean; rule?: string }> = [{ text: input, isSegmentation: false }];
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
      if (rule.action === "remove_first") variants.push({ text: rest, isSegmentation: true, rule: rule.name });
    }
    return variants;
  }

  predict(input: string, options: PredictOptions = {}): PredictResult[] {
    const { level = "cp_cm2", limit = 10, usePhonetic = true, minPrefixLength = 2, prevWord = "" } = options;
    if (!input?.trim()) return [];

    const originalInput = input.trim().toLowerCase();
    const candidatesMap = new Map<number, PredictResult>();
    let usedSegmentation: { text: string; rule?: string } | null = null;
    const segmentations = this.generateSegmentations(originalInput, prevWord);

    for (const seg of segmentations) {
      let searchInput = seg.text;
      let localFallback = false;
      while (searchInput.length >= minPrefixLength) {
        const userDysCodes = this.getPhoneticKeys(searchInput);
        let foundResults = false;

        const orthoResults = this.searchByOrthoPrefix(searchInput);
        for (const item of orthoResults) {
          if (!candidatesMap.has(item.id)) {
            candidatesMap.set(item.id, { ...item, score: 0, matchType: "ortho", segmentation: seg.isSegmentation ? seg.rule : undefined, fallback: localFallback || undefined });
            foundResults = true;
          }
        }

        if (usePhonetic) {
          for (const dysCode of userDysCodes) {
            const phonResults = this.searchByPhonDys(dysCode);
            for (const item of phonResults) {
              if (!candidatesMap.has(item.id)) {
                candidatesMap.set(item.id, { ...item, score: 0, matchType: "phon_dys", segmentation: seg.isSegmentation ? seg.rule : undefined, fallback: localFallback || undefined });
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
    const userDysCodes = this.getPhoneticKeys(effectiveInput);
    const contextRule = this.getContextFilter(prevWord);
    let results = Array.from(candidatesMap.values());
    const maxFreq = Math.max(...results.map((r) => r.freq || 0), 1);

    results = results.map((item) => {
      let score = 0;
      const freq = item.freq || 0;
      if (freq > 0) score += (Math.log10(freq + 1) / Math.log10(maxFreq + 1)) * 60;
      if (freq > 100) score += 15;
      if (freq > 300) score += 10;
      if (item.matchType === "ortho") score += 25;
      if (item.ortho.toLowerCase() === effectiveInput) {
        score += 40;
      } else if (item.ortho.toLowerCase().startsWith(effectiveInput)) {
        const matchRatio = effectiveInput.length / item.ortho.length;
        score += matchRatio * 20;
      }
      const bestPhonMatch = userDysCodes.find(code => item.phon_dys === code || item.phon_dys?.startsWith(code));
      if (bestPhonMatch) {
        if (item.phon_dys === bestPhonMatch) score += 10;
        else score += (bestPhonMatch.length / item.phon_dys.length) * 8;
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
        } else if (this.shouldPenalize(item, contextRule)) score -= contextRule.penalty;
      }
      return { ...item, score, contextMatch, emoji: this.getEmoji(item.lemme) };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}