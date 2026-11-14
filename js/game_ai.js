/* =====================================================================
   MOTEUR DE COMBAT (2/3) : IA intelligente (4 difficultés) & mannequin
   ===================================================================== */
function aiThink(f, opp) {
  const D = DIFFICULTIES[Match.difficulty] || DIFFICULTIES.guerrier, A = f.ai, I = blankInput();
  const dx = opp.x - f.x, dist = Math.abs(dx), dir = Math.sign(dx) || 1;
  const fwd = dir > 0 ? "r" : "l", back = dir > 0 ? "l" : "r";
  // FINISH : l'IA victorieuse déclenche (ou non) sa fatality selon la difficulté
  if (Match.state === "finish") {
    if (f !== Match.winner) return I;
    A.finishT++;
    if (A.finishT === 55) A.doFat = Math.random() < D.fatality;
    if (A.finishT > 55) {
      if (A.doFat) { if (A.finishT === 70) I[pick(["f1", "f2", "f1", "f2", "f3"])] = 1; }
      else if (dist > 150) I[fwd] = 1; else if (A.finishT % 20 === 0) I.lp = 1;
    }
    return I;
  }
  if (Match.state !== "fight") return I;
  // perception retardée (temps de réaction selon la difficulté)
  const threat = ["attack", "airatk", "cast", "tele", "xray_lunge", "grab"].includes(opp.state);
  if (threat && opp.t <= 1) A.threatT = frameCount;
  const perceive = threat && frameCount - A.threatT >= D.react;
  // combo breaker
  if ((f.state === "hitstun" || f.state === "juggle") && f.combo >= 3 && f.meter >= 100 && !f.breakerUsed && Math.random() < D.breaker * 0.3) { I.brk = 1; return I; }
  if (A.guardT > 0) { A.guardT--; I.d = 1; return I; }
  // projectile entrant : esquive (saut / téléportation) ou garde
  const proj = Match.projectiles.find(p => p.owner === opp && Math.sign(p.vx) === Math.sign(f.x - p.x) && Math.abs(p.x - f.x) < 470);
  if (proj && A.projMark !== proj && canAct(f)) {
    if (!proj.seenAt) proj.seenAt = frameCount;
    if (frameCount - proj.seenAt >= D.react * 0.6) {
      A.projMark = proj;
      if (Math.random() < D.antiProj) {
        const r = Math.random();
        if (r < 0.35 && f.cd.tele === 0) { I.tp = 1; return I; }
        if (r < 0.75 && Math.abs(proj.x - f.x) > 150) { I.u = 1; I[fwd] = 1; return I; }
        A.guardT = 26; I.d = 1; return I;
      }
    }
  }
  // garde réactive
  if (perceive && dist < 280 && canAct(f)) {
    if (opp.state === "grab") { if (Math.random() < D.block * 0.4) { I.u = 1; I[back] = 1; return I; } }
    else if (Math.random() < D.block * 0.35) { A.guardT = 12 + (Math.random() * 10 | 0); I.d = 1; return I; }
  }
  // punition
  if (opp.state === "attack" && opp.move && opp.t > opp.move.startup + opp.move.active && dist < 190 && canAct(f) && Math.random() < D.combo * 0.4 && !A.plan.length) A.plan = ["lp", "lp", "hp"];
  // exécution du plan de combo
  if (A.plan.length) {
    if (canAct(f) || (f.state === "attack" && f.hitDone && f.move && f.t >= f.move.startup + 2)) { const k = A.plan.shift(); I[k] = 1; }
    else if (f.state === "attack" && f.move && f.t > f.move.startup + f.move.active && !f.hitDone) A.plan = [];
    return I;
  }
  if (!canAct(f)) return I;
  if (A.cool > 0) { A.cool--; if (A.walk) I[A.walk] = 1; return I; }
  A.walk = null;
  A.cool = Math.max(3, (D.react / 2) | 0) + (Math.random() * 10 | 0);
  if (Math.random() > D.aggro * 14 && dist < 430) { if (Math.random() < 0.3) { A.walk = Math.random() < 0.7 ? fwd : back; } return I; }
  const r = Math.random();
  if (f.meter >= 300 && dist < 320 && Math.random() < D.xray * 0.5 && !["down", "getup"].includes(opp.state)) { I.xr = 1; return I; }
  if (opp.state === "down" || opp.state === "getup") { if (dist < 220) A.walk = back; A.cool = 12; return I; }
  if (opp.state === "stun") { if (dist < 170) A.plan = ["lp", "lp", "hp", "sp"]; else { A.walk = fwd; A.cool = 6; } return I; }
  if (dist < 175) {
    if (r < D.combo * 0.6) { A.plan = pick([["lp", "lp", "hp"], ["lp", "hp", "sp"], ["lp", "lp", "hp", f.meter >= 100 ? "ex" : "sp"], ["hp", "sp"]]).slice(); I[A.plan.shift()] = 1; }
    else if (r < D.combo * 0.6 + 0.12) I.gp = 1;
    else if (r < 0.78) I[pick(["lp", "hp", "lp"])] = 1;
    else if (r < 0.88) { I.dash = 1; I[back] = 1; }
    else { I.u = 1; if (Math.random() < 0.5) I[fwd] = 1; }
  } else if (dist < 440) {
    if (r < D.special * 18) I[f.meter >= 100 && Math.random() < 0.3 ? "ex" : "sp"] = 1;
    else if (r < D.special * 18 + D.tele * 25 && f.cd.tele === 0) I.tp = 1;
    else if (r < 0.6) { A.walk = fwd; A.cool = 16; I[fwd] = 1; }
    else if (r < 0.7) { I.dash = 1; I[fwd] = 1; }
    else if (r < 0.8) { I.u = 1; I[fwd] = 1; }
    else { A.walk = fwd; A.cool = 8; I[fwd] = 1; }
  } else {
    if (r < D.special * 30) I.sp = 1;
    else if (r < D.special * 30 + D.tele * 20 && f.cd.tele === 0) I.tp = 1;
    else { A.walk = fwd; A.cool = 20; I[fwd] = 1; }
  }
  return I;
}
function dummyThink(f, opp) {
  const I = blankInput(), m = Match.training ? Match.training.dummy : "idle";
  if (m === "guard") I.d = 1;
  else if (m === "jump") { if (frameCount % 70 === 0) I.u = 1; }
  else if (m === "attack") { const d = Math.abs(opp.x - f.x); if (d > 200) { if (opp.x > f.x) I.r = 1; else I.l = 1; } else if (frameCount % 80 === 0 && canAct(f)) I.lp = 1; }
  else if (m === "ai") { const save = Match.difficulty; Match.difficulty = "novice"; const r = aiThink(f, opp); Match.difficulty = save; return r; }
  return I;
}
