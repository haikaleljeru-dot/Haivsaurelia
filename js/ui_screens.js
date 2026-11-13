/* =====================================================================
   ÉCRANS : titre, sélection, VS, résultats, pause, galerie, options, commandes
   ===================================================================== */
const Sel = { mode: "1p", p1: "aurelia", stage: 0, diff: "guerrier" };
const Story = { active: false, char: "aurelia", diff: "guerrier", stage: 0, continues: 0, totalTime: 0 };
const Screens = {
  cur: "boot",
  show(id) {
    Screens.cur = id;
    ["boot", "title", "select", "vs", "cine", "hud"].forEach(k => $("#" + k).classList.toggle("on", k === id || (k === "hud" && id === "hud")));
    $$(".ovl").forEach(o => o.classList.remove("on"));
    UI.focusIdx = -1; setTimeout(() => UI.focusFirst(), 30);
  },
  overlay(id, on = true) { $("#" + id).classList.toggle("on", on); UI.focusIdx = -1; if (on) setTimeout(() => UI.focusFirst(), 30); },
  // -------------------- TITRE --------------------
  title() {
    Story.active = false; Match.active = false; F.length = 0;
    Game.setMode("menu"); MenuBG.set("vs_poster"); Screens.show("title"); Audio2.playMusic("menu"); Audio2.setIntensity(0.2);
  },
  // -------------------- SÉLECTION --------------------
  select(mode) {
    Sel.mode = mode; Game.setMode("menu"); MenuBG.set(STAGES[Sel.stage].img); Screens.show("select");
    const names = { story: "MODE HISTOIRE — CAMPAGNE", "1p": "DUEL CONTRE L'IA", "2p": "DUEL LOCAL — 2 JOUEURS", training: "ENTRAÎNEMENT & DÉMO FATALITY" };
    $("#selMode").textContent = names[mode];
    Screens.renderSelect();
  },
  renderSelect() {
    ["aurelia", "hai"].forEach(id => {
      const c = $("#card_" + id), ch = CHARACTERS[id];
      c.classList.toggle("p1", Sel.p1 === id); c.classList.toggle("p2", Sel.p1 !== id);
      const pk = Settings.portrait === "real" ? (id === "aurelia" ? "aur_real" : "hai_real") : (id === "aurelia" ? "aur_cyber" : "hai_cyber");
      c.querySelector(".art").style.backgroundImage = `url(${IMG[pk] ? IMG[pk].src : ""})`;
      c.querySelector(".b2").textContent = Sel.mode === "2p" ? "J2" : Sel.mode === "training" ? "MANNEQUIN" : "CPU";
    });
    const showStage = Sel.mode !== "story", showDiff = Sel.mode === "story" || Sel.mode === "1p";
    $("#selStageBox").style.display = showStage ? "" : "none"; $("#selDiffBox").style.display = showDiff ? "" : "none";
    $("#selStoryBox").style.display = Sel.mode === "story" ? "" : "none";
    const st = STAGES[Sel.stage]; $("#stagePrev").style.backgroundImage = `url(${IMG[st.img] ? IMG[st.img].src : ""})`; $("#stagePrev span").textContent = st.name;
    $$("#selStages .btn").forEach((b, i) => b.classList.toggle("sel", i === Sel.stage));
    $$("#selDiffs .btn").forEach(b => b.classList.toggle("sel", b.dataset.d === Sel.diff));
    $$("#selPortrait .btn").forEach(b => b.classList.toggle("sel", b.dataset.v === Settings.portrait));
    $$("#selOutfit .btn").forEach(b => b.classList.toggle("sel", b.dataset.v === Settings.outfit));
    $$("#selTime .btn").forEach(b => b.classList.toggle("sel", +b.dataset.v === Settings.roundTime));
    MenuBG.set(st.img);
  },
  buildSelect() {
    ["aurelia", "hai"].forEach((id, i) => {
      const ch = CHARACTERS[id], c = $("#card_" + id);
      const st = ch.stats, c1 = ch.color, c2 = ch.color2 || "#fff";
      c.innerHTML = `<div class="art"></div><div class="shade"></div><div class="badge b1">J1</div><div class="badge b2">CPU</div>
        <div class="info"><div class="tt" style="color:${c1}">${ch.title}</div><div class="nm" style="color:#fff;text-shadow:0 0 18px ${c1}">${ch.name}</div>
        <div class="lore">${ch.lore}</div>
        ${Object.entries(st).map(([k, v]) => `<div class="stat" style="--c1:${c1};--c2:${c2}"><b>${k.toUpperCase()}</b><i><u style="width:${v}%"></u></i></div>`).join("")}</div>`;
      c.onclick = () => { Sel.p1 = id; Audio2.play("select"); Screens.renderSelect(); };
      c.onmouseenter = () => Audio2.play("ui");
    });
    $("#selStages").innerHTML = STAGES.map((s, i) => `<button class="btn" data-i="${i}">${["PARIS", "JÉRUSALEM", "SINGULARITÉ"][i]}</button>`).join("");
    $$("#selStages .btn").forEach(b => b.onclick = () => { Sel.stage = +b.dataset.i; Audio2.play("ui"); Screens.renderSelect(); });
    $("#selDiffs").innerHTML = Object.entries(DIFFICULTIES).map(([k, d]) => `<button class="btn" data-d="${k}">${d.name}</button>`).join("");
    $$("#selDiffs .btn").forEach(b => b.onclick = () => { Sel.diff = b.dataset.d; Audio2.play("ui"); Screens.renderSelect(); });
    $$("#selPortrait .btn").forEach(b => b.onclick = () => { Settings.portrait = b.dataset.v; saveSettings(); Screens.renderSelect(); });
    $$("#selOutfit .btn").forEach(b => b.onclick = () => { Settings.outfit = b.dataset.v; saveSettings(); Screens.renderSelect(); });
    $$("#selTime .btn").forEach(b => b.onclick = () => { Settings.roundTime = +b.dataset.v; saveSettings(); Screens.renderSelect(); });
    $("#selGo").onclick = () => Screens.launch();
    $("#selBack").onclick = () => Screens.title();
  },
  launch() {
    Audio2.play("gong");
    if (Sel.mode === "story") { Flow.storyStart(Sel.p1, Sel.diff); return; }
    if (Sel.mode === "training") { Flow.fight({ type: "training", stageIdx: Sel.stage, p1Char: Sel.p1 }); return; }
    Screens.vs(Sel.stage, () => Flow.fight({ type: Sel.mode, stageIdx: Sel.stage, p1Char: Sel.p1, difficulty: Sel.diff }));
  },
  // -------------------- ÉCRAN VS (vidéo + répliques vocales) --------------------
  vs(stageIdx, onDone) {
    Game.setMode("vs"); Screens.show("vs"); VsBG.t = 0; P.length = 0;
    Vid.stopAll(); Vid.play("vid_vs_clash", 0.8);
    const st = STAGES[stageIdx], p1 = Sel.p1, p2 = otherChar(p1), L = CHARACTERS[p1], R = CHARACTERS[p2];
    const real = Settings.portrait === "real";
    const pk = id => real ? (id === "aurelia" ? "aur_real" : "hai_real") : (id === "aurelia" ? "aur_cyber" : "hai_cyber");
    const v = $("#vs"); v.classList.toggle("vid", !!VID.vid_vs_clash);
    v.innerHTML = `<div class="half l" style="background-image:url(${IMG[pk(p1)].src})"><i class="talkRing"></i></div><div class="half r" style="background-image:url(${IMG[pk(p2)].src})"><i class="talkRing"></i></div>
      <div class="stageName">${Story.active ? "STAGE " + (Story.stage + 1) + "/3 — " : ""}${st.name} • ${st.sub}</div><div class="bigvs">VS</div>
      <div class="nm l">${L.name}<small>${L.title}</small></div><div class="nm r">${R.name}<small>${R.title}</small></div><div class="dlg"></div>
      <div class="vsTag">● LIVE // MULTIVERSE FEED</div>
      <button class="btn skip" id="vsSkip">Passer ▸</button>`;
    v.querySelector(".half.l").style.setProperty("--c", L.color);
    Audio2.playMusic("cine"); setTimeout(() => Audio2.play("vsclash"), 380);
    const lines = PREFIGHT[st.id] || []; let i = 0, done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(Screens.vsTimer); Audio2.stopVoice("vs"); if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { } Vid.stop("vid_vs_clash"); onDone(); };
    Screens.vsSkip = finish; $("#vsSkip").onclick = finish;
    const step = () => {
      if (done) return;
      if (i >= lines.length) { Screens.vsTimer = setTimeout(finish, 1300); return; }
      const idx = i++, [w, text] = lines[idx], ch = w === "A" ? CHARACTERS.aurelia : CHARACTERS.hai;
      const d = el("div", "dl", `<b style="color:${ch.color}"><i class="eq"><u></u><u></u><u></u><u></u></i>${ch.name}</b>${text}`); d.style.borderColor = ch.color;
      const box = v.querySelector(".dlg"); box.appendChild(d); while (box.children.length > 2) box.firstChild.remove();
      // portrait de celui qui parle illuminé
      const side = (w === "A") === (p1 === "aurelia") ? "l" : "r";
      v.querySelectorAll(".half").forEach(h => h.classList.toggle("talk", h.classList.contains(side)));
      let dur = Settings.voice ? Audio2.voice(`pre_${st.id}_${idx}`, { ch: "vs", pan: side === "l" ? -0.35 : 0.35 }) : 0;
      if (!dur) { if (Settings.voice) Audio2.say(text, w === "A" ? 1.25 : 0.75, 1.08); dur = Math.max(2.2, text.length / 16); }
      Screens.vsTimer = setTimeout(() => { v.querySelectorAll(".half").forEach(h => h.classList.remove("talk")); step(); }, (dur + 0.45) * 1000);
    };
    Screens.vsTimer = setTimeout(step, 1100);
  },
  // -------------------- RÉSULTATS --------------------
  results(att, vic) {
    if (Game.mode !== "fight") return;
    const p1Won = att.side === 0, how = Match.finisher;
    const howTxt = { fatality1: "FATALITY — " + att.ch.fatalities[0].name, fatality2: "FATALITY — " + att.ch.fatalities[1].name, stage: "STAGE FATALITY — " + Match.stage.stageFatality, brutality: "BRUTALITY", ko: "K.O.", time: "TEMPS ÉCOULÉ" }[how] || "VICTOIRE";
    const r = $("#results .box");
    const head = Match.type === "2p" ? `${att.ch.name} GAGNE` : p1Won ? "VICTOIRE" : "DÉFAITE";
    const pk = att.id === "aurelia" ? (Settings.portrait === "real" ? "aur_real" : "aur_cyber") : (Settings.portrait === "real" ? "hai_real" : "hai_cyber");
    const s0 = F[0].stats, s1 = F[1].stats;
    let btns = "";
    if (Story.active) btns = p1Won ? `<button class="mbtn gold" id="rNext">${Story.stage >= 2 ? "Voir la fin" : "Stage suivant"}</button>` : `<button class="mbtn gold" id="rRetry">Continuer ? (réessayer)</button><button class="mbtn" id="rMenu">Abandonner</button>`;
    else btns = `<button class="mbtn gold" id="rRetry">Revanche</button><button class="mbtn" id="rSel">Changer de combattant</button><button class="mbtn" id="rMenu">Menu principal</button>`;
    r.innerHTML = `<div class="pic" style="background-image:url(${IMG[pk].src})"></div>
      <div class="ptag">${Story.active ? "CAMPAGNE • STAGE " + (Story.stage + 1) + "/3" : Match.stage.name}</div>
      <div class="wnm" style="color:${p1Won || Match.type === "2p" ? att.ch.color : "#ef4444"};text-shadow:0 0 20px ${att.ch.color}">${head}</div>
      <div class="cinzel" style="font-size:18px;color:#fbbf24;letter-spacing:.1em">${att.ch.name} — ${howTxt}</div>
      <div class="grid" style="width:540px">
        <div><span>${F[0].ch.name} — coups</span><b>${s0.hits}</b></div><div><span>${F[1].ch.name} — coups</span><b>${s1.hits}</b></div>
        <div><span>Combo max</span><b>${s0.maxCombo}</b></div><div><span>Combo max</span><b>${s1.maxCombo}</b></div>
        <div><span>Dégâts infligés</span><b>${Math.round(s0.dmg)}%</b></div><div><span>Dégâts infligés</span><b>${Math.round(s1.dmg)}%</b></div>
        <div><span>Spéciaux</span><b>${s0.specials}</b></div><div><span>Spéciaux</span><b>${s1.specials}</b></div>
        <div><span>Parades parfaites</span><b>${s0.parries || 0}</b></div><div><span>Parades parfaites</span><b>${s1.parries || 0}</b></div>
      </div><div style="width:420px">${btns}</div>`;
    Screens.overlay("results");
    const b = id => $("#" + id);
    if (b("rNext")) b("rNext").onclick = () => { Screens.overlay("results", false); Flow.storyNext(); };
    if (b("rRetry")) b("rRetry").onclick = () => { Screens.overlay("results", false); if (Story.active) { Story.continues++; Flow.storyStage(); } else Flow.fight(Flow.lastOpts); };
    if (b("rSel")) b("rSel").onclick = () => Screens.select(Sel.mode);
    if (b("rMenu")) b("rMenu").onclick = () => Screens.title();
    Audio2.playMusic(p1Won || Match.type === "2p" ? "menu" : "cine");
  },
  // -------------------- PAUSE --------------------
  pause(on) {
    if (Game.mode !== "fight" || $("#results").classList.contains("on")) return;
    Match.paused = on === undefined ? !Match.paused : on;
    Screens.overlay("pause", Match.paused);
    Audio2.setDuck(Match.paused ? 0.3 : 1);
  },
  // -------------------- GALERIE --------------------
  gallery(tab = "cine") {
    Game.setMode("menu"); MenuBG.set("cine_fracture"); Screens.show("title"); Screens.overlay("gallery");
    const U = getUnlocks(); Screens.galTab = tab;
    $$("#galTabs .btn").forEach(b => b.classList.toggle("sel", b.dataset.t === tab));
    const items = [];
    const seen = k => U[k] ? " ✓" : "";
    if (tab === "vid") {
      Object.keys(VIDEO_INFO).forEach(id => { const inf = VIDEO_INFO[id]; items.push({ img: inf.thumb, label: "🎬 " + inf.title + (VID[id] ? "" : Vid.pending ? " (chargement…)" : " (indisponible)"), vid: true, act: () => Screens.playVideo(id) }); });
    }
    if (tab === "cine") {
      [["intro", "cine_fracture"], ["interlude_jerusalem", "cine_hai"], ["interlude_singularity", "cine_singularity"], ["ending_aurelia", "ending_aurelia"], ["ending_hai", "ending_hai"]]
        .forEach(([id, img]) => items.push({ img, label: "▶ " + CINEMATICS[id].title + seen("cine_" + id), act: () => Cine.play(id, () => Screens.gallery("cine")) }));
    }
    if (tab === "fat") {
      ["aurelia", "hai"].forEach(id => CHARACTERS[id].fatalities.forEach((f, i) => {
        items.push({ img: f.key, label: "☠ " + f.name + seen(f.key), act: () => Screens.view(f.key, CHARACTERS[id].name + " — " + f.name + " (" + f.codeTxt + ")") });
        items.push({ img: f.key, label: "▶ VOIR EN ACTION — " + f.name, act: () => Flow.demo(id, "fatality" + (i + 1), id === "aurelia" ? 0 : 1) });
      }));
      STAGES.forEach((s, i) => items.push({ img: s.img, label: "⚡ STAGE FATALITY — " + s.stageFatality + seen("stage_" + s.id), act: () => Flow.demo(i === 1 ? "hai" : "aurelia", "stage", i) }));
      items.push({ img: "stage_paris", label: "✦ BRUTALITY — démo", act: () => Flow.demo("aurelia", "brutality", 0) });
      items.push({ img: "xray_aurelia", label: "✦ X-RAY Aurélia — Lames du Néant", act: () => Screens.view("xray_aurelia", "X-RAY : Lames du Néant") });
      items.push({ img: "xray_hai", label: "✦ X-RAY Haï — Overload Kabbalah", act: () => Screens.view("xray_hai", "X-RAY : Overload Kabbalah") });
    }
    if (tab === "art") {
      [["aur_cyber", "Aurélia — Cyber"], ["aur_real", "Aurélia — Réelle"], ["hai_cyber", "Haï — Cyber"], ["hai_real", "Haï — Réel"], ["couple", "Aurélia & Haï"], ["vs_poster", "Affiche VS"],
       ["planche_aurelia", "Planche — Aurélia"], ["planche_hai", "Planche — Haï"], ["cine_aurelia", "Cyber-Paris en feu"], ["cine_hai", "Néo-Jérusalem"], ["cine_singularity", "L'Œil Quantique"], ["cine_fracture", "La Fracture"]]
        .forEach(([k, l]) => items.push({ img: k, label: l, act: () => Screens.view(k, l) }));
      ["aur_idle", "aur_slash", "aur_kick", "aur_ult", "aur_hit", "hai_idle", "hai_punch", "hai_kick", "hai_ult", "hai_hit", "v1_aur_idle", "v1_hai_idle"].filter(k => IMG[k]).forEach(k => items.push({ img: k, label: "Posture — " + k.replace("v1_", "(original) ").replace("aur_", "Aurélia ").replace("hai_", "Haï "), act: () => Screens.view(k, k), contain: true }));
      STAGES.forEach(s => items.push({ img: s.img, label: "Arène — " + s.name, act: () => Screens.view(s.img, s.name + " — " + s.sub) }));
    }
    const g = $("#galGrid"); g.innerHTML = "";
    items.forEach(it => { const d = el("div", "it" + (it.vid ? " vidc" : ""), `<span>${it.label}</span>`); d.tabIndex = 0; d.style.backgroundImage = `url(${IMG[it.img] ? IMG[it.img].src : ""})`; if (it.contain) { d.style.backgroundSize = "contain"; d.style.backgroundRepeat = "no-repeat"; d.style.backgroundColor = "#0c0618"; } d.onclick = () => { Audio2.play("select"); it.act(); }; g.appendChild(d); });
  },
  view(key, cap) { const v = $("#viewer"); v.innerHTML = `<img src="${IMG[key].src}"><div class="cap">${cap}</div>`; v.classList.add("on"); v.onclick = () => Screens.closeViewer(); },
  // Lecteur vidéo dédié de la Krypte (vidéo + narration/répliques MP3 + musique)
  playVideo(id) {
    const inf = VIDEO_INFO[id], src = VID[id] ? VID[id].src : null; if (!src) { UI.toast(Vid.pending ? "Vidéo en cours de chargement…" : "Vidéo indisponible"); return; }
    const v = $("#viewer"); v.classList.add("on", "video");
    v.innerHTML = `<video id="kVid" src="${src}" autoplay loop muted playsinline controls></video><div class="cap">🎬 ${inf.title}<small>Narration & répliques en VF — voix d'Aurélia, Haï, narrateur</small></div><button class="btn vclose">✕ Fermer</button><button class="btn vvoice">🔊 Rejouer les voix</button>`;
    const kv = v.querySelector("#kVid"); kv.muted = true; const p = kv.play(); if (p && p.catch) p.catch(() => { });
    const sayAll = () => { clearTimeout(Screens.kvT); let t = 0.4; inf.voices.forEach((vid, i) => { Screens.kvT = setTimeout(() => Audio2.voice(vid, { ch: "kv" + (i % 2) }), t * 1000); t += (Audio2.voiceDur(vid) || 2) + 0.35; }); };
    Audio2.playMusic("cine"); sayAll();
    v.querySelector(".vclose").onclick = e => { e.stopPropagation(); Screens.closeViewer(); };
    v.querySelector(".vvoice").onclick = e => { e.stopPropagation(); sayAll(); };
    v.onclick = e => { if (e.target === v) Screens.closeViewer(); };
  },
  closeViewer() { const v = $("#viewer"); const kv = v.querySelector("video"); if (kv) { try { kv.pause(); } catch (e) { } kv.removeAttribute("src"); kv.load && kv.load(); } clearTimeout(Screens.kvT); Audio2.stopVoice("kv0"); Audio2.stopVoice("kv1"); v.classList.remove("on", "video"); v.innerHTML = ""; if (Game.mode === "menu") Audio2.playMusic("menu"); },
  // -------------------- OPTIONS --------------------
  options() {
    Game.setMode("menu"); Screens.show("title"); Screens.overlay("options");
    const o = $("#optList");
    const sel = (k, label, vals) => `<div class="opt"><span>${label}</span><span>${vals.map(([v, l]) => `<button class="btn${Settings[k] === v ? " sel" : ""}" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</span></div>`;
    o.innerHTML = sel("music", "Musique", [[true, "On"], [false, "Off"]]) + `<div class="opt"><span>Volume musique</span><input type="range" min="0" max="1" step="0.05" value="${Settings.musicVol}" data-r="musicVol"></div>` +
      sel("sfx", "Effets sonores", [[true, "On"], [false, "Off"]]) + `<div class="opt"><span>Volume effets</span><input type="range" min="0" max="1" step="0.05" value="${Settings.sfxVol}" data-r="sfxVol"></div>` +
      sel("voice", "Voix (Aurélia, Haï, narrateur, annonceur)", [[true, "On"], [false, "Off"]]) + `<div class="opt"><span>Volume voix</span><input type="range" min="0" max="1.5" step="0.05" value="${Settings.voiceVol}" data-r="voiceVol"></div>` +
      sel("perf", "Indicateur FPS / latence", [[true, "On"], [false, "Off"]]) + sel("shake", "Tremblements d'écran", [[true, "On"], [false, "Off"]]) +
      sel("layout", "Clavier", [["auto", "Auto"], ["azerty", "AZERTY"], ["qwerty", "QWERTY"]]) +
      sel("roundTime", "Durée des rounds", [[60, "60 s"], [99, "99 s"], [999, "∞"]]) +
      sel("outfit", "Sprites", [["hd", "HD 2026"], ["v1", "Originaux"]]) + sel("portrait", "Portraits", [["cyber", "Cyber"], ["real", "Réels"]]) +
      sel("quality", "Qualité des effets", [["basse", "Basse"], ["moyenne", "Moyenne"], ["haute", "Haute"]]) +
      sel("touch", "Boutons tactiles", [["auto", "Auto"], ["on", "Toujours"], ["off", "Jamais"]]);
    o.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { let v = b.dataset.v; v = v === "true" ? true : v === "false" ? false : isNaN(+v) ? v : +v; Settings[b.dataset.k] = v; saveSettings(); Audio2.play("ui"); Screens.options(); });
    o.querySelectorAll("[data-r]").forEach(r => r.oninput = () => { Settings[r.dataset.r] = +r.value; saveSettings(); });
  },
  // -------------------- COMMANDES --------------------
  moves() {
    Game.setMode("menu"); Screens.show("title"); Screens.overlay("moves");
    const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    const ctl = p => `<table>${row("Déplacement / Saut / Garde", [keyOf(p, "l"), keyOf(p, "r"), keyOf(p, "u"), keyOf(p, "d")].map(k => `<kbd>${k}</kbd>`).join(" "))}
      ${row("Coup rapide / Coup lourd", `<kbd>${keyOf(p, "lp")}</kbd> <kbd>${keyOf(p, "hp")}</kbd>`)}${row("Spécial (projectile)", `<kbd>${keyOf(p, "sp")}</kbd>`)}
      ${row("Téléportation", `<kbd>${keyOf(p, "tp")}</kbd>`)}${row("Chope", `<kbd>${keyOf(p, "gp")}</kbd>`)}${row("Spécial EX (1 barre)", `<kbd>${keyOf(p, "ex")}</kbd>`)}
      ${row("X-RAY (3 barres)", `<kbd>${keyOf(p, "xr")}</kbd>`)}${row("Dash", `<kbd>${keyOf(p, "dash")}</kbd>+dir ou 2× dir`)}
      ${row("Combo Breaker (1 barre, en encaissant)", `<kbd>${keyOf(p, "brk")}</kbd> ou ↓+Spécial`)}${row("Provocation parlée (+Super)", `<kbd>${keyOf(p, "tn")}</kbd>`)}
      ${row("PARADE PARFAITE : garder ≤ 6 frames avant l'impact", "↓ au dernier moment")}${row("Cancel : Rapide/Lourd → Spécial/EX/Téléport", "pendant le coup")}${row("DASH CANCEL (coup réussi)", `<kbd>${keyOf(p, "dash")}</kbd>+dir ou 2× dir`)}${row("Fatality 1 / 2 / Stage (raccourcis)", `<kbd>${keyOf(p, "f1")}</kbd> <kbd>${keyOf(p, "f2")}</kbd> <kbd>${keyOf(p, "f3")}</kbd>`)}</table>`;
    const chm = id => { const c = CHARACTERS[id], m = c.moves; return `<h3 style="color:${c.color}">${c.name}</h3><table>${Object.values(m).map(x => row(`<b>${x.name}</b> — ${x.desc}`, "")).join("")}
      ${c.fatalities.map(f => row(`☠ FATALITY — ${f.name}`, f.codeTxt)).join("")}${row("⚡ STAGE FATALITY (arène)", STAGE_FATALITY_CODE.codeTxt)}${row("✦ BRUTALITY", "Achever avec Spécial/EX/X-Ray")}</table>`; };
    $("#mvList").innerHTML = `<div><h3>JOUEUR 1 (${detectLayout().toUpperCase()})</h3>${ctl("p1")}<h3>JOUEUR 2</h3>${ctl("p2")}
      <p style="margin-top:8px;font-size:13px;color:#a78bfa">🎮 Manette : croix = déplacement, X rapide, Y lourd, B spécial, A saut, LB téléport, RB chope, RT EX, LT dash, LB+RB X-Ray, Select provocation. 📱 Boutons tactiles disponibles.<br>Codes : → = vers l'adversaire, ← = en arrière. En mode 1 joueur, les touches du J2 marchent aussi pour le J1.</p></div>
      <div>${chm("aurelia")}${chm("hai")}</div>`;
  }
};
