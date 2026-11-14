/* =====================================================================
   MOTEUR DE COMBAT (1/3) : combattants, moveset, combos, dégâts
   ===================================================================== */
const STEP = 1000 / 60;
const Match = {
  active: false, type: "versus", stageIdx: 0, stage: STAGES[0], round: 1, timer: 99, timerOn: true, tick: 0,
  state: "intro", st: 0, wins: [0, 0], winner: null, loser: null, firstBlood: false, finisher: null, seq: null,
  hitstop: 0, shake: 0, flash: 0, flashColor: "#fff", dark: 0, darkTarget: 0, timeScale: 1, slowT: 0,
  difficulty: "guerrier", p1Char: "aurelia", training: null, perfect: [true, true], roundTime: 99, projectiles: [],
  chroma: 0, speed: null, lastParryAnn: -9999, logicMs: 0, winsNeeded: 2, mods: {}, p2Char: "hai", startFrame: 0
};
// Bus d'évènements de jeu (Krypte, trophées, tutoriel, Tour des Défis, en ligne…)
const GameEv = {
  L: {},
  on(n, fn) { (GameEv.L[n] = GameEv.L[n] || []).push(fn); },
  emit(n, d) { const l = GameEv.L[n]; if (l) for (const fn of l) try { fn(d || {}); } catch (e) { if (window.MK_DEBUG) console.warn(e); } }
};
const F = [];
const Cam = { x: W / 2, y: H / 2, z: 1, override: null };
let frameCount = 0;

function otherChar(id) { return id === "aurelia" ? "hai" : "aurelia"; }
function blankInput() { return { l: 0, r: 0, u: 0, d: 0, lp: 0, hp: 0, sp: 0, tp: 0, gp: 0, ex: 0, xr: 0, f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, dash: 0, brk: 0, tn: 0 }; }
function isHuman(f) { return f && (f.ctrl === "p1" || f.ctrl === "p2" || f.ctrl === "net"); }

function makeFighter(charId, side, ctrl, costume) {
  const ch = CHARACTERS[charId] || CHARACTERS.aurelia;
  return {
    ch, id: charId, side, ctrl, x: side ? 900 : 380, y: Match.stage.floor, vx: 0, vy: 0, face: side ? -1 : 1,
    hp: 100, red: 100, redDelay: 0, meter: 0, guard: 100, state: "idle", t: 0, move: null, moveName: "", hitDone: false, blockedHit: false,
    combo: 0, comboDmg: 0, juggles: 0, inv: 0, sx: 1, sy: 1, lean: 0, flash: 0, trail: [], trailOn: 0, hidden: false, alpha: 1,
    stats: { hits: 0, maxCombo: 0, dmg: 0, specials: 0, parries: 0 }, cd: { tele: 0, taunt: 0 }, hist: [], buffer: null, breakerUsed: false,
    voiceCd: 0, guardT: -999, guardEnd: -999, edge: null, evDirs: null,
    inp: blankInput(), prev: blankInput(), ai: { plan: [], cool: 0, threatT: -999, threatSeen: null, guardT: 0, projMark: null, finishT: 0 },
    scale: 1, tint: null, airUsed: false, castKind: null, wins: 0, forceSprite: null, costume: costume || "base"
  };
}

// ---------------- MISE EN PLACE D'UN MATCH ----------------
function setupMatch(opts) {
  Object.assign(Match, { type: opts.type, stageIdx: opts.stageIdx, stage: STAGES[opts.stageIdx] || STAGES[0], difficulty: opts.difficulty || "guerrier", p1Char: opts.p1Char || "aurelia",
    wins: [0, 0], round: 1, active: true, roundTime: opts.roundTime || Settings.roundTime, winsNeeded: opts.winsNeeded || 2, mods: opts.mods || {}, startFrame: frameCount,
    training: opts.type === "training" ? Object.assign({ dummy: "idle", infMeter: true, regen: true, lastCombo: null }, opts.training || {}) : null });
  const p1 = Match.p1Char, p2 = opts.p2Char || otherChar(p1); Match.p2Char = p2;
  const cs = opts.costumes || [typeof Progress !== "undefined" ? Progress.costumeOf(p1) : "base", typeof Progress !== "undefined" ? Progress.costumeOf(p2) : "base"];
  if (p1 === p2 && cs[0] === cs[1]) cs[1] = cs[0] === "base" ? "mirror" : "base"; // miroir : palette alternative automatique
  F.length = 0;
  const net = opts.type === "online";
  F.push(makeFighter(p1, 0, net ? "net" : "p1", cs[0]));
  F.push(makeFighter(p2, 1, net ? "net" : opts.type === "2p" ? "p2" : opts.type === "training" || opts.type === "tutorial" ? "dummy" : "ai", cs[1]));
  Weather.init(Match.stage);
  P.length = 0;
  startRound();
}
function startRound() {
  const fl = Match.stage.floor;
  F.forEach((f, i) => {
    Object.assign(f, { x: i ? 900 : 380, y: fl, vx: 0, vy: 0, face: i ? -1 : 1, hp: 100, red: 100, guard: 100, state: "intro", t: 0, move: null, combo: 0, comboDmg: 0, juggles: 0, inv: 0,
      sx: 1, sy: 1, lean: 0, flash: 0, trail: [], hidden: false, alpha: 1, scale: 1, tint: null, hist: [], buffer: null, airUsed: false, forceSprite: null, breakerUsed: false });
    f.ai.plan = []; f.ai.finishT = 0; f.wins = Match.wins[i];
    f.guardT = -999; f.guardEnd = -999; f.voiceCd = 0;
    if (Match.round === 1) { f.meter = Match.training && !Match.training.tutorial ? 300 : 0; f.stats = { hits: 0, maxCombo: 0, dmg: 0, specials: 0, parries: 0 }; }
    if (Match.mods.hp) { f.hp = f.red = Match.mods.hp; }
    if (Match.mods.giant && i === 1) f.scale = 1.22;
  });
  Object.assign(Match, { state: "intro", st: 0, timer: Match.roundTime, tick: 0, seq: null, finisher: null, winner: null, loser: null, firstBlood: false,
    perfect: [true, true], dark: 0, darkTarget: 0, timeScale: 1, slowT: 0, hitstop: 0, chroma: 0, speed: null });
  Match.projectiles.length = 0; Cam.override = null;
  UI.hudReset();
  Audio2.playMusic(Match.stage.music);
  if (Match.training) { Match.state = "fight"; F.forEach(f => f.state = "idle"); if (!Match.training.tutorial) UI.banner("ENTRAÎNEMENT", "Combos • X-Ray • Fatalities", "round", 90); }
  GameEv.emit("roundStart", { round: Match.round });
}

