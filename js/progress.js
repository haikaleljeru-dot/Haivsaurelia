/* =====================================================================
   v4 — PROGRESSION : Krypte (Koins, déblocages), costumes alternatifs,
   trophées + toasts, classements locaux, haptique (manette / mobile)
   Tout est sauvegardé dans localStorage (clé mk_av_profile_v4) avec
   repli silencieux si le stockage est indisponible (navigation privée).
   ===================================================================== */
const PROFILE_KEY = "mk_av_profile_v4";
const KRYPT_ITEMS = [
  { id: "eye", type: "char", cost: 1500, name: "L'Œil Quantique", desc: "3e combattant jouable (aussi débloqué en finissant le mode Histoire)", thumb: "eye_cyber" },
  { id: "telaviv", type: "stage", cost: 250, name: "Arène : Tel-Aviv Néon 2099", desc: "4e arène + Stage Fatality « La Vague Néon de Jaffa »", thumb: "stage_telaviv" },
  { id: "cs_aurelia_soiree", type: "costume", cost: 400, name: "Aurélia — Robe de Soirée Parisienne", desc: "Costume alternatif (palette carmin & bordeaux)", thumb: "aur_idle", ch: "aurelia", cs: "soiree" },
  { id: "cs_hai_armure", type: "costume", cost: 400, name: "Haï — Armure de Néo-Jérusalem", desc: "Costume alternatif (armure or & bronze)", thumb: "hai_idle", ch: "hai", cs: "armure" },
  { id: "cs_eye_solaire", type: "costume", cost: 300, name: "L'Œil Solaire", desc: "Costume alternatif de l'Œil (aussi offert au sommet de la Tour)", thumb: "eye_idle", ch: "eye", cs: "solaire" },
  { id: "vid_ending_aurelia", type: "video", cost: 150, name: "Vidéo : Fin d'Aurélia", desc: "Débloque la vidéo dans la Galerie", thumb: "ending_aurelia" },
  { id: "vid_ending_hai", type: "video", cost: 150, name: "Vidéo : Fin de Haï", desc: "Débloque la vidéo dans la Galerie", thumb: "ending_hai" },
  { id: "vid_fatality_aurelia", type: "video", cost: 200, name: "Vidéo : Fatality d'Aurélia", desc: "Débloque la vidéo dans la Galerie", thumb: "fat_aur_1" },
  { id: "vid_fatality_hai", type: "video", cost: 200, name: "Vidéo : Fatality de Haï", desc: "Débloque la vidéo dans la Galerie", thumb: "fat_hai_1" },
  { id: "art_eye", type: "art", cost: 120, name: "Artwork : L'Œil Quantique", desc: "Portrait + X-Ray de l'Œil", thumb: "xray_eye", arts: ["eye_cyber", "xray_eye"] },
  { id: "art_eye_fat", type: "art", cost: 150, name: "Artworks : Fatalities de l'Œil", desc: "2 illustrations", thumb: "fat_eye_1", arts: ["fat_eye_1", "fat_eye_2"] },
  { id: "art_friend", type: "art", cost: 100, name: "Artworks : Friendships", desc: "3 illustrations", thumb: "friendship_aur", arts: ["friendship_aur", "friendship_hai", "friendship_eye"] },
  { id: "art_anim", type: "art", cost: 100, name: "Artworks : Animalities", desc: "3 illustrations", thumb: "animality_hai", arts: ["animality_aur", "animality_hai", "animality_eye"] },
  { id: "art_endings", type: "art", cost: 200, name: "Artworks : Fin de l'Œil & Fin secrète", desc: "2 illustrations", thumb: "ending_eye", arts: ["ending_eye", "secret_ending"] }
];
const CHEATS = { SINGULARITE: "eye", KOMBAT: "koins", TELAVIV: "telaviv" };
const ACHIEVEMENTS = [
  ["first_win", "Premier Sang", "Gagner un combat", "🩸"],
  ["flawless", "Flawless Victory", "Gagner un round sans dégât", "💎"],
  ["fatality", "Fatality !", "Réussir une Fatality", "💀"],
  ["all_fat", "Collection Macabre", "Réussir les 6 Fatalities", "⚰️"],
  ["friendship", "Amis pour la vie", "Réussir une Friendship", "💖"],
  ["animality", "Bête Intérieure", "Réussir une Animality", "🐾"],
  ["stage_fat", "Architecte du Chaos", "Réussir une Stage Fatality", "🏛️"],
  ["brutality", "Brutal !", "Réussir une Brutality", "🔥"],
  ["combo10", "Combo Divin", "Enchaîner un combo de 10 coups", "⚡"],
  ["parry10", "Mur de Lumière", "10 parades parfaites (total)", "🛡️"],
  ["dash20", "Danseur Quantique", "20 Dash Cancels (total)", "💨"],
  ["xray", "Vision X-Ray", "Placer un X-Ray", "☢️"],
  ["breaker", "Brise-Chaînes", "Réussir un Combo Breaker", "⛓️"],
  ["story", "Légende du Kombat", "Terminer le mode Histoire", "📜"],
  ["eye", "L'Œil s'ouvre", "Débloquer L'Œil Quantique", "👁️"],
  ["secret", "Âmes Sœurs", "Voir la fin secrète (Histoire sans perdre un round)", "🌌"],
  ["tower5", "Mi-Tour", "Atteindre l'étage 5 de la Tour", "🗼"],
  ["tower10", "Maître de la Tour", "Vaincre les 10 étages de la Tour", "👑"],
  ["tutorial", "Élève Assidu", "Terminer le tutoriel", "🎓"],
  ["online", "Duelliste du Réseau", "Jouer un duel en ligne", "🌐"],
  ["clip", "Réalisateur", "Sauvegarder un clip replay", "🎬"],
  ["speed", "Éclair", "Gagner un combat en moins de 45 s", "⏱️"],
  ["krypt", "Pilleur de Krypte", "Acheter un objet dans la Krypte", "🗝️"],
  ["rich", "Fortune Cosmique", "Gagner 3000 Koins au total", "🪙"]
];
const COSTUME_BASE = {};

