/* =====================================================================
   MOTEUR DE COMBAT (3/4) : sprites, fin de round, outils de finishers,
   Fatalities d'Aurélia
   ===================================================================== */
function spriteKey(f) {
  const sp = f.ch.sprites; let k;
  switch (f.state) {
    case "attack": k = f.move && f.move.sprite === "heavy" ? sp.heavy : sp.light; break;
    case "airatk": k = sp.air; break;
    case "jump": k = f.vy < -5 ? sp.idle : sp.air; break;
    case "cast": case "victory": case "xray_hold": case "taunt": k = sp.cast; break;
    case "xray_lunge": k = sp.heavy; break;
    case "grab": case "throw": k = sp.light; break;
    case "hitstun": case "juggle": case "down": case "ko": case "thrown": case "stun": case "dizzy": case "getup": case "parried": k = sp.hit; break;
    default: k = sp.idle;
  }
  if (f.forceSprite) k = sp[f.forceSprite] || f.forceSprite;
  if (Settings.outfit === "v1" && f.costume === "base") { const v = "v1_" + k; if (IMG[v]) return v; if (k === sp.hit && IMG["v1_" + sp.idle]) return "v1_" + sp.idle; }
  if (f.costume && f.costume !== "base" && typeof Costumes !== "undefined") return Costumes.key(f.id, f.costume, k);
  return k;
}
function spriteInfo(f, keyOverride) {
  const key = keyOverride || spriteKey(f); const img = IMG[key]; if (!img || !img.naturalWidth) return null;
  const meta = f.ch.spriteMeta[key] || f.ch.spriteMeta[(typeof COSTUME_BASE !== "undefined" && COSTUME_BASE[key]) || key] || { h: 300, ax: 0.5 };
  const h = meta.h * f.scale, w = img.naturalWidth / img.naturalHeight * h;
  return { key, img, w, h, ax: meta.ax, flip: meta.flip ? -1 : 1 };
}