// ---------------- ENTRÉES & CODES ----------------
function pressed(f, k) { return (f.inp[k] && !f.prev[k]) || !!(f.edge && f.edge[k]); }
// ---- Voix des combattants (clips MP3) + bulle HUD ----
function speak(f, key, force) {
  if (!f || (!force && f.voiceCd > 0)) return 0;
  const id = f.ch.pfx + "_" + key;
  const d = Audio2.voice(id, { ch: "f" + f.side, pan: (f.x / W * 2 - 1) * 0.55 });
  if (d) { f.voiceCd = Math.round(d * 60) + 40; const m = typeof VOICE_LINES !== "undefined" && VOICE_LINES[id]; UI.speech(f.side, m ? m.text : "", d, id); }
  return d;
}
function speedFx(x, y, amt, color, dir = 0) { Match.speed = { x, y, amt, color, dir, t: 0 }; }
// Mémorise les appuis pendant le hitstop (buffer + historique de codes) => rien n'est perdu
function bufferInputs(f) {
  if (f.evDirs) for (const d of f.evDirs) pushHist(f, d === "l" ? relDir(f, -1) : d === "r" ? relDir(f, 1) : d === "u" ? "U" : "D");
  else { if (pressed(f, "l")) pushHist(f, relDir(f, -1)); if (pressed(f, "r")) pushHist(f, relDir(f, 1)); if (pressed(f, "u")) pushHist(f, "U"); if (pressed(f, "d")) pushHist(f, "D"); }
  for (const k of BUF_KEYS) if (pressed(f, k)) f.buffer = { k, t: frameCount };
  const ad = f.inp.r ? 1 : f.inp.l ? -1 : 0;
  if (ad && f.inp.dash && (pressed(f, "dash") || pressed(f, "l") || pressed(f, "r"))) f.buffer = { k: "dash", d: ad, t: frameCount };
  f.histDone = true;
}
const BUF_KEYS = ["lp", "hp", "sp", "ex", "tp", "gp", "xr", "tn"];
function relDir(f, absDir) { return absDir === f.face ? "F" : "B"; }
function pushHist(f, d) { f.hist.push({ d, t: frameCount }); if (f.hist.length > 8) f.hist.shift(); }
function checkCode(f, code) {
  const h = f.hist.filter(e => frameCount - e.t < 75).map(e => e.d);
  if (h.length < code.length) return false;
  for (let i = 0; i < code.length; i++) if (h[h.length - code.length + i] !== code[i]) return false;
  return true;
}

// ---------------- ACTIONS ----------------
function canAct(f) { return ["idle", "walk", "guard", "land"].includes(f.state); }
function setState(f, s, extra) { f.state = s; f.t = 0; if (extra) Object.assign(f, extra); }
function startAttack(f, name) {
  const mv = MOVES[name]; f.move = mv; f.moveName = name; f.hitDone = false; f.blockedHit = false;
  setState(f, mv.air ? "airatk" : "attack");
  if (!mv.air) f.vx = f.face * (name === "heavy" ? 3 : 2);
  Audio2.play("whoosh", name === "heavy" ? 0.7 : 1);
  if (name === "heavy") { f.sx = 1.06; f.sy = 0.95; }
}
function doSpecial(f, ex) {
  if (Match.mods.noproj && f.ctrl === "p1") { UI.notify("PROJECTILES INTERDITS", f.side, "warn", true); return false; }
  if (ex && f.meter < 100) ex = false;
  if (Match.projectiles.some(p => p.owner === f && !p.dead)) return false;
  if (ex) { f.meter -= 100; UI.notify("EX !", f.side, "ex"); }
  f.castKind = ex ? "ex" : "sp"; setState(f, "cast"); f.vx = 0; f.stats.specials++;
  speak(f, ex ? "sp2" : "sp1", ex); GameEv.emit("special", { f, ex });
  return true;
}
function doTeleport(f) {
  if (f.cd.tele > 0) return false;
  f.cd.tele = 75; setState(f, "tele"); f.inv = 18; Audio2.play("teleport"); f.trailOn = 24;
  speedFx(f.x, f.y - 150, 0.85, f.ch.light, 0); Match.chroma = Math.max(Match.chroma, 0.35); speak(f, "tele");
  burst(f.x, f.y - 150, f.ch.color, 30, 9, "orb", { size: 3 });
  if (f.id === "hai") glyphBurst(f.x, f.y - 150, "#22d3ee", 18, BIN, 5); else if (f.id === "eye") { glyphBurst(f.x, f.y - 150, "#fbbf24", 14, SACRED, 5); ring(f.x, f.y - 150, "#a855f7", 10, 12, 20, 6); } else glyphBurst(f.x, f.y - 150, "#d946ef", 10, RUNES, 4);
  return true;
}
function doDash(f, dir, cancel) { if (cancel) GameEv.emit("dashCancel", { f }); setState(f, "dash"); f.dashDir = dir; f.vx = dir * (cancel ? 15 : 13); f.trailOn = 14; f.dashCancel = !!cancel; if (dir !== f.face) f.inv = 9; Audio2.play("dash"); burst(f.x - dir * 30, f.y - 20, "rgba(200,200,255,0.6)", 8, 3, "smoke", { size: 10 }); speedFx(f.x, f.y - 150, cancel ? 0.8 : 0.55, f.ch.light, dir); }
function doTaunt(f) {
  setState(f, "taunt"); f.vx = 0; Audio2.play("taunt");
  speak(f, Math.random() < 0.5 ? "taunt1" : "taunt2", true);
  if (f.cd.taunt <= 0) { f.meter = Math.min(300, f.meter + 15); f.cd.taunt = 240; UI.notify("PROVOCATION +SUPER", f.side, "ex"); }
  burst(f.x, f.y - 280, f.ch.light, 10, 3, "orb", { size: 3 });
}
function doGrab(f) { setState(f, "grab"); f.vx = f.face * 2; Audio2.play("whoosh", 0.6); }
function doXray(f) {
  if (f.meter < 300) return false;
  f.meter = 0; setState(f, "xray_lunge"); f.inv = 30; Match.hitstop = 22; Match.flash = 0.6; Match.flashColor = f.ch.color;
  UI.notify("X-RAY !", f.side, "xray"); Audio2.play("xray"); ring(f.x, f.y - 150, f.ch.color, 20, 14, 26, 8);
  speak(f, "xray", true); speedFx(f.x, f.y - 150, 1, f.ch.light, 0); Match.chroma = 1; GameEv.emit("xray", { f });
  return true;
}

