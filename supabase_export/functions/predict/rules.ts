/**
 * RÈGLES DYS COMPILÉES - VERSION FINALE
 */

export interface Pattern { src: string; code: string; }
export interface ContextRule { name: string; filter: { cgram: string[] | null; genre: string | null; nombre: string | null; infover_match: string[] | null; infover_exclude: string[] | null; }; boost: number; penalty: number; }
export interface SegmentationRule { name: string; triggers: Set<string> | null; prefixes: string[]; minRestLength: number; action: string; }

// Équivalences strictes de début de mot (pour le scoring visuel)
export const START_EQUIVALENTS: Record<string, string[]> = {
  k: ["c", "qu", "ch"],
  c: ["k", "qu"],
  qu: ["k", "c"],
  f: ["ph"],
  ph: ["f"],
  z: ["s"],
  s: ["z", "c", "ç"]
};

// Patterns standards (Sans doublons, l'algo récursif fait le reste)
export const PATTERNS: Pattern[] = [
  // Suffixes complexes
  { src: "stion", code: "!#i$" },
  { src: "xtion", code: "&#i$" },
  { src: "tiaux", code: "!io" },
  { src: "tieux", code: "!ie" },
  { src: "tion", code: "!i$" },
  { src: "tiel", code: "!iel" },
  { src: "tien", code: "!i$" },
  
  // Nasales complexes
  { src: "ain", code: "$" },
  { src: "aim", code: "$" },
  { src: "ein", code: "$" },
  { src: "eim", code: "$" },
  { src: "oin", code: "w$" },
  { src: "ien", code: "i$" },
  
  // Digrammes voyelles
  { src: "eau", code: "o" },
  
  // Doubles consonnes (Simplification)
  { src: "ll", code: "l" },
  { src: "rr", code: "r" },
  { src: "ss", code: "!" },
  { src: "tt", code: "#" },
  { src: "pp", code: "%" },
  { src: "bb", code: "%" },
  { src: "dd", code: "#" },
  { src: "ff", code: "?" },
  { src: "mm", code: "€" },
  { src: "nn", code: "€" },
  { src: "cc", code: "&" },
  { src: "gg", code: "&" },
  { src: "zz", code: "!" },
  
  // Nasales simples
  { src: "an", code: "$" },
  { src: "am", code: "$" },
  { src: "en", code: "$" },
  { src: "em", code: "$" },
  { src: "on", code: "$" },
  { src: "om", code: "$" },
  { src: "un", code: "$" },
  { src: "um", code: "$" },
  { src: "in", code: "$" },
  { src: "im", code: "$" },
  { src: "yn", code: "$" },
  { src: "ym", code: "$" },
  
  // Digrammes consonnes
  { src: "ch", code: "£" },
  { src: "ph", code: "?" },
  { src: "qu", code: "&" },
  { src: "gu", code: "&" },
  { src: "gn", code: "ni" },
  
  // Digrammes voyelles
  { src: "ou", code: "u" },
  { src: "au", code: "o" },
  { src: "ai", code: "e" },
  { src: "ei", code: "e" },
  { src: "eu", code: "e" },
  { src: "oe", code: "e" },
  { src: "oi", code: "wa" },
];

export const CHARS: Record<string, string> = {
  a: "a", e: "e", i: "i", o: "o", u: "y", y: "i",
  "é": "e", "è": "e", "ê": "e", "ë": "e", "à": "a", "â": "a", "î": "i", "ï": "i", "ô": "o", "ù": "y", "û": "y", "ü": "y", "ÿ": "y",
  b: "%", p: "%", d: "#", t: "#", f: "?", v: "?", g: "&", k: "&", c: "&", q: "&", s: "!", z: "!", "ç": "!", x: "!", j: "£", m: "€", n: "€", l: "l", r: "r", w: "w", h: "",
};

export const FINAL_VOWEL_EXPANSIONS: Record<string, string[]> = {
  e: ["e", "o", "$"], a: ["a", "$"], o: ["o", "u"], y: ["y"], i: ["i"], u: ["u"],
};

export const ORTHO_EQUIVALENTS: Record<string, string[]> = {
  o: ["o", "au", "eau", "ô"], au: ["au", "o", "eau"], eau: ["eau", "o", "au"],
  e: ["e", "ai", "ei", "é", "è", "ê"], "é": ["é", "e", "ai", "ei", "er", "ez"], "è": ["è", "e", "ai", "ei", "ê"], ai: ["ai", "e", "ei", "é", "è"], ei: ["ei", "e", "ai"],
  ou: ["ou", "oû", "oo"],
  an: ["an", "en", "am", "em"], en: ["en", "an", "am", "em"], am: ["am", "an", "en", "em"], em: ["em", "en", "an", "am"],
  "in": ["in", "ain", "ein", "im", "yn", "ym"], ain: ["ain", "in", "ein"], ein: ["ein", "in", "ain"],
  "on": ["on", "om"], om: ["om", "on"],
  oi: ["oi", "oie", "oy"], wa: ["oi", "oie"],
};

