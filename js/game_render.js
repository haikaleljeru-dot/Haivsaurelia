/* =====================================================================
   BOUCLE DE COMBAT, CAMÉRA DYNAMIQUE & RENDU DE L'ARÈNE
   ===================================================================== */
function fightStep() {
  frameCount++;
  updateParticles(); Weather.update();
  Match.dark += (Match.darkTarget - Match.dark) * 0.08;
  if (Match.flash > 0) Match.flash *= 0.86;
  if (Match.shake > 0) Match.shake *= 0.86;
  if (Match.slowT > 0) { Match.slowT--; if (Match.slowT === 0) Match.timeScale = 1; }
  if (Match.chroma > 0) Match.chroma = Match.chroma < 0.02 ? 0 : Match.chroma * 0.9;
  if (Match.seq && Match.flash > 0.5) Match.chroma = Math.max(Match.chroma, 0.8);
  if (Match.speed) { Match.speed.t++; Match.speed.amt *= 0.88; if (Match.speed.amt < 0.04) Match.speed = null; }
  F.forEach((f, i) => { f.prev = f.inp; f.inp = Input.read(f, F[1 - i]); f.histDone = false; });
  if (Match.hitstop > 0) { Match.hitstop--; if (!Match.seq && (Match.state === "fight" || Match.state === "finish")) F.forEach(bufferInputs); return; }
  if (Match.paused) return;

  if (Match.seq) {
    Match.seq.update();
    F.forEach(f => { f.t++; if (f.flash > 0) f.flash--; f.sx += (1 - f.sx) * 0.15; f.sy += (1 - f.sy) * 0.15; for (let i = f.trail.length - 1; i >= 0; i--) { f.trail[i].a -= 0.035; if (f.trail[i].a <= 0) f.trail.splice(i, 1); } if (f.redDelay > 0) f.redDelay--; else if (f.red > f.hp) f.red = Math.max(f.hp, f.red - 0.7); });
    return;
  }
  const [a, b] = F;
  if (Match.state === "intro") {
    Match.st++;
    if (Match.st === 2) { UI.banner("ROUND " + Match.round, Match.round === 3 ? "ROUND DÉCISIF" : Match.stage.name, "round", 72); Audio2.announce("round", "Round " + Match.round, "ann_round" + Math.min(3, Match.round)); }
    if (Match.st === 78) { UI.banner("FIGHT !", "", "fight", 50); Audio2.announce("fight", "Fight !", "ann_fight"); Match.chroma = 0.5; }
    if (Match.st >= 98) { Match.state = "fight"; F.forEach(f => setState(f, "idle")); }
    F.forEach(f => { f.t++; });
    return;
  }
  if (Match.state === "roundend") { roundEndUpdate(); if (Match.state === "roundend" || Match.state === "over") F.forEach((f, i) => updateFighter(f, F[1 - i])); return; }
  if (Match.state === "over") { F.forEach((f, i) => updateFighter(f, F[1 - i])); return; }
  if (Match.state === "fight" || Match.state === "finish") {
    handleInput(a, b); if (Match.seq) return;
    handleInput(b, a); if (Match.seq) return;
    updateFighter(a, b); if (Match.seq) return;
    updateFighter(b, a); if (Match.seq) return;
    const free = s => !["tele", "thrown", "throw", "fatality_v", "fatality_w"].includes(s);
    if (free(a.state) && free(b.state) && Math.abs(a.y - b.y) < 140) {
      const dx = b.x - a.x, min = 80;
      if (Math.abs(dx) < min) { const push = (min - Math.abs(dx)) / 2 * (Math.sign(dx) || (a.side ? -1 : 1)); a.x = clamp(a.x - push, 50, W - 50); b.x = clamp(b.x + push, 50, W - 50); }
    }
    updateProjectiles();
    if (Match.state === "fight" && !Match.training && Match.roundTime < 999) {
      if (++Match.tick >= 60) {
        Match.tick = 0; Match.timer--;
        if (Match.timer <= 10 && Match.timer > 0) Audio2.play("ui");
        if (Match.timer <= 0) { Match.timer = 0; const w = a.hp >= b.hp ? a : b, l = w === a ? b : a; UI.banner("TIME OVER", "", "ko", 100); Audio2.voice("ann_time_over", { ch: "ann" }); Match.finisher = "time"; setState(l, "stun"); endRound(w, l, "time"); }
      }
    }
    if (Match.state === "finish") {
      Match.st++;
      if (Match.st % 42 === 0) Audio2.play("heartbeat");
      UI.finishTimer(Math.max(0, 10 - Math.floor(Match.st / 60)));
      if (Match.st > 600) { const v = Match.loser; Match.finisher = "ko"; setState(v, "juggle"); v.vy = -4; v.forceSprite = null; endRound(Match.winner, v, "ko"); }
    }
    // intensité musicale : PV bas, round avancé, combos en cours, chrono serré
    const cmb = Math.max(a.combo || 0, b.combo || 0), tl = Match.roundTime < 999 && Match.timer <= 15 ? 0.2 : 0;
    Audio2.setIntensity(1 - Math.min(a.hp, b.hp) / 100 + (Match.round - 1) * 0.15 + Math.min(0.35, cmb * 0.06) + tl);
  }
}