function handleInput(f, opp) {
  const I = f.inp;
  if (!f.histDone) {
    if (f.evDirs) for (const d of f.evDirs) pushHist(f, d === "l" ? relDir(f, -1) : d === "r" ? relDir(f, 1) : d === "u" ? "U" : "D");
    else { if (pressed(f, "l")) pushHist(f, relDir(f, -1)); if (pressed(f, "r")) pushHist(f, relDir(f, 1)); if (pressed(f, "u")) pushHist(f, "U"); if (pressed(f, "d")) pushHist(f, "D"); }
  }
  f.histDone = false;

  // ---- FINISH : codes de fatality (ou touches rapides) ----
  if (Match.state === "finish" && f === Match.winner) {
    const fats = f.ch.fatalities, BK = { light: "lp", heavy: "hp", special: "sp", taunt: "tn" }; let which = null;
    if (pressed(f, "f1") || (pressed(f, BK[fats[0].btn]) && checkCode(f, fats[0].code))) which = "fatality1";
    else if (pressed(f, "f2") || (pressed(f, BK[fats[1].btn]) && checkCode(f, fats[1].code))) which = "fatality2";
    else if (pressed(f, "f3") || (pressed(f, "sp") && checkCode(f, STAGE_FATALITY_CODE.code))) which = "stage";
    else if (f.ch.friendship && (pressed(f, "f4") || (pressed(f, BK[f.ch.friendship.btn]) && checkCode(f, f.ch.friendship.code)))) which = "friendship";
    else if (f.ch.animality && (pressed(f, "f5") || (pressed(f, BK[f.ch.animality.btn]) && checkCode(f, f.ch.animality.code)))) which = "animality";
    if (which !== null) { startFinisher(f, opp, which); return; }
    if (pressed(f, "tn")) return; // pas de provocation pendant FINISH (réservé à la Friendship)
  }
  if (Match.state === "finish" && f === Match.loser) return;
  // ---- Combo Breaker ----
  if ((f.state === "hitstun" || f.state === "juggle") && f.meter >= 100 && f.combo >= 2 && !f.breakerUsed && (pressed(f, "brk") || (I.d && pressed(f, "sp")))) { comboBreaker(f, opp); return; }
  // ---- Tech de chope ----
  if (f.state === "thrown" && f.t < 10 && pressed(f, "gp")) { techThrow(f, opp); return; }
  // ---- buffer d'entrées (12 frames) ----
  for (const k of BUF_KEYS) if (pressed(f, k)) f.buffer = { k, t: frameCount };
  if (f.buffer && frameCount - f.buffer.t > 12) f.buffer = null;
  const absDir = I.r ? 1 : I.l ? -1 : 0;
  const dblTap = absDir && (pressed(f, "l") || pressed(f, "r")) && f.lastTap && f.lastTap.d === absDir && frameCount - f.lastTap.t < 14;
  // ---- CANCELS : light / light2 / heavy -> special, ex, tele (touché OU bloqué) ----
  if (f.state === "attack" && f.move && f.move.chain && f.hitDone && f.t >= f.move.startup) {
    // Dash Cancel sur coup réussi (touché) : Dash + direction ou double-tap
    const bufDash = f.buffer && f.buffer.k === "dash" && frameCount - f.buffer.t <= 12 ? f.buffer.d : 0;
    if (!f.blockedHit && ["light", "light2", "heavy"].includes(f.moveName) && ((absDir && (I.dash && (pressed(f, "dash") || pressed(f, "l") || pressed(f, "r")) || dblTap)) || bufDash)) {
      const d = absDir || bufDash; f.lastTap = null; f.buffer = null; doDash(f, d, true); UI.notify("DASH CANCEL", f.side, "tech", true); return;
    }
    if (f.buffer) {
      const map = { lp: f.moveName === "light" ? "light2" : "light", hp: "heavy", sp: "special", ex: "ex", tp: "tele" };
      const next = map[f.buffer.k];
      const ok = next && (next === "light2" ? f.moveName === "light" : f.move.chain.includes(next));
      if (ok) {
        f.buffer = null;
        if (next === "special" || next === "ex") { if (!doSpecial(f, next === "ex")) startAttack(f, "heavy"); }
        else if (next === "tele") { if (!doTeleport(f)) return; }
        else startAttack(f, next);
        return;
      }
    }
  }
  if (f.state === "jump" && !f.airUsed && (pressed(f, "lp") || pressed(f, "hp"))) { f.airUsed = true; startAttack(f, "air"); return; }
  // fin de dash : on peut annuler la fin d'un dash par une attaque
  if (f.state === "dash" && f.t >= 6 && f.buffer && ["lp", "hp", "sp", "ex", "gp"].includes(f.buffer.k)) setState(f, "idle");
  if (!canAct(f)) return;

  // appui frais OU appui mémorisé pendant la récupération (tamponné) => réactivité maximale
  const want = k => { if (pressed(f, k)) return true; if (f.buffer && f.buffer.k === k && frameCount - f.buffer.t <= 10) return true; return false; };
  const use = () => { f.buffer = null; };
  if (want("xr") && f.meter >= 300) { use(); doXray(f); return; }
  if (want("ex") && doSpecial(f, true)) { use(); return; }
  if (want("tp") && doTeleport(f)) { use(); return; }
  if (want("gp")) { use(); doGrab(f); return; }
  if (want("sp") && !I.d && doSpecial(f, false)) { use(); return; }
  if (want("hp")) { use(); startAttack(f, "heavy"); return; }
  if (want("lp")) { use(); startAttack(f, "light"); return; }
  if (want("tn")) { use(); doTaunt(f); return; }
  if (I.dash && absDir) { doDash(f, absDir); return; }
  if (absDir && (pressed(f, "l") || pressed(f, "r"))) {
    if (dblTap) { f.lastTap = null; doDash(f, absDir); return; }
    f.lastTap = { d: absDir, t: frameCount };
  }
  if (I.u && f.y >= Match.stage.floor - 1) { setState(f, "jump"); f.vy = f.ch.jump; f.vx = absDir * 4.8; f.sx = 0.86; f.sy = 1.16; f.airUsed = false; Audio2.play("jump"); return; }
  if (I.d) {
    if (f.state !== "guard") { f.guardT = frameCount - (f.guardEnd > frameCount - 10 ? 99 : 0); setState(f, "guard"); }
    f.vx = 0; return;
  }
  if (f.state === "guard") { setState(f, "idle"); f.guardEnd = frameCount; }
  if (absDir) { const fwd = absDir === f.face; f.vx = absDir * (fwd ? f.ch.walk : f.ch.back); if (f.state !== "walk") setState(f, "walk"); }
  else { f.vx = 0; if (f.state === "walk") setState(f, "idle"); }
}

