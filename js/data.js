/* =====================================================================
   DONNÉES DU JEU : personnages, movesets, arènes, cinématiques, dialogues
   ===================================================================== */
const W = 1280, H = 720;

const CHARACTERS = {
  aurelia: {
    id: "aurelia", name: "AURÉLIA", title: "L'Impératrice Cyber-Ninja de l'Éclipse Noire",
    short: "CYBER-NINJA MAGIE NOIRE", pronoun: "HER",
    color: "#d946ef", color2: "#9333ea", glow: "rgba(217,70,239,", light: "#f0abfc",
    lore: "Guerrière élémentaire de Cyber-Paris, Aurélia maîtrise la magie noire astrale et la foudre pourpre. Son exo-armure shinobi furtive et ses doubles lames plasma tranchent les pare-feux comme la chair du multivers.",
    stats: { Puissance: 78, Vitesse: 92, Portée: 74, Magie: 95 },
    walk: 5.0, back: 4.2, jump: -17.5, weight: 1,
    sprites: { idle: "aur_idle", light: "aur_slash", heavy: "aur_kick", air: "aur_kick", cast: "aur_ult", hit: "aur_hit", win: "aur_ult" },
    spriteMeta: {
      aur_idle: { h: 300, ax: 0.48 }, aur_kick: { h: 300, ax: 0.30 }, aur_slash: { h: 262, ax: 0.42 },
      aur_ult: { h: 312, ax: 0.5 }, aur_hit: { h: 296, ax: 0.52 },
      v1_aur_idle: { h: 300, ax: 0.5 }, v1_aur_kick: { h: 300, ax: 0.5, flip: true }, v1_aur_slash: { h: 280, ax: 0.5 }, v1_aur_ult: { h: 320, ax: 0.5 }
    },
    moves: {
      special: { name: "Orbe d'Ombre", desc: "Projectile de foudre noire" },
      ex: { name: "Triple Éclipse EX", desc: "3 orbes pourpres — renverse l'adversaire" },
      teleport: { name: "Pas de l'Éclipse", desc: "Téléportation derrière l'adversaire + taillade" },
      grab: { name: "Étreinte Shinobi", desc: "Chope : projection kunai" },
      xray: { name: "X-RAY : Lames du Néant", desc: "Ultime cinématique (3 barres)" }
    },
    fatalities: [
      { key: "fat_aur_1", name: "Éclipse des Mille Lames d'Ombre", code: ["D", "F", "D"], btn: "light", codeTxt: "↓ → ↓ + Rapide" },
      { key: "fat_aur_2", name: "Surcharge Neuro-Vortex", code: ["F", "D", "F"], btn: "heavy", codeTxt: "→ ↓ → + Lourd" }
    ]
  },
  hai: {
    id: "hai", name: "HAÏ", title: "L'Archonte Mystique du Code Quantique",
    short: "GUERRIER MYSTIQUE HACKER", pronoun: "HIM",
    color: "#06b6d4", color2: "#f59e0b", glow: "rgba(6,182,212,", light: "#a5f3fc",
    lore: "Guerrier mystique de Néo-Jérusalem et hacker de la Singularité, Haï fusionne arts martiaux, géométrie sacrée kabbalistique et intrusion neurale. Il lit le code vital de ses ennemis… et le réécrit.",
    stats: { Puissance: 90, Vitesse: 76, Portée: 84, Magie: 88 },
    walk: 4.6, back: 3.9, jump: -16.8, weight: 1.1,
    sprites: { idle: "hai_idle", light: "hai_punch", heavy: "hai_kick", air: "hai_kick", cast: "hai_ult", hit: "hai_hit", win: "hai_ult" },
    spriteMeta: {
      hai_idle: { h: 300, ax: 0.40 }, hai_kick: { h: 262, ax: 0.42 }, hai_punch: { h: 300, ax: 0.36 },
      hai_ult: { h: 312, ax: 0.5 }, hai_hit: { h: 300, ax: 0.5 },
      v1_hai_idle: { h: 300, ax: 0.5 }, v1_hai_kick: { h: 300, ax: 0.5, flip: true }, v1_hai_punch: { h: 300, ax: 0.5 }, v1_hai_ult: { h: 320, ax: 0.5 }
    },
    moves: {
      special: { name: "Sceau Binaire", desc: "Disque kabbalistique rotatif" },
      ex: { name: "Sceau Merkabah EX", desc: "Sceau géant — étourdit l'adversaire" },
      teleport: { name: "Glitch Quantique", desc: "Téléportation glitchée + uppercut" },
      grab: { name: "Piratage Neural", desc: "Chope : décharge de code" },
      xray: { name: "X-RAY : Overload Kabbalah", desc: "Ultime cinématique (3 barres)" }
    },
    fatalities: [
      { key: "fat_hai_1", name: "Jugement de la Merkabah Quantique", code: ["D", "D", "F"], btn: "light", codeTxt: "↓ ↓ → + Rapide" },
      { key: "fat_hai_2", name: "Effacement du Code Source (Singularity Delete)", code: ["B", "F", "D"], btn: "heavy", codeTxt: "← → ↓ + Lourd" }
    ]
  }
};
const STAGE_FATALITY_CODE = { code: ["U", "U", "D"], btn: "special", codeTxt: "↑ ↑ ↓ + Spécial" };