// ---------------- FIN DE ROUND / MATCH ----------------
function startFinisher(att, vic, kind) {
  UI.finishPrompt(null);
  Match.state = "fatality"; Match.st = 0; Match.winner = att; Match.loser = vic; Match.finisher = kind; Match.timeScale = 1; Match.slowT = 0;
  Match.projectiles.length = 0; endCombo(vic);
  att.vx = att.vy = vic.vx = 0; att.y = Match.stage.floor; att.trail = []; vic.trail = [];
  if (vic.y > Match.stage.floor) vic.y = Match.stage.floor;
  const FAT = { aurelia: [SeqAurF1, SeqAurF2], hai: [SeqHaiF1, SeqHaiF2], eye: [SeqEyeF1, SeqEyeF2] }[att.id] || [SeqAurF1, SeqAurF2];
  const STG = { paris: SeqStageParis, jerusalem: SeqStageJerusalem, singularity: SeqStageSingularity, telaviv: SeqStageTelAviv };
  const B = { fatality1: FAT[0], fatality2: FAT[1], stage: STG[Match.stage.id] || SeqStageParis, brutality: SeqBrutality, friendship: SeqFriendship, animality: SeqAnimality };
  Match.seq = B[kind](att, vic);
  Audio2.stopMusic(); Audio2.play("heartbeat");
  const key = kind === "stage" ? "stage_" + Match.stage.id : kind === "brutality" ? "brutality" : kind === "friendship" ? att.ch.friendship.key : kind === "animality" ? att.ch.animality.key : att.ch.fatalities[kind === "fatality1" ? 0 : 1].key;
  saveUnlock(key);
  GameEv.emit("finisher", { att, vic, kind, key });
}
function finishSeqDone(att, vic) {
  Vid.stopAll();
  Match.seq = null; Cam.override = null; Match.darkTarget = 0.2;
  [att, vic].forEach(f => { f.tint = null; f.alpha = 1; f.scale = 1; f.sx = f.sy = 1; });
  att.hidden = false; att.forceSprite = null;
  if (Match.training) {
    Object.assign(vic, { hidden: false, forceSprite: null, hp: 100, red: 100, state: "idle", t: 0, x: clamp(att.x + att.face * 320, 90, W - 90), y: Match.stage.floor, vx: 0, vy: 0, lean: 0 });
    setState(att, "idle"); Match.state = "fight"; Match.darkTarget = 0; Audio2.playMusic(Match.stage.music); return;
  }
  endRound(att, vic, Match.finisher);
}
function endRound(att, vic, how) {
  if (Match.state === "roundend" || Match.state === "over") return;
  Match.state = "roundend"; Match.st = 0; Match.winner = att; Match.loser = vic;
  Match.winLineAt = -1; Match.flawlessAt = -1;
  Match.wins[att.side]++; att.wins = Match.wins[att.side];
  UI.roundSeals(); UI.finishPrompt(null);
}
function roundEndUpdate() {
  Match.st++;
  const att = Match.winner, vic = Match.loser;
  if (Match.st === 70) {
    att.forceSprite = null; att.hidden = false; setState(att, "victory");
    const flawless = att.hp >= 99.9 && Match.perfect[att.side];
    const fin = Match.finisher;
    const sub = flawless ? "FLAWLESS VICTORY" : fin === "fatality1" || fin === "fatality2" ? "FATALITY" : fin === "brutality" ? "BRUTALITY" : fin === "stage" ? "STAGE FATALITY" : fin === "friendship" ? "FRIENDSHIP" : fin === "animality" ? "ANIMALITY" : "";
    UI.banner(att.ch.name + " GAGNE", sub, "win", 130);
    Audio2.announce("win", att.ch.spoken + " gagne !", att.ch.annWin);
    Match.winLineAt = 70 + Math.round((Audio2.voiceDur(att.ch.annWin) + 0.25) * 60);
    GameEv.emit("roundWon", { att, vic, flawless, fin, round: Match.round });
    if (flawless) { Match.flawlessAt = Match.winLineAt; Match.winLineAt += Math.round((Audio2.voiceDur("ann_flawless") + 0.2) * 60); }
  }
  if (Match.st === Match.flawlessAt) { Audio2.voice("ann_flawless", { ch: "ann" }); if (!Audio2.hasVoice("ann_flawless")) Audio2.say("Flawless victory", 0.4, 0.85, "en-US"); }
  if (Match.st === Match.winLineAt) speak(att, "win", true);
  if (Match.st === 240) {
    if (Match.wins[att.side] >= Match.winsNeeded) { Match.state = "over"; GameEv.emit("matchOver", { att, vic, frames: frameCount - Match.startFrame }); UI.matchOver(att, vic); }
    else { Match.round++; startRound(); }
  }
}

