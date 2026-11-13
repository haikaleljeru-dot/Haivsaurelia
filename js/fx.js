/* =====================================================================
   EFFETS VISUELS : particules Canvas 2D haute densité, éclairs, sceaux,
   météo dynamique par arène, teintes de sprites, helpers de rendu
   ===================================================================== */
const IMG = {};           // images chargées
const TINT = {};          // silhouettes teintées pré-rendues (clé|couleur)
const GLOW = {};          // sprites de lueur radiale par couleur
const QUALITY = { level: "haute", mult: 1 };
const HEB = "אבגדהוזחטיכלמנסעפצקרשת";
const BIN = "01";
const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";

function rnd(a = 1, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

function glowSprite(color) {
  if (GLOW[color]) return GLOW[color];
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, color); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (GLOW[color] = c);
}
// Silhouette teintée (sans getImageData => compatible file://)
function tinted(key, color) {
  const id = key + "|" + color;
  if (TINT[id]) return TINT[id];
  const img = IMG[key]; if (!img || !img.naturalWidth) return null;
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return (TINT[id] = c);
}

// ---------------- PARTICULES ----------------
const P = [];
const MAX_P = 2600;
function emit(o) {
  if (P.length >= MAX_P * QUALITY.mult) P.shift();
  const p = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 40, max: 40, size: 4, color: "#fff", type: "orb", g: 0, drag: 0.98, rot: 0, vr: 0, ch: "", add: true, grow: 0 }, o);
  p.max = p.life; P.push(p); return p;
}
function burst(x, y, color, n = 20, spd = 7, type = "spark", extra = {}) {
  n = Math.round(n * QUALITY.mult);
  for (let i = 0; i < n; i++) {
    const a = rnd(Math.PI * 2), s = rnd(0.3, 1) * spd;
    emit(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: rnd(18, 40), size: rnd(2, 5), color, type, g: type === "blood" ? 0.45 : 0.08, drag: 0.94 }, extra));
  }
}
function ring(x, y, color, r0 = 10, grow = 9, life = 22, width = 6) { emit({ x, y, type: "ring", color, size: r0, grow, life, w: width, drag: 1 }); }
function glyphBurst(x, y, color, n, chars, spd = 4) {
  n = Math.round(n * QUALITY.mult);
  for (let i = 0; i < n; i++) { const a = rnd(Math.PI * 2), s = rnd(0.4, 1) * spd; emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, type: "glyph", ch: pick(chars), color, size: rnd(12, 24), life: rnd(30, 60), drag: 0.96, vr: rnd(-0.1, 0.1) }); }
}
function updateParticles() {
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
    if (p.grow) p.size += p.grow;
    if (p.target) { p.vx += (p.target.x - p.x) * p.target.k; p.vy += (p.target.y - p.y) * p.target.k; }
    if (p.life <= 0) P.splice(i, 1);
  }
}
function drawParticles(ctx) {
  ctx.save();
  for (const p of P) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalCompositeOperation = p.add ? "lighter" : "source-over";
    ctx.globalAlpha = a;
    switch (p.type) {
      case "spark": {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.6; ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke(); break;
      }
      case "orb": { const s = p.size * 4; ctx.drawImage(glowSprite(p.color), p.x - s / 2, p.y - s / 2, s, s); break; }
      case "blood": { ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * 1.5, Math.atan2(p.vy, p.vx), 0, Math.PI * 2); ctx.fill(); break; }
      case "pixel": { ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); break; }
      case "glyph": { const gs = glyphSprite(p.ch, p.color, p.size), d = gs.width; if (p.rot) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(gs, -d / 2, -d / 2); ctx.restore(); } else ctx.drawImage(gs, p.x - d / 2, p.y - d / 2); break; }
      case "ring": { ctx.strokeStyle = p.color; ctx.lineWidth = (p.w || 5) * a; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2); ctx.stroke(); break; }
      case "smoke": { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a * 0.35; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - a), 0, Math.PI * 2); ctx.fill(); break; }
      case "line": { ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke(); break; }
    }
  }
  ctx.restore();
}

