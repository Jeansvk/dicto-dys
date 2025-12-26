/**
 * RÈGLES DYS COMPILÉES
 * Généré automatiquement depuis les fichiers rules/*.json
 */

export interface Pattern {
  src: string;
  code: string;
}

export interface ContextRule {
  name: string;
  filter: {
    cgram: string[] | null;
    genre: string | null;
    nombre: string | null;
    infover_match: string[] | null;
    infover_exclude: string[] | null;
  };
  boost: number;
  penalty: number;
}

export interface SegmentationRule {
  name: string;
  triggers: Set<string> | null;
  prefixes: string[];
  minRestLength: number;
  action: string;
}

// <--- NOUVEAU : Regex pour détecter une terminaison de type voyelle + n/m
export const REGEX_NASAL_DETECTION = /([aeiouyéèêàâ]+)([nm]+)$/i;

// Patterns triés par longueur décroissante
export const PATTERNS: Pattern[] = [
  // Suffixes tion
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
  // Digrammes voyelles (3 lettres)
  { src: "eau", code: "o" },
  // Doubles consonnes
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

// Caractères simples
export const CHARS: Record<string, string> = {
  // Voyelles
  a: "a", e: "e", i: "i", o: "o", u: "y", y: "i",
  // Voyelles accentuées
  "é": "e", "è": "e", "ê": "e", "ë": "e",
  "à": "a", "â": "a",
  "î": "i", "ï": "i",
  "ô": "o",
  "ù": "y", "û": "y", "ü": "y", "ÿ": "y",
  // Consonnes confondues
  b: "%", p: "%",
  d: "#", t: "#",
  f: "?", v: "?",
  g: "&", k: "&", c: "&", q: "&",
  s: "!", z: "!", "ç": "!", x: "!",
  j: "£",
  m: "€", n: "€",
  // Consonnes distinctes
  l: "l", r: "r", w: "w", h: "",
};

// Expansions voyelles finales
export const FINAL_VOWEL_EXPANSIONS: Record<string, string[]> = {
  e: ["e", "o", "$"],
  a: ["a", "$"],
  o: ["o", "u"],
  y: ["y"],
  i: ["i"],
  u: ["u"],
};

// Équivalences orthographiques
export const ORTHO_EQUIVALENTS: Record<string, string[]> = {
  // Son O
  o: ["o", "au", "eau", "ô"],
  au: ["au", "o", "eau"],
  eau: ["eau", "o", "au"],
  // Son E
  e: ["e", "ai", "ei", "é", "è", "ê"],
  "é": ["é", "e", "ai", "ei", "er", "ez"],
  "è": ["è", "e", "ai", "ei", "ê"],
  ai: ["ai", "e", "ei", "é", "è"],
  ei: ["ei", "e", "ai"],
  // Son OU
  ou: ["ou", "oû", "oo"],
  // Nasales AN
  an: ["an", "en", "am", "em"],
  en: ["en", "an", "am", "em"],
  am: ["am", "an", "en", "em"],
  em: ["em", "en", "an", "am"],
  // Nasales IN
  "in": ["in", "ain", "ein", "im", "yn", "ym"],
  ain: ["ain", "in", "ein"],
  ein: ["ein", "in", "ain"],
  // Nasales ON
  "on": ["on", "om"],
  om: ["om", "on"],
  // Son OI
  oi: ["oi", "oie", "oy"],
  wa: ["oi", "oie"],
};

// Règles de contexte grammatical
export const CONTEXT: Map<string, ContextRule> = new Map([
  // Déterminants masculins singuliers
  ...["un", "le", "mon", "ton", "son", "ce", "du", "au"].map(t => [t, {
    name: "determinants_masc_sing",
    filter: { cgram: ["NOM", "ADJ"], genre: "m", nombre: "s", infover_match: null, infover_exclude: null },
    boost: 25, penalty: 0
  }] as [string, ContextRule]),
  // Déterminants féminins singuliers
  ...["une", "la", "ma", "ta", "sa", "cette"].map(t => [t, {
    name: "determinants_fem_sing",
    filter: { cgram: ["NOM", "ADJ"], genre: "f", nombre: "s", infover_match: null, infover_exclude: null },
    boost: 25, penalty: 0
  }] as [string, ContextRule]),
  // Déterminants pluriels
  ...["les", "des", "mes", "tes", "ses", "ces", "aux", "nos", "vos", "leurs"].map(t => [t, {
    name: "determinants_pluriel",
    filter: { cgram: ["NOM", "ADJ"], genre: null, nombre: "p", infover_match: null, infover_exclude: null },
    boost: 25, penalty: 0
  }] as [string, ContextRule]),
  // Pronoms personnels
  ...["je", "j'"].map(t => [t, {
    name: "pronom_je",
    filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["1s", "1sg"], infover_exclude: null },
    boost: 20, penalty: 0
  }] as [string, ContextRule]),
  ["tu", {
    name: "pronom_tu",
    filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["2s", "2sg"], infover_exclude: null },
    boost: 20, penalty: 0
  }],
  ...["il", "elle", "on"].map(t => [t, {
    name: "pronom_il_elle",
    filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["3s", "3sg"], infover_exclude: null },
    boost: 20, penalty: 0
  }] as [string, ContextRule]),
  ["nous", {
    name: "pronom_nous",
    filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["1p", "1pl"], infover_exclude: null },
    boost: 20, penalty: 0
  }],
  ["vous", {
    name: "pronom_vous",
    filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["2p", "2pl"], infover_exclude: null },
    boost: 20, penalty: 0
  }],
  ...["ils", "elles"].map(t => [t, {
    name: "pronom_ils_elles",
    filter: { cgram: ["VER"], genre: null, nombre: null, infover_match: ["3p", "3pl"], infover_exclude: null },
    boost: 20, penalty: 0
  }] as [string, ContextRule]),
  // Adverbes d'intensité
  ...["très", "tres", "plus", "moins", "trop", "assez", "si"].map(t => [t, {
    name: "adverbes_intensite",
    filter: { cgram: ["ADJ", "ADV"], genre: null, nombre: null, infover_match: null, infover_exclude: null },
    boost: 20, penalty: 0
  }] as [string, ContextRule]),
  // Prépositions
  ...["de", "d'"].map(t => [t, {
    name: "preposition_de",
    filter: { cgram: ["NOM", "VER"], genre: null, nombre: null, infover_match: null, infover_exclude: null },
    boost: 15, penalty: 0
  }] as [string, ContextRule]),
  ...["à", "a"].map(t => [t, {
    name: "preposition_a",
    filter: { cgram: ["NOM", "VER"], genre: null, nombre: null, infover_match: null, infover_exclude: null },
    boost: 15, penalty: 0
  }] as [string, ContextRule]),
]);

// Règles de segmentation (liaisons)
export const SEGMENTATION: SegmentationRule[] = [
  {
    name: "liaisons_n",
    triggers: new Set(["un", "mon", "ton", "son", "aucun", "bien", "rien", "en"]),
    prefixes: ["n"],
    minRestLength: 1,
    action: "remove_first"
  },
  {
    name: "liaisons_z",
    triggers: new Set(["les", "des", "mes", "tes", "ses", "ces", "aux", "eux", "nous", "vous", "ils", "elles"]),
    prefixes: ["z", "s"],
    minRestLength: 1,
    action: "remove_first"
  },
  {
    name: "liaisons_t",
    triggers: new Set(["petit", "grand", "est", "ont", "sont", "fait", "tout", "quand", "comment"]),
    prefixes: ["t"],
    minRestLength: 1,
    action: "remove_first"
  },
  {
    name: "elision_l",
    triggers: null,
    prefixes: ["l"],
    minRestLength: 2,
    action: "remove_first"
  },
  {
    name: "elision_d",
    triggers: null,
    prefixes: ["d"],
    minRestLength: 2,
    action: "remove_first"
  },
];
