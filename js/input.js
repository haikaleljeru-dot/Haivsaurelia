/* =====================================================================
   ENTRÉES ULTRA RÉACTIVES : file d'événements horodatés (keydown /
   pointerdown) consommée dans l'ordre à chaque tick logique -> aucun
   appui perdu, codes de Fatality fiables ; manettes ; tactile sans délai
   ===================================================================== */
const KEYMAP = {
  p1: { l: ["KeyA"], r: ["KeyD"], u: ["KeyW"], d: ["KeyS"], lp: ["KeyF"], hp: ["KeyG"], sp: ["KeyH"], tp: ["KeyR"], gp: ["KeyT"], ex: ["KeyY"], xr: ["KeyB"],
        f1: ["Digit1"], f2: ["Digit2"], f3: ["Digit3"], f4: ["Digit4"], f5: ["Digit5"], dash: ["ShiftLeft"], brk: ["KeyV"], tn: ["KeyC"] },
  p2: { l: ["ArrowLeft"], r: ["ArrowRight"], u: ["ArrowUp"], d: ["ArrowDown"], lp: ["KeyJ", "Numpad1"], hp: ["KeyK", "Numpad2"], sp: ["KeyL", "Numpad3"], tp: ["KeyU", "Numpad4"],
        gp: ["KeyI", "Numpad5"], ex: ["KeyO", "Numpad6"], xr: ["KeyP", "Numpad0"], f1: ["Digit8", "Numpad7"], f2: ["Digit9", "Numpad8"], f3: ["Digit0", "Numpad9"], f4: ["Minus"], f5: ["Equal"], dash: ["ShiftRight", "NumpadEnter"], brk: ["KeyM", "NumpadAdd"], tn: ["Period", "NumpadDecimal", "KeyN"] }
};
const AZERTY_LABEL = { KeyA: "Q", KeyQ: "A", KeyW: "Z", KeyZ: "W", KeyM: ",", Semicolon: "M", Digit1: "1/&", Digit2: "2/é", Digit3: "3/\"", Digit8: "8/_", Digit9: "9/ç", Digit0: "0/à", Digit4: "4/'", Digit5: "5/(", Minus: ")", Equal: "=" };
function detectLayout() {
  if (Settings.layout !== "auto") return Settings.layout;
  if (typeof Input !== "undefined" && Input.hwLayout) return Input.hwLayout; // disposition matérielle réelle (Chromium)
  const l = (navigator.language || "").toLowerCase();
  return /^fr|^be/.test(l) ? "azerty" : "qwerty";
}
function keyLabel(code) {
  if (detectLayout() === "azerty" && AZERTY_LABEL[code]) return AZERTY_LABEL[code];
  return code.replace(/^Key/, "").replace(/^Digit/, "").replace("ArrowLeft", "←").replace("ArrowRight", "→").replace("ArrowUp", "↑").replace("ArrowDown", "↓")
    .replace("ShiftLeft", "Maj G").replace("ShiftRight", "Maj D").replace("Period", ".").replace("Minus", "-").replace("Equal", "=").replace(/^Numpad/, "Pavé ");
}
function keyOf(p, act) { return keyLabel(KEYMAP[p][act][0]); }