const Progress = {
  p: null, mem: false,
  blank() { return { v: 4, koins: 300, earned: 0, owned: {}, costume: { aurelia: "base", hai: "base", eye: "base" }, ach: {}, seen: {},
    stats: { wins: 0, losses: 0, flawless: 0, fatalities: 0, friendships: 0, animalities: 0, parries: 0, dash: 0, matches: 0, online: 0 },
    lb: { fastest: [], combo: [] }, tower: { best: 0 }, lang: null }; },
  load() {
    let d = null; try { d = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); } catch (e) { d = null; this.mem = true; }
    const b = this.blank(); this.p = d && d.v === 4 ? Object.assign(b, d, { stats: Object.assign(b.stats, d.stats || {}), lb: Object.assign(b.lb, d.lb || {}), costume: Object.assign(b.costume, d.costume || {}), tower: Object.assign(b.tower, d.tower || {}) }) : b;
    // compat : une Histoire terminée en v3 débloque l'Œil
    try { const u = getUnlocks(); if (u.story_aurelia || u.story_hai) this.p.owned.eye = 1; } catch (e) { }
    return this.p;
  },
  save() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.p)); } catch (e) { this.mem = true; } },
  has(id) { if (!this.p) this.load(); return !!this.p.owned[id]; },
  charAvailable(id) { const ch = CHARACTERS[id]; return !!ch && (!ch.secret || this.has(id)); },
  stageAvailable(i) { const st = STAGES[i]; return !!st && (!st.locked || this.has(st.id)); },
  chars() { return CHAR_IDS.filter(id => this.charAvailable(id)); },
  costumeOf(id) { if (!this.p) this.load(); const c = this.p.costume[id] || "base"; return c === "base" || this.has("cs_" + id + "_" + c) ? c : "base"; },
  costumesFor(id) { return ["base"].concat(KRYPT_ITEMS.filter(it => it.type === "costume" && it.ch === id && this.has(it.id)).map(it => it.cs)); },
  setCostume(id, cs) { this.p.costume[id] = cs; this.save(); },
  unlock(id, silent) {
    if (!this.p) this.load(); if (this.p.owned[id]) return false; this.p.owned[id] = 1; this.save();
    const it = KRYPT_ITEMS.find(x => x.id === id);
    if (!silent && it) Progress.toast("🔓 DÉBLOQUÉ", it.name, "unlock");
    if (id === "eye") this.award("eye");
    return true;
  },
  buy(id) {
    const it = KRYPT_ITEMS.find(x => x.id === id); if (!it || this.has(id)) return false;
    if (this.p.koins < it.cost) { UI.toast(L("Pas assez de Koins")); Audio2.play("block"); return false; }
    this.p.koins -= it.cost; this.unlock(id); this.award("krypt"); this.save(); Audio2.play("gong");
    return true;
  },
  cheat(code) {
    const c = String(code || "").toUpperCase().replace(/[^A-Z]/g, ""); const k = CHEATS[c];
    if (!k) return false;
    if (k === "koins") { if (this.p.seen.cheat_koins) return "used"; this.p.seen.cheat_koins = 1; this.addKoins(1000, "Code secret"); return true; }
    this.unlock(k); return true;
  },
  addKoins(n, why) { if (!this.p) this.load(); n = Math.round(n); if (n <= 0) return; this.p.koins += n; this.p.earned += n; this.save(); Progress.lastGain = { n, t: performance.now() }; Progress.koinFx(n, why); if (this.p.earned >= 3000) this.award("rich"); },
  award(id) {
    if (!this.p) this.load(); if (this.p.ach[id]) return false;
    const a = ACHIEVEMENTS.find(x => x[0] === id); if (!a) return false;
    this.p.ach[id] = Date.now(); this.save(); Progress.toast(a[3] + " " + L("TROPHÉE DÉBLOQUÉ"), L(a[1]) + " — " + L(a[2]), "ach");
    try { Audio2.play("parry"); } catch (e) { } return true;
  },
  unlockSeen(k) { if (!this.p) this.load(); this.p.seen["fin_" + k] = 1; const fats = ["fat_aur_1", "fat_aur_2", "fat_hai_1", "fat_hai_2", "fat_eye_1", "fat_eye_2"]; if (fats.every(f => this.p.seen["fin_" + f])) this.award("all_fat"); this.save(); },
  lbAdd(kind, entry) { const L2 = this.p.lb[kind]; L2.push(Object.assign({ d: Date.now() }, entry)); L2.sort((a, b) => kind === "fastest" ? a.v - b.v : b.v - a.v); L2.splice(10); this.save(); return L2.indexOf(L2.find(e => e === entry || (e.v === entry.v && e.ch === entry.ch))); },
  // ---- toasts (trophées, déblocages) ----
  toast(title, sub, cls) {
    try {
      let box = document.getElementById("achBox"); if (!box) { box = el("div", "", ""); box.id = "achBox"; document.getElementById("stage").appendChild(box); }
      const t = el("div", "ach " + (cls || ""), `<b>${title}</b><span>${sub || ""}</span>`); box.appendChild(t);
      setTimeout(() => t.classList.add("out"), 3600); setTimeout(() => t.remove(), 4200);
    } catch (e) { }
  },
  koinFx(n, why) { try { const t = el("div", "koinfx", `🪙 +${n}${why ? " <small>" + L(why) + "</small>" : ""}`); document.getElementById("stage").appendChild(t); setTimeout(() => t.remove(), 1900); } catch (e) { } }
};