// ---------------- MISE À JOUR D'UN COMBATTANT ----------------
function updateFighter(f, opp) {
  const fl = Match.stage.floor;
  f.t++;
  if (f.inv > 0) f.inv--;
  if (f.cd.tele > 0) f.cd.tele--;
  if (f.cd.taunt > 0) f.cd.taunt--;
  if (f.voiceCd > 0) f.voiceCd--;
  if (f.flash > 0) f.flash--;
  f.sx += (1 - f.sx) * 0.2; f.sy += (1 - f.sy) * 0.2;
  if (f.state !== "guard" && f.state !== "blockstun") f.guard = Math.min(100, f.guard + 0.3);
  if (f.redDelay > 0) f.redDelay--; else if (f.red > f.hp) f.red = Math.max(f.hp, f.red - 0.7);
  if (Match.training && Match.training.infMeter && f.ctrl === "p1") f.meter = 300;
  if (Match.mods.infmeter) f.meter = 300;
  if (Match.state === "fight") { if (Match.mods.acid && f.ctrl === "p1" && f.hp > 1) { f.hp = Math.max(1, f.hp - 0.012); f.red = Math.max(f.red, f.hp); } if (Match.mods.regen && f.side === 1 && f.hp < 100 && f.hp > 0) f.hp = Math.min(100, f.hp + 0.035); }
  if (Match.training && Match.training.regen && f.state === "idle" && f.t > 70 && f.hp < 100) { f.hp = Math.min(100, f.hp + 1.2); f.red = Math.max(f.red, f.hp); }

  const grounded = f.y >= fl - 0.5;
  switch (f.state) {
    case "idle": case "walk": case "guard": if (grounded && opp.state !== "tele") f.face = opp.x >= f.x ? 1 : -1; break;
    case "land": f.vx *= 0.7; if (f.t > 6) setState(f, "idle"); break;
    case "attack": {
      const mv = f.move; f.vx *= 0.85;
      if (f.t === mv.startup && f.moveName === "heavy") f.vx = f.face * 5;
      if (f.t >= mv.startup && f.t < mv.startup + mv.active && !f.hitDone) tryHit(f, opp, mv, f.moveName);
      if (f.t >= mv.startup + mv.active + mv.recovery) { setState(f, "idle"); f.move = null; }
      break;
    }
    case "airatk": { const mv = f.move; if (f.t >= mv.startup && f.t < mv.startup + mv.active && !f.hitDone) tryHit(f, opp, mv, "air"); break; }
    case "cast": {
      if (f.t === 1) burst(f.x + f.face * 40, f.y - 170, f.ch.color, 16, 5, "orb", { size: 3 });
      if (f.t === 12) spawnProjectile(f, f.castKind === "ex");
      if (f.t >= 34) setState(f, "idle");
      break;
    }
    case "tele": {
      f.alpha = f.t < 10 ? 1 - f.t / 10 : 0;
      if (f.t === 11 && f.id === "eye") { // Repli Dimensionnel : réapparaît au-dessus et plonge
        f.x = clamp(opp.x - opp.face * 50, 70, W - 70); f.y = fl - 250; f.vy = 0; f.face = opp.x >= f.x ? 1 : -1;
        ring(f.x, f.y - 150, "#a855f7", 10, 10, 20, 5); glyphBurst(f.x, f.y - 150, "#fbbf24", 12, SACRED, 4); Audio2.play("glitch");
      }
      if (f.t >= 14 && f.id === "eye") { f.alpha = 1; startAttack(f, "dive"); f.vy = 13; f.vx = f.face * 2.5; f.airUsed = true; break; }
      if (f.t === 11 && f.id !== "eye") {
        let nx = opp.x - opp.face * 130;
        if (nx < 70 || nx > W - 70) nx = opp.x + opp.face * 130;
        f.x = clamp(nx, 70, W - 70); f.y = fl; f.vy = 0; f.face = opp.x >= f.x ? 1 : -1;
        burst(f.x, f.y - 150, f.ch.color2, 26, 8, "orb", { size: 3 }); ring(f.x, f.y - 150, f.ch.color, 10, 8, 18, 4);
        if (f.id === "hai") Audio2.play("glitch");
      }
      if (f.t >= 14) { f.alpha = 1; startAttack(f, "tele"); }
      break;
    }
    case "dash": f.vx *= 0.88; if (f.t >= (f.dashCancel ? 12 : 15)) setState(f, "idle"); break;
    case "taunt": f.vx = 0; if (f.t % 8 === 0) emit({ x: f.x + rnd(-50, 50), y: f.y - rnd(60, 280), vy: -rnd(1, 2.5), type: "orb", color: f.ch.light, size: rnd(2, 4), life: 28 }); if (f.t >= 42) setState(f, "idle"); break;
    case "parried": f.vx *= 0.85; if (f.t >= f.stun) setState(f, "idle"); break;
    case "grab": {
      f.vx *= 0.8;
      if (f.t === 6) {
        const d = Math.abs(opp.x - f.x);
        if (d < 135 && opp.y >= fl - 5 && !opp.inv && !["juggle", "down", "getup", "ko", "dizzy", "tele"].includes(opp.state)) { setState(f, "throw"); setState(opp, "thrown"); opp.vx = 0; Audio2.play("grab"); }
      }
      if (f.state === "grab" && f.t >= 26) setState(f, "idle");
      break;
    }
    case "throw": {
      if (f.t === 18 && opp.state === "thrown") {
        opp.x = clamp(f.x + f.face * 60, 50, W - 50);
        setState(opp, "juggle"); opp.vy = -11; opp.vx = f.face * 8;
        Match.shake = 14; Match.hitstop = 8; burst(opp.x, opp.y - 140, f.ch.color, 30, 9, "spark");
        if (f.id === "hai") glyphBurst(opp.x, opp.y - 150, "#22d3ee", 20, BIN, 6); else if (f.id === "eye") { const st = Math.min(opp.meter, 50); opp.meter -= st; f.meter = Math.min(300, f.meter + st); glyphBurst(opp.x, opp.y - 150, "#fbbf24", 22, SACRED, 6); burst(opp.x, opp.y - 150, "#a855f7", 26, 8, "orb", { size: 3, target: { x: f.x, y: f.y - 160, k: 0.02 } }); if (st > 5) UI.notify("SUPER ABSORBÉ", f.side, "ex"); } else burst(opp.x, opp.y - 150, "#a21caf", 20, 6, "blood");
        applyDamage(f, opp, 11, { type: "grab", noCombo: true }); Haptics.hit(opp, 0.6, 140);
      }
      if (f.t >= 34) setState(f, "idle");
      break;
    }
    case "thrown": if (opp.state === "throw") { if (opp.t < 18) { f.x = opp.x + opp.face * 70; f.y = fl - Math.sin(opp.t / 18 * Math.PI) * 50; } } else if (f.t > 40) setState(f, "idle"); break;
    case "xray_lunge": {
      if (f.t === 1) { f.vx = f.face * 15; f.trailOn = 30; }
      if (f.t > 1 && f.t < 26 && Math.abs(opp.x - f.x) < 150 && Math.abs(opp.y - f.y) < 160 && !["down", "getup", "ko", "tele"].includes(opp.state)) {
        if ((opp.state === "guard" || opp.state === "blockstun") && opp.y >= fl - 1) { f.hitDone = true; resolveHit(f, opp, { dmg: 6, hitstun: 20, block: 22, kb: 10 }, "xray"); setState(f, "idle"); }
        else { startXray(f, opp); return; }
      }
      if (f.state === "xray_lunge" && f.t >= 34) { f.vx = 0; setState(f, "idle"); }
      break;
    }
    case "hitstun": f.vx *= 0.86; if (f.t >= f.stun) { setState(f, "idle"); endCombo(f); } break;
    case "blockstun": f.vx *= 0.82; if (f.t >= f.stun) setState(f, f.inp.d ? "guard" : "idle"); break;
    case "stun": f.vx *= 0.85; if (f.t % 20 === 0) burst(f.x, f.y - 290, "#fde047", 4, 2, "orb", { size: 3 }); if (f.t >= 70) { setState(f, "idle"); endCombo(f); } break;
    case "juggle": break;
    case "down": f.vx *= 0.8; if (f.t >= 40 && Match.state !== "finish" && Match.state !== "roundend" && Match.state !== "over" && f.hp > 0) { setState(f, "getup"); f.inv = 16; } break;
    case "getup": if (f.t >= 14) { setState(f, "idle"); endCombo(f); f.lean = 0; } break;
    case "dizzy": f.vx *= 0.8; if (f.t % 6 === 0) emit({ x: f.x + Math.cos(f.t * 0.1) * 40, y: f.y - 320 + Math.sin(f.t * 0.1) * 8, life: 22, size: 3, color: "#fde047", type: "orb" }); break;
  }

  if (!["thrown", "tele", "fatality_v", "fatality_w"].includes(f.state)) {
    f.x += f.vx; f.y += f.vy;
    if (f.y < fl) f.vy += (f.state === "juggle" ? 0.72 : 0.9) * (Match.mods.grav || 1);
    else {
      if (f.vy > 0) {
        if (f.state === "jump" || f.state === "airatk") { setState(f, "land"); f.sx = 1.18; f.sy = 0.82; Audio2.play("land"); f.vx = 0; burst(f.x, fl - 4, "rgba(220,200,255,0.5)", 6, 3, "smoke", { size: 8 }); }
        else if (f.state === "juggle") { setState(f, "down"); f.vx *= 0.4; Match.shake = Math.max(Match.shake, 8); Audio2.play("land"); burst(f.x, fl - 6, "rgba(220,200,255,0.6)", 12, 5, "smoke", { size: 12 }); }
      }
      f.y = fl; f.vy = 0;
    }
  }
  f.x = clamp(f.x, 50, W - 50);
  if (f.trailOn > 0) { f.trailOn--; if (frameCount % 2 === 0) f.trail.push({ x: f.x, y: f.y, key: spriteKey(f), face: f.face, a: 0.55, lean: f.lean }); }
  for (let i = f.trail.length - 1; i >= 0; i--) { f.trail[i].a -= 0.05; if (f.trail[i].a <= 0) f.trail.splice(i, 1); }
  const tl = f.state === "walk" ? (f.vx * f.face > 0 ? 0.05 : -0.04) : f.state === "hitstun" ? -0.13 : f.state === "dash" ? (f.dashDir === f.face ? 0.12 : -0.1) : 0;
  f.lean += (tl - f.lean) * 0.2;
}