export const CONTEXT: Map<string, ContextRule> = new Map([
  ...["un", "le", "mon", "ton", "son", "ce", "du", "au"].map(t => [t, { name: "determinants_masc_sing", filter: { cgram: ["NOM", "ADJ"], genre: "m", nombre: "s", infover_match: null, infover_exclude: null }, boost: 25, penalty: 0 }] as [string, ContextRule]),
  ...["une", "la", "ma", "ta", "sa", "cette"].map(t => [t, { name: "determinants_fem_sing", filter: { cgram: ["NOM", "ADJ"], genre: "f", nombre: "s", infover_match: null, infover_exclude: null }, boost: 25, penalty: 0 }] as [string, ContextRule]),
  ...["les", "des", "mes", "tes", "ses", "ces", "aux", "nos", "vos", "leurs"].map(t => [t, { name: "determinants_pluriel", filter: { cgram: ["NOM", "ADJ"], genre: null, nombre: "p", infover_match: null, infover_exclude: null }, boost: 25, penalty: 0 }] as [string, ContextRule]),
  ...["je", "j'"].map(t => [t, { name: "pronom_je", filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["1s", "1sg"], infover_exclude: null }, boost: 20, penalty: 0 }] as [string, ContextRule]),
  ["tu", { name: "pronom_tu", filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["2s", "2sg"], infover_exclude: null }, boost: 20, penalty: 0 }],
  ...["il", "elle", "on"].map(t => [t, { name: "pronom_il_elle", filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["3s", "3sg"], infover_exclude: null }, boost: 20, penalty: 0 }] as [string, ContextRule]),
  ["nous", { name: "pronom_nous", filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["1p", "1pl"], infover_exclude: null }, boost: 20, penalty: 0 }],
  ["vous", { name: "pronom_vous", filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["2p", "2pl"], infover_exclude: null }, boost: 20, penalty: 0 }],
  ...["ils", "elles"].map(t => [t, { name: "pronom_ils_elles", filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["3p", "3pl"], infover_exclude: null }, boost: 20, penalty: 0 }] as [string, ContextRule]),
  ...["très", "tres", "plus", "moins", "trop", "assez", "si"].map(t => [t, { name: "adverbes_intensite", filter: { cgram: ["ADJ", "ADV"], genre: null, nombre: null, infover_match: null, infover_exclude: null }, boost: 20, penalty: 0 }] as [string, ContextRule]),
  ...["de", "d'"].map(t => [t, { name: "preposition_de", filter: { cgram: ["NOM", "VER"], genre: null, nombre: null, infover_match: null, infover_exclude: null }, boost: 15, penalty: 0 }] as [string, ContextRule]),
  ...["à", "a"].map(t => [t, { name: "preposition_a", filter: { cgram: ["NOM", "VER"], genre: null, nombre: null, infover_match: null, infover_exclude: null }, boost: 15, penalty: 0 }] as [string, ContextRule]),
]);

export const SEGMENTATION: SegmentationRule[] = [
  { name: "liaisons_n", triggers: new Set(["un", "mon", "ton", "son", "aucun", "bien", "rien", "en"]), prefixes: ["n"], minRestLength: 1, action: "remove_first" },
  { name: "liaisons_z", triggers: new Set(["les", "des", "mes", "tes", "ses", "ces", "aux", "eux", "nous", "vous", "ils", "elles"]), prefixes: ["z", "s"], minRestLength: 1, action: "remove_first" },
  { name: "liaisons_t", triggers: new Set(["petit", "grand", "est", "ont", "sont", "fait", "tout", "quand", "comment"]), prefixes: ["t"], minRestLength: 1, action: "remove_first" },
  { name: "elision_l", triggers: null, prefixes: ["l"], minRestLength: 2, action: "remove_first" },
  { name: "elision_d", triggers: null, prefixes: ["d"], minRestLength: 2, action: "remove_first" },
];

// Liste des consonnes pouvant être muettes à la fin d'un mot
// (Ex: le 't' de 'koment', le 'd' de 'canard', le 's' de 'tapis')
export const SILENT_FINAL_LETTERS = new Set(['t', 's', 'd', 'x', 'p', 'g', 'z', 'c']);