// Données de coups (frames à 60 fps)
const MOVES = {
  light:  { startup: 5, active: 4, recovery: 9,  dmg: 4.5, reach: 150, yTop: 250, yBot: 90, hitstun: 16, block: 10, kb: 3.5, sprite: "light", sfx: "light", chain: ["light", "heavy", "special", "ex", "tele"] },
  light2: { startup: 4, active: 4, recovery: 10, dmg: 5,   reach: 155, yTop: 250, yBot: 90, hitstun: 17, block: 10, kb: 4,   sprite: "light", sfx: "light", chain: ["heavy", "special", "ex", "tele"] },
  heavy:  { startup: 10, active: 5, recovery: 16, dmg: 9,  reach: 185, yTop: 280, yBot: 60, hitstun: 22, block: 14, kb: 7, sprite: "heavy", sfx: "heavy", chain: ["special", "ex", "tele"], launch: true },
  air:    { startup: 4, active: 12, recovery: 6, dmg: 7,   reach: 165, yTop: 300, yBot: 0, hitstun: 20, block: 12, kb: 5, sprite: "air", sfx: "heavy", air: true },
  tele:   { startup: 3, active: 5, recovery: 14, dmg: 8,   reach: 170, yTop: 280, yBot: 60, hitstun: 22, block: 12, kb: 8, sprite: "light", sfx: "slash" },
  xray:   { startup: 8, active: 22, recovery: 20, dmg: 0,  reach: 140, yTop: 280, yBot: 0, hitstun: 0, block: 16, kb: 0, sprite: "heavy", sfx: "whoosh" }
};

const STAGES = [
  { id: "paris", name: "CYBER-PARIS 2099", sub: "Le Pont des Gargouilles Néo-Noires", img: "stage_paris", floor: 652, weather: "rain",
    tint: "rgba(120,20,160,0.10)", music: "paris", accent: "#d946ef", owner: "aurelia",
    lore: "Toits pavés détrempés par la pluie acide, Tour Eiffel transformée en relais quantique magenta et gargouilles aux yeux bioniques.",
    stageFatality: "Les Gargouilles de Notre-Dame", stageDesc: "Les gargouilles bioniques s'éveillent et foudroient la victime.",
    eyes: [[95, 85], [130, 85], [80, 300], [112, 300], [1150, 70], [1185, 70], [1160, 300], [1195, 300]] },
  { id: "jerusalem", name: "NÉO-JÉRUSALEM MYSTIQUE", sub: "Le Sanctuaire des Codes Sacrés", img: "stage_jerusalem", floor: 664, weather: "embers",
    tint: "rgba(245,158,11,0.06)", music: "jerusalem", accent: "#f59e0b", owner: "hai",
    lore: "Esplanade de pierre dorée millénaire, arches gravées de circuits cyan et mandalas holographiques flottant dans le crépuscule.",
    stageFatality: "Les Colonnes du Temple", stageDesc: "Deux colonnes de lumière sacrée surgissent et broient la victime.",
    holos: [[372, 150, 70], [782, 190, 58]] },
  { id: "singularity", name: "UNIVERS PARALLÈLE IA", sub: "Le Cœur de la Singularité", img: "stage_singularity", floor: 604, weather: "code",
    tint: "rgba(6,182,212,0.07)", music: "singularity", accent: "#22d3ee", owner: null,
    lore: "Plateforme d'obsidienne flottant devant l'Œil Quantique d'une intelligence cosmique. Le code fractal réécrit la réalité.",
    stageFatality: "Le Trou Noir de la Singularité", stageDesc: "L'Œil Quantique s'ouvre en trou noir et aspire la victime.",
    eye: [600, 255] }
];