function endCombo(f) {
  if (f.combo >= 2) { const att = F[1 - f.side]; att.stats.maxCombo = Math.max(att.stats.maxCombo, f.combo); UI.comboEnd(att.side, f.combo, f.comboDmg); if (Match.training) Match.training.lastCombo = { n: f.combo, d: f.comboDmg }; GameEv.emit("combo", { att, vic: f, n: f.combo, dmg: f.comboDmg }); }
  f.combo = 0; f.comboDmg = 0; f.juggles = 0; f.breakerUsed = false;
}

// ---------------- COLLISIONS & DÉGÂTS ----------------
function hurtbox(f) {
  if (f.state === "down" || f.state === "ko") return { x0: f.x - 120, x1: f.x + 120, y0: f.y - 60, y1: f.y };
  if (f.state === "juggle") return { x0: f.x - 75, x1: f.x + 75, y0: f.y - 210, y1: f.y - 10 };
  return { x0: f.x - 48, x1: f.x + 48, y0: f.y - 285, y1: f.y };
}
function tryHit(att, vic, mv, name) {
  if (vic.inv > 0 || ["down", "getup", "ko", "tele", "thrown", "fatality_v"].includes(vic.state) || vic.hidden) return;
  const hb = hurtbox(vic);
  const ax0 = att.face > 0 ? att.x : att.x - mv.reach, ax1 = att.face > 0 ? att.x + mv.reach : att.x;
  const ay0 = att.y - mv.yTop, ay1 = att.y - mv.yBot;
  if (ax1 < hb.x0 || ax0 > hb.x1 || ay1 < hb.y0 || ay0 > hb.y1) return;
  att.hitDone = true;
  resolveHit(att, vic, mv, name);
}
function resolveHit(att, vic, mv, name) {
  const fl = Match.stage.floor;
  const hx = (att.x + vic.x) / 2, hy = vic.y - (name === "air" ? 220 : 170);
  const isSpecial = name === "special" || name === "ex" || name === "xray";
  const canBlock = (vic.state === "guard" || vic.state === "blockstun") && vic.y >= fl - 1;
  if (canBlock && vic.state === "guard" && frameCount - vic.guardT <= 6 && canParry(vic)) { doParry(att, vic, hx, hy, name); return; }
  if (canBlock) {
    const chip = mv.dmg * (isSpecial ? 0.22 : 0.12);
    vic.hp = Math.max(1, vic.hp - chip); vic.redDelay = 30;
    vic.guard -= mv.dmg * 4.2 + (name === "heavy" ? 8 : 0);
    setState(vic, "blockstun", { stun: mv.block }); vic.vx = att.face * (mv.kb * 0.8 + 2);
    att.meter = Math.min(300, att.meter + mv.dmg * 1.2); vic.meter = Math.min(300, vic.meter + mv.dmg * 0.8);
    att.blockedHit = true; Match.hitstop = Math.max(Match.hitstop, 4);
    burst(hx, hy, vic.ch.spark, 14, 5, "spark"); ring(hx, hy, "#e0f2fe", 8, 5, 12, 3);
    Audio2.play("block"); UI.notify("BLOQUÉ", vic.side, "block", true);
    if (vic.guard <= 0) { vic.guard = 30; setState(vic, "stun"); vic.vx = att.face * 4; UI.notify("GUARD BREAK !", vic.side, "warn"); Audio2.play("guardbreak"); Match.shake = 12; Match.chroma = Math.max(Match.chroma, 0.75); burst(vic.x + vic.face * 40, vic.y - 160, "#fff", 40, 10, "spark"); }
    return;
  }
  const counter = vic.state === "attack" && vic.move && vic.t < vic.move.startup;
  const punish = vic.state === "attack" && vic.move && vic.t >= vic.move.startup + vic.move.active;
  const scale = vic.combo > 1 ? Math.max(0.42, 1 - 0.1 * (vic.combo - 1)) : 1;
  const dmg = mv.dmg * scale * (counter ? 1.25 : 1) * (Match.mods.giant && att.side === 1 ? 1.2 : 1) * (Match.mods.boss && att.side === 1 ? 1.15 : 1) * (Match.mods.dmg || 1);
  const heavy = ["heavy", "ex", "tele", "air"].includes(name);
  vic.flash = 6;
  Match.hitstop = Math.max(Match.hitstop, heavy ? 9 : 5);
  Match.shake = Math.max(Match.shake, dmg * 1.3);
  burst(hx, hy, att.ch.color, heavy ? 30 : 18, heavy ? 10 : 7, "spark");
  burst(hx, hy, "#fff", 6, 4, "orb", { size: 3 });
  burst(hx, hy, vic.ch.blood, heavy ? 16 : 8, 6, "blood", { size: rnd(2, 4) });
  burst(hx, hy, "#8b0000", heavy ? 8 : 4, 5, "blood", { size: 2.5 });
  ring(hx, hy, att.ch.light, 6, heavy ? 9 : 6, 14, heavy ? 6 : 3);
  if (att.id === "hai") glyphBurst(hx, hy, "#fbbf24", heavy ? 8 : 4, BIN, 4); else if (att.id === "eye") glyphBurst(hx, hy, heavy ? "#fbbf24" : "#c084fc", heavy ? 7 : 3, SACRED, 4); else if (heavy) glyphBurst(hx, hy, "#e879f9", 5, RUNES, 4);
  if (heavy || counter) Haptics.hit(vic, heavy ? 0.75 : 0.5, heavy ? 120 : 70); if (heavy) Haptics.hit(att, 0.35, 50);
  Audio2.play(name === "light" || name === "light2" ? (att.id === "aurelia" ? "slash" : "light") : name === "tele" ? "slash" : "heavy");
  if (heavy || name === "xray") speedFx(hx, hy, heavy ? 0.5 : 0.7, att.ch.light, 0);
  if (counter) { UI.notify("COUNTER !", att.side, "counter"); Audio2.play("counter"); Match.chroma = Math.max(Match.chroma, 0.6); }
  else if (punish) UI.notify("PUNITION !", att.side, "counter");
  // réaction (avant dégâts pour que le KO puisse écraser l'état)
  const airborne = vic.y < fl - 2 || vic.state === "juggle";
  if (mv.knockdown || (mv.launch && (vic.combo >= 2 || counter))) { setState(vic, "juggle"); vic.vy = mv.knockdown ? -10 : -13.5; vic.vx = att.face * (mv.knockdown ? 6 : 3.2); vic.juggles++; }
  else if (airborne) { setState(vic, "juggle"); vic.juggles++; vic.vy = vic.juggles > 4 ? -3 : -8.5; vic.vx = att.face * 3; }
  else if (mv.stunHit) { setState(vic, "stun"); vic.t = 25; vic.vx = att.face * 3; }
  else { setState(vic, "hitstun", { stun: mv.hitstun + (counter ? 6 : 0) }); vic.vx = att.face * mv.kb; vic.sx = 0.9; vic.sy = 1.05; }
  vic.move = null;
  applyDamage(att, vic, dmg, { type: name });
  GameEv.emit("hit", { att, vic, name, dmg, counter });
}
function applyDamage(att, vic, dmg, opts) {
  vic.hp = Math.max(0, vic.hp - dmg); vic.redDelay = 32;
  if (!opts.noCombo) { vic.combo++; vic.comboDmg += dmg; }
  vic.lastHitType = opts.type; att.stats.hits++; att.stats.dmg += dmg;
  att.meter = Math.min(300, att.meter + dmg * 2.4); vic.meter = Math.min(300, vic.meter + dmg * 1.5);
  Match.perfect[vic.side] = false;
  if (!Match.firstBlood && !Match.training) { Match.firstBlood = true; UI.notify("FIRST BLOOD", att.side, "blood"); burst(vic.x, vic.y - 170, "#b91c1c", 30, 9, "blood"); if (Match.round === 1) Audio2.voice("ann_first_blood", { ch: "ann", ifFree: true }); }
  if (vic.combo >= 2) UI.comboLive(att.side, vic.combo, vic.comboDmg);
  if (Match.training) { if (vic.hp <= 0) { vic.hp = 100; vic.red = 100; UI.notify("SANTÉ RESTAURÉE", vic.side, "block"); } return; }
  if (vic.hp <= 0) handleKO(att, vic, opts.type);
}
function handleKO(att, vic, type) {
  if (Match.state === "finish") { Match.finisher = "ko"; vic.hp = 0; setState(vic, "juggle"); vic.vy = -12; vic.vx = att.face * 7; UI.banner("K.O.", "", "ko", 90); endRound(att, vic, "ko"); return; }
  if (Match.state !== "fight" && Match.state !== "xray") return;
  const decisive = Match.wins[att.side] + 1 >= Match.winsNeeded;
  Haptics.hit(vic, 1, 260);
  vic.hp = 0;
  if (decisive && (type === "special" || type === "ex" || type === "xray")) { startFinisher(att, vic, "brutality"); return; }
  if (decisive) {
    Match.state = "finish"; Match.st = 0; Match.winner = att; Match.loser = vic;
    endCombo(vic); setState(vic, "dizzy"); vic.vx = 0; vic.vy = 0; vic.y = Match.stage.floor;
    Match.projectiles.length = 0;
    Match.timeScale = 0.35; Match.slowT = 40; Match.darkTarget = 0.35;
    const pr = { HER: ["FINISH HER !", "ann_finish_her"], HIM: ["FINISH HIM !", "ann_finish_him"], IT: ["FINISH IT !", "ann_finish_it"] }[vic.ch.pronoun] || ["FINISH HIM !", "ann_finish_him"];
    UI.banner(pr[0], "", "finish", 150);
    Audio2.announce("finish", pr[0], pr[1]);
    Audio2.playMusic("finish");
    UI.finishPrompt(att);
    return;
  }
  Match.timeScale = 0.3; Match.slowT = 50; Match.flash = 0.5; Match.flashColor = "#fff";
  setState(vic, "juggle"); vic.vy = -12; vic.vx = att.face * 7;
  UI.banner("K.O.", "", "ko", 110); Audio2.announce("win", "K.O.", "ann_ko"); Match.chroma = 0.6;
  Match.finisher = "ko";
  endRound(att, vic, "ko");
}
function comboBreaker(f, opp) {
  f.meter -= 100; f.breakerUsed = true; endCombo(f); f.breakerUsed = true; setState(f, "idle"); f.inv = 20; f.vy = 0; f.y = Match.stage.floor;
  setState(opp, "juggle"); opp.vy = -7; opp.vx = -opp.face * 9; opp.move = null;
  UI.notify("BREAKER !", f.side, "breaker"); GameEv.emit("breaker", { f }); Audio2.play("breaker"); speak(f, "brk", true); Match.chroma = Math.max(Match.chroma, 0.7); Match.shake = 18; Match.hitstop = 10; Match.flash = 0.4; Match.flashColor = f.ch.color;
  ring(f.x, f.y - 150, f.ch.color, 20, 16, 26, 10); ring(f.x, f.y - 150, "#fff", 10, 12, 20, 4); burst(f.x, f.y - 150, f.ch.color, 60, 13, "spark");
}
function techThrow(f, opp) { setState(f, "idle"); setState(opp, "idle"); f.vx = -f.face * 8; opp.vx = -opp.face * 8; f.y = opp.y = Match.stage.floor; UI.notify("TECH !", f.side, "block"); Audio2.play("block"); burst((f.x + opp.x) / 2, f.y - 160, "#fff", 20, 6, "spark"); }