// ---------------- ÉCLAIRS ----------------
function boltPath(x1, y1, x2, y2, jag = 22, depth = 5) {
  let pts = [[x1, y1], [x2, y2]];
  for (let d = 0; d < depth; d++) {
    const np = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const mx = (ax + bx) / 2, my = (ay + by) / 2, len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1), off = rnd(-1, 1) * jag * Math.pow(0.55, d) * (len / 140);
      np.push([mx + nx * off, my + ny * off], pts[i + 1]);
    }
    pts = np;
  }
  return pts;
}
function drawBolt(ctx, x1, y1, x2, y2, color = "#e879f9", width = 3, jag = 30, core = "#fff", branches = 2) {
  const pts = boltPath(x1, y1, x2, y2, jag);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const stroke = (w, c, a) => { ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
  stroke(width * 4, color, 0.25); stroke(width * 1.6, color, 0.8); stroke(Math.max(1, width * 0.5), core, 1);
  ctx.restore();
  for (let b = 0; b < branches; b++) {
    const p = pts[(rnd(0.2, 0.8) * pts.length) | 0];
    drawBolt(ctx, p[0], p[1], p[0] + rnd(-90, 90), p[1] + rnd(-30, 110), color, width * 0.5, jag * 0.6, core, 0);
  }
}
// Éclair « foudre noire » (cœur sombre, contour violet)
function drawBlackBolt(ctx, x1, y1, x2, y2, w = 5) {
  const pts = boltPath(x1, y1, x2, y2, 40);
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const path = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
  ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#c026d3"; ctx.globalAlpha = 0.6; ctx.lineWidth = w * 3.2; path(); ctx.stroke();
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.strokeStyle = "#0a0010"; ctx.lineWidth = w; path(); ctx.stroke();
  ctx.restore();
}

// ---------------- SCEAU KABBALISTIQUE ----------------
// Sceau kabbalistique : pré-rendu une fois (avec lueur) puis dessiné en image => très rapide
const SEAL_CACHE = {};
function sealSprite(color, gold, glyphs) {
  const id = color + gold + glyphs; if (SEAL_CACHE[id]) return SEAL_CACHE[id];
  const R = 200, S = R * 2 + 60, c = document.createElement("canvas"); c.width = c.height = S;
  const ctx = c.getContext("2d"); ctx.translate(S / 2, S / 2);
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = gold; ctx.lineWidth = 3.5;
  for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let i = 0; i <= 3; i++) { const a = -Math.PI / 2 + k * Math.PI + i * Math.PI * 2 / 3; const px = Math.cos(a) * R * 0.78, py = Math.sin(a) * R * 0.78; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2); ctx.stroke();
  if (glyphs) {
    ctx.fillStyle = color; ctx.shadowBlur = 6; ctx.font = `700 ${R * 0.13 | 0}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; ctx.save(); ctx.rotate(a); ctx.fillText(HEB[i % HEB.length], 0, -R * 0.91); ctx.restore(); }
  }
  return (SEAL_CACHE[id] = c);
}
function drawSeal(ctx, x, y, r, rot, color = "#22d3ee", gold = "#fbbf24", alpha = 1, squash = 1, glyphs = true) {
  if (r <= 1) return;
  const c = sealSprite(color, gold, glyphs && r > 30), k = r / 200, S = c.width * k;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, squash); ctx.rotate(rot); ctx.globalAlpha = Math.min(1, alpha); ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(c, -S / 2, -S / 2, S, S);
  ctx.restore();
}
// Glyphes lumineux pré-rendus (évite shadowBlur par particule)
const GLYPH_CACHE = {};
function glyphSprite(ch, color, size) {
  const sz = Math.max(8, Math.round(size / 4) * 4), id = ch + color + sz; if (GLYPH_CACHE[id]) return GLYPH_CACHE[id];
  const c = document.createElement("canvas"); c.width = c.height = sz * 2; const g = c.getContext("2d");
  g.font = `700 ${sz}px Orbitron, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 8;
  g.fillText(ch, sz, sz); return (GLYPH_CACHE[id] = c);
}
// Bouclier hexagonal d'ombre (Aurélia)
function drawHexShield(ctx, x, y, r, alpha, color = "#d946ef", t = 0, crack = 0) {
  ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.lineWidth = 3;
  const cells = [[0, 0], [0, -1], [0, 1], [0.86, -0.5], [0.86, 0.5]];
  for (const [cx, cy] of cells) {
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; const px = cx * r * 0.62 + Math.cos(a) * r * 0.36, py = cy * r * 0.62 + Math.sin(a) * r * 0.36; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
  }
  ctx.globalAlpha = alpha * (0.25 + 0.1 * Math.sin(t * 0.2)); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(r * 0.2, 0, r * 0.6, r, 0, 0, Math.PI * 2); ctx.fill();
  if (crack > 0) { ctx.globalAlpha = alpha; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; for (let i = 0; i < crack * 6; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * 1.3) * r * 0.8, Math.sin(i * 1.3) * r * 0.8); ctx.stroke(); } }
  ctx.restore();
}