function updateCamera() {
  let tx, ty, tz;
  if (Cam.override) { tx = Cam.override.x; ty = Cam.override.y; tz = Cam.override.z; }
  else if (F.length === 2) { const [a, b] = F; tx = (a.x + b.x) / 2; tz = clamp(1.3 - Math.abs(a.x - b.x) / 1500, 1.0, 1.2); ty = Math.min(a.y, b.y, Match.stage.floor) - 200; }
  else { tx = W / 2; ty = H / 2; tz = 1; }
  const k = Cam.override ? 0.09 : 0.07;
  Cam.x += (tx - Cam.x) * k; Cam.y += (ty - Cam.y) * k; Cam.z += (tz - Cam.z) * k;
}
const VIEW = { vx: 0, vy: 0, z: 1 };
function worldToScreen(x, y) { return [(x - VIEW.vx) * VIEW.z, (y - VIEW.vy) * VIEW.z]; }
function worldTransform(ctx) {
  const z = Cam.z, vw = W / z, vh = H / z;
  let vx = clamp(Cam.x - vw / 2, -40, W + 40 - vw), vy = clamp(Cam.y - vh * 0.48, -40, H + 4 - vh);
  VIEW.vx = vx; VIEW.vy = vy; VIEW.z = z;
  const sh = Match.shake > 0.6 && Settings.shake !== false ? Match.shake : 0;
  ctx.setTransform(z, 0, 0, z, -vx * z + rnd(-sh, sh), -vy * z + rnd(-sh, sh));
}
function drawStage(ctx) {
  const st = Match.stage, img = IMG[st.img];
  if (img && img.naturalWidth) ctx.drawImage(img, -48, -44, 1376, 768); else { ctx.fillStyle = "#0b0716"; ctx.fillRect(-60, -60, W + 120, H + 120); }
  ctx.fillStyle = st.tint; ctx.fillRect(-60, -60, W + 120, H + 120);
  if (Weather.flash > 0.02) { ctx.fillStyle = `rgba(230,210,255,${Weather.flash * 0.5})`; ctx.fillRect(-60, -60, W + 120, H + 120); }
  Weather.drawBack(ctx, frameCount);
  const g = ctx.createLinearGradient(0, st.floor - 90, 0, st.floor + 60); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(5,0,15,0.4)"); ctx.fillStyle = g; ctx.fillRect(-60, st.floor - 90, W + 120, 200);
}
function drawFighter(ctx, f) {
  for (const tr of f.trail) { const info = spriteInfo(f, tr.key); if (!info) continue; ctx.save(); ctx.globalCompositeOperation = "lighter"; drawFighterRaw(ctx, f, info, tr.x, tr.y, { face: tr.face, tint: f.ch.color, alpha: tr.a * 0.7, rot: tr.lean }); ctx.restore(); }
  if (f.hidden || f.alpha <= 0) return;
  const info = spriteInfo(f); if (!info) return;
  const fl = Match.stage.floor, hgt = clamp((fl - f.y) / 300, 0, 1);
  drawGroundAura(ctx, f, info, fl, hgt);
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.5 * (1 - hgt * 0.6)})`; ctx.beginPath(); ctx.ellipse(f.x, fl - 4, 80 * (1 - hgt * 0.4) * f.scale, 15 * f.scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.32 + (f.meter >= 300 ? 0.3 + 0.2 * Math.sin(frameCount * 0.2) : 0); const as = 220 * f.scale; ctx.drawImage(glowSprite(f.ch.color), f.x - as / 2, fl - 30, as, 50); ctx.restore();
  if (f.meter >= 300 && frameCount % 3 === 0 && Match.state === "fight") emit({ x: f.x + rnd(-40, 40), y: f.y - rnd(0, 250), vy: -rnd(1, 3), type: "orb", color: f.ch.color, size: rnd(2, 4), life: 30 });
  let x = f.x, y = f.y, rot = f.lean * f.face, sx = f.sx, sy = f.sy;
  if (f.state === "idle" || f.state === "guard" || f.state === "intro") sy *= 1 + Math.sin(frameCount * 0.09 + f.side * 2) * 0.012;
  if (f.state === "walk") y -= Math.abs(Math.sin(frameCount * 0.22)) * 5;
  if (f.state === "down" || f.state === "ko") { rot = -f.face * Math.PI / 2; y = fl - 38; x = f.x - f.face * 10; }
  if (f.state === "getup") rot = -f.face * Math.PI / 2 * (1 - f.t / 14);
  if (f.state === "juggle") rot = -f.face * clamp(f.t * 0.06, 0, 1.2);
  if (f.state === "dizzy") rot = Math.sin(frameCount * 0.08) * 0.12;
  if (f.state === "hitstun" && f.t < 4) x -= f.face * 6;
  if (f.state === "guard" || f.state === "blockstun") {
    const a = 0.45 + f.guard / 200, gx = f.x + f.face * 70, gy = f.y - 160;
    if (f.id === "hai") drawSeal(ctx, gx, gy, 95, frameCount * 0.05, "#22d3ee", "#fbbf24", a * (f.state === "blockstun" ? 1.3 : 1), 1, true);
    else if (f.id === "eye") drawPrismShield(ctx, gx, gy, 115, a * (f.state === "blockstun" ? 1.3 : 1), frameCount, f.guard < 35);
    else drawHexShield(ctx, gx, gy, 120, a, "#d946ef", frameCount, f.guard < 35 ? 1 : 0);
  }
  if (f.id === "eye") drawEyeHalo(ctx, f, info, x, y, rot, sx, sy);
  ctx.save(); ctx.globalAlpha = f.alpha;
  const rim = tinted(info.key, f.ch.color);
  if (rim) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.2 * f.alpha; for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3]]) { ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(rot); ctx.scale(f.face * info.flip * sx, sy); ctx.drawImage(rim, -info.w * info.ax, -info.h, info.w, info.h); ctx.restore(); } ctx.restore(); }
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(f.face * info.flip * sx, sy);
  ctx.drawImage(info.img, -info.w * info.ax, -info.h, info.w, info.h);
  if (f.tint) { const tc = tinted(info.key, f.tint); if (tc) { ctx.globalAlpha = 0.55 * f.alpha; ctx.drawImage(tc, -info.w * info.ax, -info.h, info.w, info.h); } }
  if (f.flash > 0) { const wc = tinted(info.key, "#ffffff"); if (wc) { ctx.globalAlpha = Math.min(1, f.flash / 4) * 0.85; ctx.drawImage(wc, -info.w * info.ax, -info.h, info.w, info.h); } }
  if (f.state === "stun" || f.state === "dizzy") { ctx.globalAlpha = 0.22 + 0.14 * Math.sin(frameCount * 0.3); const yc = tinted(info.key, "#fde047"); if (yc) ctx.drawImage(yc, -info.w * info.ax, -info.h, info.w, info.h); }
  ctx.restore();
  if (Settings.portrait === "real" && f.id !== "eye" && !["down", "ko", "juggle", "fatality_v"].includes(f.state)) {
    const pi = IMG[f.ch.portraits.real];
    if (pi && pi.naturalWidth) { const r = 22, py = f.y - info.h - 30; ctx.save(); ctx.beginPath(); ctx.arc(f.x, py, r, 0, Math.PI * 2); ctx.closePath(); ctx.strokeStyle = f.ch.color; ctx.lineWidth = 3; ctx.shadowColor = f.ch.color; ctx.shadowBlur = 10; ctx.stroke(); ctx.clip(); ctx.drawImage(pi, f.x - r, py - r, r * 2, r * 2.15); ctx.restore(); }
  }
}
// ---------- L'Œil Quantique : halo d'or procédural en rotation derrière la tête ----------
function drawEyeHalo(ctx, f, info, x, y, rot, sx, sy) {
  if (f.hidden || f.alpha <= 0.05 || ["down", "ko", "juggle"].includes(f.state)) return;
  const m = f.ch.spriteMeta[COSTUME_BASE[info.key] || info.key] || {}, hx = (m.hx == null ? 0.5 : m.hx), hy = (m.hy == null ? 0.06 : m.hy);
  const lx = (hx - info.ax) * info.w, ly = -info.h + hy * info.h + info.h * 0.05;
  const gold = f.costume === "solaire" ? "#fff7d6" : "#fbbf24";
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(f.face * info.flip * sx, sy); ctx.translate(lx, ly);
  ctx.globalAlpha = f.alpha; ctx.globalCompositeOperation = "lighter";
  const R = 46 * f.scale, s = R * 3.4; ctx.drawImage(glowSprite("#f59e0b"), -s / 2, -s / 2, s, s);
  ctx.rotate(frameCount * 0.02); ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.shadowColor = gold; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(0, 0, R * 1.22, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = gold; ctx.font = `700 ${Math.round(11 * f.scale)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i / 12 * Math.PI * 2); ctx.fillText(SACRED[i % SACRED.length], 0, -R * 1.11); ctx.restore(); }
  ctx.restore();
}
// Bouclier prismatique (garde de l'Œil Quantique)
function drawPrismShield(ctx, x, y, r, a, t, crack) {
  ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, a);
  for (let k = 0; k < 2; k++) {
    ctx.save(); ctx.rotate((k ? -1 : 1) * t * 0.03 + k * Math.PI); ctx.strokeStyle = k ? "#fbbf24" : "#c084fc"; ctx.fillStyle = k ? "rgba(251,191,36,0.07)" : "rgba(168,85,247,0.12)"; ctx.lineWidth = 3;
    ctx.beginPath(); for (let i = 0; i < 3; i++) { const an = i / 3 * Math.PI * 2 - Math.PI / 2; ctx[i ? "lineTo" : "moveTo"](Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  const s = r * 2.2; ctx.globalAlpha = a * 0.5; ctx.drawImage(glowSprite("#a855f7"), -s / 2, -s / 2, s, s);
  if (crack) { ctx.globalAlpha = a; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * 1.7) * r * 0.8, Math.sin(i * 1.7) * r * 0.8); ctx.stroke(); } }
  ctx.restore();
}
// ---------- Reflets & auras technologiques au sol (par arène) ----------
function drawGroundAura(ctx, f, info, fl, hgt) {
  if (QUALITY.level === "basse" || f.hidden) return;
  const id = Match.stage.id, k = 1 - hgt * 0.7, c = f.ch.color, act = f.flash > 0 || f.state === "attack" || f.state === "dash" ? 1 : 0;
  if (id === "paris" || id === "telaviv") {
    // reflet néon sur les pavés mouillés : sprite inversé + halo
    if (!["down", "ko", "juggle"].includes(f.state)) {
      ctx.save(); ctx.globalAlpha = 0.2 * k * f.alpha; ctx.translate(f.x, fl + (fl - f.y) * 0.9); ctx.scale(f.face * info.flip, -0.42);
      ctx.drawImage(info.img, -info.w * info.ax, -info.h, info.w, info.h); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12 * k; const tc = tinted(info.key, c);
      if (tc) { ctx.translate(f.x, fl + (fl - f.y) * 0.9); ctx.scale(f.face * info.flip, -0.42); ctx.drawImage(tc, -info.w * info.ax, -info.h, info.w, info.h); } ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (0.35 + act * 0.25) * k; const w = 260 * k; ctx.drawImage(glowSprite(c), f.x - w / 2, fl - 14, w, 34);
    ctx.strokeStyle = c; ctx.globalAlpha = 0.25 * k; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, fl + 2, 110 * k, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  } else if (id === "jerusalem") {
    const r = 105 * (1 + act * 0.08) * k;
    drawSeal(ctx, f.x, fl - 2, r, frameCount * 0.02 * (f.side ? -1 : 1), f.id === "hai" ? "#22d3ee" : f.id === "eye" ? "#c084fc" : "#e879f9", "#fbbf24", (0.42 + act * 0.3) * k, 0.24, true);
  } else if (id === "singularity") {
    ctx.save(); ctx.translate(f.x, fl); ctx.scale(1, 0.26); ctx.globalCompositeOperation = "lighter";
    const R = 150 * k; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
    const pulse = 0.3 + 0.2 * Math.sin(frameCount * 0.12) + act * 0.4, off = (f.x * 0.5) % 24;
    ctx.strokeStyle = f.id === "hai" ? "#22d3ee" : f.id === "eye" ? "#fbbf24" : "#c084fc"; ctx.lineWidth = 2; ctx.globalAlpha = pulse * k;
    ctx.beginPath(); for (let x = -R - off; x <= R; x += 24) { ctx.moveTo(x, -R); ctx.lineTo(x, R); } for (let y = -R; y <= R; y += 24) { ctx.moveTo(-R, y); ctx.lineTo(R, y); } ctx.stroke();
    const rr = (frameCount * 3) % R; ctx.globalAlpha = (1 - rr / R) * 0.8 * k; ctx.lineWidth = 5; ctx.strokeStyle = "#a5f3fc"; ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}
// ---------- Speed-lines cinétiques (écran) ----------
function drawSpeedLines(ctx) {
  const S = Match.speed; if (!S || QUALITY.level === "basse") return;
  const [sx, sy] = worldToScreen(S.x, S.y), n = Math.round(54 * S.amt * QUALITY.mult) + 6;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = S.color; ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = rnd(0.15, 0.55) * Math.min(1, S.amt * 1.4); ctx.lineWidth = rnd(1, 3.2);
    ctx.beginPath();
    if (!S.dir) { const a = rnd(Math.PI * 2), r0 = rnd(120, 260), r1 = r0 + rnd(180, 620) * S.amt; ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1); }
    else { const y = sy + rnd(-220, 200), x0 = sx - S.dir * rnd(40, 160), len = rnd(120, 420) * S.amt; ctx.moveTo(x0, y); ctx.lineTo(x0 - S.dir * len, y); }
    ctx.stroke();
  }
  ctx.restore();
}
// ---------- Aberration chromatique RGB (sans getImageData => compatible file://) ----------
let CA = null;
function chromaPass(ctx, px) {
  if (px < 0.8 || QUALITY.level === "basse") return;
  // adaptatif : sur machine lente / qualité moyenne, seuls les gros impacts gardent l'aberration RGB
  if (px < 3.5 && (QUALITY.level === "moyenne" || (window.MK && MK.fps && MK.fps < 50))) return;
  if (!CA) { const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }; CA = { r: mk(), c: mk() }; }
  const r = CA.r.getContext("2d"), c = CA.c.getContext("2d");
  // canal rouge et canal cyan extraits directement du rendu courant (2 copies + 2 filtres multiply)
  r.globalCompositeOperation = "copy"; r.drawImage(ctx.canvas, 0, 0); r.globalCompositeOperation = "multiply"; r.fillStyle = "#ff0000"; r.fillRect(0, 0, W, H);
  c.globalCompositeOperation = "copy"; c.drawImage(ctx.canvas, 0, 0); c.globalCompositeOperation = "multiply"; c.fillStyle = "#00ffff"; c.fillRect(0, 0, W, H);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "copy"; ctx.drawImage(CA.r, px, px * 0.25);
  ctx.globalCompositeOperation = "lighter"; ctx.drawImage(CA.c, -px, -px * 0.25);
  ctx.restore();
}
// ---------- Alerte danger (< 25 % PV) ----------
function drawDanger(ctx) {
  for (const f of F) {
    if (f.hp >= 25 || f.hp <= 0 || Match.state !== "fight" || Match.training) continue;
    const a = 0.18 + 0.14 * Math.sin(frameCount * 0.18), left = f.side === 0;
    const g = ctx.createLinearGradient(left ? 0 : W, 0, left ? 170 : W - 170, 0); g.addColorStop(0, `rgba(220,20,40,${a})`); g.addColorStop(1, "rgba(220,20,40,0)");
    ctx.fillStyle = g; ctx.fillRect(left ? 0 : W - 170, 0, 170, H);
  }
}
const FRONT_STATES = ["attack", "airatk", "xray_lunge", "throw", "fatality_w", "tele"];
function renderFight(ctx) {
  updateCamera();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  worldTransform(ctx);
  drawStage(ctx);
  if (Match.dark > 0.01) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(4,0,10,${Match.dark})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (Match.seq && Match.seq.drawBack) Match.seq.drawBack(ctx);
  F.slice().sort((p, q) => (FRONT_STATES.includes(p.state) ? 1 : 0) - (FRONT_STATES.includes(q.state) ? 1 : 0)).forEach(f => drawFighter(ctx, f));
  Match.projectiles.forEach(p => drawProjectile(ctx, p));
  if (Match.seq && Match.seq.drawFront) Match.seq.drawFront(ctx);
  drawParticles(ctx);
  if (Match.seq && Match.seq.drawTop) Match.seq.drawTop(ctx);
  Weather.drawFront(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(vignette(), 0, 0);
  drawSpeedLines(ctx);
  if (Match.seq && Match.seq.drawScreen) Match.seq.drawScreen(ctx);
  drawDanger(ctx);
  if (Match.chroma > 0.03) chromaPass(ctx, Match.chroma * 9);
  if (Match.flash > 0.02) { ctx.globalAlpha = Math.min(1, Match.flash); ctx.fillStyle = Match.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (Match.state === "finish") { ctx.save(); ctx.globalAlpha = 0.22 + 0.1 * Math.sin(frameCount * 0.1); ctx.fillStyle = "#7f1d1d"; ctx.globalCompositeOperation = "multiply"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
function saveUnlock(k) { try { const u = JSON.parse(localStorage.getItem("mk_av_unlocks") || "{}"); u[k] = 1; localStorage.setItem("mk_av_unlocks", JSON.stringify(u)); } catch (e) { } if (typeof Progress !== "undefined") Progress.unlockSeen(k); }
function getUnlocks() { try { return JSON.parse(localStorage.getItem("mk_av_unlocks") || "{}"); } catch (e) { return {}; } }
