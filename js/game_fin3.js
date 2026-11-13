/* =====================================================================
   MOTEUR DE COMBAT (5/5) — v4 : Fatalities de L'Œil Quantique,
   Friendships & Animalities (3 personnages), Stage Fatality Tel-Aviv
   ===================================================================== */
// Œil cosmique procédural (utilisé par les finishers de l'Œil Quantique)
function drawCosmicEye(ctx, x, y, R, open, t, look = 0) {
  if (R <= 1 || open <= 0) return;
  ctx.save(); ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  const s = R * 5; ctx.drawImage(glowSprite("#7e22ce"), -s / 2, -s / 2, s, s);
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(t * 0.02 * (i % 2 ? -1 : 1) + i); ctx.strokeStyle = i === 1 ? "rgba(251,191,36,0.8)" : "rgba(192,132,252,0.7)"; ctx.lineWidth = 3; ctx.setLineDash([18, 10]); ctx.beginPath(); ctx.arc(0, 0, R * (1.35 + i * 0.2), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  ctx.globalCompositeOperation = "source-over";
  ctx.beginPath(); ctx.moveTo(-R * 1.6, 0); ctx.quadraticCurveTo(0, -R * 1.25 * open, R * 1.6, 0); ctx.quadraticCurveTo(0, R * 1.25 * open, -R * 1.6, 0); ctx.closePath();
  ctx.save(); ctx.clip();
  ctx.fillStyle = "#0b0418"; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  const ix = look * R * 0.3, g = ctx.createRadialGradient(ix, 0, R * 0.1, ix, 0, R * 0.8);
  g.addColorStop(0, "#fff7d6"); g.addColorStop(0.25, "#fbbf24"); g.addColorStop(0.6, "#a855f7"); g.addColorStop(1, "#1e0638");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, 0, R * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(ix, 0, R * 0.12, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = "#fde68a"; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 20; ctx.stroke();
  ctx.restore();
}

// ===== L'ŒIL QUANTIQUE — FATALITY 1 : RÉÉCRITURE DE L'EXISTENCE =====
function SeqEyeF1(att, vic) {
  const s = { t: 0, name: "RÉÉCRITURE DE L'EXISTENCE", art: "fat_eye_1", tiles: null, scan: 0 };
  const fl = Match.stage.floor; seqStart(att, vic, "cast");
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.75;
    Cam.override = { x: vic.x, y: fl - 230, z: t < 190 ? 1.3 : 1.1 };
    if (t === 1) { Audio2.play("choir", 92); Audio2.play("glitch"); UI.notify(s.name, att.side, "xray"); }
    if (t < 50) vic.y = fl - easeOut(t / 50) * 70;
    if (t > 30 && t < 150) {
      if (t % 3 === 0) emit({ x: vic.x + rnd(-90, 90), y: vic.y - rnd(20, 300), vy: -rnd(1, 3), type: "glyph", ch: pick(SACRED + BIN), color: pick(["#c084fc", "#fbbf24", "#e9d5ff"]), size: rnd(12, 22), life: 50, drag: 1 });
      vic.tint = t % 12 < 3 ? "#c084fc" : null; vic.flash = t % 20 < 2 ? 2 : 0;
      if (t % 14 === 0) Audio2.play("glitch");
    }
    if (t === 150) {
      vic.tint = null; s.tiles = makeTiles(vic, 10, "up"); vic.hidden = true; Audio2.play("beam"); Match.flash = 0.6; Match.flashColor = "#e9d5ff";
      if (s.tiles) for (const tl of s.tiles.tiles) { tl.vx = rnd(-0.6, 0.6); tl.vy = -rnd(1.5, 4.5); }
    }
    if (s.tiles) {
      s.scan = Math.min(1, (t - 150) / 70);
      const cut = s.tiles.y - s.tiles.info.h + s.tiles.info.h * s.scan;
      for (const tl of s.tiles.tiles) {
        if (s.tiles.y + tl.ly > cut) continue; // la ligne de réécriture descend
        if (tl.delay > 0) { tl.delay--; continue; }
        tl.ox += tl.vx; tl.oy += tl.vy; tl.rot += tl.vr; tl.a -= 0.025;
        if (tl.a > 0 && Math.random() < 0.05) emit({ x: s.tiles.x + tl.lx + tl.ox, y: s.tiles.y + tl.ly + tl.oy, vy: -2, type: "glyph", ch: pick(SACRED), color: "#fbbf24", size: 12, life: 30, drag: 1 });
      }
    }
    if (t === 225) { Match.flash = 1; Match.flashColor = "#fff"; Match.shake = 20; Audio2.play("explode"); ring(vic.x, fl - 150, "#fbbf24", 20, 16, 28, 8); }
    if (t === 230) { panelArt(s, s.art, 230, FAT_PANEL, 1, null); speak(att, "fat", true); }
    if (t === 380) { UI.banner("FATALITY", s.name, "fatality", 170); Audio2.announce("fatality", "Fatality !", "ann_fatality"); }
    if (t >= 520) finishSeqDone(att, vic);
  };
  s.drawBack = (ctx) => {
    const t = s.t, k = easeOut(Math.min(1, t / 40)) * (t > 230 ? Math.max(0, 1 - (t - 230) / 30) : 1); if (k <= 0) return;
    const x = vic.hidden && s.tiles ? s.tiles.x : vic.x;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(x + i * 30, fl - 360); ctx.lineTo(x + i * 30, fl); ctx.stroke(); }
    for (let j = 0; j <= 12; j++) { ctx.beginPath(); ctx.moveTo(x - 180, fl - j * 30); ctx.lineTo(x + 180, fl - j * 30); ctx.stroke(); }
    ctx.restore();
    drawSeal(ctx, x, fl - 6, 200 * k, -t * 0.03, "#a855f7", "#fbbf24", 0.9, 0.28);
  };
  s.drawFront = (ctx) => {
    if (!s.tiles || s.scan >= 1 && s.t > 240) return;
    const T = s.tiles, y = T.y - T.info.h + T.info.h * s.scan;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#fde68a"; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 20; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(T.x - 170, y); ctx.lineTo(T.x + 170, y); ctx.stroke(); ctx.restore();
  };
  s.drawTop = (ctx) => drawTiles(ctx, s.tiles);
  s.drawScreen = (ctx) => drawArtPanel(ctx, s);
  return s;
}