// ---------- Récompenses en jeu (bus d'évènements) ----------
function humanSide(f) { return f && (f.ctrl === "p1" || f.ctrl === "p2" || (f.ctrl === "net" && typeof Online !== "undefined" && Online.localSide === f.side)); }
function rewardable() { return Match.type !== "training" && Match.type !== "tutorial" && Match.type !== "demo"; }
GameEv.on("combo", ({ att, n }) => {
  if (!humanSide(att) || !rewardable()) return;
  if (n >= 10) Progress.award("combo10");
  if (n >= 5) { Match.koinBank = (Match.koinBank || 0) + n * 5; }
  if (n >= 3) Progress.lbAdd("combo", { v: n, ch: att.id });
});
GameEv.on("parry", ({ f }) => { if (!humanSide(f)) return; Progress.p.stats.parries++; Progress.save(); if (Progress.p.stats.parries >= 10) Progress.award("parry10"); if (rewardable()) Match.koinBank = (Match.koinBank || 0) + 5; });
GameEv.on("dashCancel", ({ f }) => { if (!humanSide(f)) return; Progress.p.stats.dash++; if (Progress.p.stats.dash % 5 === 0) Progress.save(); if (Progress.p.stats.dash >= 20) Progress.award("dash20"); });
GameEv.on("xray", ({ f }) => { if (humanSide(f)) Progress.award("xray"); });
GameEv.on("breaker", ({ f }) => { if (humanSide(f)) Progress.award("breaker"); });
GameEv.on("finisher", ({ att, kind }) => {
  if (Match.training && Match.training.demoFin) { Match.training.demoFin = false; return; } // démo par bouton : pas de trophée
  if (!humanSide(att)) return;
  const S = Progress.p.stats;
  if (kind === "fatality1" || kind === "fatality2") { S.fatalities++; Progress.award("fatality"); }
  if (kind === "friendship") { S.friendships++; Progress.award("friendship"); }
  if (kind === "animality") { S.animalities++; Progress.award("animality"); }
  if (kind === "stage") Progress.award("stage_fat");
  if (kind === "brutality") Progress.award("brutality");
  if (rewardable()) Match.koinBank = (Match.koinBank || 0) + ({ fatality1: 75, fatality2: 75, stage: 75, brutality: 50, friendship: 100, animality: 100 }[kind] || 0);
  Progress.save();
});
GameEv.on("roundWon", ({ att, vic, flawless }) => {
  if (!vic.ch) return;
  if (!humanSide(vic) && humanSide(att) || Match.type === "2p") {} // 2 joueurs locaux : un seul profil partagé
  if (humanSide(vic) && !humanSide(att)) { Match.lostRound = true; if (typeof Story !== "undefined" && Story.active) Story.lost++; }
  if (!humanSide(att) || !rewardable()) return;
  if (flawless) { Progress.p.stats.flawless++; Progress.award("flawless"); Match.koinBank = (Match.koinBank || 0) + 50; Progress.save(); }
});
GameEv.on("matchOver", ({ att, vic, frames }) => {
  if (!rewardable()) return;
  const S = Progress.p.stats; S.matches++;
  if (Match.type === "online") { S.online++; Progress.award("online"); }
  let bank = Match.koinBank || 0; Match.koinBank = 0;
  if (humanSide(att)) {
    S.wins++; Progress.award("first_win"); bank += Match.type === "online" ? 150 : 100;
    const secs = Math.round(frames / 60 * 10) / 10;
    if (Match.roundTime < 999) Progress.lbAdd("fastest", { v: secs, ch: att.id, st: Match.stage.id, vs: vic.id });
    if (secs < 45) Progress.award("speed");
  } else if (humanSide(vic)) { S.losses++; bank += 25; }
  Progress.save();
  if (bank > 0) Progress.addKoins(bank, humanSide(att) ? "Victoire" : "Participation");
});

