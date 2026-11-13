/* =====================================================================
   FLUX DE JEU, NAVIGATION, ENTRAÎNEMENT, TACTILE, BOUCLE PRINCIPALE
   ===================================================================== */
const Game = {
  mode: "boot",
  setMode(m) {
    Game.mode = m; document.documentElement.dataset.mode = m;
    $("#hud").classList.toggle("on", m === "fight");
    $("#trainPanel").classList.toggle("on", m === "fight" && !!Match.training);
    $("#trainHelp").classList.toggle("on", m === "fight" && !!Match.training);
    if (m !== "fight") { $("#banner").className = ""; $("#finishBox").classList.remove("on"); Match.paused = false; ["f0", "f1", "ann"].forEach(c => Audio2.stopVoice(c)); $$(".bub").forEach(b => b.classList.remove("on")); }
    if (m === "menu") Vid.stopAll();
    applySettings();
  }
};
const Flow = {
  lastOpts: null,
  fight(opts) {
    Flow.lastOpts = opts; Sel.p1 = opts.p1Char;
    Screens.show("hud"); $$(".ovl").forEach(o => o.classList.remove("on"));
    Cam.x = W / 2; Cam.y = H / 2; Cam.z = 1;
    Match.paused = false; acc = 0;
    setupMatch(opts);
    Game.setMode("fight");
    Training.refresh();
  },
  storyStart(char, diff) {
    Object.assign(Story, { active: true, char, diff, stage: 0, continues: 0 }); Sel.p1 = char;
    Cine.play("intro", () => Flow.storyStage());
  },
  storyStage() {
    Story.active = true;
    Screens.vs(Story.stage, () => Flow.fight({ type: "story", stageIdx: Story.stage, p1Char: Story.char, difficulty: Story.diff }));
  },
  storyNext() {
    Story.stage++;
    if (Story.stage === 1) Cine.play("interlude_jerusalem", () => Flow.storyStage());
    else if (Story.stage === 2) Cine.play("interlude_singularity", () => Flow.storyStage());
    else { const id = Story.char === "aurelia" ? "ending_aurelia" : "ending_hai"; Story.active = false; saveUnlock("story_" + Story.char); Cine.play(id, () => { UI.toast("🏆 CAMPAGNE TERMINÉE — fin ajoutée à la galerie"); Screens.title(); }); }
  },
  demo(char, kind, stageIdx) {
    Flow.fight({ type: "training", stageIdx, p1Char: char, training: { dummy: "idle" } });
    setTimeout(() => Training.finisher(kind), 700);
  }
};
// -------------------- ENTRAÎNEMENT --------------------
const Training = {
  build() {
    const p = $("#trainPanel");
    p.innerHTML = `<h4>MANNEQUIN</h4><div id="tDummy">${[["idle", "Immobile"], ["guard", "Garde"], ["jump", "Saute"], ["ai", "IA"]].map(([k, l]) => `<button class="btn" data-d="${k}">${l}</button>`).join("")}</div>
      <h4>OPTIONS</h4><button class="btn" id="tMeter">Super infini</button><button class="btn" id="tRegen">Vie auto</button>
      <h4>DÉMO FATALITY</h4><button class="btn red" data-f="fatality1">Fatality 1</button><button class="btn red" data-f="fatality2">Fatality 2</button>
      <button class="btn red" data-f="stage">Stage Fatality</button><button class="btn red" data-f="brutality">Brutality</button><button class="btn" data-f="xray">X-Ray</button>
      <h4>ARÈNE</h4>${STAGES.map((s, i) => `<button class="btn" data-s="${i}">${["Paris", "Jérusalem", "Singularité"][i]}</button>`).join("")}
      <div style="margin-top:6px"><button class="btn" id="tSwap">Changer de perso</button><button class="btn" id="tQuit">Quitter</button></div>
      <div id="tCombo" style="margin-top:6px;color:#fbbf24;font:700 12px Orbitron"></div>`;
    p.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { Match.training.dummy = b.dataset.d; Training.refresh(); });
    $("#tMeter").onclick = () => { Match.training.infMeter = !Match.training.infMeter; Training.refresh(); };
    $("#tRegen").onclick = () => { Match.training.regen = !Match.training.regen; Training.refresh(); };
    p.querySelectorAll("[data-f]").forEach(b => b.onclick = () => Training.finisher(b.dataset.f));
    p.querySelectorAll("[data-s]").forEach(b => b.onclick = () => Flow.fight({ type: "training", stageIdx: +b.dataset.s, p1Char: Match.p1Char, training: { dummy: Match.training.dummy } }));
    $("#tSwap").onclick = () => Flow.fight({ type: "training", stageIdx: Match.stageIdx, p1Char: otherChar(Match.p1Char), training: { dummy: Match.training.dummy } });
    $("#tQuit").onclick = () => Screens.title();
  },
  refresh() {
    if (!Match.training) { $("#trainPanel").classList.remove("on"); $("#trainHelp").classList.remove("on"); return; }
    $$("#tDummy .btn").forEach(b => b.classList.toggle("sel", b.dataset.d === Match.training.dummy));
    $("#tMeter").classList.toggle("sel", Match.training.infMeter); $("#tRegen").classList.toggle("sel", Match.training.regen);
    $$("#trainPanel [data-s]").forEach(b => b.classList.toggle("sel", +b.dataset.s === Match.stageIdx));
    const c = F[0].ch;
    $("#trainHelp").innerHTML = `<b style="color:${c.color};font-family:Orbitron">${c.name} — LISTE RAPIDE</b><br>
      Rapide <kbd>${keyOf("p1", "lp")}</kbd> • Lourd <kbd>${keyOf("p1", "hp")}</kbd> • Spécial <kbd>${keyOf("p1", "sp")}</kbd><br>Téléport <kbd>${keyOf("p1", "tp")}</kbd> • Chope <kbd>${keyOf("p1", "gp")}</kbd> • EX <kbd>${keyOf("p1", "ex")}</kbd> • X-Ray <kbd>${keyOf("p1", "xr")}</kbd><br>
      Combo : Rapide › Rapide › Lourd › Spécial<br>☠ ${c.fatalities[0].codeTxt}<br>☠ ${c.fatalities[1].codeTxt}<br>⚡ Stage : ${STAGE_FATALITY_CODE.codeTxt}<br>Les codes marchent quand l'adversaire est étourdi (FINISH).`;
  },
  finisher(kind) {
    if (Game.mode !== "fight" || !Match.training || Match.seq) return;
    const a = F[0], v = F[1]; $("#banner").className = ""; UI.bannerT = 0;
    if (kind === "xray") { a.meter = 300; if (Match.state === "fight" && canAct(a)) { a.face = v.x >= a.x ? 1 : -1; doXray(a); } return; }
    if (Match.state !== "fight") return;
    v.x = clamp(a.x + a.face * 230, 120, W - 120); if (Math.abs(v.x - a.x) < 150) { a.x = clamp(v.x - a.face * 230, 120, W - 120); }
    a.face = v.x >= a.x ? 1 : -1; v.face = -a.face; v.y = Match.stage.floor; v.hp = 1; setState(v, "stun"); setState(a, "idle");
    startFinisher(a, v, kind);
  }
};
// -------------------- TACTILE --------------------
function buildTouch() {
  const t = $("#touch");
  const B = [["l", "◀", 30, 560], ["r", "▶", 190, 560], ["u", "▲", 110, 480], ["d", "▼<br>garde", 110, 630], ["lp", "RAPIDE", 1000, 600], ["hp", "LOURD", 1090, 540], ["sp", "SPÉCIAL", 1180, 480],
    ["tp", "TÉLÉ", 1180, 600], ["gp", "CHOPE", 1090, 640], ["ex", "EX", 1000, 500], ["xr", "X-RAY", 910, 560], ["dash", "DASH", 270, 630], ["tn", "TAUNT", 910, 460]];
  B.forEach(([k, l, x, y]) => {
    const b = el("div", "tb", l); b.style.left = x + "px"; b.style.top = (y - 40) + "px";
    // pointerdown immédiat (pas de délai 300 ms) + capture du pointeur + file horodatée
    const on = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { } Input.touch[k] = 1; Input.push("touch:" + k, e.timeStamp); b.classList.add("act"); if (navigator.vibrate && Settings.touch !== "off") try { navigator.vibrate(8); } catch (x) { } },
      off = e => { e.preventDefault(); Input.touch[k] = 0; b.classList.remove("act"); };
    b.addEventListener("pointerdown", on, { passive: false }); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
    b.addEventListener("contextmenu", e => e.preventDefault());
    t.appendChild(b);
  });
  const pb = el("div", "tb", "❚❚"); pb.style.left = "610px"; pb.style.top = "96px"; pb.style.width = pb.style.height = "54px"; pb.onclick = () => Screens.pause(); t.appendChild(pb);
}
// -------------------- NAVIGATION CLAVIER/MANETTE --------------------
UI.focusIdx = -1;
UI.focusables = () => {
  const ov = $$(".ovl.on"); let root = ov.length ? ov[ov.length - 1] : $(".layer.on");
  if ($("#viewer").classList.contains("on")) return [];
  if (!root) return [];
  return Array.from(root.querySelectorAll(".mbtn,.btn,.gal .it")).filter(e => e.offsetParent !== null);
};
UI.focusFirst = () => { const f = UI.focusables(); f.forEach(e => e.classList.remove("focus")); const i = f.findIndex(e => e.classList.contains("mbtn")); UI.focusIdx = i >= 0 ? i : -1; if (UI.focusIdx >= 0) f[UI.focusIdx].classList.add("focus"); };
UI.moveFocus = d => { const f = UI.focusables(); if (!f.length) return; f.forEach(e => e.classList.remove("focus")); UI.focusIdx = (UI.focusIdx + d + f.length) % f.length; f[UI.focusIdx].classList.add("focus"); f[UI.focusIdx].scrollIntoView({ block: "nearest" }); Audio2.play("ui"); };
UI.activate = () => { const f = UI.focusables(); if (UI.focusIdx >= 0 && f[UI.focusIdx]) f[UI.focusIdx].click(); };
UI.back = () => {
  if ($("#viewer").classList.contains("on")) { Screens.closeViewer(); return; }
  if (Game.mode === "fight") { Screens.pause(); return; }
  const ov = $$(".ovl.on"); if (ov.length) { if (ov[ov.length - 1].id === "results") return; Screens.title(); return; }
  if (Screens.cur === "select") Screens.title();
};
UI.onKey = e => {
  const c = e.code; Audio2.init();
  if (Game.mode === "boot") { if (Boot.ready) Boot.enter(); return; }
  if (Game.mode === "cine") {
    if (c === "Space") Cine.togglePause(); else if (c === "ArrowRight") Cine.go(1); else if (c === "ArrowLeft") Cine.go(-1); else if (c === "Enter" || c === "Escape") Cine.finish();
    return;
  }
  if (Game.mode === "vs") { if (c === "Enter" || c === "Escape" || c === "Space") Screens.vsSkip && Screens.vsSkip(); return; }
  if (c === "F9") { Settings.perf = !Settings.perf; saveSettings(); return; }
  if (Game.mode === "fight" && !Match.paused && !$("#results").classList.contains("on")) { if (c === "Escape" || c === "KeyP" && Match.type !== "2p" && false) Screens.pause(); if (c === "Escape") return; return; }
  if (c === "Escape" || c === "Backspace") { if (Match.paused && Game.mode === "fight") Screens.pause(false); else UI.back(); return; }
  if (Screens.cur === "select" && !$$(".ovl.on").length && (c === "ArrowLeft" || c === "ArrowRight")) { Sel.p1 = otherChar(Sel.p1); Audio2.play("select"); Screens.renderSelect(); return; }
  if (c === "ArrowUp" || c === "ArrowLeft") UI.moveFocus(-1);
  else if (c === "ArrowDown" || c === "ArrowRight" || c === "Tab") { e.preventDefault(); UI.moveFocus(1); }
  else if (c === "Enter" || c === "Space" || c === "NumpadEnter") { e.preventDefault(); UI.activate(); }
};
let padPrev = {};
function pollMenuPad() {
  const p = Input.menuPad(), edge = k => p[k] && !padPrev[k]; padPrev = p;
  if (Game.mode === "fight") { if (edge("start")) Screens.pause(); if (!Match.paused && !$("#results").classList.contains("on")) return; }
  if (Game.mode === "cine") { if (edge("ok") || edge("start")) Cine.finish(); if (edge("right")) Cine.go(1); return; }
  if (Game.mode === "vs") { if (edge("ok") || edge("start")) Screens.vsSkip && Screens.vsSkip(); return; }
  if (Game.mode === "boot") { if ((edge("ok") || edge("start")) && Boot.ready) Boot.enter(); return; }
  if (edge("up") || edge("left")) UI.moveFocus(-1); if (edge("down") || edge("right")) UI.moveFocus(1);
  if (edge("ok")) UI.activate(); if (edge("back")) UI.back();
}
// -------------------- DÉMARRAGE / PRÉCHARGEMENT --------------------
// Écran splash non bloquant : images + voix = critiques ; les vidéos MP4 (≈8 Mo) se chargent en arrière-plan
// (repli automatique sur les illustrations tant qu'une vidéo n'est pas prête). Sécurité : entrée possible après 12 s.
const Boot = {
  ready: false, errors: [], total: 0, n: 0, vTotal: 0, vN: 0, t0: 0,
  step(label) { Boot.n++; const pct = Math.min(100, Math.round(Boot.n / Boot.total * 100)); $("#boot .bar i").style.width = pct + "%"; if (!Boot.ready) $("#boot .txt").textContent = "CHARGEMENT DU MULTIVERS… " + pct + "% — " + label; },
  vStep() { Boot.vN++; Boot.status(); },
  status() {
    const v = $("#bootVid"); if (!v) return;
    v.textContent = Boot.vN >= Boot.vTotal ? (Vid.errors.length ? "⚠ " + Vid.errors.length + " vidéo(s) indisponible(s) — illustrations utilisées" : "🎬 " + Object.keys(VID).length + " vidéos cinématiques prêtes") : "🎬 vidéos cinématiques : " + Boot.vN + "/" + Boot.vTotal + " (chargement en arrière-plan)";
  },
  loadImages() {
    const M = window.ASSET_MANIFEST, keys = Object.keys(M); let n = 0;
    return new Promise(res => {
      if (!keys.length) return res();
      keys.forEach(k => {
        const im = new Image(); im.decoding = "async";
        im.onload = im.onerror = ev => { if (ev.type === "error") Boot.errors.push(k); Boot.step("images"); if (++n === keys.length) res(); };
        im.src = M[k]; IMG[k] = im;
      });
    });
  },
  setReady(timeout) {
    if (Boot.ready) return; Boot.ready = true;
    const miss = Boot.errors.length + Audio2.voiceErrors.length;
    $("#boot .bar i").style.width = "100%";
    $("#boot .txt").textContent = timeout ? "CONNEXION LENTE — le reste se charge pendant que tu joues" : miss ? "⚠ " + miss + " élément(s) manquant(s)" : `MULTIVERS CHARGÉ — ${Object.keys(IMG).length} visuels • ${Audio2.voiceCount} voix`;
    $("#boot .press").style.display = "block"; $("#boot").classList.add("ready");
    Boot.status();
  },
  async start() {
    Boot.t0 = performance.now();
    applySettings(); Input.init(); Screens.buildSelect(); Training.build(); buildTouch(); fitStage(); View.init();
    Boot.total = Object.keys(window.ASSET_MANIFEST).length + Object.keys(window.VOICE_MANIFEST || {}).length;
    Boot.vTotal = Object.keys(window.VIDEO_MANIFEST || {}).length;
    requestAnimationFrame(loop);
    const vb = el("div", "vload"); vb.id = "bootVid"; $("#boot").appendChild(vb); Boot.status();
    Vid.pending = true;
    // les vidéos ne démarrent qu'après les éléments critiques : toute la bande passante va d'abord au jouable
    let vidStarted = false;
    const startVideos = () => { if (vidStarted) return; vidStarted = true;
      Vid.load(() => Boot.vStep()).then(() => { Vid.pending = false; Boot.status(); if ($("#gallery").classList.contains("on") && Screens.galTab === "vid") Screens.gallery("vid"); }); };
    const safety = setTimeout(() => { Boot.setReady(true); startVideos(); }, 12000);
    await Promise.all([Boot.loadImages(), Audio2.loadVoices(() => Boot.step("voix"))]);
    startVideos();
    try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) { }
    clearTimeout(safety); Boot.loadMs = Math.round(performance.now() - Boot.t0);
    Boot.setReady(false);
  },
  enter() {
    if (Game.mode !== "boot") return;
    Audio2.init(); Audio2.play("gong");
    if (View.isTouch() && !View.isFull()) View.fullscreen(true);
    Screens.title();
  }
};
// -------------------- AFFICHAGE : échelle, zones sûres (encoches), plein écran, orientation --------------------
const View = {
  isTouch() { return matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0; },
  isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  canFull() { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen); },
  fullscreen(on) {
    try {
      if (on === undefined) on = !View.isFull();
      const d = document.documentElement;
      if (on) {
        const r = d.requestFullscreen ? d.requestFullscreen({ navigationUI: "hide" }) : d.webkitRequestFullscreen && d.webkitRequestFullscreen();
        const lock = () => { try { if (screen.orientation && screen.orientation.lock && View.isTouch()) screen.orientation.lock("landscape").catch(() => { }); } catch (e) { } };
        if (r && r.then) r.then(lock, () => { }); else lock();
      } else {
        const r = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen();
        if (r && r.catch) r.catch(() => { });
      }
    } catch (e) { }
  },
  init() {
    const fs = el("button", "fsbtn", "⛶"); fs.id = "fsBtn"; fs.type = "button"; fs.title = "Plein écran (F11)"; fs.setAttribute("aria-label", "Basculer en plein écran");
    fs.addEventListener("click", e => { e.stopPropagation(); View.fullscreen(); fs.blur(); });
    if (!View.canFull()) fs.style.display = "none";
    $("#wrap").appendChild(fs);
    const rot = el("div", "", `<div class="rbox"><div class="ricon">📱↻</div><b>Tourne ton téléphone</b><span>Le Multivers se joue en mode paysage</span><button class="btn" type="button" id="rotGo">Continuer quand même</button></div>`);
    rot.id = "rotate"; document.body.appendChild(rot);
    $("#rotGo").onclick = () => { document.documentElement.classList.add("rot-ok"); };
    const onResize = () => { fitStage(); };
    addEventListener("resize", onResize); addEventListener("orientationchange", () => setTimeout(fitStage, 120));
    document.addEventListener("fullscreenchange", () => { $("#fsBtn").classList.toggle("on", View.isFull()); setTimeout(fitStage, 60); });
    document.addEventListener("webkitfullscreenchange", () => setTimeout(fitStage, 60));
    if (window.visualViewport) visualViewport.addEventListener("resize", onResize);
    // onglet/app masqué pendant un combat => pause automatique
    document.addEventListener("visibilitychange", () => { if (document.hidden && Game.mode === "fight" && !Match.paused && !$("#results").classList.contains("on")) try { Screens.pause(true); } catch (e) { } });
  }
};
function fitStage() {
  const w = $("#wrap"), cs = getComputedStyle(w);
  const aw = w.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = w.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const s = Math.max(0.1, Math.min((aw || innerWidth) / W, (ah || innerHeight) / H));
  $("#stage").style.transform = `scale(${s})`;
  document.documentElement.classList.toggle("portrait", innerHeight > innerWidth * 1.1);
  View.scale = s;
}
// -------------------- BOUCLE --------------------
let lastT = 0, acc = 0, fpsAvg = 60;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (ts - (lastT || ts)) / 1000); lastT = ts; if (dt > 0) fpsAvg = fpsAvg * 0.95 + (1 / dt) * 0.05;
  const ctx = CTX;
  pollMenuPad(); Audio2.tick();
  if (Game.mode === "fight") {
    if (!Match.paused) {
      acc += dt * 1000 * Match.timeScale; let n = 0;
      // entrées en attente => on traite le tick logique sans attendre l'accumulateur complet (latence mini)
      if (acc < STEP && Input.queue.length && acc > STEP * 0.5 && Match.timeScale >= 1) acc = STEP;
      while (acc >= STEP && n < 5) { const t0 = performance.now(); fightStep(); Match.logicMs = Match.logicMs * 0.9 + (performance.now() - t0) * 0.1; Input.endStep(); acc -= STEP; n++; }
      if (n === 0 && Match.timeScale < 1) { /* ralenti : pas de pas logique ce frame */ }
      UI.updateHud();
      if (Match.training && Match.training.lastCombo) $("#tCombo").textContent = "DERNIER COMBO : " + Match.training.lastCombo.n + " coups / " + Math.round(Match.training.lastCombo.d) + "%";
    } else Input.endStep();
    renderFight(ctx);
  } else if (Game.mode === "cine") { Cine.update(dt); Cine.draw(ctx); Input.endStep(); }
  else if (Game.mode === "vs") { VsBG.draw(ctx, dt); Input.endStep(); }
  else if (Game.mode === "menu") { MenuBG.draw(ctx, dt); Input.endStep(); }
  else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
}
let CTX = null;
window.addEventListener("DOMContentLoaded", () => {
  CTX = $("#cv").getContext("2d");
  $("#boot").addEventListener("click", () => Boot.ready && Boot.enter());
  // Menu titre
  const T = { story: () => Screens.select("story"), vs: () => Screens.select("1p"), duo: () => Screens.select("2p"), train: () => Screens.select("training"),
    intro: () => Cine.play("intro", () => Screens.title()), gal: () => Screens.gallery("cine"), opt: () => Screens.options(), mv: () => Screens.moves() };
  $$("#title [data-m]").forEach(b => { b.onclick = () => { Audio2.init(); Audio2.play("select"); T[b.dataset.m](); }; b.onmouseenter = () => Audio2.play("ui"); });
  $$("#galTabs .btn").forEach(b => b.onclick = () => Screens.gallery(b.dataset.t));
  $$("[data-close]").forEach(b => b.onclick = () => Screens.title());
  $("#pResume").onclick = () => Screens.pause(false);
  $("#pRestart").onclick = () => { Screens.pause(false); Flow.fight(Flow.lastOpts); };
  $("#pMoves").onclick = () => { const on = $("#pauseMoves").classList.toggle("hidden"); };
  $("#pFull").onclick = () => View.fullscreen();
  $("#pQuit").onclick = () => { Screens.pause(false); Screens.title(); };
  $("#cineCtl").addEventListener("click", e => { const c = e.target.dataset.c; if (!c) return; ({ prev: () => Cine.go(-1), pause: () => Cine.togglePause(), next: () => Cine.go(1), skip: () => Cine.finish(), replay: () => Cine.replay() })[c](); });
  Boot.start();
});
// Hook de test / debug
window.MK = { Game, Boot, View, Match, F, Flow, Screens, Cine, Training, Settings, IMG, VID, Vid, Audio2, Input, Story, Sel, get fps() { return fpsAvg; } };