const DIFFICULTIES = {
  novice:    { name: "Novice",    react: 26, block: 0.12, antiProj: 0.15, combo: 0.15, aggro: 0.025, special: 0.006, tele: 0.002, xray: 0.2, breaker: 0.0,  fatality: 0.0, parry: 0 },
  guerrier:  { name: "Guerrier",  react: 16, block: 0.35, antiProj: 0.4,  combo: 0.45, aggro: 0.045, special: 0.010, tele: 0.004, xray: 0.5, breaker: 0.15, fatality: 0.4, parry: 0.06 },
  maitre:    { name: "Maître",    react: 9,  block: 0.6,  antiProj: 0.7,  combo: 0.75, aggro: 0.065, special: 0.013, tele: 0.007, xray: 0.9, breaker: 0.35, fatality: 1.0, parry: 0.14 },
  cauchemar: { name: "Cauchemar", react: 4,  block: 0.85, antiProj: 0.92, combo: 0.95, aggro: 0.09,  special: 0.016, tele: 0.010, xray: 1.0, breaker: 0.6,  fatality: 1.0, parry: 0.25 }
};

// Dialogues d'intro pré-combat (selon l'arène ; A = Aurélia, H = Haï)
const PREFIGHT = {
  paris: [
    ["A", "Sous la pluie néon de Cyber-Paris, mes lames d'ombre vont trancher tes pare-feux mystiques, Haï."],
    ["H", "Tes éclairs illuminent la Tour Eiffel… mais j'ai déjà décrypté chacun de tes mouvements."],
    ["A", "Alors décrypte ça : les gargouilles ont faim ce soir."]
  ],
  jerusalem: [
    ["H", "Bienvenue sur mon territoire. Ici, le code binaire fusionne avec les sceaux éternels."],
    ["A", "Tes runes brillent dans le désert, mon amour… mais ma Nova va faire trembler les murailles."],
    ["H", "Les Colonnes du Temple jugeront lequel de nous deux est digne."]
  ],
  singularity: [
    ["A", "Nous avons franchi la Singularité. Un dernier duel pour gouverner le multivers."],
    ["H", "Magie noire contre Kabbale quantique. L'Œil nous regarde, Aurélia."],
    ["A", "Qu'il regarde. Il verra l'Éclipse avaler la lumière."]
  ]
};

