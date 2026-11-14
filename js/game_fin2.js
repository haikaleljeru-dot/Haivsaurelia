/* =====================================================================
   MOTEUR DE COMBAT (4/4) : Fatalities de Haï, Brutality, Stage Fatalities,
   X-Ray cinématique
   ===================================================================== */
// ===== HAÏ — FATALITY 1 : JUGEMENT DE LA MERKABAH QUANTIQUE =====
function SeqHaiF1(att, vic) {
  const s = { t: 0, name: "JUGEMENT DE LA MERKABAH QUANTIQUE", art: "fat_hai_1" };
  const fl = Match.stage.floor; seqStart(att, vic, "cast");
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.7;
    Cam.override = { x: vic.x, y: fl - 260, z: t < 160 ? 1.2 : 1.05 };
    if (t === 1) { Audio2.play("choir", 147); Audio2.play("gong"); UI.notify(s.name, att.side, "xray"); }
    if (t < 60) vic.y = fl - easeOut(t / 60) * 150;
    if (t > 50 && t < 170) {
      vic.alpha = 0.6 + Math.random() * 0.4; vic.tint = Math.random() < 0.3 ? "#22d3ee" : null;
      for (let i = 0; i < 3; i++) emit({ x: vic.x + rnd(-60, 60), y: vic.y - rnd(40, 260), vx: rnd(-0.5, 0.5), vy: -rnd(4, 9), type: "glyph", ch: pick(BIN), color: pick(["#22d3ee", "#fbbf24", "#a5f3fc"]), size: rnd(12, 20), life: 50, drag: 1 });
      if (t % 10 === 0) Audio2.play("glitch");
    }
    if (t === 150) Audio2.play("beam");
    if (t > 170 && t < 225) { vic.alpha = Math.max(0, 1 - (t - 170) / 50); vic.tint = "#ffffff"; Match.shake = 10; if (t % 2 === 0) burst(vic.x, vic.y - 150, pick(["#fbbf24", "#22d3ee", "#fff"]), 8, 10, "spark"); }
    if (t === 225) { vic.hidden = true; Match.flash = 1; Match.flashColor = "#fef3c7"; Match.shake = 30; Audio2.play("explode"); glyphBurst(vic.x, vic.y - 150, "#fbbf24", 60, HEB + BIN, 8); burst(vic.x, vic.y - 150, "#fde68a", 90, 14, "orb", { size: 3 }); ring(vic.x, vic.y - 150, "#22d3ee", 20, 18, 30, 10); }
    if (t > 225 && t < 320 && t % 3 === 0) emit({ x: vic.x + rnd(-90, 90), y: fl - rnd(200, 360), vy: rnd(0.5, 2), type: "glyph", ch: pick(HEB), color: "#fbbf24", size: 14, life: 60, drag: 1 });
    if (t === 245) { panelArt(s, s.art, 245, FAT_PANEL, 1, att.ch.fatVideo); speak(att, "fat", true); }
    if (t === 400) { UI.banner("FATALITY", s.name, "fatality", 170); Audio2.announce("fatality", "Fatality !", "ann_fatality"); }
    if (t >= 540) finishSeqDone(att, vic);
  };
  s.drawBack = (ctx) => {
    const t = s.t, x = vic.x, k = easeOut(Math.min(1, t / 45)) * (t > 245 ? Math.max(0, 1 - (t - 245) / 30) : 1);
    if (k <= 0) return;
    drawSeal(ctx, x, fl - 6, 220 * k, t * 0.03, "#22d3ee", "#fbbf24", 0.95, 0.28);
    drawSeal(ctx, x, fl - 520, 170 * k, -t * 0.04, "#fbbf24", "#22d3ee", 0.9, 0.3);
    if (t > 140) {
      const bk = Math.min(1, (t - 140) / 30) * (t > 225 ? Math.max(0, 1 - (t - 225) / 25) : 1), bw = t < 170 ? 6 : 180 + Math.sin(t * 0.6) * 20;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.3, `rgba(34,211,238,${0.5 * bk})`); g.addColorStop(0.5, `rgba(255,251,235,${bk})`); g.addColorStop(0.7, `rgba(251,191,36,${0.5 * bk})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(x - bw, -200, bw * 2, fl + 200); ctx.restore();
    }
  };
  s.drawFront = (ctx) => {
    const t = s.t;
    if (t > 50 && t < 225) { ctx.save(); ctx.font = "700 16px Orbitron, monospace"; ctx.fillStyle = "#67e8f9"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 10; const pct = Math.min(100, ((t - 50) / 120 * 100) | 0); const tx = vic.x + (vic.x > W / 2 ? -420 : 80); ctx.fillText(`> HACK CODE_VITAL.${vic.id.toUpperCase()} … ${pct}%`, tx, vic.y - 300); ctx.fillText(pct >= 100 ? "> SUPPRESSION AUTORISÉE" : "> DÉCRYPTAGE DES SCEAUX…", tx, vic.y - 278); ctx.restore(); }
  };
  s.drawScreen = (ctx) => drawArtPanel(ctx, s);
  return s;
}

// ===== HAÏ — FATALITY 2 : EFFACEMENT DU CODE SOURCE (SINGULARITY DELETE) =====
function SeqHaiF2(att, vic) {
  const s = { t: 0, name: "EFFACEMENT DU CODE SOURCE", art: "fat_hai_2", tiles: null, gray: 0 };
  const fl = Match.stage.floor; seqStart(att, vic, null);
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.45;
    Cam.override = { x: vic.x, y: fl - 240, z: 1.25 };
    s.gray = t < 30 ? t / 30 : t < 130 ? 1 : Math.max(0, 1 - (t - 130) / 20);
    if (t === 1) { Audio2.play("glitch"); Audio2.play("gong"); UI.notify("TIME.STOP()", att.side, "xray"); }
    if (t > 25 && t < 125 && t % 2 === 0) for (let i = 0; i < 3; i++) emit({ x: vic.x + rnd(-520, 520), y: fl - 700 + rnd(-40, 0), vy: rnd(5, 9), type: "glyph", ch: pick(HEB + "01"), color: "#fbbf24", size: rnd(14, 24), life: 90, drag: 1 });
    if (t === 70) { att.trailOn = 20; burst(att.x, att.y - 150, "#22d3ee", 20, 8, "pixel", { size: 4 }); Audio2.play("teleport"); att.x = clamp(vic.x - vic.face * 75, 60, W - 60); att.face = vic.x >= att.x ? 1 : -1; att.forceSprite = "idle"; att.trail.push({ x: att.x, y: att.y, key: spriteKey(att), face: att.face, a: 0.8, lean: 0 }); }
    if (t === 105) { att.forceSprite = "light"; att.sy = 1.2; Audio2.play("heavy"); }
    if (t === 112) { Match.flash = 0.9; Match.flashColor = "#a5f3fc"; Match.shake = 22; Match.hitstop = 8; burst(vic.x, vic.y - 200, "#fbbf24", 50, 12, "spark"); ring(vic.x, vic.y - 200, "#22d3ee", 10, 16, 24, 8); Audio2.play("bone"); }
    if (t > 112 && t < 130) vic.y -= 4;
    if (t === 130) { s.tiles = makeTiles(vic, 11, "up"); vic.hidden = true; if (s.tiles) for (const tl of s.tiles.tiles) { tl.vx = rnd(-2, 2); tl.vy = -rnd(3, 9); } Audio2.play("shatter"); Audio2.play("glitch"); burst(vic.x, vic.y - 150, "#22d3ee", 80, 12, "pixel", { size: 5, g: -0.05 }); glyphBurst(vic.x, vic.y - 150, "#a5f3fc", 50, BIN, 7); UI.notify("DELETE", att.side, "xray"); }
    if (s.tiles) for (const tl of s.tiles.tiles) { if (tl.delay > 0) { tl.delay--; continue; } tl.ox += tl.vx; tl.oy += tl.vy; tl.vy -= 0.06; tl.rot += tl.vr; tl.a -= 0.01; }
    if (t === 170) { panelArt(s, s.art, 170, FAT_PANEL, -1, att.ch.fatVideo); speak(att, "fat", true); }
    if (t === 325) { UI.banner("FATALITY", "EFFACEMENT DU CODE SOURCE — SINGULARITY DELETE", "fatality", 170); Audio2.announce("fatality", "Fatality !", "ann_fatality"); }
    if (t >= 465) finishSeqDone(att, vic);
  };
  s.drawTop = (ctx) => drawTiles(ctx, s.tiles, s.t % 6 < 3 ? null : "#67e8f9");
  s.drawScreen = (ctx) => {
    if (s.gray > 0) {
      ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha = s.gray; ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = s.gray * 0.35; ctx.strokeStyle = "#10b981"; ctx.lineWidth = 1;
      ctx.beginPath(); for (let x = (s.t * 2) % 40; x < W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y < H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke(); ctx.restore();
    }
    drawArtPanel(ctx, s);
  };
  return s;
}

// ===== BRUTALITY (dernier coup du match = Spécial / EX / X-Ray) =====
function SeqBrutality(att, vic) {
  const s = { t: 0, tiles: null }; const fl = Match.stage.floor; seqStart(att, vic, "cast");
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.5; Cam.override = { x: vic.x, y: fl - 220, z: 1.25 };
    if (t < 40) { vic.y = fl - Math.sin(t / 40 * Math.PI) * 40; vic.flash = t % 4 < 2 ? 2 : 0; vic.lean = Math.sin(t) * 0.1; if (t % 5 === 0) burst(vic.x, vic.y - 150, att.ch.color, 10, 6, "spark"); }
    if (t === 40) {
      vic.y = fl; s.tiles = makeTiles(vic, 16, "burst"); vic.hidden = true;
      if (s.tiles) for (const tl of s.tiles.tiles) { const a = Math.atan2(tl.ly + s.tiles.info.h / 2, tl.lx); const sp = rnd(5, 16); tl.vx = Math.cos(a) * sp; tl.vy = Math.sin(a) * sp - 5; tl.delay = 0; }
      Match.flash = 1; Match.flashColor = att.ch.light; Match.shake = 30; Audio2.play("explode"); Audio2.play("bone");
      burst(vic.x, vic.y - 150, att.ch.color, 120, 16, "spark"); burst(vic.x, vic.y - 150, "#7f1d1d", 50, 12, "blood", { size: 4 }); ring(vic.x, vic.y - 150, "#fff", 10, 20, 26, 10);
    }
    if (s.tiles) for (const tl of s.tiles.tiles) { tl.vy += 0.5; tl.ox += tl.vx; tl.oy += tl.vy; tl.rot += tl.vr * 2; if (s.tiles.y + tl.ly + tl.oy > fl) { tl.oy = fl - s.tiles.y - tl.ly; tl.vy *= -0.3; tl.vx *= 0.7; tl.vr *= 0.5; } if (t > 120) tl.a -= 0.02; }
    if (t === 55) { UI.banner("BRUTALITY", att.id === "aurelia" ? "SURCHARGE D'OMBRE" : att.id === "eye" ? "SURCHARGE COSMIQUE" : "SURCHARGE QUANTIQUE", "brutality", 150); Audio2.announce("fatality", "Brutality !", "ann_brutality"); }
    if (t >= 215) finishSeqDone(att, vic);
  };
  s.drawTop = (ctx) => drawTiles(ctx, s.tiles);
  return s;
}

// ===== STAGE FATALITY : LES GARGOUILLES DE CYBER-PARIS =====
function SeqStageParis(att, vic) {
  const s = { t: 0 }; const fl = Match.stage.floor; seqStart(att, vic, "cast");
  const eyes = Match.stage.eyes;
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.6; Cam.override = { x: W / 2, y: H / 2 - 40, z: 1 };
    if (t === 1) { Audio2.play("gong"); UI.notify("LES GARGOUILLES S'ÉVEILLENT", att.side, "xray"); }
    if (t < 50) { vic.x = lerp(vic.x, W / 2, 0.06); vic.y = fl - easeOut(t / 50) * 120; }
    if (t > 50 && t < 140) { vic.flash = t % 4 < 2 ? 2 : 0; vic.tint = t % 6 < 3 ? "#ef4444" : null; Match.shake = 4; if (t % 8 === 0) Audio2.play("lightning"); if (t % 3 === 0) burst(vic.x, vic.y - 160, "#ef4444", 4, 6, "spark"); }
    if (t === 140) { Match.flash = 1; Match.flashColor = "#fff"; Audio2.play("explode"); vic.vy = -26; vic.tint = null; s.fly = true; burst(vic.x, vic.y - 150, "#ef4444", 80, 14, "spark"); burst(vic.x, vic.y - 150, "#7f1d1d", 30, 10, "blood", { size: 4 }); }
    if (s.fly) { vic.y += vic.vy; vic.vy += 0.6; vic.lean += 0.2; if (vic.y < -300) { vic.hidden = true; s.fly = false; } }
    if (t === 200) { Audio2.play("explode"); Match.shake = 20; UI.banner("STAGE FATALITY", "LES GARGOUILLES DE CYBER-PARIS", "fatality", 170); Audio2.announce("fatality", "Stage Fatality !", "ann_stage_fatality"); }
    if (t >= 360) finishSeqDone(att, vic);
  };
  s.drawFront = (ctx) => {
    const t = s.t, k = Math.min(1, t / 30);
    for (const [x, y] of eyes) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = k; const sz = 60 + Math.sin(t * 0.3) * 10; ctx.drawImage(glowSprite("#ef4444"), x - sz / 2, y - sz / 2, sz, sz); ctx.restore();
      if (t > 50 && t < 140) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#f87171"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 20; ctx.lineWidth = 4 + Math.sin(t) * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(vic.x + rnd(-10, 10), vic.y - 160 + rnd(-10, 10)); ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
    }
    if (t >= 140 && t < 165) drawBolt(ctx, vic.x, -40, vic.x, vic.y - 100, "#e9d5ff", 8, 40, "#fff", 4);
  };
  return s;
}
// ===== STAGE FATALITY : LES COLONNES DU TEMPLE (NÉO-JÉRUSALEM) =====
function SeqStageJerusalem(att, vic) {
  const s = { t: 0, rise: 0, close: 0 }; const fl = Match.stage.floor; seqStart(att, vic, "cast");
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.55; Cam.override = { x: vic.x, y: fl - 240, z: 1.12 };
    if (t === 1) { Audio2.play("gong"); Audio2.play("choir", 147); UI.notify("LES COLONNES DU TEMPLE", att.side, "xray"); }
    s.rise = easeOut(clamp((t - 20) / 40, 0, 1)); s.close = ease(clamp((t - 80) / 22, 0, 1));
    if (t > 20 && t < 60 && t % 4 === 0) { Match.shake = 6; burst(vic.x + rnd(-260, 260), fl, "#d6a560", 6, 5, "smoke", { size: 10 }); }
    if (t > 80 && t <= 102) vic.sx = lerp(1, 0.18, s.close);
    if (t === 102) { Match.flash = 1; Match.flashColor = "#fde68a"; Match.shake = 30; Audio2.play("explode"); Audio2.play("bone"); vic.hidden = true; burst(vic.x, fl - 150, "#fbbf24", 100, 14, "spark"); burst(vic.x, fl - 150, "#7f1d1d", 40, 9, "blood", { size: 4 }); glyphBurst(vic.x, fl - 200, "#fde68a", 40, HEB, 8); }
    if (t === 150) { UI.banner("STAGE FATALITY", "LES COLONNES DU TEMPLE", "fatality", 170); Audio2.announce("fatality", "Stage Fatality !", "ann_stage_fatality"); }
    if (t >= 320) finishSeqDone(att, vic);
  };
  s.drawFront = (ctx) => {
    const h = 540 * s.rise, gap = lerp(210, 30, s.close);
    for (const side of [-1, 1]) {
      const x = vic.x + side * (gap + 55);
      ctx.save(); const g = ctx.createLinearGradient(x - 55, 0, x + 55, 0); g.addColorStop(0, "#5b3a14"); g.addColorStop(0.5, "#e2b36a"); g.addColorStop(1, "#4a2f10");
      ctx.fillStyle = g; ctx.fillRect(x - 55, fl - h, 110, h); ctx.fillStyle = "#3b2a12"; ctx.fillRect(x - 64, fl - h, 128, 22);
      ctx.strokeStyle = "#22d3ee"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 12; ctx.lineWidth = 2;
      for (let y = fl - h + 40; y < fl; y += 48) { ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x - 10, y); ctx.lineTo(x - 10, y + 20); ctx.lineTo(x + 30, y + 20); ctx.stroke(); }
      ctx.fillStyle = "#fde68a"; ctx.font = "700 22px serif"; ctx.shadowColor = "#fbbf24"; for (let i = 0; i < 6; i++) ctx.fillText(HEB[(i * 3 + (side > 0 ? 1 : 0)) % HEB.length], x - 8, fl - h + 70 + i * 80);
      ctx.restore();
    }
  };
  return s;
}
// ===== STAGE FATALITY : LE TROU NOIR DE LA SINGULARITÉ =====
function SeqStageSingularity(att, vic) {
  const s = { t: 0, R: 0 }; const fl = Match.stage.floor; const [ex, ey] = Match.stage.eye; seqStart(att, vic, "cast");
  const x0 = vic.x, y0 = vic.y;
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.45; Cam.override = { x: W / 2, y: H / 2 - 40, z: 1 };
    s.R = easeOut(clamp(t / 60, 0, 1)) * 150 * (t > 190 ? Math.max(0, 1 - (t - 190) / 25) : 1);
    if (t === 1) { Audio2.play("xray"); UI.notify("L'ŒIL QUANTIQUE S'OUVRE", att.side, "xray"); }
    if (t > 50 && t < 170) {
      const k = ease((t - 50) / 120); vic.x = lerp(x0, ex, k); vic.y = lerp(y0, ey + 120, k); vic.scale = lerp(1, 0.08, k); vic.lean += 0.15 * k; vic.sy = 1 + k * 0.8; vic.sx = 1 - k * 0.5;
      if (t % 2 === 0) emit({ x: ex + rnd(-600, 600), y: ey + rnd(-300, 400), target: { x: ex, y: ey, k: 0.004 }, type: "orb", color: pick(["#a855f7", "#f59e0b", "#22d3ee"]), size: rnd(2, 4), life: 60, drag: 0.92 });
    }
    if (t === 170) { vic.hidden = true; Match.flash = 1; Match.flashColor = "#c4b5fd"; Audio2.play("explode"); Match.shake = 26; ring(ex, ey, "#fff", 10, 22, 30, 10); }
    if (t === 200) { UI.banner("STAGE FATALITY", "LE TROU NOIR DE LA SINGULARITÉ", "fatality", 170); Audio2.announce("fatality", "Stage Fatality !", "ann_stage_fatality"); }
    if (t >= 370) finishSeqDone(att, vic);
  };
  s.drawBack = (ctx) => {
    const R = s.R, t = s.t; if (R <= 1) return;
    ctx.save(); ctx.translate(ex, ey); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(t * 0.05 + i * 1.05); ctx.scale(1, 0.35); ctx.strokeStyle = i % 2 ? "rgba(245,158,11,0.7)" : "rgba(168,85,247,0.7)"; ctx.lineWidth = 10 - i; ctx.beginPath(); ctx.arc(0, 0, R * (1.4 + i * 0.18), 0, Math.PI * 1.3); ctx.stroke(); ctx.restore(); }
    ctx.globalCompositeOperation = "source-over"; const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R); g.addColorStop(0, "#000"); g.addColorStop(0.8, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  return s;
}

// ===== X-RAY CINÉMATIQUE (gros plan ralenti, 3 impacts) =====
function startXray(att, vic) {
  Match.state = "xray"; Match.st = 0; Match.projectiles.length = 0;
  setState(att, "xray_hold"); att.vx = 0; att.trail = []; setState(vic, "fatality_v"); vic.vx = 0; vic.vy = 0; vic.forceSprite = "hit";
  if (vic.y > Match.stage.floor) vic.y = Match.stage.floor;
  const s = { t: 0, xr: 0 };
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.82;
    Cam.override = { x: vic.x, y: vic.y - 170, z: 1.75 };
    if (t < 140 && vic.y < Match.stage.floor) vic.y = Math.min(Match.stage.floor, vic.y + 3);
    if ([34, 74, 114].includes(t)) {
      const dmg = t === 114 ? 12 : 9; vic.hp = Math.max(0, vic.hp - dmg); vic.redDelay = 40; att.stats.hits++; att.stats.dmg += dmg; vic.combo++; vic.comboDmg += dmg; Match.perfect[vic.side] = false;
      Audio2.play("bone"); Audio2.play("heavy"); Match.shake = 22; Match.flash = 0.7; Match.flashColor = "#fff"; s.xr = 12; Match.chroma = 1; speedFx(vic.x, vic.y - 170, 0.9, "#fff", 0);
      burst(vic.x, vic.y - 170, att.ch.color, 40, 12, "spark"); burst(vic.x, vic.y - 170, "#7f1d1d", 20, 9, "blood", { size: 3 });
      if (Match.training && vic.hp <= 0) vic.hp = 100;
    }
    if (s.xr > 0) s.xr--;
    if (t >= 150) {
      Match.state = "fight"; Match.seq = null; Cam.override = null; Match.darkTarget = 0;
      vic.forceSprite = null; setState(att, "idle"); setState(vic, "juggle"); vic.vy = -10; vic.vx = att.face * 8; vic.lastHitType = "xray";
      UI.comboLive(att.side, vic.combo, vic.comboDmg);
      if (vic.hp <= 0) handleKO(att, vic, "xray");
    }
  };
  s.drawTop = (ctx) => {
    if (s.xr > 0) { const info = spriteInfo(vic); if (info) { drawFighterRaw(ctx, vic, info, vic.x, vic.y, { tint: "#a5f3fc", alpha: 0.85 }); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1; for (let y = vic.y - info.h; y < vic.y; y += 6) { ctx.beginPath(); ctx.moveTo(vic.x - 120, y); ctx.lineTo(vic.x + 120, y); ctx.stroke(); } ctx.restore(); } }
  };
  s.drawScreen = (ctx) => {
    const t = s.t, img = IMG[att.ch.xrayImg]; if (!img || !img.naturalWidth) return;
    const k = t < 16 ? easeOut(t / 16) : t > 134 ? easeOut((150 - t) / 16) : 1, side = att.side ? 1 : -1;
    ctx.save(); ctx.translate(side * (1 - k) * W, 0);
    const x0 = att.side ? W * 0.42 : 0, x1 = att.side ? W : W * 0.58;
    ctx.beginPath();
    if (att.side) { ctx.moveTo(x0 + 80, 60); ctx.lineTo(x1, 40); ctx.lineTo(x1, H - 40); ctx.lineTo(x0, H - 60); }
    else { ctx.moveTo(x0, 40); ctx.lineTo(x1, 60); ctx.lineTo(x1 - 80, H - 60); ctx.lineTo(x0, H - 40); }
    ctx.closePath();
    ctx.save(); ctx.clip(); const z = 1.1 + t / 150 * 0.15 + (s.xr > 8 ? 0.04 : 0), iw = W * z, ih = H * z;
    ctx.drawImage(img, (W - iw) / 2 + (att.side ? W * 0.18 : -W * 0.18), (H - ih) / 2, iw, ih);
    if (s.xr > 0) { ctx.globalCompositeOperation = "difference"; ctx.fillStyle = `rgba(255,255,255,${s.xr / 24})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    ctx.lineWidth = 5; ctx.strokeStyle = att.ch.color; ctx.shadowColor = att.ch.color; ctx.shadowBlur = 20; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha = k; ctx.font = "900 46px Orbitron, sans-serif"; ctx.fillStyle = "#fff"; ctx.shadowColor = att.ch.color; ctx.shadowBlur = 24; ctx.textAlign = att.side ? "right" : "left";
    ctx.fillText("X-RAY", att.side ? W - 70 : 70, H - 92); ctx.font = "700 22px Rajdhani, sans-serif"; ctx.fillText(att.ch.moves.xray.name.replace("X-RAY : ", "").toUpperCase(), att.side ? W - 70 : 70, H - 62); ctx.restore();
  };
  Match.seq = s;
}