// ===== L'ŒIL QUANTIQUE — FATALITY 2 : LE REGARD DE L'HORIZON =====
function SeqEyeF2(att, vic) {
  const s = { t: 0, name: "LE REGARD DE L'HORIZON", art: "fat_eye_2", tiles: null, open: 0 };
  const fl = Match.stage.floor; seqStart(att, vic, "cast");
  const ex = clamp(vic.x, 260, W - 260), ey = fl - 470, x0 = vic.x, y0 = vic.y;
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.8;
    Cam.override = { x: (ex + vic.x) / 2, y: fl - 300, z: 1.05 };
    s.open = easeOut(clamp((t - 20) / 50, 0, 1)) * (t > 225 ? Math.max(0, 1 - (t - 225) / 20) : 1);
    if (t === 1) { Audio2.play("choir", 73); Audio2.play("xray"); UI.notify(s.name, att.side, "xray"); }
    if (t === 70) Audio2.play("beam");
    if (t > 70 && t < 190) {
      const k = ease((t - 70) / 120); vic.x = lerp(x0, ex, k); vic.y = lerp(y0, ey + 160, k); vic.lean = Math.sin(t * 0.2) * 0.3 * k; vic.sy = 1 + k * 0.9; vic.sx = 1 - k * 0.55; vic.scale = 1 - k * 0.5;
      if (t % 2 === 0) emit({ x: vic.x + rnd(-200, 200), y: vic.y - rnd(0, 250), target: { x: ex, y: ey, k: 0.006 }, type: "orb", color: pick(["#a855f7", "#fbbf24"]), size: rnd(2, 4), life: 40, drag: 0.92 });
      Match.shake = 4;
    }
    if (t === 190) { s.tiles = makeTiles(vic, 12, "burst"); vic.hidden = true; Audio2.play("shatter"); if (s.tiles) for (const tl of s.tiles.tiles) tl.delay = rnd(10); }
    if (s.tiles) for (const tl of s.tiles.tiles) { if (tl.delay > 0) { tl.delay--; continue; } const gx = ex - (s.tiles.x + tl.lx + tl.ox), gy = ey - (s.tiles.y + tl.ly + tl.oy); tl.vx += gx * 0.01; tl.vy += gy * 0.01; tl.vx *= 0.92; tl.vy *= 0.92; tl.ox += tl.vx; tl.oy += tl.vy; tl.rot += 0.2; tl.a -= 0.02; }
    if (t === 215) { Match.flash = 1; Match.flashColor = "#fef3c7"; Match.shake = 30; Audio2.play("explode"); ring(ex, ey, "#fff", 20, 22, 30, 12); burst(ex, ey, "#fbbf24", 90, 14, "orb", { size: 3 }); }
    if (t === 235) { panelArt(s, s.art, 235, FAT_PANEL, -1, null); speak(att, "fat", true); }
    if (t === 385) { UI.banner("FATALITY", s.name, "fatality", 170); Audio2.announce("fatality", "Fatality !", "ann_fatality"); }
    if (t >= 520) finishSeqDone(att, vic);
  };
  s.drawBack = (ctx) => {
    const t = s.t; drawCosmicEye(ctx, ex, ey, 110, s.open, t, clamp((vic.x - ex) / 300, -1, 1));
    if (t > 70 && t < 215) { ctx.save(); ctx.globalCompositeOperation = "lighter"; const a = 0.35 + Math.sin(t * 0.5) * 0.1; const g = ctx.createLinearGradient(0, ey, 0, fl); g.addColorStop(0, `rgba(251,191,36,${a})`); g.addColorStop(1, "rgba(168,85,247,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ex - 40, ey); ctx.lineTo(ex + 40, ey); ctx.lineTo(x0 + 140, fl); ctx.lineTo(x0 - 140, fl); ctx.closePath(); ctx.fill(); ctx.restore(); }
  };
  s.drawTop = (ctx) => drawTiles(ctx, s.tiles, "#c084fc");
  s.drawScreen = (ctx) => drawArtPanel(ctx, s);
  return s;
}

// ===== FRIENDSHIP (3 personnages) =====
function SeqFriendship(att, vic) {
  const fr = att.ch.friendship, s = { t: 0, name: fr.name.toUpperCase(), art: fr.art };
  const fl = Match.stage.floor; seqStart(att, vic, "cast"); vic.forceSprite = "idle";
  const cols = { aurelia: ["#f472b6", "#e879f9", "#fda4af"], hai: ["#fbbf24", "#22d3ee", "#a3e635"], eye: ["#c084fc", "#fbbf24", "#e9d5ff"] }[att.id] || ["#fff"];
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.35;
    Cam.override = { x: (att.x + vic.x) / 2, y: fl - 230, z: 1.15 };
    if (t === 1) { Audio2.play("choir", 130); UI.notify(s.name, att.side, "ex"); }
    if (t === 20) speak(att, "friend", true);
    if (t > 10 && t < 220) {
      if (t % 2 === 0) emit({ x: rnd(0, W), y: -20, vx: rnd(-1, 1), vy: rnd(2, 4), type: "glyph", ch: pick(att.id === "aurelia" ? "❤✿❀" : att.id === "hai" ? "♪♫★" : "✦✧☆"), color: pick(cols), size: rnd(16, 30), life: 140, drag: 1, vr: rnd(-0.05, 0.05) });
      att.lean = Math.sin(t * 0.15) * 0.08; att.sy = 1 + Math.abs(Math.sin(t * 0.15)) * 0.04;
      if (t % 30 === 0) ring(att.x, att.y - 150, pick(cols), 20, 8, 30, 4);
    }
    if (t === 110) { vic.forceSprite = "hit"; vic.lean = -0.12; Audio2.play("land"); }
    if (t === 130) panelArt(s, s.art, 130, 200, att.side ? -1 : 1, null);
    if (t === 260) { UI.banner("FRIENDSHIP", s.name, "fatality", 160); Audio2.announce("fatality", "Friendship !", "ann_friendship"); }
    if (t === 330) UI.banner("FRIENDSHIP ?", "ENCORE ?", "round", 80);
    if (t >= 420) finishSeqDone(att, vic);
  };
  s.drawBack = (ctx) => { // arc-en-ciel néon
    const t = s.t, k = easeOut(Math.min(1, t / 50)) * (t > 380 ? Math.max(0, 1 - (t - 380) / 40) : 1); if (k <= 0) return;
    const cx = (att.x + vic.x) / 2; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 14;
    ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#22d3ee", "#6366f1", "#a855f7"].forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.45 * k; ctx.beginPath(); ctx.arc(cx, fl + 40, 420 - i * 16, Math.PI, Math.PI + Math.PI * k); ctx.stroke(); });
    ctx.restore();
  };
  s.drawScreen = (ctx) => drawArtPanel(ctx, s);
  return s;
}

