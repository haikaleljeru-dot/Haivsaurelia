/* =====================================================================
   v4 — MODES : TOUR DES DÉFIS (10 combats à modificateurs) & TUTORIEL
   ===================================================================== */
const TOWER_FLOORS = [
  { name: "Échauffement", desc: "Combat classique, IA Novice.", opp: "hai", st: 0, diff: "novice", mods: {}, koins: 60 },
  { name: "Sans projectiles", desc: "Tes projectiles sont interdits : corps à corps obligatoire.", opp: "aurelia", st: 1, diff: "novice", mods: { noproj: 1 }, koins: 70 },
  { name: "Super infini", desc: "Ta barre de super est toujours pleine : X-Ray à volonté !", opp: "hai", st: 2, diff: "guerrier", mods: { infmeter: 1 }, koins: 80 },
  { name: "Pluie acide", desc: "Ta vie fond lentement : gagne vite.", opp: "aurelia", st: 0, diff: "guerrier", mods: { acid: 1 }, koins: 90 },
  { name: "Gravité lunaire", desc: "Sauts flottants et jongles aériens interminables.", opp: "eye", st: 2, diff: "guerrier", mods: { grav: 0.55 }, koins: 120, reward: "telaviv" },
  { name: "Régénération", desc: "L'adversaire régénère sa vie : enchaîne sans pause.", opp: "hai", st: 3, diff: "maitre", mods: { regen: 1 }, koins: 120 },
  { name: "Dégâts ×1,5", desc: "Chaque coup inflige 50 % de dégâts en plus, des deux côtés.", opp: "aurelia", st: 1, diff: "maitre", mods: { dmg: 1.5 }, koins: 130 },
  { name: "Le Géant", desc: "Un adversaire gigantesque qui frappe plus fort.", opp: "hai", st: 0, diff: "maitre", mods: { giant: 1 }, koins: 150 },
  { name: "Mort subite", desc: "Un seul round, 40 % de vie chacun.", opp: "aurelia", st: 3, diff: "cauchemar", mods: { hp: 40 }, wins: 1, koins: 170 },
  { name: "Boss : L'Œil Quantique", desc: "L'Œil surpuissant (+15 % de dégâts), IA Cauchemar.", opp: "eye", st: 2, diff: "cauchemar", mods: { boss: 1 }, koins: 250, reward: "cs_eye_solaire" }
];
const Tower = {
  active: false, floor: 0, char: "aurelia",
  open() {
    Game.setMode("menu"); MenuBG.set("stage_singularity"); Screens.show("title"); Screens.overlay("tower");
    if (!Progress.charAvailable(Tower.char)) Tower.char = "aurelia";
    Tower.render();
  },
  render() {
    const best = Progress.p.tower.best || 0, chars = Progress.chars();
    const rows = TOWER_FLOORS.map((fl, i) => {
      const done = i < best, cur = i === Math.min(best, 9), ch = CHARACTERS[fl.opp];
      const rw = fl.reward ? " • 🎁 " + (KRYPT_ITEMS.find(it => it.id === fl.reward) || {}).name : "";
      return `<div class="twf${done ? " done" : ""}${cur ? " cur" : ""}"><b>${i + 1}</b><div class="twn"><span>${L(fl.name)}</span><small>${L(fl.desc)}</small></div><div class="twv" style="color:${ch.color}">VS ${ch.name}<small>${L(STAGE_SHORT[STAGES[fl.st].id])} • ${DIFFICULTIES[fl.diff].name}</small></div><div class="twr">🪙 ${fl.koins}${L(rw)}</div><div class="twc">${done ? "✓" : cur ? "▶" : "🔒"}</div></div>`;
    }).reverse().join("");
    $("#twBody").innerHTML = `<div class="twTop"><div><span class="dim">${L("Ton combattant")} :</span> ${chars.map(id => `<button class="btn rch${Tower.char === id ? " sel" : ""}" data-ch="${id}" style="--c:${CHARACTERS[id].color}">${CHARACTERS[id].name}</button>`).join("")}</div>
      <div><span class="dim">${L("Meilleur étage")} : <b>${best}/10</b></span> <button class="mbtn gold" id="twGo">${best >= 10 ? L("Recommencer l'ascension") : best ? L("Reprendre à l'étage") + " " + (best + 1) : L("Commencer l'ascension")}</button>${best ? `<button class="btn" id="twReset">${L("Repartir de l'étage 1")}</button>` : ""}</div></div>
      <div class="twList">${rows}</div><p class="dim">${L("Une défaite ? Tu peux réessayer l'étage autant de fois que tu veux. Étage 5 : arène Tel-Aviv offerte • Étage 10 : costume « L'Œil Solaire » + 500 Koins.")}</p>`;
    $$("#twBody .rch").forEach(b => b.onclick = () => { Tower.char = b.dataset.ch; Audio2.play("ui"); Tower.render(); });
    $("#twGo").onclick = () => { Tower.active = true; Tower.floor = best >= 10 ? 0 : best; Tower.fightFloor(); };
    if ($("#twReset")) $("#twReset").onclick = () => { Tower.active = true; Tower.floor = 0; Tower.fightFloor(); };
    I18N.apply($("#tower"));
  },
  fightFloor() {
    const fl = TOWER_FLOORS[Tower.floor]; let opp = fl.opp; if (opp === Tower.char && opp !== "eye") opp = defaultOpp(Tower.char);
    Screens.overlay("tower", false); Tower.active = true; Match.towerPending = true;
    const st = Progress.stageAvailable(fl.st) ? fl.st : 0;
    Screens.vs(st, () => Flow.fight({ type: "tower", stageIdx: st, p1Char: Tower.char, p2Char: opp, difficulty: fl.diff, mods: Object.assign({}, fl.mods), winsNeeded: fl.wins || 2, roundTime: 99,
      tower: { floor: Tower.floor }, onStart: () => UI.toast("🗼 " + L("ÉTAGE") + " " + (Tower.floor + 1) + " — " + L(fl.name) + " : " + L(fl.desc), 4200) }), Tower.char, opp);
  },
  resultButtons(won) {
    if (won && Tower.floor >= 9) return `<button class="mbtn gold" id="twMenu">${L("👑 Tour conquise ! Retour à la Tour")}</button><button class="mbtn" id="rMenu">${L("Menu principal")}</button>`;
    return won ? `<button class="mbtn gold" id="twNext">${L("Étage suivant")} ▸ ${Tower.floor + 2}/10</button><button class="mbtn" id="twMenu">${L("Retour à la Tour")}</button>`
      : `<button class="mbtn gold" id="twRetry">${L("Réessayer l'étage")} ${Tower.floor + 1}</button><button class="mbtn" id="twMenu">${L("Retour à la Tour")}</button>`;
  },
  bindResults(won) {
    if (!Match.tower) return;
    if (won) Tower.reward();
    const b = id => $("#" + id);
    if (b("twNext")) b("twNext").onclick = () => { Screens.overlay("results", false); Tower.floor++; Tower.fightFloor(); };
    if (b("twRetry")) b("twRetry").onclick = () => { Screens.overlay("results", false); Tower.fightFloor(); };
    if (b("twMenu")) b("twMenu").onclick = () => { Screens.overlay("results", false); Tower.open(); };
  },
  reward() {
    const i = Match.tower.floor, fl = TOWER_FLOORS[i], T = Progress.p.tower, first = i + 1 > (T.best || 0);
    if (Match.tower.paid) return; Match.tower.paid = true;
    if (first) T.best = i + 1; Progress.save();
    Progress.addKoins(first ? fl.koins : Math.round(fl.koins / 3), L("TOUR") + " " + (i + 1));
    if (fl.reward && Progress.unlock(fl.reward)) { }
    if (i + 1 >= 5) Progress.award("tower5");
    if (i + 1 >= 10) { Progress.award("tower10"); if (first) Progress.addKoins(500, L("Tour conquise")); }
  }
};