const Input = {
  keys: {}, touch: {}, pads: [], queue: [], lat: 0, latMax: 0, latN: 0, codeMap: null,
  init() {
    Input.codeMap = {};
    // détection réelle AZERTY / QWERTY via Keyboard Map API quand disponible (sinon : langue du navigateur)
    try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { const q = m.get("KeyQ"); if (q) Input.hwLayout = q.toLowerCase() === "a" ? "azerty" : "qwerty"; }).catch(() => { }); } catch (e) { }
    for (const p of ["p1", "p2"]) for (const k in KEYMAP[p]) for (const c of KEYMAP[p][k]) (Input.codeMap[c] = Input.codeMap[c] || []).push([p, k]);
    addEventListener("keydown", e => {
      const game = Input.isGameKey(e.code);
      if (e.repeat) { if (game && Game.mode === "fight") e.preventDefault(); return; }
      Input.keys[e.code] = true;
      if (game && Game.mode === "fight") { e.preventDefault(); Input.push(e.code, e.timeStamp); }
      if (["ArrowUp", "ArrowDown", "Space"].includes(e.code) && Game.mode !== "fight") e.preventDefault();
      UI.onKey(e);
    }, { capture: true });
    addEventListener("keyup", e => { Input.keys[e.code] = false; }, { capture: true });
    addEventListener("blur", () => { Input.keys = {}; Input.touch = {}; Input.queue.length = 0; });
    addEventListener("gamepadconnected", e => UI.toast("🎮 Manette connectée : " + (e.gamepad.id || "").slice(0, 30)));
  },
  push(code, ts) {
    // e.timeStamp et performance.now() partagent la même origine temporelle
    const t = ts && ts > 0 && ts <= performance.now() + 5 ? ts : performance.now();
    Input.queue.push({ c: code, t });
    if (Input.queue.length > 64) Input.queue.shift();
  },
  isGameKey(c) { return !!(Input.codeMap ? Input.codeMap[c] : false); },
  actionOf(code, ctrl, alsoP2) {
    if (code.startsWith("touch:")) return ctrl === "p1" ? code.slice(6) : null;
    const m = Input.codeMap[code]; if (!m) return null;
    for (const [p, k] of m) if (p === ctrl || (alsoP2 && p === "p2")) return k;
    return null;
  },
  endStep() { const now = performance.now(); if (Game.mode !== "fight") Input.queue.length = 0; else Input.queue = Input.queue.filter(e => now - e.t < 400); },
  fromKeys(I, map) { for (const k in map) for (const c of map[k]) if (Input.keys[c]) I[k] = 1; },
  fromPad(I, gp) {
    if (!gp) return;
    const b = i => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes || [];
    if (b(14) || ax[0] < -0.45) I.l = 1; if (b(15) || ax[0] > 0.45) I.r = 1;
    if (b(12) || ax[1] < -0.55) I.u = 1; if (b(13) || ax[1] > 0.55) I.d = 1;
    if (b(2)) I.lp = 1; if (b(3)) I.hp = 1; if (b(1)) I.sp = 1; if (b(0)) I.u = 1;
    if (b(4)) I.tp = 1; if (b(5)) I.gp = 1; if (b(7)) I.ex = 1; if (b(6)) I.dash = 1;
    if (b(4) && b(5)) { I.xr = 1; I.tp = 0; I.gp = 0; }
    if (b(10) || b(11)) I.brk = 1; if (b(8)) I.tn = 1;
  },
  // échantillon local (clavier J1+J2, manette 1, tactile, file d'appuis) — utilisé par le duel en ligne
  sampleLocal() {
    const I = blankInput();
    Input.fromKeys(I, KEYMAP.p1); Input.fromKeys(I, KEYMAP.p2);
    try { Input.fromPad(I, Input.padFor({ ctrl: "p1" })); } catch (e) { }
    for (const k in Input.touch) if (Input.touch[k]) I[k] = 1;
    const edge = {}, dirs = [], keep = []; let blocked = false;
    for (const ev of Input.queue) {
      const k = Input.actionOf(ev.c, "p1", true);
      if (!k) { keep.push(ev); continue; }
      if (blocked || edge[k]) { blocked = true; keep.push(ev); continue; }
      edge[k] = 1; I[k] = 1; if (k === "l" || k === "r" || k === "u" || k === "d") dirs.push(k);
    }
    Input.queue = keep;
    return { I, edge, dirs };
  },
  padFor(f) {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (f.ctrl === "p1") return pads[0]; if (f.ctrl === "p2") return pads[1]; return null;
  },
  sampleLat(ms) { if (ms < 0 || ms > 400) return; Input.lat = Input.latN ? Input.lat * 0.85 + ms * 0.15 : ms; Input.latN++; Input.latMax = Math.max(Input.latMax * 0.995, ms); },
  read(f, opp) {
    f.edge = null; f.evDirs = null;
    if (f.ctrl === "ai") return aiThink(f, opp);
    if (f.ctrl === "dummy") return dummyThink(f, opp);
    if (f.ctrl === "net") return Online.read(f);
    const I = blankInput(), alsoP2 = f.ctrl === "p1" && Match.type !== "2p";
    Input.fromKeys(I, KEYMAP[f.ctrl]);
    if (alsoP2) Input.fromKeys(I, KEYMAP.p2);
    try { Input.fromPad(I, Input.padFor(f)); } catch (e) { }
    if (f.ctrl === "p1") for (const k in Input.touch) if (Input.touch[k]) I[k] = 1;
    // File d'appuis : chaque appui est consommé dans l'ordre exact de frappe.
    // Un 2e appui de la même action (ou tout appui suivant) est reporté au tick suivant.
    const edge = {}, dirs = [], keep = [], now = performance.now(); let blocked = false;
    for (const ev of Input.queue) {
      const k = Input.actionOf(ev.c, f.ctrl, alsoP2);
      if (!k) { keep.push(ev); continue; }
      if (blocked || edge[k]) { blocked = true; keep.push(ev); continue; }
      edge[k] = 1; I[k] = 1; if (k === "l" || k === "r" || k === "u" || k === "d") dirs.push(k);
      Input.sampleLat(now - ev.t);
    }
    Input.queue = keep; f.edge = edge; f.evDirs = dirs;
    return I;
  },
  menuPad() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const out = {};
    for (const gp of pads) {
      const b = i => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes || [];
      if (b(12) || ax[1] < -0.6) out.up = 1; if (b(13) || ax[1] > 0.6) out.down = 1;
      if (b(14) || ax[0] < -0.6) out.left = 1; if (b(15) || ax[0] > 0.6) out.right = 1;
      if (b(0)) out.ok = 1; if (b(1)) out.back = 1; if (b(9)) out.start = 1;
    }
    return out;
  }
};
