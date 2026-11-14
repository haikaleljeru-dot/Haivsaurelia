/* =====================================================================
   RÉGLAGES + HUD DE COMBAT (barres asymétriques, super 3 segments, combos)
   ===================================================================== */
const Settings = Object.assign({ outfit: "hd", portrait: "cyber", roundTime: 99, layout: "auto", quality: "haute", touch: "auto", music: true, sfx: true, voice: true, musicVol: 0.55, sfxVol: 0.8, voiceVol: 1, shake: true, subs: true, perf: false, lang: "fr", haptics: true, replay: true },
  (() => { try { return JSON.parse(localStorage.getItem("mk_av_settings") || "{}"); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem("mk_av_settings", JSON.stringify(Settings)); } catch (e) { } applySettings(); }
function applySettings() {
  QUALITY.level = Settings.quality; QUALITY.mult = { basse: 0.4, moyenne: 0.7, haute: 1 }[Settings.quality] || 1;
  Audio2.set("music", Settings.music); Audio2.set("sfx", Settings.sfx); Audio2.set("voice", Settings.voice);
  Audio2.set("musicVol", Settings.musicVol); Audio2.set("sfxVol", Settings.sfxVol); Audio2.set("voiceVol", Settings.voiceVol);
  const pf = document.getElementById("perf"); if (pf) pf.classList.toggle("on", Game.mode === "fight" && (Settings.perf || !!Match.training));
  const touchOn = Settings.touch === "on" || (Settings.touch === "auto" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
  $("#touch").classList.toggle("on", touchOn && Game.mode === "fight");
  $("#stage").classList.toggle("touchon", touchOn && Game.mode === "fight");
}
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

const UI = {
  noteLast: {}, bannerT: 0, comboT: [0, 0], bub: [null, null], perfT: 0,
  // Bulle de réplique + portrait HUD qui pulse pendant que le personnage parle
  speech(side, text, dur, vid) {
    if (Game.mode !== "fight") return;
    if (typeof I18N !== "undefined") text = I18N.sub(vid, text);
    UI.bub[side] = { until: performance.now() + Math.max(0.9, dur) * 1000 + 250 };
    const b = $("#bub" + side); b.textContent = "« " + text + " »"; b.classList.remove("on"); void b.offsetWidth; b.classList.add("on");
    $(side ? ".hs.r" : ".hs.l").classList.add("talk");
  },
  toast(msg, ms = 2200) { const t = el("div", "toast", msg); $("#stage").appendChild(t); setTimeout(() => t.remove(), ms); },
  hudReset() {
    F.forEach((f, i) => {
      const s = i ? ".hs.r" : ".hs.l";
      $(s + " .nm").textContent = f.ch.name;
      const pk = f.ch.portraits[Settings.portrait === "real" ? "real" : "cyber"];
      $(s + " .pf").style.backgroundImage = `url(${IMG[pk] ? IMG[pk].src : ""})`;
      $("#combo" + i).className = "combo " + (i ? "r" : "l");
    });
    $("#banner").className = ""; $("#finishBox").classList.remove("on");
    UI.bub = [null, null]; $$(".bub").forEach(b => b.classList.remove("on")); $$(".hs").forEach(h => h.classList.remove("talk", "danger", "xrfull"));
    $("#rlabel").textContent = Match.training ? (Match.training.tutorial ? L("TUTORIEL") : L("ENTRAÎNEMENT")) : (Match.tower ? L("TOUR") + " " + (Match.tower.floor + 1) + "/10 • " : Match.type === "online" ? "ONLINE • " : "") + "ROUND " + Match.round + " • " + L(Match.stage.name);
    UI.roundSeals(); UI.updateHud(true);
  },
  updateHud(force) {
    if (!F.length) return;
    F.forEach((f, i) => {
      const s = i ? ".hs.r" : ".hs.l";
      const fill = $(s + " .hp .fill"); fill.style.transform = `scaleX(${Math.max(0, f.hp) / 100})`; fill.classList.toggle("low", f.hp < 25);
      $(s + " .hp .red").style.transform = `scaleX(${Math.max(0, f.red) / 100})`;
      const gd = $(s + " .gd i"); gd.style.transform = `scaleX(${f.guard / 100})`; gd.classList.toggle("brk", f.guard < 30);
      const segs = $$(s + " .mt .seg");
      segs.forEach((sg, k) => { const v = clamp((f.meter - k * 100) / 100, 0, 1); sg.firstChild.style.width = (v * 100) + "%"; sg.classList.toggle("full", v >= 1); });
      const lab = $(s + " .mt .lab"), bars = Math.floor(f.meter / 100);
      lab.textContent = bars >= 3 ? "X-RAY" : bars === 2 ? "EX ×2" : bars === 1 ? "EX / BREAKER" : "SUPER";
      lab.classList.toggle("xr", bars >= 3);
      const hs = $(s); hs.classList.toggle("xrfull", bars >= 3); hs.classList.toggle("danger", f.hp < 25 && f.hp > 0 && !Match.training);
      // onde vocale + bulle positionnée au-dessus de la tête du combattant
      const B = UI.bub[i], now = performance.now(), talking = B && now < B.until;
      const bars2 = hs.querySelectorAll(".vw i");
      if (talking) { const wv = Audio2.wave(bars2.length), lv = Audio2.level("f" + i); bars2.forEach((b, k) => b.style.transform = `scaleY(${clamp(0.12 + wv[k] * 2.2 + lv * 0.4 * Math.random(), 0.1, 1)})`); }
      else if (hs.classList.contains("talk")) { hs.classList.remove("talk"); bars2.forEach(b => b.style.transform = "scaleY(0.1)"); }
      const bub = $("#bub" + i);
      if (talking) { const [sx, sy] = worldToScreen(f.x, f.y - 330); bub.style.transform = `translate(${clamp(sx, 120, W - 120)}px, ${clamp(sy, 120, H - 100)}px) translate(-50%, -100%)`; }
      else if (B) { UI.bub[i] = null; bub.classList.remove("on"); }
    });
    if (++UI.perfT % 15 === 0 && $("#perf").classList.contains("on")) $("#perf").innerHTML = `<b>${Math.round(MK.fps)}</b> FPS • entrée→logique <b>${Input.lat.toFixed(1)}</b> ms (max ${Input.latMax.toFixed(0)}) • logique <b>${Match.logicMs.toFixed(2)}</b> ms • ${P.length} particules`;
    const tm = $("#timer");
    tm.textContent = Match.training || Match.roundTime >= 999 ? "∞" : Math.max(0, Match.timer);
    tm.classList.toggle("low", !Match.training && Match.timer <= 10 && Match.state === "fight");
    for (let i = 0; i < 2; i++) if (UI.comboT[i] > 0 && --UI.comboT[i] === 0) $("#combo" + i).classList.remove("on");
    if (UI.bannerT > 0 && --UI.bannerT === 0) $("#banner").className = "";
  },
  banner(main, sub, cls, frames = 90) {
    const b = $("#banner"); b.className = ""; void b.offsetWidth;
    b.querySelector(".bm").textContent = main; b.querySelector(".bm").style.fontSize = main.length > 12 ? "62px" : main.length > 9 ? "82px" : ""; b.querySelector(".bs").textContent = sub || "";
    b.className = "on " + (cls || ""); UI.bannerT = frames;
  },
  notify(text, side, cls, throttle) {
    const key = side + text; if (throttle && UI.noteLast[key] && frameCount - UI.noteLast[key] < 40) return; UI.noteLast[key] = frameCount;
    const box = $("#notes" + side); const n = el("div", "note " + (cls === "warn" ? "blood" : cls || ""), text); box.appendChild(n);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => n.remove(), 1600);
  },
  comboLive(side, n, dmg) {
    if (n < 2) return;
    const c = $("#combo" + side); c.innerHTML = `<b>${n}</b><span>COUPS</span><small>${Math.round(dmg)}% DÉGÂTS</small>`;
    c.classList.add("on"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); UI.comboT[side] = 110;
  },
  comboEnd(side, n, dmg) {
    const w = comboWord(n); const c = $("#combo" + side);
    c.innerHTML = `<b>${n}</b><span>${n} COUPS${w ? " — " + w : ""}</span><small>${Math.round(dmg)}% DÉGÂTS</small>`;
    c.classList.add("on"); UI.comboT[side] = 100;
    if (n >= 6) Audio2.voice("ann_excellent", { ch: "ann", ifFree: true }); else if (n >= 4) Audio2.voice("ann_brutal", { ch: "ann", ifFree: true });
  },
  roundSeals() {
    [".hs.l", ".hs.r"].forEach((s, i) => { const box = $(s + " .seals"); box.innerHTML = ""; for (let k = 0; k < Match.winsNeeded; k++) box.appendChild(el("div", "seal" + (Match.wins[i] > k ? " won" : ""))); box.style.display = Match.training ? "none" : "flex"; });
  },
  finishPrompt(att) {
    const b = $("#finishBox");
    if (!att) { b.classList.remove("on"); return; }
    if (att.ctrl === "ai" || (att.ctrl === "net" && typeof Online !== "undefined" && Online.localSide !== att.side)) { b.classList.remove("on"); return; }
    const p = att.ctrl === "net" ? "p1" : att.ctrl, f = att.ch.fatalities, st = Match.stage, fr = att.ch.friendship, an = att.ch.animality, net = att.ctrl === "net";
    b.innerHTML = `<div class="ft">${att.ch.name} — ACHÈVE TON ADVERSAIRE</div>
      <div class="fc">☠ ${f[0].name} : <b>${f[0].codeTxt}</b> &nbsp;ou&nbsp; <kbd>${keyOf(p, "f1")}</kbd></div>
      <div class="fc">☠ ${f[1].name} : <b>${f[1].codeTxt}</b> &nbsp;ou&nbsp; <kbd>${keyOf(p, "f2")}</kbd></div>
      <div class="fc">⚡ Stage Fatality — ${st.stageFatality} : <b>${STAGE_FATALITY_CODE.codeTxt}</b> &nbsp;ou&nbsp; <kbd>${keyOf(p, "f3")}</kbd></div>
      <div class="fc" style="color:#f9a8d4">💖 Friendship — ${fr.name} : <b>${fr.codeTxt}</b> &nbsp;ou&nbsp; <kbd>${keyOf(p, "f4")}</kbd></div>
      <div class="fc" style="color:#86efac">🐾 Animality — ${an.name} : <b>${an.codeTxt}</b> &nbsp;ou&nbsp; <kbd>${keyOf(p, "f5")}</kbd></div>
      <div class="fc" style="color:#fdba74">✦ Brutality : achève avec un Spécial / EX / X-Ray</div>
      <div class="tm" id="finishT">10</div>
      ${net ? "" : `<div><button class="btn red" data-fin="fatality1">Fatality 1</button><button class="btn red" data-fin="fatality2">Fatality 2</button><button class="btn red" data-fin="stage">Stage</button><button class="btn red" data-fin="friendship">Friendship</button><button class="btn red" data-fin="animality">Animality</button></div>`}`;
    b.querySelectorAll("[data-fin]").forEach(bt => bt.onclick = () => { if (Match.state === "finish") startFinisher(att, F[1 - att.side], bt.dataset.fin); });
    if (typeof I18N !== "undefined") I18N.apply(b);
    b.classList.add("on");
  },
  finishTimer(n) { const e = $("#finishT"); if (e) e.textContent = n; },
  matchOver(att, vic) { setTimeout(() => Screens.results(att, vic), 900); }
};
