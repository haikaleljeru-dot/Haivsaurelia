/* =====================================================================
   ÉCRANS : titre, sélection, VS, résultats, pause, galerie, options, commandes
   ===================================================================== */
const Sel = { mode: "1p", p1: "aurelia", p2: "hai", p2Auto: true, stage: 0, diff: "guerrier" };
const Story = { active: false, char: "aurelia", diff: "guerrier", stage: 0, continues: 0, totalTime: 0, lost: 0 };
function defaultOpp(id) { return id === "aurelia" ? "hai" : "aurelia"; }
function portraitKey(id) { const ch = CHARACTERS[id]; return ch.portraits[Settings.portrait === "real" ? "real" : "cyber"]; }
function nextChar(id, d) { const L2 = Progress.chars(); const i = L2.indexOf(id); return L2[(i + d + L2.length) % L2.length] || "aurelia"; }
const Screens = {
  cur: "boot",
  show(id) {
    Screens.cur = id; if (typeof Replay !== "undefined" && id !== "hud") Replay.stop();
    ["boot", "title", "select", "vs", "cine", "hud"].forEach(k => $("#" + k).classList.toggle("on", k === id || (k === "hud" && id === "hud")));
    $$(".ovl").forEach(o => o.classList.remove("on"));
    UI.focusIdx = -1; setTimeout(() => UI.focusFirst(), 30);
  },
  overlay(id, on = true) { $("#" + id).classList.toggle("on", on); UI.focusIdx = -1; if (on) setTimeout(() => UI.focusFirst(), 30); },
  // -------------------- TITRE --------------------
  title() {
    Story.active = false; Match.active = false; F.length = 0;
    if (typeof Online !== "undefined" && Online.inMatch) Online.leaveMatch();
    Match.tower = null; Tower.active = false; Tutorial.active = false;
    Game.setMode("menu"); MenuBG.set("vs_poster"); Screens.show("title"); Audio2.playMusic("menu"); Audio2.setIntensity(0.2);
    Screens.koinTag();
  },
  koinTag() { const k = $("#koinTag"); if (k) k.innerHTML = `🪙 <b>${Progress.p.koins}</b> Koins • 🏆 ${Object.keys(Progress.p.ach).length}/${ACHIEVEMENTS.length}`; $$("#langSel .lng").forEach(b => b.classList.toggle("sel", b.dataset.lang === I18N.lang)); },
  // -------------------- SÉLECTION --------------------
  select(mode) {
    Sel.mode = mode; Game.setMode("menu"); MenuBG.set(STAGES[Sel.stage].img); Screens.show("select");
    const names = { story: "MODE HISTOIRE — CAMPAGNE", "1p": "DUEL CONTRE L'IA", "2p": "DUEL LOCAL — 2 JOUEURS", training: "ENTRAÎNEMENT & DÉMO FATALITY" };
    $("#selMode").textContent = L(names[mode]);
    if (!Progress.charAvailable(Sel.p1)) Sel.p1 = "aurelia";
    if (!Progress.charAvailable(Sel.p2) || Sel.p2Auto) Sel.p2 = defaultOpp(Sel.p1);
    if (!Progress.stageAvailable(Sel.stage)) Sel.stage = 0;
    Screens.renderSelect();
  },
  renderSelect() {
    const story = Sel.mode === "story";
    if (story) Sel.p2 = STORY_PATH[Sel.p1][0][0];
    [["#card_aurelia", Sel.p1, 0], ["#card_hai", Sel.p2, 1]].forEach(([q, id, side]) => {
      const c = $(q), ch = CHARACTERS[id], c1 = ch.color, c2 = ch.color2 || "#fff";
      c.classList.toggle("p1", side === 0); c.classList.toggle("p2", side === 1);
      const cs = Progress.costumesFor(id), cur = side === 0 ? Progress.costumeOf(id) : (Sel.p2cs && cs.includes(Sel.p2cs) ? Sel.p2cs : Progress.costumeOf(id));
      c.innerHTML = `<div class="art"></div><div class="shade"></div><div class="badge b1">J1</div><div class="badge b2">${Sel.mode === "2p" ? "J2" : Sel.mode === "training" ? L("MANNEQUIN") : "CPU"}</div>
        <div class="roster">${CHAR_IDS.map(k => { const ok = Progress.charAvailable(k); return `<button class="btn rch${k === id ? " sel" : ""}${ok ? "" : " lockd"}" data-side="${side}" data-ch="${k}" style="--c:${CHARACTERS[k].color}">${ok ? "" : "🔒 "}${CHARACTERS[k].name.replace("L'ŒIL QUANTIQUE", "L'ŒIL")}</button>`; }).join("")}</div>
        <div class="info"><div class="tt" style="color:${c1}">${L(ch.title)}</div><div class="nm" style="color:#fff;text-shadow:0 0 18px ${c1}">${ch.name}</div>
        <div class="lore">${L(ch.lore)}</div>
        ${Object.entries(ch.stats).map(([k, v]) => `<div class="stat" style="--c1:${c1};--c2:${c2}"><b>${L(k).toUpperCase()}</b><i><u style="width:${v}%"></u></i></div>`).join("")}
        ${cs.length > 1 ? `<div class="csRow">${L("Tenue")} : ${cs.map(k => `<button class="btn csb${k === cur ? " sel" : ""}" data-side="${side}" data-cs="${k}">${Costumes.label(id, k)}</button>`).join("")}</div>` : ""}</div>`;
      c.querySelector(".art").style.backgroundImage = `url(${IMG[portraitKey(id)] ? IMG[portraitKey(id)].src : ""})`;
      if (cur !== "base") c.querySelector(".art").classList.add("cs_" + cur);
    });
    $$("#select .rch").forEach(b => b.onclick = e => {
      e.stopPropagation(); const k = b.dataset.ch;
      if (!Progress.charAvailable(k)) { UI.toast(L("🔒 Termine le mode Histoire ou débloque-le dans la Krypte")); Audio2.play("block"); return; }
      if (b.dataset.side === "0") { Sel.p1 = k; if (Sel.p2Auto) Sel.p2 = defaultOpp(k); } else if (!story) { Sel.p2 = k; Sel.p2Auto = false; }
      Audio2.play("select"); Screens.renderSelect();
    });
    $$("#select .csb").forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.side === "0" ? Sel.p1 : Sel.p2; if (b.dataset.side === "0") Progress.setCostume(id, b.dataset.cs); else Sel.p2cs = b.dataset.cs; Audio2.play("ui"); Screens.renderSelect(); });
    const showStage = !story, showDiff = story || Sel.mode === "1p";
    $("#selStageBox").style.display = showStage ? "" : "none"; $("#selDiffBox").style.display = showDiff ? "" : "none";
    $("#selStoryBox").style.display = story ? "" : "none";
    const st = STAGES[Sel.stage]; $("#stagePrev").style.backgroundImage = `url(${IMG[st.img] ? IMG[st.img].src : ""})`; $("#stagePrev span").textContent = L(st.name);
    $$("#selStages .btn").forEach((b, i) => { b.classList.toggle("sel", i === Sel.stage); b.classList.toggle("lockd", !Progress.stageAvailable(i)); b.textContent = (Progress.stageAvailable(i) ? "" : "🔒 ") + L(STAGE_SHORT[STAGES[i].id]); });
    $$("#selDiffs .btn").forEach(b => b.classList.toggle("sel", b.dataset.d === Sel.diff));
    $$("#selPortrait .btn").forEach(b => b.classList.toggle("sel", b.dataset.v === Settings.portrait));
    $$("#selOutfit .btn").forEach(b => b.classList.toggle("sel", b.dataset.v === Settings.outfit));
    $$("#selTime .btn").forEach(b => b.classList.toggle("sel", +b.dataset.v === Settings.roundTime));
    MenuBG.set(st.img);
    I18N.apply($("#select"));
  },
  buildSelect() {
    $("#selStages").innerHTML = STAGES.map((s, i) => `<button class="btn" data-i="${i}">${STAGE_SHORT[s.id]}</button>`).join("");
    $$("#selStages .btn").forEach(b => b.onclick = () => { const i = +b.dataset.i; if (!Progress.stageAvailable(i)) { UI.toast(L("🔒 Arène à débloquer dans la Krypte (250 Koins) ou à l'étage 5 de la Tour")); Audio2.play("block"); return; } Sel.stage = i; Audio2.play("ui"); Screens.renderSelect(); });
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
    const cs = [Progress.costumeOf(Sel.p1), Sel.p2cs && Progress.costumesFor(Sel.p2).includes(Sel.p2cs) ? Sel.p2cs : Progress.costumeOf(Sel.p2)];
    if (Sel.mode === "training") { Flow.fight({ type: "training", stageIdx: Sel.stage, p1Char: Sel.p1, p2Char: Sel.p2, costumes: cs }); return; }
    Screens.vs(Sel.stage, () => Flow.fight({ type: Sel.mode, stageIdx: Sel.stage, p1Char: Sel.p1, p2Char: Sel.p2, difficulty: Sel.diff, costumes: cs }), Sel.p1, Sel.p2);
  },
  // choix d'un dialogue pré-combat selon l'arène et le duo (voix MP3 « pre_* » / « dlg_* »)
  pickDialogue(stId, a, b) {
    const ltr = { aurelia: "A", hai: "H", eye: "E" }, pair = [ltr[a], ltr[b]].sort().join("");
    if (a === b) return null;
    const opts = [];
    if (pair === "AH" && PREFIGHT[stId]) opts.push({ pfx: "pre_" + stId, lines: PREFIGHT[stId] });
    DIALOGUES.forEach(d => { if (d.pair.split("").sort().join("") === pair && (d.stage === stId || d.stage === "*")) opts.push({ pfx: "dlg_" + d.id, lines: d.lines }); });
    if (!opts.length) return null;
    const k = "dlgIdx_" + stId + pair; Screens[k] = ((Screens[k] == null ? Math.floor(Math.random() * opts.length) : Screens[k] + 1)) % opts.length;
    return opts[Screens[k]];
  },
  // -------------------- ÉCRAN VS (vidéo + répliques vocales) --------------------
  vs(stageIdx, onDone, p1, p2) {
    Game.setMode("vs"); Screens.show("vs"); VsBG.t = 0; P.length = 0;
    Vid.stopAll(); Vid.play("vid_vs_clash", 0.8);
    p1 = p1 || Sel.p1; p2 = p2 || defaultOpp(p1);
    const st = STAGES[stageIdx], Lc = CHARACTERS[p1], R = CHARACTERS[p2];
    const pk = portraitKey;
    const v = $("#vs"); v.classList.toggle("vid", !!VID.vid_vs_clash);
    v.innerHTML = `<div class="half l" style="background-image:url(${IMG[pk(p1)].src})"><i class="talkRing"></i></div><div class="half r" style="background-image:url(${IMG[pk(p2)].src})"><i class="talkRing"></i></div>
      <div class="stageName">${Story.active ? "STAGE " + (Story.stage + 1) + "/3 — " : Match.towerPending ? L("TOUR DES DÉFIS") + " — " + L("ÉTAGE") + " " + (Tower.floor + 1) + "/10 — " : ""}${L(st.name)} • ${L(st.sub)}</div><div class="bigvs">VS</div>
      <div class="nm l">${Lc.name}<small>${L(Lc.title)}</small></div><div class="nm r">${R.name}<small>${L(R.title)}</small></div><div class="dlg"></div>
      <div class="vsTag">● LIVE // MULTIVERSE FEED</div>
      <button class="btn skip" id="vsSkip">Passer ▸</button>`;
    v.querySelector(".half.l").style.setProperty("--c", Lc.color);
    Audio2.playMusic("cine"); setTimeout(() => Audio2.play("vsclash"), 380);
    const D = Screens.pickDialogue(st.id, p1, p2), lines = D ? D.lines : []; let i = 0, done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(Screens.vsTimer); Audio2.stopVoice("vs"); if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { } Vid.stop("vid_vs_clash"); onDone(); };
    Screens.vsSkip = finish; $("#vsSkip").onclick = finish;
    const step = () => {
      if (done) return;
      if (i >= lines.length) { Screens.vsTimer = setTimeout(finish, 1300); return; }
      const idx = i++, [w, text] = lines[idx], ch = CHARACTERS[WHO_CHAR[w]], vid = `${D.pfx}_${idx}`;
      const d = el("div", "dl", `<b style="color:${ch.color}"><i class="eq"><u></u><u></u><u></u><u></u></i>${ch.name}</b>${I18N.sub(vid, text)}`); d.style.borderColor = ch.color;
      const box = v.querySelector(".dlg"); box.appendChild(d); while (box.children.length > 2) box.firstChild.remove();
      // portrait de celui qui parle illuminé
      const side = WHO_CHAR[w] === p1 ? "l" : "r";
      v.querySelectorAll(".half").forEach(h => h.classList.toggle("talk", h.classList.contains(side)));
      let dur = Settings.voice ? Audio2.voice(vid, { ch: "vs", pan: side === "l" ? -0.35 : 0.35 }) : 0;
      if (!dur) { if (Settings.voice) Audio2.say(text, w === "A" ? 1.25 : w === "E" ? 0.3 : 0.75, 1.08); dur = Math.max(2.2, text.length / 16); }
      Screens.vsTimer = setTimeout(() => { v.querySelectorAll(".half").forEach(h => h.classList.remove("talk")); step(); }, (dur + 0.45) * 1000);
    };
    Screens.vsTimer = setTimeout(step, 1100);
  },
  // -------------------- RÉSULTATS --------------------
  results(att, vic) {
    if (Game.mode !== "fight") return;
    const p1Won = Match.type === "online" ? att.side === Online.localSide : att.side === 0, how = Match.finisher;
    const howTxt = { fatality1: "FATALITY — " + att.ch.fatalities[0].name, fatality2: "FATALITY — " + att.ch.fatalities[1].name, stage: "STAGE FATALITY — " + Match.stage.stageFatality, brutality: "BRUTALITY", friendship: "FRIENDSHIP — " + att.ch.friendship.name, animality: "ANIMALITY — " + att.ch.animality.name, ko: "K.O.", time: L("TEMPS ÉCOULÉ") }[how] || L("VICTOIRE");
    const r = $("#results .box");
    const head = Match.type === "2p" ? `${att.ch.name} ${L("GAGNE")}` : p1Won ? L("VICTOIRE") : L("DÉFAITE");
    const pk = portraitKey(att.id);
    const s0 = F[0].stats, s1 = F[1].stats;
    let btns = "";
    if (Story.active) btns = p1Won ? `<button class="mbtn gold" id="rNext">${Story.stage >= 2 ? L("Voir la fin") : L("Stage suivant")}</button>` : `<button class="mbtn gold" id="rRetry">${L("Continuer ? (réessayer)")}</button><button class="mbtn" id="rMenu">${L("Abandonner")}</button>`;
    else if (Match.tower) btns = Tower.resultButtons(p1Won);
    else if (Match.type === "online") btns = `<button class="mbtn gold" id="rOnRe">${L("Revanche en ligne")}</button><button class="mbtn" id="rMenu">${L("Quitter le duel")}</button>`;
    else btns = `<button class="mbtn gold" id="rRetry">${L("Revanche")}</button><button class="mbtn" id="rSel">${L("Changer de combattant")}</button><button class="mbtn" id="rMenu">${L("Menu principal")}</button>`;
    if (Replay.canSave()) btns += `<button class="mbtn" id="rClip">🎞 ${L("Clip des 10 dernières secondes")}</button>`;
    const kw = Progress.lastGain && performance.now() - Progress.lastGain.t < 4000 ? `<div class="kwin">🪙 +${Progress.lastGain.n} Koins <small>(${L("total")} ${Progress.p.koins})</small></div>` : "";
    r.innerHTML = `<div class="pic" style="background-image:url(${IMG[pk].src})"></div>
      <div class="ptag">${Story.active ? L("CAMPAGNE") + " • STAGE " + (Story.stage + 1) + "/3" : Match.tower ? L("TOUR DES DÉFIS") + " • " + L("ÉTAGE") + " " + (Match.tower.floor + 1) + "/10" : L(Match.stage.name)}</div>
      <div class="wnm" style="color:${p1Won || Match.type === "2p" ? att.ch.color : "#ef4444"};text-shadow:0 0 20px ${att.ch.color}">${head}</div>
      <div class="cinzel" style="font-size:18px;color:#fbbf24;letter-spacing:.1em">${att.ch.name} — ${howTxt}</div>${kw}
      <div class="grid" style="width:540px">
        <div><span>${F[0].ch.name} — ${L("coups")}</span><b>${s0.hits}</b></div><div><span>${F[1].ch.name} — ${L("coups")}</span><b>${s1.hits}</b></div>
        <div><span>${L("Combo max")}</span><b>${s0.maxCombo}</b></div><div><span>${L("Combo max")}</span><b>${s1.maxCombo}</b></div>
        <div><span>${L("Dégâts infligés")}</span><b>${Math.round(s0.dmg)}%</b></div><div><span>${L("Dégâts infligés")}</span><b>${Math.round(s1.dmg)}%</b></div>
        <div><span>${L("Spéciaux")}</span><b>${s0.specials}</b></div><div><span>${L("Spéciaux")}</span><b>${s1.specials}</b></div>
        <div><span>${L("Parades parfaites")}</span><b>${s0.parries || 0}</b></div><div><span>${L("Parades parfaites")}</span><b>${s1.parries || 0}</b></div>
      </div><div style="width:420px">${btns}</div>`;
    Screens.overlay("results");
    const b = id => $("#" + id);
    if (b("rNext")) b("rNext").onclick = () => { Screens.overlay("results", false); Flow.storyNext(); };
    if (b("rRetry")) b("rRetry").onclick = () => { Screens.overlay("results", false); if (Story.active) { Story.continues++; Flow.storyStage(); } else Flow.fight(Flow.lastOpts); };
    if (b("rSel")) b("rSel").onclick = () => Screens.select(Sel.mode);
    if (b("rMenu")) b("rMenu").onclick = () => { if (Match.type === "online") Online.disconnect(true); Screens.title(); };
    if (b("rOnRe")) b("rOnRe").onclick = () => Online.requestRematch();
    if (b("rClip")) b("rClip").onclick = () => Replay.save();
    Tower.bindResults(p1Won);
    Audio2.playMusic(p1Won || Match.type === "2p" ? "menu" : "cine");
  },
  // -------------------- PAUSE --------------------
  pause(on) {
    if (Game.mode !== "fight" || $("#results").classList.contains("on")) return;
    if (Match.type === "online") { // le duel en ligne ne se met jamais en pause (lockstep) : simple menu par-dessus
      if (on === true) return; const show = on === undefined ? !$("#pause").classList.contains("on") : on;
      Match.paused = false; Screens.overlay("pause", show); ["pRestart", "pMoves", "pClip"].forEach(id => $("#" + id).classList.toggle("hidden", show)); return;
    }
    ["pRestart", "pMoves"].forEach(id => $("#" + id).classList.remove("hidden"));
    $("#pClip").classList.toggle("hidden", !Replay.canSave());
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
    const eyeOk = Progress.charAvailable("eye"), lockMsg = L("🔒 Débloque-le dans la Krypte");
    const vidOpen = id => ({ vid_ending_aurelia: U.story_aurelia, vid_ending_hai: U.story_hai, vid_fatality_aurelia: U.fat_aur_1 || U.fat_aur_2, vid_fatality_hai: U.fat_hai_1 || U.fat_hai_2 })[id] || Progress.has(id) || !KRYPT_ITEMS.some(it => it.id === id);
    const artOpen = k => { const it = KRYPT_ITEMS.find(x => x.type === "art" && x.arts.includes(k)); return !it || Progress.has(it.id) || (k === "ending_eye" && U.story_eye) || (k === "secret_ending" && U.cine_secret); };
    if (tab === "vid") {
      Object.keys(VIDEO_INFO).forEach(id => { const inf = VIDEO_INFO[id], ok = vidOpen(id); items.push({ img: inf.thumb, label: "🎬 " + L(inf.title) + (VID[id] ? "" : Vid.pending ? " " + L("(chargement…)") : " " + L("(indisponible)")), vid: true, lock: !ok, act: () => ok ? Screens.playVideo(id) : UI.toast(lockMsg) }); });
    }
    if (tab === "cine") {
      [["intro", "cine_fracture"], ["interlude_jerusalem", "cine_hai"], ["interlude_singularity", "cine_singularity"], ["ending_aurelia", "ending_aurelia"], ["ending_hai", "ending_hai"], ["ending_eye", "ending_eye"], ["secret", "secret_ending"]]
        .forEach(([id, img]) => { const ok = id === "ending_eye" ? artOpen("ending_eye") || U.cine_ending_eye : id === "secret" ? artOpen("secret_ending") || U.cine_secret : true; items.push({ img, label: "▶ " + L(CINEMATICS[id].title) + seen("cine_" + id), lock: !ok, act: () => ok ? Cine.play(id, () => Screens.gallery("cine")) : UI.toast(lockMsg) }); });
    }
    if (tab === "fat") {
      CHAR_IDS.forEach(id => { const C = CHARACTERS[id], ok = id !== "eye" || eyeOk;
        C.fatalities.forEach((f, i) => {
          const artOk = ok && (id !== "eye" || artOpen(f.key));
          items.push({ img: f.key, label: "☠ " + L(f.name) + seen(f.key), lock: !artOk, act: () => artOk ? Screens.view(f.key, C.name + " — " + L(f.name) + " (" + f.codeTxt + ")") : UI.toast(lockMsg) });
          items.push({ img: f.key, label: "▶ " + L("VOIR EN ACTION") + " — " + L(f.name), lock: !ok, act: () => ok ? Flow.demo(id, "fatality" + (i + 1), id === "aurelia" ? 0 : id === "hai" ? 1 : 2) : UI.toast(lockMsg) });
        });
        ["friendship", "animality"].forEach(kind => { const fn = C[kind]; items.push({ img: fn.art, label: (kind === "friendship" ? "💖 FRIENDSHIP — " : "🐾 ANIMALITY — ") + L(fn.name) + seen(fn.key), lock: !ok, act: () => ok ? Flow.demo(id, kind, id === "hai" ? 1 : 0) : UI.toast(lockMsg) }); });
      });
      STAGES.forEach((s, i) => { const ok = Progress.stageAvailable(i); items.push({ img: s.img, label: "⚡ STAGE FATALITY — " + L(s.stageFatality) + seen("stage_" + s.id), lock: !ok, act: () => ok ? Flow.demo(i === 1 ? "hai" : "aurelia", "stage", i) : UI.toast(lockMsg) }); });
      items.push({ img: "stage_paris", label: "✦ BRUTALITY — " + L("démo"), act: () => Flow.demo("aurelia", "brutality", 0) });
      items.push({ img: "xray_aurelia", label: "✦ X-RAY Aurélia — " + L("Lames du Néant"), act: () => Screens.view("xray_aurelia", "X-RAY : " + L("Lames du Néant")) });
      items.push({ img: "xray_hai", label: "✦ X-RAY Haï — Overload Kabbalah", act: () => Screens.view("xray_hai", "X-RAY : Overload Kabbalah") });
      const xo = eyeOk && artOpen("xray_eye"); items.push({ img: "xray_eye", label: "✦ X-RAY L'Œil — " + L("Effondrement Neural"), lock: !xo, act: () => xo ? Screens.view("xray_eye", "X-RAY : " + L("Effondrement Neural")) : UI.toast(lockMsg) });
    }
    if (tab === "art") {
      [["aur_cyber", "Aurélia — Cyber"], ["aur_real", "Aurélia — Réelle"], ["hai_cyber", "Haï — Cyber"], ["hai_real", "Haï — Réel"], ["couple", "Aurélia & Haï"], ["vs_poster", "Affiche VS"],
       ["planche_aurelia", "Planche — Aurélia"], ["planche_hai", "Planche — Haï"], ["cine_aurelia", "Cyber-Paris en feu"], ["cine_hai", "Néo-Jérusalem"], ["cine_singularity", "L'Œil Quantique"], ["cine_fracture", "La Fracture"],
       ["eye_cyber", "L'Œil Quantique — Portrait"], ["friendship_aur", "Friendship — Aurélia"], ["friendship_hai", "Friendship — Haï"], ["friendship_eye", "Friendship — L'Œil"], ["animality_aur", "Animality — Aurélia"], ["animality_hai", "Animality — Haï"], ["animality_eye", "Animality — L'Œil"], ["ending_eye", "Fin de l'Œil Quantique"], ["secret_ending", "Fin secrète"]]
        .forEach(([k, l]) => { const ok = artOpen(k); items.push({ img: k, label: L(l), lock: !ok, act: () => ok ? Screens.view(k, L(l)) : UI.toast(lockMsg) }); });
      ["aur_idle", "aur_slash", "aur_kick", "aur_ult", "aur_hit", "hai_idle", "hai_punch", "hai_kick", "hai_ult", "hai_hit", "eye_idle", "eye_punch", "eye_kick", "eye_ult", "eye_hit", "v1_aur_idle", "v1_hai_idle"].filter(k => IMG[k]).forEach(k => { const ok = !k.startsWith("eye") || eyeOk; items.push({ img: k, label: L("Posture") + " — " + k.replace("v1_", "(original) ").replace("aur_", "Aurélia ").replace("hai_", "Haï ").replace("eye_", "L'Œil "), lock: !ok, act: () => ok ? Screens.view(k, k) : UI.toast(lockMsg), contain: true }); });
      STAGES.forEach((s, i) => items.push({ img: s.img, label: L("Arène") + " — " + L(s.name), act: () => Screens.view(s.img, L(s.name) + " — " + L(s.sub)) }));
    }
    const g = $("#galGrid"); g.innerHTML = "";
    items.forEach(it => { const d = el("div", "it" + (it.vid ? " vidc" : "") + (it.lock ? " lock" : ""), `<span>${it.label}</span>`); d.tabIndex = 0; const im = IMG[it.img]; d.style.backgroundImage = `url(${im && im.src ? im.src : ""})`; if (it.contain) { d.style.backgroundSize = "contain"; d.style.backgroundRepeat = "no-repeat"; d.style.backgroundColor = "#0c0618"; } d.onclick = () => { Audio2.play(it.lock ? "block" : "select"); it.act(); }; g.appendChild(d); });
  },
  view(key, cap) { const v = $("#viewer"); if (!IMG[key] || !IMG[key].src) { UI.toast(L("Chargement…")); return; } v.innerHTML = `<img src="${IMG[key].src}"><div class="cap">${cap}</div>`; v.classList.add("on"); v.onclick = () => Screens.closeViewer(); },
  // Lecteur vidéo dédié de la Krypte (vidéo + narration/répliques MP3 + musique)
  playVideo(id) {
    const inf = VIDEO_INFO[id], src = VID[id] ? VID[id].src : null; if (!src) { UI.toast(L(Vid.pending ? "Vidéo en cours de chargement…" : "Vidéo indisponible")); return; }
    const v = $("#viewer"); v.classList.add("on", "video");
    v.innerHTML = `<video id="kVid" src="${src}" autoplay loop muted playsinline controls></video><div class="cap">🎬 ${L(inf.title)}<small>${L("Narration & répliques en VF — voix d'Aurélia, Haï, narrateur")}</small></div><button class="btn vclose">${L("✕ Fermer")}</button><button class="btn vvoice">${L("🔊 Rejouer les voix")}</button>`;
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
      sel("touch", "Boutons tactiles", [["auto", "Auto"], ["on", "Toujours"], ["off", "Jamais"]]) +
      sel("lang", "Langue (interface & sous-titres)", [["fr", "Français"], ["en", "English"], ["he", "עברית"]]) +
      sel("haptics", "Vibrations (manette / mobile)", [[true, "On"], [false, "Off"]]) +
      sel("replay", "Enregistrement des clips (10 s)", [[true, "On"], [false, "Off"]]);
    o.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { let v = b.dataset.v; v = v === "true" ? true : v === "false" ? false : isNaN(+v) ? v : +v; Settings[b.dataset.k] = v; saveSettings(); if (b.dataset.k === "lang") I18N.set(v); Audio2.play("ui"); Screens.options(); });
    I18N.apply($("#options"));
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
      ${row("PARADE PARFAITE : garder ≤ 6 frames avant l'impact", "↓ au dernier moment")}${row("Cancel : Rapide/Lourd → Spécial/EX/Téléport", "pendant le coup")}${row("DASH CANCEL (coup réussi)", `<kbd>${keyOf(p, "dash")}</kbd>+dir ou 2× dir`)}${row("Fatality 1 / 2 / Stage (raccourcis)", `<kbd>${keyOf(p, "f1")}</kbd> <kbd>${keyOf(p, "f2")}</kbd> <kbd>${keyOf(p, "f3")}</kbd>`)}${row("Friendship / Animality (raccourcis)", `<kbd>${keyOf(p, "f4")}</kbd> <kbd>${keyOf(p, "f5")}</kbd>`)}</table>`;
    const chm = id => { const c = CHARACTERS[id], m = c.moves; return `<h3 style="color:${c.color}">${c.name}</h3><table>${Object.values(m).map(x => row(`<b>${x.name}</b> — ${x.desc}`, "")).join("")}
      ${c.fatalities.map(f => row(`☠ FATALITY — ${f.name}`, f.codeTxt)).join("")}${row(`💖 FRIENDSHIP — ${c.friendship.name}`, c.friendship.codeTxt)}${row(`🐾 ANIMALITY — ${c.animality.name}`, c.animality.codeTxt)}${row("⚡ STAGE FATALITY (arène)", STAGE_FATALITY_CODE.codeTxt)}${row("✦ BRUTALITY", "Achever avec Spécial/EX/X-Ray")}</table>`; };
    $("#mvList").innerHTML = `<div><h3>JOUEUR 1 (${detectLayout().toUpperCase()})</h3>${ctl("p1")}<h3>JOUEUR 2</h3>${ctl("p2")}
      <p style="margin-top:8px;font-size:13px;color:#a78bfa">🎮 Manette : croix = déplacement, X rapide, Y lourd, B spécial, A saut, LB téléport, RB chope, RT EX, LT dash, LB+RB X-Ray, Select provocation. 📱 Boutons tactiles disponibles.<br>Codes : → = vers l'adversaire, ← = en arrière. En mode 1 joueur, les touches du J2 marchent aussi pour le J1.</p></div>
      <div>${chm("aurelia")}${chm("hai")}${Progress.charAvailable("eye") ? chm("eye") : `<h3 style="color:#a855f7">🔒 L'ŒIL QUANTIQUE</h3><p>${L("Termine le mode Histoire ou débloque-le dans la Krypte.")}</p>`}</div>`;
    I18N.apply($("#moves"));
  },
  // -------------------- KRYPTE --------------------
  krypt() {
    Game.setMode("menu"); MenuBG.set("cine_singularity"); Screens.show("title"); Screens.overlay("krypt");
    Screens.renderKrypt();
    $("#kCodeGo").onclick = () => { const r = Progress.cheat($("#kCode").value); $("#kCodeMsg").textContent = r === true ? L("✓ Code accepté !") : r === "used" ? L("Code déjà utilisé") : L("✗ Code inconnu"); Audio2.play(r === true ? "gong" : "block"); $("#kCode").value = ""; Screens.renderKrypt(); };
    $("#kCode").onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") $("#kCodeGo").click(); };
  },
  renderKrypt() {
    $("#kBal").innerHTML = `🪙 ${Progress.p.koins} Koins`;
    const g = $("#kGrid"); g.innerHTML = "";
    KRYPT_ITEMS.forEach(it => {
      const own = Progress.has(it.id), im = IMG[it.thumb];
      const d = el("div", "kit" + (own ? " own" : "") + (it.type === "costume" ? " cs" : ""), `<div class="th" style="background-image:url(${im && im.src ? im.src : ""})"></div><div class="tx"><b>${L(it.name)}</b><span>${L(it.desc)}</span></div>
        <button class="btn ${own ? "" : "gold"}">${own ? L("✓ Possédé") : "🪙 " + it.cost}</button>`);
      if (it.type === "costume" && im) d.querySelector(".th").classList.add("cs_" + it.cs);
      d.querySelector("button").onclick = () => { if (own) { if (it.type === "costume") { Progress.setCostume(it.ch, Progress.costumeOf(it.ch) === it.cs ? "base" : it.cs); UI.toast(CHARACTERS[it.ch].name + " : " + Costumes.label(it.ch, Progress.costumeOf(it.ch))); } return; } if (Progress.buy(it.id)) Screens.renderKrypt(); };
      g.appendChild(d);
    });
    $("#kCost").innerHTML = `<b>${L("Tenues équipées")} :</b> ` + CHAR_IDS.filter(id => Progress.charAvailable(id)).map(id => `${CHARACTERS[id].name} — <i>${Costumes.label(id, Progress.costumeOf(id))}</i>`).join(" • ") + `<br><small>${L("Gagne des Koins : victoire 100, Flawless +50, Fatality +75, Friendship/Animality +100, combo ≥5 coups, parades parfaites, Tour des Défis, Histoire terminée +500.")}</small>`;
    I18N.apply($("#krypt"));
  },
  // -------------------- TROPHÉES & CLASSEMENTS --------------------
  trophies() {
    Game.setMode("menu"); MenuBG.set("vs_poster"); Screens.show("title"); Screens.overlay("trophies");
    const P2 = Progress.p, S = P2.stats, fmt = d => new Date(d).toLocaleDateString(I18N.lang === "he" ? "he-IL" : I18N.lang === "en" ? "en-GB" : "fr-FR");
    const nm = id => (CHARACTERS[id] || {}).name || id;
    const lb = (arr, unit) => arr.length ? `<table>${arr.map((e, i) => `<tr><td>#${i + 1}</td><td><b>${e.v}${unit}</b></td><td>${nm(e.ch)}${e.vs ? " vs " + nm(e.vs) : ""}</td><td>${e.st ? L(STAGE_SHORT[e.st] || e.st) : ""}</td><td>${fmt(e.d)}</td></tr>`).join("")}</table>` : `<p class="dim">${L("Aucun record pour l'instant.")}</p>`;
    $("#trList").innerHTML = `<div class="trGrid">${ACHIEVEMENTS.map(([id, n, d, ic]) => { const t = P2.ach[id]; return `<div class="tr${t ? " ok" : ""}"><i>${t ? ic : "🔒"}</i><b>${L(n)}</b><span>${L(d)}</span>${t ? `<small>${fmt(t)}</small>` : ""}</div>`; }).join("")}</div>
      <div class="lbs"><div><h3>⏱ ${L("Victoires les plus rapides")}</h3>${lb(P2.lb.fastest, " s")}</div><div><h3>⚡ ${L("Combos les plus longs")}</h3>${lb(P2.lb.combo, " " + L("coups"))}</div>
      <div><h3>💎 ${L("Statistiques")}</h3><table><tr><td>Flawless</td><td><b>${S.flawless}</b></td></tr><tr><td>${L("Victoires")}</td><td><b>${S.wins}</b></td></tr><tr><td>${L("Défaites")}</td><td><b>${S.losses}</b></td></tr><tr><td>Fatalities</td><td><b>${S.fatalities}</b></td></tr><tr><td>Friendships</td><td><b>${S.friendships}</b></td></tr><tr><td>Animalities</td><td><b>${S.animalities}</b></td></tr><tr><td>${L("Parades parfaites")}</td><td><b>${S.parries}</b></td></tr><tr><td>Dash Cancels</td><td><b>${S.dash}</b></td></tr><tr><td>${L("Duels en ligne")}</td><td><b>${S.online}</b></td></tr><tr><td>${L("Tour : meilleur étage")}</td><td><b>${P2.tower.best}/10</b></td></tr><tr><td>Koins</td><td><b>${P2.koins}</b></td></tr></table></div></div>`;
    I18N.apply($("#trophies"));
  }
};