// ---------------- MÉTÉO PAR ARÈNE ----------------
const Weather = {
  drops: [], embers: [], cols: [], shards: [], flash: 0, boltT: 0, bolt: null, stage: null,
  init(stage) {
    this.stage = stage; this.drops = []; this.embers = []; this.cols = []; this.shards = [];
    const m = QUALITY.mult;
    if (stage.weather === "rain") for (let i = 0; i < 320 * m; i++) this.drops.push({ x: rnd(-100, W + 200), y: rnd(-50, H), s: rnd(14, 24), l: rnd(14, 30), z: rnd(0.4, 1) });
    if (stage.weather === "embers") {
      for (let i = 0; i < 110 * m; i++) this.embers.push({ x: rnd(W), y: rnd(H), vy: rnd(0.4, 1.6), vx: rnd(-0.3, 0.3), s: rnd(1.5, 4), ph: rnd(6) });
      for (let i = 0; i < 34 * m; i++) this.embers.push({ glyph: pick(HEB), x: rnd(W), y: rnd(H), vy: rnd(0.3, 0.9), vx: rnd(-0.2, 0.2), s: rnd(12, 22), ph: rnd(6) });
    }
    if (stage.weather === "code") {
      for (let i = 0; i < 46 * m; i++) this.cols.push({ x: rnd(W), y: rnd(-H, H), v: rnd(3, 9), len: (rnd(6, 16)) | 0, c: pick(["#22d3ee", "#fbbf24", "#c084fc"]), chars: Array.from({ length: 16 }, () => pick(BIN + "ΣΩΔ∞λ")) });
      for (let i = 0; i < 22 * m; i++) this.shards.push({ x: rnd(W), y: rnd(H * 0.8), r: rnd(6, 18), rot: rnd(6), vr: rnd(-0.02, 0.02), vy: rnd(-0.3, 0.3), ph: rnd(6) });
    }
  },
  update() {
    const st = this.stage; if (!st) return;
    if (st.weather === "rain") {
      for (const d of this.drops) { d.y += d.s * d.z; d.x -= 3 * d.z; if (d.y > st.floor + 30 * d.z) { if (d.z > 0.75 && Math.random() < 0.25) emit({ x: d.x, y: st.floor - rnd(0, 40), vx: rnd(-1, 1), vy: rnd(-2.5, -1), g: 0.25, life: 12, size: 1.5, color: "rgba(232,121,249,0.8)", type: "orb" }); d.y = rnd(-80, -10); d.x = rnd(-50, W + 250); } }
      this.flash *= 0.88;
      if (Math.random() < 0.0035) { this.flash = 0.55; this.boltT = 10; const x = rnd(200, 1100); this.bolt = [x, -20, x + rnd(-120, 120), rnd(160, 320)]; if (typeof Audio2 !== "undefined") Audio2.play("lightning"); }
      if (this.boltT > 0) this.boltT--;
    } else if (st.weather === "embers") {
      for (const e of this.embers) { e.y -= e.vy; e.x += e.vx + Math.sin((e.ph += 0.02)) * 0.3; if (e.y < -20) { e.y = H + 10; e.x = rnd(W); } }
    } else if (st.weather === "code") {
      for (const c of this.cols) { c.y += c.v; if (c.y - c.len * 18 > H) { c.y = rnd(-200, -20); c.x = rnd(W); } if (Math.random() < 0.05) c.chars[(rnd(16)) | 0] = pick(BIN + "ΣΩΔ∞λ"); }
      for (const s of this.shards) { s.rot += s.vr; s.y += Math.sin((s.ph += 0.01)) * 0.3; }
    }
  },
  drawBack(ctx, t) {
    const st = this.stage; if (!st) return;
    ctx.save();
    if (st.weather === "rain") {
      if (this.boltT > 0 && this.bolt) drawBolt(ctx, ...this.bolt, "#e9d5ff", 3, 60, "#fff", 3);
      ctx.strokeStyle = "rgba(200,160,255,0.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); for (const d of this.drops) if (d.z < 0.7) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2.5, d.y + d.l * d.z); } ctx.stroke();
    } else if (st.weather === "embers") {
      // anneaux holographiques en rotation sur les mandalas
      (st.holos || []).forEach(([x, y, r], i) => drawSeal(ctx, x, y, r * (1 + 0.04 * Math.sin(t * 0.03 + i)), t * 0.006 * (i ? -1 : 1), i ? "#fbbf24" : "#22d3ee", "#fde68a", 0.28, 1, false));
      ctx.globalCompositeOperation = "lighter";
      for (const e of this.embers) {
        if (e.glyph) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(e.ph * 3); ctx.fillStyle = "#fbbf24"; ctx.font = `${e.s | 0}px serif`; ctx.fillText(e.glyph, e.x, e.y); }
        else { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.ph * 4); const s = e.s * 5; ctx.drawImage(glowSprite("#f59e0b"), e.x - s / 2, e.y - s / 2, s, s); }
      }
    } else if (st.weather === "code") {
      const [ex, ey] = st.eye; const pulse = 0.5 + 0.5 * Math.sin(t * 0.04);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.25 + 0.2 * pulse; const s = 300 + pulse * 40; ctx.drawImage(glowSprite("#a855f7"), ex - s / 2, ey - s / 2, s, s);
      ctx.font = "700 15px Orbitron, monospace";
      for (const c of this.cols) for (let i = 0; i < c.len; i++) { const y = c.y - i * 18; if (y < -20 || y > H) continue; ctx.globalAlpha = (1 - i / c.len) * 0.45; ctx.fillStyle = i === 0 ? "#fff" : c.c; ctx.fillText(c.chars[i % 16], c.x, y); }
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#67e8f9"; ctx.lineWidth = 1.2;
      for (const sh of this.shards) { ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot); ctx.beginPath(); ctx.moveTo(0, -sh.r); ctx.lineTo(sh.r * 0.6, 0); ctx.lineTo(0, sh.r); ctx.lineTo(-sh.r * 0.6, 0); ctx.closePath(); ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
  },
  drawFront(ctx) {
    const st = this.stage; if (!st) return;
    if (st.weather === "rain") {
      ctx.save(); ctx.strokeStyle = "rgba(232,190,255,0.42)"; ctx.lineWidth = 1.6; ctx.beginPath();
      for (const d of this.drops) if (d.z >= 0.7) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3.5, d.y + d.l * d.z); } ctx.stroke(); ctx.restore();
    }
  }
};

// Vignette pré-rendue
let VIGNETTE = null;
function vignette() {
  if (VIGNETTE) return VIGNETTE;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.7)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H); return (VIGNETTE = c);
}