// ---------------- OUTILS DE SÉQUENCES ----------------
// Panneau cinématique slash rouge/or : VRAIE VIDÉO MP4 incrustée (fallback artwork HD)
const FAT_PANEL = 230;
function panelArt(seq, key, t0, dur, side = 1, video) {
  seq.panel = { key, t0, dur, side, video };
  if (video) Vid.play(video, clamp(Vid.dur(video) / (dur / 60) * 0.92, 0.7, 1.5));
}
function drawArtPanel(ctx, seq) {
  const p = seq.panel; if (!p) return; const t = seq.t - p.t0; if (t < 0 || t > p.dur) return;
  const vid = p.video ? Vid.ready(p.video) : null;
  const img = vid || IMG[p.key]; if (!vid && (!img || !img.naturalWidth)) return;
  if (t > 14 && t < p.dur - 14 && t % 40 < 4) Match.chroma = Math.max(Match.chroma, 0.9); // pulsations RGB rythmées
  const k = t < 14 ? easeOut(t / 14) : t > p.dur - 14 ? easeOut((p.dur - t) / 14) : 1;
  ctx.save();
  ctx.globalAlpha = 0.7 * k; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  ctx.translate((1 - k) * W * 0.7 * p.side, 0);
  ctx.beginPath(); ctx.moveTo(90, 70); ctx.lineTo(W - 40, 40); ctx.lineTo(W - 90, H - 70); ctx.lineTo(40, H - 40); ctx.closePath();
  ctx.save(); ctx.clip();
  const z = 1.05 + t / p.dur * 0.12, iw = W * z, ih = H * z;
  ctx.drawImage(img, (W - iw) / 2 + Math.sin(t * 0.02) * 10, (H - ih) / 2, iw, ih);
  ctx.globalCompositeOperation = "overlay"; ctx.fillStyle = "rgba(180,0,30,0.16)"; ctx.fillRect(0, 0, W, H);
  if (vid) { // scanlines + bandeau tech
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.12; ctx.fillStyle = "#000"; for (let y = (t * 2) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1.4); ctx.globalAlpha = 1;
    ctx.font = "700 14px Orbitron, sans-serif"; ctx.fillStyle = "#fde68a"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 10; ctx.fillText("● REC  FATALITY.CAM // " + (seq.name || ""), 110, H - 92); ctx.shadowBlur = 0;
  }
  ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = "#b91c1c"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 25; ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = "#fde68a"; ctx.shadowBlur = 0; ctx.stroke();
  ctx.restore();
}
function drawFighterRaw(ctx, f, info, x, y, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.face || f.face) * info.flip * (o.sx || 1), o.sy || 1);
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.drawImage(o.tint ? tinted(info.key, o.tint) || info.img : info.img, -info.w * info.ax, -info.h, info.w, info.h);
  ctx.restore();
}
// Découpe en tuiles (désintégration / pixels) — sans getImageData (compatible file://)
function makeTiles(f, size, mode) {
  const info = spriteInfo(f); if (!info) return null;
  const tiles = [], cols = Math.ceil(info.w / size), rows = Math.ceil(info.h / size), kx = info.img.naturalWidth / info.w, ky = info.img.naturalHeight / info.h;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const lx = c * size, ly = r * size;
    tiles.push({ sx: lx * kx, sy: ly * ky, sw: size * kx, sh: size * ky, lx: lx - info.w * info.ax, ly: ly - info.h, ox: 0, oy: 0, vx: 0, vy: 0, rot: 0, vr: rnd(-0.2, 0.2), delay: mode === "up" ? (rows - r) * 0.6 + rnd(6) : rnd(8), a: 1 });
  }
  return { info, tiles, size, x: f.x, y: f.y, face: f.face * info.flip };
}
function drawTiles(ctx, T, tint) {
  if (!T) return; const { info, size } = T;
  ctx.save(); ctx.translate(T.x, T.y); ctx.scale(T.face, 1);
  const src = tint ? tinted(info.key, tint) || info.img : info.img;
  for (const t of T.tiles) { if (t.a <= 0) continue; ctx.globalAlpha = t.a; ctx.save(); ctx.translate(t.lx + t.ox + size / 2, t.ly + t.oy + size / 2); ctx.rotate(t.rot); ctx.drawImage(src, t.sx, t.sy, t.sw, t.sh, -size / 2, -size / 2, size + 0.6, size + 0.6); ctx.restore(); }
  ctx.restore();
}
function seqStart(att, vic, attSprite) { vic.state = "fatality_v"; vic.t = 0; vic.forceSprite = "hit"; att.state = "fatality_w"; att.t = 0; att.forceSprite = attSprite; att.face = vic.x >= att.x ? 1 : -1; vic.face = -att.face; }