// ---------------- PARADE PARFAITE (Just Guard) ----------------
function canParry(f) {
  if (f.ctrl === "p1" || f.ctrl === "p2" || f.ctrl === "net") return true;
  if (f.ctrl === "ai") return Math.random() < ((DIFFICULTIES[Match.difficulty] || {}).parry || 0);
  return false;
}
function doParry(att, vic, hx, hy, name) {
  vic.meter = Math.min(300, vic.meter + 35); vic.guardT = -999; vic.stats.parries = (vic.stats.parries || 0) + 1;
  setState(vic, "idle"); vic.vx = -vic.face * 1.5; vic.inv = 3; vic.flash = 4;
  const melee = !["special", "ex"].includes(name) && Math.abs(att.x - vic.x) < 320;
  if (melee) { setState(att, "parried", { stun: name === "heavy" || name === "xray" ? 26 : 20 }); att.move = null; att.vx = -att.face * 4.5; att.trailOn = 0; }
  Match.hitstop = Math.max(Match.hitstop, 11); Match.chroma = Math.max(Match.chroma, 0.85); Match.flash = 0.35; Match.flashColor = "#fde68a";
  Match.timeScale = 0.55; Match.slowT = 14; Match.shake = Math.max(Match.shake, 6);
  ring(hx, hy, "#fde68a", 8, 15, 22, 9); ring(hx, hy, "#fff", 4, 10, 16, 4); ring(hx, hy, "#fbbf24", 20, 22, 30, 5);
  burst(hx, hy, "#fbbf24", 36, 11, "spark"); burst(hx, hy, "#fff7d6", 14, 6, "orb", { size: 3 });
  speedFx(hx, hy, 0.6, "#fde68a", 0);
  Audio2.play("parry"); UI.notify("PARADE PARFAITE !", vic.side, "counter"); GameEv.emit("parry", { f: vic, att }); Haptics.hit(vic, 0.4, 60);
  if (frameCount - Match.lastParryAnn > 300) { Match.lastParryAnn = frameCount; Audio2.voice("ann_parry", { ch: "ann", ifFree: true }); }
}