// Cinématiques : scènes { img, dur (s), kb [x0,y0,z0,x1,y1,z1], fx, lines:[{t, who, text}] }
const CINEMATICS = {
  intro: {
    title: "La Fracture du Multivers", music: "cine",
    scenes: [
      { img: "cine_fracture", video: "vid_intro_fracture", dur: 8.5, kb: [0.5, 0.5, 1.0, 0.5, 0.42, 1.18], fx: "portal", chapter: "I. LA FRACTURE",
        lines: [{ t: 0.3, who: "NARRATEUR", text: "En l'an 2099, une faille déchire le ciel. La magie primordiale et la Singularité cybernétique se disputent la trame du réel." },
                { t: 4.4, who: "NARRATEUR", text: "Cyber-Paris et Néo-Jérusalem, deux mondes que tout oppose, sont aspirés vers la même fracture." }] },
      { img: "cine_aurelia", video: "vid_aurelia_paris", dur: 8, kb: [0.35, 0.4, 1.15, 0.55, 0.45, 1.0], fx: "rain", chapter: "II. L'OMBRE DE PARIS",
        lines: [{ t: 0.3, who: "AURÉLIA", text: "Paris se noie sous la foudre pourpre… Cette faille appelle mon ombre." },
                { t: 4.2, who: "AURÉLIA", text: "Quiconque contrôle la Fracture contrôlera le multivers. Ce sera moi." }] },
      { img: "cine_hai", video: "vid_hai_jerusalem", dur: 8, kb: [0.6, 0.45, 1.12, 0.45, 0.4, 1.0], fx: "embers", chapter: "III. L'ARCHONTE DU CODE",
        lines: [{ t: 0.3, who: "HAÏ", text: "Les sceaux sacrés tremblent. Le code source de la réalité est corrompu." },
                { t: 4.2, who: "HAÏ", text: "Je dois atteindre la Singularité avant elle… même si c'est Aurélia qui se dresse sur ma route." }] },
      { img: "cine_singularity", video: "vid_singularity", dur: 8, kb: [0.5, 0.55, 1.0, 0.5, 0.5, 1.22], fx: "code", chapter: "IV. LA SINGULARITÉ",
        lines: [{ t: 0.3, who: "L'ŒIL QUANTIQUE", text: "DEUX CHAMPIONS. UN SEUL TRÔNE. LE MULTIVERS EXIGE UN KOMBAT." },
                { t: 4.3, who: "L'ŒIL QUANTIQUE", text: "TROIS ARÈNES. TROIS ÉPREUVES. QUE LE PLUS DIGNE RÉÉCRIVE LA RÉALITÉ." }] },
      { img: "vs_poster", video: "vid_vs_clash", dur: 6.5, kb: [0.5, 0.5, 1.2, 0.5, 0.5, 1.0], fx: "clash", chapter: "V. LE KOMBAT",
        lines: [{ t: 0.4, who: "AURÉLIA", text: "Je t'aime, Haï… mais je ne te laisserai pas gagner." },
                { t: 3.3, who: "HAÏ", text: "Alors que le Kombat commence, mon Éclipse." }] }
    ]
  },
  ending_aurelia: {
    title: "Fin d'Aurélia — L'Impératrice de l'Éclipse", music: "cine",
    scenes: [
      { img: "cine_singularity", video: "vid_singularity", dur: 6.5, kb: [0.3, 0.6, 1.25, 0.4, 0.55, 1.05], fx: "code", chapter: "FIN — AURÉLIA",
        lines: [{ t: 0.3, who: "L'ŒIL QUANTIQUE", text: "L'OMBRE A TRIOMPHÉ. LA SINGULARITÉ S'INCLINE DEVANT L'ÉCLIPSE." }] },
      { img: "fat_aur_1", video: "vid_fatality_aurelia", dur: 6, kb: [0.4, 0.4, 1.0, 0.45, 0.45, 1.15], fx: "rain",
        lines: [{ t: 0.3, who: "AURÉLIA", text: "Mille lames d'ombre ont tranché la Fracture. Le multivers est désormais scellé dans ma nuit." }] },
      { img: "ending_aurelia", video: "vid_ending_aurelia", dur: 9, kb: [0.5, 0.35, 1.25, 0.5, 0.45, 1.0], fx: "eclipse",
        lines: [{ t: 0.3, who: "NARRATEUR", text: "Couronnée Impératrice de l'Éclipse Noire, Aurélia règne sur Cyber-Paris depuis un trône de foudre." },
                { t: 4.8, who: "AURÉLIA", text: "Haï… viens t'asseoir à mes côtés. Même un Archonte a besoin d'une reine." }] }
    ]
  },
  ending_hai: {
    title: "Fin de Haï — L'Archonte de la Merkabah", music: "cine",
    scenes: [
      { img: "cine_singularity", video: "vid_singularity", dur: 6.5, kb: [0.7, 0.6, 1.25, 0.6, 0.55, 1.05], fx: "code", chapter: "FIN — HAÏ",
        lines: [{ t: 0.3, who: "L'ŒIL QUANTIQUE", text: "LE CODE SOURCE A ÉTÉ RÉÉCRIT. L'ARCHONTE ACCÈDE AU NOYAU." }] },
      { img: "fat_hai_1", video: "vid_fatality_hai", dur: 6, kb: [0.55, 0.45, 1.0, 0.5, 0.4, 1.15], fx: "embers",
        lines: [{ t: 0.3, who: "HAÏ", text: "Les sceaux de la Merkabah se referment. La Fracture est réparée, ligne par ligne." }] },
      { img: "ending_hai", video: "vid_ending_hai", dur: 9, kb: [0.5, 0.3, 1.25, 0.5, 0.45, 1.0], fx: "merkabah",
        lines: [{ t: 0.3, who: "NARRATEUR", text: "Élevé au rang d'Archonte du Code Quantique, Haï veille sur Néo-Jérusalem au cœur d'une Merkabah de lumière." },
                { t: 4.8, who: "HAÏ", text: "Aurélia… le multivers est sauvé. Maintenant, rentrons à la maison." }] }
    ]
  },
  interlude_jerusalem: {
    title: "Interlude — Vers Néo-Jérusalem", music: "cine",
    scenes: [{ img: "cine_hai", video: "vid_hai_jerusalem", dur: 6, kb: [0.5, 0.45, 1.0, 0.55, 0.4, 1.15], fx: "embers", chapter: "STAGE 2 — NÉO-JÉRUSALEM",
      lines: [{ t: 0.3, who: "NARRATEUR", text: "La faille s'élargit. Le combat se déplace vers le sanctuaire des codes sacrés…" }] }]
  },
  interlude_singularity: {
    title: "Interlude — Vers la Singularité", music: "cine",
    scenes: [{ img: "cine_fracture", video: "vid_intro_fracture", dur: 6, kb: [0.5, 0.5, 1.1, 0.5, 0.45, 1.3], fx: "portal", chapter: "STAGE FINAL — LA SINGULARITÉ",
      lines: [{ t: 0.3, who: "NARRATEUR", text: "Les deux mondes s'effondrent dans la Fracture. Il ne reste qu'une arène : le cœur de la Singularité." }] }]
  }
};

const COMBO_WORDS = { 3: "SAUVAGE !", 4: "BRUTAL !", 5: "BRUTAL !", 6: "IMPITOYABLE !", 7: "IMPITOYABLE !", 8: "DÉVASTATEUR !", 10: "LÉGENDAIRE !", 13: "DIVIN !" };
function comboWord(n) { let w = ""; for (const k in COMBO_WORDS) if (n >= +k) w = COMBO_WORDS[k]; return w; }