// ===== ANIMALITY (3 personnages) =====
function SeqAnimality(att, vic) {
  const an = att.ch.animality, s = { t: 0, name: an.name.toUpperCase(), art: an.art, tiles: null };
  const fl = Match.stage.floor; seqStart(att, vic, "cast");
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.7;
    Cam.override = { x: (att.x + vic.x) / 2, y: fl - 240, z: 1.2 };
    if (t === 1) { Audio2.play("choir", 82); Audio2.play("lightning"); UI.notify(s.name, att.side, "xray"); }
    if (t > 10 && t < 70) { att.tint = t % 6 < 3 ? att.ch.color : null; att.sx = 1 + (t - 10) / 60 * 0.25; att.sy = 1 + (t - 10) / 60 * 0.25; if (t % 3 === 0) burst(att.x, att.y - 150, att.ch.color, 8, 6, "smoke", { size: 14 }); }
    if (t === 70) { att.hidden = true; att.tint = null; Match.flash = 1; Match.flashColor = att.ch.light; Audio2.play("explode"); Match.shake = 22; burst(att.x, att.y - 150, "rgba(40,20,60,0.8)", 40, 9, "smoke", { size: 20 }); }
    if (t === 76) panelArt(s, s.art, 76, 170, att.side ? -1 : 1, null);
    if (t >= 120 && t < 230 && t % 14 === 0) { Audio2.play(t % 28 ? "slash" : "bone"); Match.shake = 12; vic.flash = 3; burst(vic.x, vic.y - rnd(80, 220), vic.ch.blood, 18, 9, "blood", { size: rnd(2, 5) }); }
    if (t === 240) {
      s.tiles = makeTiles(vic, 22, "burst"); vic.hidden = true; Audio2.play("bone"); Audio2.play("explode"); Match.shake = 30;
      if (s.tiles) for (const tl of s.tiles.tiles) { tl.vx = rnd(-9, 9); tl.vy = rnd(-14, -4); tl.delay = 0; }
      burst(vic.x, vic.y - 150, vic.ch.blood, 60, 12, "blood", { size: 4 });
    }
    if (s.tiles) for (const tl of s.tiles.tiles) { tl.vy += 0.55; tl.ox += tl.vx; tl.oy += tl.vy; tl.rot += tl.vr * 2; if (s.tiles.y + tl.ly + tl.oy > fl) { tl.oy = fl - s.tiles.y - tl.ly; tl.vy *= -0.25; tl.vx *= 0.6; } if (s.t > 330) tl.a -= 0.02; }
    if (t === 262) { att.hidden = false; att.forceSprite = "cast"; Match.flash = 0.6; Match.flashColor = att.ch.light; speak(att, "fat", true); }
    if (t === 280) { UI.banner("ANIMALITY", s.name, "fatality", 170); Audio2.announce("fatality", "Animality !", "ann_animality"); }
    if (t >= 440) finishSeqDone(att, vic);
  };
  s.drawTop = (ctx) => drawTiles(ctx, s.tiles);
  s.drawFront = (ctx) => { // griffes
    const t = s.t; if (t < 120 || t >= 240) return; const ph = (t - 120) % 14; if (ph > 6) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = att.ch.light; ctx.shadowColor = att.ch.color; ctx.shadowBlur = 18; ctx.lineWidth = 6 - ph * 0.7;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(vic.x - 90 + i * 26, vic.y - 280 + i * 10); ctx.lineTo(vic.x + 90 + i * 26, vic.y - 60 + i * 10); ctx.stroke(); }
    ctx.restore();
  };
  s.drawScreen = (ctx) => drawArtPanel(ctx, s);
  return s;
}