// ===== AURÉLIA — FATALITY 1 : ÉCLIPSE DES MILLE LAMES D'OMBRE =====
function SeqAurF1(att, vic) {
  const s = { t: 0, slashes: [], pieces: null, name: "ÉCLIPSE DES MILLE LAMES D'OMBRE", art: "fat_aur_1" };
  const fl = Match.stage.floor; seqStart(att, vic, "cast");
  s.update = () => {
    const t = ++s.t, cx = vic.x, cy = vic.y - 150;
    Match.darkTarget = 0.7;
    Cam.override = { x: vic.x, y: fl - 230, z: t < 200 ? 1.35 : 1.15 };
    if (t === 1) { Audio2.play("choir", 110); Audio2.play("lightning"); UI.notify(s.name, att.side, "xray"); }
    if (t < 60) { vic.y = fl - easeOut(t / 60) * 110; vic.lean = Math.sin(t * 0.1) * 0.1; }
    if (t % 4 === 0 && t < 175) emit({ x: cx + rnd(-260, 260), y: cy + rnd(-200, 200), target: { x: cx, y: cy, k: 0.004 }, type: "orb", color: "#a855f7", size: rnd(2, 4), life: 40, drag: 0.95 });
    if (t >= 55 && t < 160 && t % 9 === 0) {
      const a = rnd(Math.PI), L = 270;
      s.slashes.push({ t, x1: cx - Math.cos(a) * L, y1: cy - Math.sin(a) * L, x2: cx + Math.cos(a) * L, y2: cy + Math.sin(a) * L });
      att.hidden = true; const side = Math.random() < 0.5 ? 1 : -1;
      att.trail.push({ x: cx + side * rnd(150, 230), y: fl - rnd(0, 120), key: spriteKey(Object.assign({}, att, { forceSprite: "light" })), face: -side, a: 0.9, lean: 0 });
      Audio2.play("slash"); Match.shake = 7; vic.flash = 3; burst(cx, cy, "#f0abfc", 14, 8, "spark"); burst(cx, cy, "#6b21a8", 6, 6, "blood", { size: 3 });
    }
    if (t === 165) { att.hidden = false; att.x = clamp(vic.x - att.face * 250, 60, W - 60); att.forceSprite = "cast"; }
    if (t === 178) {
      s.info = spriteInfo(vic); s.px = vic.x; s.py = vic.y; s.face = vic.face;
      s.pieces = [0, 1, 2, 3].map(i => ({ i, ox: 0, oy: 0, vx: rnd(-3, 3) + (i - 1.5) * 1.4, vy: rnd(-5, -1) - i, rot: 0, vr: rnd(-0.05, 0.05) }));
      vic.hidden = true; Match.flash = 1; Match.flashColor = "#fff"; Match.shake = 32; Match.hitstop = 6;
      Audio2.play("explode"); Audio2.play("bone"); Audio2.play("lightning");
      burst(cx, cy, "#7e22ce", 90, 16, "spark"); burst(cx, cy, "#3b0764", 40, 10, "blood", { size: 4 }); burst(cx, cy, "#9f1239", 25, 9, "blood", { size: 3 });
      ring(cx, cy, "#e879f9", 20, 18, 30, 10);
    }
    if (s.pieces) for (const p of s.pieces) { p.vy += 0.35; p.ox += p.vx; p.oy += p.vy; p.rot += p.vr; const floorOff = fl + 10 - s.py - (3 - p.i) * 4; if (p.oy > floorOff) { p.oy = floorOff; p.vy *= -0.2; p.vx *= 0.8; p.vr *= 0.8; } }
    if (t === 205) { panelArt(s, s.art, 205, FAT_PANEL, 1, att.ch.fatVideo); speak(att, "fat", true); }
    if (t === 360) { UI.banner("FATALITY", s.name, "fatality", 170); Audio2.announce("fatality", "Fatality !", "ann_fatality"); }
    if (t >= 500) finishSeqDone(att, vic);
  };
  s.drawBack = (ctx) => {
    const t = s.t, x = vic.hidden ? s.px : vic.x, y = fl - 260, k = easeOut(Math.min(1, t / 50)) * (t > 190 ? Math.max(0, 1 - (t - 190) / 40) : 1);
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(t * 0.03 * (i % 2 ? -1 : 1) + i); ctx.scale(1, 0.45); ctx.strokeStyle = `rgba(168,85,247,${0.55 * k})`; ctx.lineWidth = 9 - i; ctx.beginPath(); ctx.arc(0, 0, (240 - i * 34) * k, 0, Math.PI * 1.6); ctx.stroke(); ctx.restore(); }
    const s2 = 380 * k; ctx.drawImage(glowSprite("#7e22ce"), -s2 / 2, -s2 / 2, s2, s2);
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = `rgba(8,0,18,${0.9 * k})`; ctx.beginPath(); ctx.ellipse(0, 0, 95 * k, 42 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  s.drawFront = (ctx) => {
    const t = s.t;
    for (const sl of s.slashes) { const age = t - sl.t; const a = t < 178 ? Math.max(0.22, 1 - age / 25) : Math.max(0, 1 - (t - 178) / 20); if (a <= 0) continue; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(sl.x1, sl.y1); ctx.lineTo(sl.x2, sl.y2); ctx.strokeStyle = "rgba(192,38,211,0.35)"; ctx.lineWidth = age < 4 ? 34 : 14; ctx.stroke(); ctx.strokeStyle = "#e879f9"; ctx.lineWidth = age < 4 ? 14 : 4; ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = age < 4 ? 4 : 1.5; ctx.stroke(); ctx.restore(); }
    if (s.pieces && s.info) {
      const info = s.info, bands = [0, 0.27, 0.52, 0.76, 1.02];
      for (const p of s.pieces) {
        ctx.save(); ctx.translate(s.px + p.ox, s.py + p.oy); ctx.rotate(p.rot); ctx.scale(s.face * info.flip, 1);
        const y0 = -info.h * (1 - bands[p.i]), y1 = -info.h * (1 - bands[p.i + 1]), sk = 18;
        ctx.beginPath(); ctx.moveTo(-info.w, y0 - sk); ctx.lineTo(info.w, y0 + sk); ctx.lineTo(info.w, y1 + sk); ctx.lineTo(-info.w, y1 - sk); ctx.closePath(); ctx.clip();
        ctx.drawImage(info.img, -info.w * info.ax, -info.h, info.w, info.h);
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#f0abfc"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-info.w, y0 - sk); ctx.lineTo(info.w, y0 + sk); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-info.w, y1 - sk); ctx.lineTo(info.w, y1 + sk); ctx.stroke();
        ctx.restore();
      }
    }
    if (t >= 178 && t < 215) for (let i = 0; i < 6; i++) { const a = rnd(Math.PI * 2); drawBlackBolt(ctx, s.px, s.py - 150, s.px + Math.cos(a) * rnd(200, 520), s.py - 150 + Math.sin(a) * rnd(150, 380), 5); }
  };
  s.drawScreen = (ctx) => drawArtPanel(ctx, s);
  return s;
}

// ===== AURÉLIA — FATALITY 2 : SURCHARGE NEURO-VORTEX =====
function SeqAurF2(att, vic) {
  const s = { t: 0, name: "SURCHARGE NEURO-VORTEX", art: "fat_aur_2", tiles: null, R: 260 };
  const fl = Match.stage.floor; seqStart(att, vic, "cast");
  s.update = () => {
    const t = ++s.t; Match.darkTarget = 0.72;
    Cam.override = { x: (vic.x * 2 + att.x) / 3, y: fl - 230, z: 1.3 };
    const cx = vic.x, cy = fl - 190;
    s.R = t < 110 ? lerp(260, 170, ease(t / 40)) : lerp(170, 55, ease((t - 110) / 60));
    if (t === 1) { Audio2.play("choir", 98); UI.notify(s.name, att.side, "xray"); }
    if (t < 70) vic.y = fl - easeOut(t / 70) * 60;
    if (t > 40) vic.lean = Math.sin(t * 0.7) * 0.05;
    if (t % 7 === 0 && t > 20 && t < 172) Audio2.play("lightning");
    if (t > 110 && t < 172) { vic.scale = lerp(1, 0.55, (t - 110) / 62); vic.sx = 0.8 + Math.sin(t) * 0.05; vic.tint = t % 4 < 2 ? "#e879f9" : null; vic.flash = t % 6 < 2 ? 2 : 0; }
    if (t === 172) {
      vic.tint = null; s.tiles = makeTiles(vic, 12, "burst"); vic.hidden = true;
      if (s.tiles) for (const tl of s.tiles.tiles) { const a = Math.atan2(tl.ly + s.tiles.info.h / 2, tl.lx); const sp = rnd(2, 9); tl.vx = Math.cos(a) * sp; tl.vy = Math.sin(a) * sp - 2; }
      Match.flash = 1; Match.flashColor = "#f0abfc"; Match.shake = 28; Audio2.play("explode"); Audio2.play("shatter");
      burst(cx, cy, "#d946ef", 160, 15, "orb", { size: 3 }); burst(cx, cy, "#7e22ce", 60, 12, "pixel", { size: 5, g: 0.02 }); ring(cx, cy, "#f0abfc", 10, 20, 30, 12);
    }
    if (s.tiles) for (const tl of s.tiles.tiles) { if (tl.delay > 0) { tl.delay--; continue; } const sw = 0.06, vx = tl.vx; tl.vx = vx * 0.97 - tl.vy * sw; tl.vy = tl.vy * 0.97 + vx * sw - 0.05; tl.ox += tl.vx; tl.oy += tl.vy; tl.rot += tl.vr; tl.a -= 0.012; if (Math.random() < 0.02) emit({ x: s.tiles.x + tl.lx + tl.ox, y: s.tiles.y + tl.ly + tl.oy, type: "orb", color: "#e879f9", size: 2, life: 20 }); }
    if (t === 205) { panelArt(s, s.art, 205, FAT_PANEL, -1, att.ch.fatVideo); speak(att, "fat", true); }
    if (t === 360) { UI.banner("FATALITY", s.name, "fatality", 170); Audio2.announce("fatality", "Fatality !", "ann_fatality"); }
    if (t >= 500) finishSeqDone(att, vic);
  };
  s.drawFront = (ctx) => {
    const t = s.t, cx = vic.x, cy = fl - 190, R = s.R;
    if (t > 212) return;
    const k = Math.min(1, t / 30), pts = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + t * 0.05; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9]); }
    if (t > 40 && t < 175) {
      for (let i = 0; i < 6; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 6]; drawBolt(ctx, x1, y1, x2, y2, "#c026d3", 2.2, 18, "#fff", 0); if (t % 3 === 0) drawBolt(ctx, x1, y1, cx, cy, "#a855f7", 1.4, 22, "#fff", 0); }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 0.03); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "#e879f9"; ctx.font = "700 20px serif"; ctx.globalAlpha = 0.85;
      for (let i = 0; i < 16; i++) { ctx.save(); ctx.rotate(i / 16 * Math.PI * 2); ctx.fillText(RUNES[i % RUNES.length], 0, -R * 1.12); ctx.restore(); } ctx.restore();
    }
    if (t < 176) for (const [x, y] of pts) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const s2 = 90 * k; ctx.drawImage(glowSprite("#a21caf"), x - s2 / 2, y - s2 / 2, s2, s2); ctx.restore();
      ctx.save(); ctx.fillStyle = "#0b0012"; ctx.strokeStyle = "#e879f9"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 17 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      if (Math.random() < 0.5) drawBolt(ctx, x, y, x + rnd(-40, 40), y + rnd(-40, 40), "#e879f9", 1, 8, "#fff", 0);
    }
  };
  s.drawTop = (ctx) => drawTiles(ctx, s.tiles);
  s.drawScreen = (ctx) => drawArtPanel(ctx, s);
  return s;
}