// ---------- COSTUMES ALTERNATIFS (recolorisation HSV pré-calculée) ----------
const COSTUME_DEFS = {
  aurelia: { soiree: { name: "Robe de Soirée Parisienne", map: [[250, 335, 352, 1.15, 0.95]], dark: [345, 0.55, 0.9], gold: true } },
  hai: { armure: { name: "Armure de Néo-Jérusalem", map: [[160, 215, 44, 1.1, 1.08], [215, 260, 40, 0.9, 1.0]], dark: [32, 0.5, 1.12] } },
  eye: { solaire: { name: "L'Œil Solaire", map: [[245, 320, 42, 1.05, 1.12]], dark: [30, 0.35, 1.05] } }
};
const Costumes = {
  names: { base: "Tenue d'origine", mirror: "Palette miroir" },
  label(id, cs) { return cs === "base" || cs === "mirror" ? L(this.names[cs]) : L((COSTUME_DEFS[id] && COSTUME_DEFS[id][cs] || {}).name || cs); },
  key(id, cs, k) {
    const ck = "cs_" + cs + "_" + k; if (IMG[ck]) return ck;
    const img = IMG[k]; if (!img || !img.naturalWidth) return k;
    const c = this.build(id, cs, img); if (!c) return k;
    IMG[ck] = c; COSTUME_BASE[ck] = k; return ck;
  },
  prepare(f) { if (!f || f.costume === "base") return; for (const k of Object.values(f.ch.sprites)) this.key(f.id, f.costume, k); },
  build(id, cs, img) {
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const def = cs === "mirror" ? { mirror: true } : (COSTUME_DEFS[id] || {})[cs];
    if (!def) return null;
    try {
      const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3] < 8) continue;
        let r = a[i] / 255, gg = a[i + 1] / 255, b = a[i + 2] / 255;
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), v = mx, dl = mx - mn, s = mx ? dl / mx : 0;
        let h = 0; if (dl) { h = mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4; h *= 60; if (h < 0) h += 360; }
        let nh = h, ns = s, nv = v;
        if (def.mirror) { if (s > 0.18) nh = (h + 150) % 360; }
        else {
          let done = false;
          for (const [h0, h1, to, sm, vm] of def.map) if (s > 0.16 && h >= h0 && h <= h1) { nh = to + (h - (h0 + h1) / 2) * 0.15; ns = Math.min(1, s * sm); nv = Math.min(1, v * vm); done = true; break; }
          if (!done && def.dark && v < 0.32 && s < 0.5) { nh = def.dark[0]; ns = Math.max(s, def.dark[1] * (1 - v * 1.5)); nv = Math.min(1, v * def.dark[2]); }
        }
        if (nh === h && ns === s && nv === v) continue;
        const C = nv * ns, X = C * (1 - Math.abs((nh / 60) % 2 - 1)), m = nv - C; let R, G, B;
        if (nh < 60) [R, G, B] = [C, X, 0]; else if (nh < 120) [R, G, B] = [X, C, 0]; else if (nh < 180) [R, G, B] = [0, C, X]; else if (nh < 240) [R, G, B] = [0, X, C]; else if (nh < 300) [R, G, B] = [X, 0, C]; else [R, G, B] = [C, 0, X];
        a[i] = (R + m) * 255; a[i + 1] = (G + m) * 255; a[i + 2] = (B + m) * 255;
      }
      g.putImageData(d, 0, 0);
    } catch (e) { // image « tainted » (file://) : repli teinte par mélange
      g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.35; g.fillStyle = def.mirror ? "#10b981" : id === "aurelia" ? "#be123c" : "#d4a017"; g.fillRect(0, 0, c.width, c.height);
    }
    c.naturalWidth = c.width; c.naturalHeight = c.height;
    return c;
  }
};

// ---------- HAPTIQUE : vibration manette (dual-rumble) + mobile ----------
const Haptics = {
  last: 0,
  hit(f, strength = 0.6, ms = 100) {
    if (Settings.haptics === false || !f) return;
    const now = performance.now(); if (now - this.last < 40) return; this.last = now;
    try {
      let pad = null;
      if (f.ctrl === "p1" || f.ctrl === "p2") pad = Input.padFor(f);
      else if (f.ctrl === "net" && typeof Online !== "undefined" && Online.localSide === f.side) pad = Input.padFor({ ctrl: "p1" });
      if (pad && pad.vibrationActuator && pad.vibrationActuator.playEffect) pad.vibrationActuator.playEffect("dual-rumble", { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength + 0.2) }).catch(() => { });
      const local = f.ctrl === "p1" || (f.ctrl === "net" && typeof Online !== "undefined" && Online.localSide === f.side);
      const ua = navigator.userActivation;
      if (local && navigator.vibrate && (typeof View !== "undefined" && View.isTouch && View.isTouch()) && (!ua || ua.hasBeenActive)) navigator.vibrate(Math.round(ms * strength));
    } catch (e) { }
  }
};