// ===== STAGE FATALITY : LA VAGUE NÉON DE JAFFA (Tel-Aviv) =====
function SeqStageTelAviv(att, vic) {
  const s = { t: 0, wave: -1 }; const fl = Match.stage.floor; const [lx, ly] = Match.stage.lighthouse || [308, 236]; seqStart(att, vic, "cast");
  const x0 = vic.x, y0 = vic.y, dir = vic.x < W / 2 ? -1 : 1;
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.4; Cam.override = { x: W / 2, y: H / 2 - 30, z: 1 };
    if (t === 1) { Audio2.play("beam"); UI.notify("LE PHARE DE JAFFA S'ÉVEILLE", att.side, "xray"); }
    if (t === 60) { Audio2.play("lightning"); Match.shake = 10; }
    if (t > 60) s.wave = easeOut(clamp((t - 60) / 110, 0, 1));
    if (t > 110 && t < 230) {
      const k = ease((t - 110) / 120); vic.x = lerp(x0, dir > 0 ? W + 220 : -220, k); vic.y = lerp(y0, fl - 260, Math.sin(k * Math.PI) * 0.9) ; vic.lean += 0.18 * dir; vic.scale = 1 - k * 0.3;
      if (t % 2 === 0) burst(vic.x, vic.y - 100, pick(["#22d3ee", "#ec4899", "#e0f2fe"]), 6, 6, "spark");
    }
    if (t === 230) { vic.hidden = true; Audio2.play("explode"); Match.shake = 18; }
    if (t === 240) { UI.banner("STAGE FATALITY", "LA VAGUE NÉON DE JAFFA", "fatality", 170); Audio2.announce("fatality", "Stage Fatality !", "ann_stage_fatality"); }
    if (t >= 400) finishSeqDone(att, vic);
  };
  s.drawBack = (ctx) => {
    const t = s.t; if (t < 1) return;
    // faisceau du phare qui balaie puis se fixe sur la victime
    const ang = t < 60 ? Math.PI * 0.1 + Math.sin(t * 0.1) * 0.6 : Math.atan2(vic.y - 150 - ly, vic.x - lx);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(lx, ly); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, 1300, 0); g.addColorStop(0, "rgba(253,230,138,0.65)"); g.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1300, -120); ctx.lineTo(1300, 120); ctx.closePath(); ctx.fill(); ctx.restore();
    const gs = 160; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(glowSprite("#fde68a"), lx - gs / 2, ly - gs / 2, gs, gs); ctx.restore();
  };
  s.drawFront = (ctx) => {
    if (s.wave <= 0) return; const t = s.t, k = s.wave * (t > 300 ? Math.max(0, 1 - (t - 300) / 60) : 1); if (k <= 0) return;
    const top = lerp(fl + 40, fl - 420, k);
    for (let L = 0; L < 3; L++) {
      ctx.save(); ctx.globalAlpha = 0.55 + L * 0.15;
      const g = ctx.createLinearGradient(0, top, 0, fl + 60); g.addColorStop(0, L === 2 ? "rgba(224,242,254,0.95)" : L ? "rgba(34,211,238,0.85)" : "rgba(236,72,153,0.75)"); g.addColorStop(1, "rgba(8,47,73,0.95)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-60, H + 20);
      for (let x = -60; x <= W + 60; x += 20) ctx.lineTo(x, top + L * 40 + Math.sin(x * 0.012 + t * 0.12 + L) * 28 + Math.sin(x * 0.03 - t * 0.2) * 10);
      ctx.lineTo(W + 60, H + 20); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = L === 1 ? "#67e8f9" : "#f9a8d4"; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16; ctx.stroke();
      ctx.restore();
    }
    if (t % 3 === 0) emit({ x: rnd(0, W), y: top + rnd(-10, 30), vx: rnd(-2, 2), vy: -rnd(2, 6), type: "orb", color: pick(["#e0f2fe", "#67e8f9", "#f9a8d4"]), size: rnd(2, 4), life: 30, g: 0.2 });
  };
  return s;
}