// ---------------- PROJECTILES ----------------
function spawnProjectile(f, ex) {
  const hai = f.id === "hai";
  if (f.id === "eye") {
    const p = ex ? { owner: f, x: f.x + f.face * 110, y: f.y - 170, vx: f.face * 5.2, r: 46, dmg: 6, hits: 2, life: 170, ex, type: "hole", rot: 0, dead: false, hitCd: 0, main: true }
      : { owner: f, x: f.x + f.face * 95, y: f.y - 180, vx: f.face * 15, r: 26, dmg: 7, hits: 1, life: 120, ex, type: "prism", rot: 0, dead: false, hitCd: 0, main: true };
    Match.projectiles.push(p); Audio2.play("projectile", true); burst(p.x, p.y, f.ch.color, 20, 7, "orb", { size: 3 }); return;
  }
  const base = { owner: f, x: f.x + f.face * 90, y: f.y - (hai ? 165 : 175), vx: f.face * (ex ? 11 : 12.5), r: ex ? 52 : 34, dmg: ex ? 13 : 8, hits: ex ? 2 : 1, life: 150, ex, type: hai ? "seal" : "orb", rot: 0, dead: false, hitCd: 0, main: true };
  Match.projectiles.push(base);
  if (ex && !hai) Match.projectiles.push(Object.assign({}, base, { y: base.y - 70, r: 24, dmg: 4, hits: 1, vx: base.vx * 1.1, main: false }), Object.assign({}, base, { y: base.y + 55, r: 24, dmg: 4, hits: 1, vx: base.vx * 1.1, main: false }));
  Audio2.play("projectile", hai);
  burst(base.x, base.y, f.ch.color, 20, 7, "orb", { size: 3 });
}
function updateProjectiles() {
  const list = Match.projectiles;
  for (const p of list) {
    if (p.dead) continue;
    p.x += p.vx; p.life--; p.rot += 0.15; if (p.hitCd > 0) p.hitCd--;
    if (p.type === "hole") { // Trou Noir : aspire l'adversaire au sol
      const v = F[1 - p.owner.side], d = p.x - v.x;
      if (Math.abs(d) < 430 && Math.abs(d) > 30 && ["idle", "walk", "guard", "blockstun", "hitstun"].includes(v.state) && v.y >= Match.stage.floor - 2) v.x = clamp(v.x + Math.sign(d) * 1.7, 50, W - 50);
      if (frameCount % 2 === 0) emit({ x: p.x + rnd(-120, 120), y: p.y + rnd(-90, 90), target: { x: p.x, y: p.y, k: 0.02 }, type: "orb", color: pick(["#a855f7", "#fbbf24", "#e9d5ff"]), size: rnd(1.5, 3), life: 26, drag: 0.9 });
    } else if (p.type === "prism") { if (frameCount % 2 === 0) emit({ x: p.x - p.vx, y: p.y + rnd(-8, 8), vx: -p.vx * 0.1, vy: rnd(-0.6, 0.6), type: "glyph", ch: pick(SACRED), color: pick(["#c084fc", "#fbbf24"]), size: 12, life: 18 }); }
    else if (frameCount % 2 === 0) { if (p.type === "seal") emit({ x: p.x - p.vx, y: p.y + rnd(-p.r, p.r) * 0.6, vx: -p.vx * 0.1, vy: rnd(-1, 1), type: "glyph", ch: pick(BIN), color: pick(["#22d3ee", "#fbbf24"]), size: 12, life: 24 }); else emit({ x: p.x - p.vx, y: p.y + rnd(-10, 10), vx: -p.vx * 0.15, vy: rnd(-1, 1), type: "orb", color: "#a21caf", size: rnd(3, 6), life: 26 }); }
    const vic = F[1 - p.owner.side], hb = hurtbox(vic);
    if (p.hitCd === 0 && vic.inv <= 0 && !["down", "getup", "ko", "tele", "fatality_v"].includes(vic.state) && p.x + p.r * 0.6 > hb.x0 && p.x - p.r * 0.6 < hb.x1 && p.y + p.r * 0.5 > hb.y0 && p.y - p.r * 0.5 < hb.y1) {
      const last = p.hits === 1;
      resolveHit(p.owner, vic, { dmg: p.dmg, hitstun: 20, block: 14, kb: p.type === "hole" ? 1 : 6, knockdown: p.ex && last && p.main && p.owner.id === "aurelia", stunHit: p.ex && last && (p.owner.id === "hai" || p.owner.id === "eye") }, p.ex ? "ex" : "special");
      p.hits--; p.hitCd = 10; burst(p.x, p.y, p.owner.ch.color, 26, 9, "orb", { size: 3 }); ring(p.x, p.y, p.owner.ch.light, 10, 8, 16, 5);
      if (p.hits <= 0) p.dead = true;
    }
    for (const q of list) if (q !== p && !q.dead && !p.dead && q.owner !== p.owner && Math.abs(q.x - p.x) < (q.r + p.r) * 0.7 && Math.abs(q.y - p.y) < 60) { p.dead = q.dead = true; burst((p.x + q.x) / 2, p.y, "#fff", 40, 11, "spark"); ring((p.x + q.x) / 2, p.y, "#fde047", 10, 12, 20, 6); Audio2.play("explode"); Match.shake = 10; }
    if (p.life <= 0 || p.x < -80 || p.x > W + 80) p.dead = true;
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
}
function drawProjectile(ctx, p) {
  if (p.type === "prism") {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const s = p.r * 4.5; ctx.drawImage(glowSprite("#a855f7"), p.x - s / 2, p.y - s / 2, s, s);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot * 2); ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(192,132,252,0.55)";
    ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 - Math.PI / 2; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * p.r, Math.sin(a) * p.r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-p.rot * 4); ctx.strokeStyle = "#e9d5ff"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI / 2; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * p.r * 0.6, Math.sin(a) * p.r * 0.6); } ctx.closePath(); ctx.stroke();
    ctx.restore(); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(251,191,36,0.5)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 5, p.y); ctx.stroke(); ctx.restore();
    return;
  }
  if (p.type === "hole") {
    const R = p.r * (0.92 + 0.08 * Math.sin(frameCount * 0.3));
    ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(p.rot * (i % 2 ? -1.5 : 1.2) + i); ctx.scale(1, 0.4); ctx.strokeStyle = i % 2 ? "rgba(251,191,36,0.75)" : "rgba(168,85,247,0.8)"; ctx.lineWidth = 6 - i; ctx.beginPath(); ctx.arc(0, 0, R * (1.35 + i * 0.22), 0, Math.PI * 1.5); ctx.stroke(); ctx.restore(); }
    const s = R * 4; ctx.drawImage(glowSprite("#7e22ce"), -s / 2, -s / 2, s, s);
    ctx.globalCompositeOperation = "source-over"; const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R); g.addColorStop(0, "#000"); g.addColorStop(0.75, "#05000a"); g.addColorStop(1, "rgba(251,191,36,0.85)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return;
  }
  if (p.type === "orb") {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const s = p.r * 4.2; ctx.drawImage(glowSprite("#c026d3"), p.x - s / 2, p.y - s / 2, s, s); ctx.restore();
    ctx.save(); const gr = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r); gr.addColorStop(0, "#000"); gr.addColorStop(0.65, "#1a0026"); gr.addColorStop(1, "rgba(217,70,239,0.9)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.9 + 0.1 * Math.sin(frameCount * 0.5)), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    for (let i = 0; i < 3; i++) { const a = rnd(Math.PI * 2); drawBolt(ctx, p.x, p.y, p.x + Math.cos(a) * p.r * 1.6, p.y + Math.sin(a) * p.r * 1.6, "#e879f9", 1.5, 10, "#fff", 0); }
  } else {
    drawSeal(ctx, p.x, p.y, p.r, p.rot * (p.vx > 0 ? 1 : -1), "#22d3ee", "#fbbf24", 0.95, 1, p.r > 40);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const s = p.r * 3.2; ctx.drawImage(glowSprite("#0891b2"), p.x - s / 2, p.y - s / 2, s, s); ctx.restore();
  }
}