// ---------------------------------------------------------------------
const TUTO_STEPS = [
  { t: "Déplacements", d: "Avance et recule avec ← →, saute avec ↑. Double-tape ← ou → (ou la touche Dash) pour dasher.", k: "move" },
  { t: "Attaques", d: "Touche le mannequin 3 fois avec Rapide ({lp}) et Lourd ({hp}).", k: "hits", n: 3 },
  { t: "Combo", d: "Enchaîne un combo de 3 coups : Rapide › Rapide › Lourd.", k: "combo", n: 3 },
  { t: "Coup spécial", d: "Lance ton projectile avec Spécial ({sp}). L'EX ({ex}) coûte 1 barre et frappe plus fort.", k: "special" },
  { t: "Parade parfaite", d: "Le mannequin attaque ! Appuie sur Garde (↓) AU DERNIER MOMENT (≤ 6 frames avant l'impact) : il est étourdi et tu gagnes de la super.", k: "parry" },
  { t: "Dash Cancel", d: "Touche avec un coup, puis dashe immédiatement (double-tape → ou {dash}) pendant le coup : l'attaque est annulée et tu enchaînes.", k: "dash" },
  { t: "X-Ray", d: "Ta barre est pleine : déclenche le X-Ray ({xr}) quand l'adversaire est proche.", k: "xray" },
  { t: "Fatality", d: "FINISH ! Tape le code de ta Fatality : {fat}. (Raccourci : {f1})", k: "fatality" }
];
const Tutorial = {
  active: false, step: 0, cnt: 0, ch: "aurelia", x0: 0, jumped: false, timer: null,
  start(ch) {
    Tutorial.ch = Progress.charAvailable(ch) ? ch : "aurelia"; Tutorial.active = true; Tutorial.step = 0; Tutorial.cnt = 0;
    Flow.fight({ type: "training", stageIdx: 0, p1Char: Tutorial.ch, p2Char: defaultOpp(Tutorial.ch), training: { dummy: "idle", tutorial: true, infMeter: false, regen: true },
      onStart: () => Tutorial.enter(0) });
    clearInterval(Tutorial.timer); Tutorial.timer = setInterval(Tutorial.poll, 120);
  },
  fmt(s) {
    const c = CHARACTERS[Tutorial.ch], f = c.fatalities[0];
    return L(s).replace(/\{(\w+)\}/g, (m, k) => k === "fat" ? f.codeTxt : `<kbd>${keyOf("p1", k)}</kbd>`);
  },
  enter(i) {
    Tutorial.step = i; Tutorial.cnt = 0; const S = TUTO_STEPS[i], a = F[0], v = F[1];
    if (!S) return Tutorial.done();
    Tutorial.x0 = a.x; Tutorial.jumped = false;
    Match.training.dummy = S.k === "parry" ? "attack" : "idle";
    Match.training.infMeter = S.k === "xray" || S.k === "special";
    if (S.k === "xray") a.meter = 300;
    if (S.k === "fatality") Tutorial.toFinish();
    Tutorial.render();
    Audio2.play("ui");
  },
  render(okMsg) {
    const S = TUTO_STEPS[Tutorial.step]; if (!S) return;
    const prog = TUTO_STEPS.map((s, i) => `<i class="${i < Tutorial.step ? "ok" : i === Tutorial.step ? "cur" : ""}"></i>`).join("");
    const cnt = S.n ? ` <b>${Math.min(Tutorial.cnt, S.n)}/${S.n}</b>` : "";
    $("#tutBox").innerHTML = `<div class="tutProg">${prog}</div><div class="tutH">🎓 ${L("ÉTAPE")} ${Tutorial.step + 1}/8 — ${L(S.t)}${cnt}</div><div class="tutD">${Tutorial.fmt(S.d)}</div>${okMsg ? `<div class="tutOk">${okMsg}</div>` : ""}<div class="tutBtns"><button class="btn" id="tutSkip">${L("Passer l'étape")} ▸</button><button class="btn" id="tutQuit">${L("Quitter")}</button></div>`;
    $("#tutSkip").onclick = () => Tutorial.next();
    $("#tutQuit").onclick = () => Screens.title();
  },
  next() { if (!Tutorial.active) return; Audio2.play("parry"); Tutorial.render("✓ " + L("Bravo !")); const s = Tutorial.step; setTimeout(() => { if (Tutorial.active && Tutorial.step === s) Tutorial.enter(s + 1); }, 900); Tutorial.step = s; Tutorial.lock = s; },
  ok(k, n) {
    if (!Tutorial.active || Match.type !== "training" || !Match.training || !Match.training.tutorial) return;
    const S = TUTO_STEPS[Tutorial.step]; if (!S || S.k !== k || Tutorial.lock === Tutorial.step) return;
    if (S.n) { Tutorial.cnt = Math.max(Tutorial.cnt + (n === undefined ? 1 : 0), n || 0); Tutorial.render(); if (Tutorial.cnt < S.n) return; }
    Tutorial.next();
  },
  poll() {
    if (!Tutorial.active) { clearInterval(Tutorial.timer); return; }
    if (Game.mode !== "fight" || !Match.training || !Match.training.tutorial) return;
    const S = TUTO_STEPS[Tutorial.step], a = F[0]; if (!S) return;
    if (S.k === "move") { if (a.y < Match.stage.floor - 50) Tutorial.jumped = true; if (Tutorial.jumped && Math.abs(a.x - Tutorial.x0) > 120) Tutorial.ok("move"); }
    if (S.k === "fatality" && Match.state === "fight" && !Match.seq && Tutorial.lock !== Tutorial.step) Tutorial.toFinish();
  },
  toFinish() {
    const a = F[0], v = F[1]; if (Match.seq) return;
    v.x = clamp(a.x + a.face * 230, 120, W - 120); if (Math.abs(v.x - a.x) < 150) a.x = clamp(v.x - a.face * 230, 120, W - 120);
    a.face = v.x >= a.x ? 1 : -1; v.face = -a.face; v.y = Match.stage.floor; v.hp = 1; v.red = 1;
    Match.state = "finish"; Match.st = 0; Match.winner = a; Match.loser = v; Match.projectiles.length = 0;
    setState(v, "dizzy"); setState(a, "idle"); a.hist = [];
    const pr = { HER: "FINISH HER !", HIM: "FINISH HIM !", IT: "FINISH IT !" }[v.ch.pronoun] || "FINISH HIM !";
    UI.banner(pr, "", "finish", 120); UI.finishPrompt(a);
  },
  done() {
    const first = !Progress.p.ach.tutorial;
    Progress.award("tutorial"); if (first) Progress.addKoins(200, L("Tutoriel terminé"));
    $("#tutBox").innerHTML = `<div class="tutH">🏆 ${L("TUTORIEL TERMINÉ !")}</div><div class="tutD">${L("Tu maîtrises les bases : parade parfaite, Dash Cancel, X-Ray et Fatalities. Le Multivers t'attend !")}</div><div class="tutBtns"><button class="mbtn gold" id="tutEnd">${L("Menu principal")}</button><button class="btn" id="tutAgain">${L("Recommencer")}</button></div>`;
    $("#tutEnd").onclick = () => Screens.title(); $("#tutAgain").onclick = () => Tutorial.start(Tutorial.ch);
    Tutorial.step = TUTO_STEPS.length; Tutorial.lock = -1; Match.training.dummy = "idle";
  }
};
GameEv.on("hit", ({ att }) => { if (att && att.side === 0) Tutorial.ok("hits"); });
GameEv.on("combo", ({ att, n }) => { if (att && att.side === 0) Tutorial.ok("combo", n); });
GameEv.on("special", ({ f }) => { if (f && f.side === 0) Tutorial.ok("special"); });
GameEv.on("parry", ({ f }) => { if (f && f.side === 0) Tutorial.ok("parry"); });
GameEv.on("dashCancel", ({ f }) => { if (f && f.side === 0) Tutorial.ok("dash"); });
GameEv.on("xray", ({ f }) => { if (f && f.side === 0) Tutorial.ok("xray"); });
GameEv.on("finisher", ({ att }) => { if (att && att.side === 0) Tutorial.ok("fatality"); });
