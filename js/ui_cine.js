/* =====================================================================
   LECTEUR DE CINÉMATIQUES (Ken Burns, sous-titres FR, FX) + FONDS DE MENU
   ===================================================================== */
const WHO_COLOR = { "AURÉLIA": "#f0abfc", "HAÏ": "#67e8f9", "NARRATEUR": "#fde68a", "L'ŒIL QUANTIQUE": "#c084fc" };
const WHO_VOICE = { "AURÉLIA": [1.25, 1.0], "HAÏ": [0.75, 0.95], "NARRATEUR": [0.6, 0.92], "L'ŒIL QUANTIQUE": [0.1, 0.8] };
function srcDims(img) { return img ? [img.naturalWidth || img.videoWidth || img.width || 0, img.naturalHeight || img.videoHeight || img.height || 0] : [0, 0]; }
function drawCover(ctx, img, cx, cy, z, alpha = 1) {
  const [iw, ih] = srcDims(img); if (!iw || !ih) return;
  const s = Math.max(W / iw, H / ih) * z;
  const vw = W / s, vh = H / s;
  const sx = clamp(cx * iw - vw / 2, 0, iw - vw), sy = clamp(cy * ih - vh / 2, 0, ih - vh);
  ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, vw, vh, 0, 0, W, H); ctx.globalAlpha = 1;
}
// Source visuelle d'une scène : vidéo MP4 si prête, sinon artwork HD (Ken Burns)
function sceneSource(sc) { const v = sc && sc.video ? Vid.ready(sc.video) : null; return v || IMG[sc.img]; }
const Cine = {
  id: null, data: null, idx: 0, t: 0, paused: false, onDone: null, lineShown: -1, prevImg: null, fadeOut: 0, fxT: 0, sched: [], dur: 8,
  play(id, onDone) {
    const d = CINEMATICS[id]; if (!d) { onDone && onDone(); return; }
    Object.assign(Cine, { id, data: d, idx: 0, t: 0, paused: false, onDone, lineShown: -1, prevImg: null, fadeOut: 0 });
    Game.setMode("cine"); Screens.show("cine");
    $("#cine .ttl").textContent = d.title.toUpperCase();
    $("#cineCtl [data-c=pause]").textContent = "❚❚ Pause";
    Audio2.suspend(false); Audio2.playMusic(d.music || "cine"); Audio2.setIntensity(0.3);
    Cine.enterScene(); saveUnlock("cine_" + id);
  },
  scene() { return Cine.data.scenes[Cine.idx]; },
  // Planifie les répliques selon la VRAIE durée des clips vocaux (aucun chevauchement)
  schedule() {
    const sc = Cine.scene(); let t = 0;
    Cine.sched = sc.lines.map((L, i) => { const vid = `cine_${Cine.id}_${Cine.idx}_${i}`, d = Audio2.voiceDur(vid) || L.text.length / 15; const st = Math.max(L.t, t); t = st + d + 0.45; return { L, st, vid, d }; });
    Cine.dur = Math.max(sc.dur, t + 0.7);
  },
  enterScene() {
    const sc = Cine.scene(); Cine.t = 0; Cine.lineShown = -1;
    Cine.schedule();
    Audio2.stopVoice("cine");
    $("#cine .subs").innerHTML = "";
    const ch = $("#cine .chap");
    if (sc.chapter) { const p = sc.chapter.split(/\.\s|—\s/); ch.innerHTML = `<small>${p.length > 1 ? p[0].trim() : ""}</small><div>${p.length > 1 ? p.slice(1).join(" ").trim() : sc.chapter}</div>`; ch.classList.add("on"); clearTimeout(Cine.chT); Cine.chT = setTimeout(() => ch.classList.remove("on"), 2300); }
    else ch.classList.remove("on");
    P.length = 0;
    const map = { rain: "rain", embers: "embers", code: "code" };
    Weather.init({ weather: map[sc.fx] || "none", floor: H + 60, holos: [[640, 260, 170]], eye: [640, 300] });
    if (sc.fx === "clash") { Audio2.play("vsclash"); }
    if (sc.fx === "portal") Audio2.play("glitch");
    // vidéo : vitesse adaptée à la durée de la scène (ralenti cinématique doux)
    if (sc.video) { const keep = Cine.prevImg && Cine.prevImg.video; Vid.stopAll(keep); Vid.play(sc.video, clamp(Vid.dur(sc.video) / Cine.dur, 0.55, 1)); }
    else Vid.stopAll(Cine.prevImg && Cine.prevImg.video);
    $("#cine").classList.toggle("hasvid", !!(sc.video && Vid.ready(sc.video)));
  },
  go(delta) {
    const n = Cine.idx + delta;
    if (n < 0) { Cine.t = 0; Cine.lineShown = -1; Audio2.stopVoice("cine"); return; }
    if (n >= Cine.data.scenes.length) { Cine.finish(); return; }
    const sc = Cine.scene();
    Cine.prevImg = { key: sc.img, video: sc.video && Vid.ready(sc.video) ? sc.video : null, kb: Cine.kbAt(Math.min(1, Cine.t / Cine.dur)), a: 1 };
    Cine.idx = n; Cine.enterScene(); Audio2.play("whoosh", 0.5);
  },
  kbAt(p) { const k = Cine.scene().kb; const e = ease(p); return [lerp(k[0], k[3], e), lerp(k[1], k[4], e), lerp(k[2], k[5], e)]; },
  finish() {
    if (Cine.fadeOut) return; Cine.fadeOut = 0.001;
  },
  end() {
    if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { }
    Audio2.stopVoice("cine"); Vid.stopAll(); Audio2.suspend(false);
    const cb = Cine.onDone; Cine.onDone = null; Cine.id = null; $("#cine .subs").innerHTML = "";
    cb ? cb() : Screens.title();
  },
  replay() { Cine.idx = 0; Cine.fadeOut = 0; Cine.prevImg = null; if (Cine.paused) Cine.togglePause(); Cine.enterScene(); },
  togglePause() {
    Cine.paused = !Cine.paused; $("#cineCtl [data-c=pause]").textContent = Cine.paused ? "▶ Lecture" : "❚❚ Pause";
    Audio2.suspend(Cine.paused); Cine.paused ? Vid.pauseAll() : Vid.resumeAll();
    if (Cine.paused && window.speechSynthesis) speechSynthesis.cancel();
  },
  update(dt) {
    if (!Cine.data) return;
    if (Cine.fadeOut) { Cine.fadeOut += dt; if (Cine.fadeOut > 0.9) Cine.end(); return; }
    if (Cine.paused) return;
    Cine.t += dt; frameCount++;
    if (Cine.prevImg) { Cine.prevImg.a -= dt / 0.9; if (Cine.prevImg.a <= 0) { if (Cine.prevImg.video && Cine.prevImg.video !== Cine.scene().video) Vid.stop(Cine.prevImg.video); Cine.prevImg = null; } }
    const sc = Cine.scene();
    for (let i = 0; i < Cine.sched.length; i++) if (i > Cine.lineShown && Cine.t >= Cine.sched[i].st) {
      Cine.lineShown = i; const S = Cine.sched[i], L = S.L;
      const cps = Math.max(18, L.text.length / Math.max(0.6, S.d * 0.9));
      $("#cine .subs").innerHTML = `<div class="who" style="color:${WHO_COLOR[L.who] || "#fff"}"><i class="eq"><b></b><b></b><b></b><b></b></i>${L.who}</div><div class="tx" data-full="${L.text.replace(/"/g, "&quot;")}" data-t0="${Cine.t}" data-cps="${cps}"></div>`;
      if (Settings.voice) { const d = Audio2.voice(S.vid, { ch: "cine" }); if (!d) { const v = WHO_VOICE[L.who] || [0.8, 1]; Audio2.say(L.text, v[0], v[1] * 1.05); } }
      Cine.speakEnd = Cine.t + S.d;
    }
    $("#cine .subs").classList.toggle("talk", Cine.t < (Cine.speakEnd || 0));
    const tx = $("#cine .subs .tx");
    if (tx) { const full = tx.dataset.full, n = Math.min(full.length, Math.floor((Cine.t - +tx.dataset.t0) * +tx.dataset.cps)); if (tx.textContent.length !== n) tx.textContent = full.slice(0, n); }
    updateParticles(); Weather.update();
    // FX dynamiques
    if (sc.fx === "portal" && frameCount % 2 === 0) { const a = rnd(6.28), r = rnd(160, 420); emit({ x: 640 + Math.cos(a) * r, y: 300 + Math.sin(a) * r * 0.6, vx: -Math.cos(a) * 3, vy: -Math.sin(a) * 2, type: "orb", color: pick(["#d946ef", "#22d3ee", "#fff"]), size: rnd(2, 4), life: 50 }); }
    if (sc.fx === "eclipse" && frameCount % 3 === 0) emit({ x: rnd(W), y: H + 10, vy: -rnd(1, 3), vx: rnd(-0.5, 0.5), type: "orb", color: pick(["#a855f7", "#f0abfc"]), size: rnd(2, 5), life: 120 });
    if (sc.fx === "merkabah" && frameCount % 3 === 0) glyphBurst(rnd(W), rnd(H * 0.3, H), "#fbbf24", 1, HEB, 1);
    if (sc.fx === "clash" && frameCount % 50 === 0) { Weather.flash = 0.5; Cine.bolt = [rnd(300, 980), -10, 640 + rnd(-80, 80), 360, 10]; Audio2.play("lightning"); Cine.chroma = 1; }
    if (Cine.bolt && --Cine.bolt[4] <= 0) Cine.bolt = null;
    Cine.chroma = (Cine.chroma || 0) * 0.9;
    Weather.flash *= 0.9;
    if (Cine.t >= Cine.dur) Cine.go(1);
    $("#cine .prog").style.width = ((Cine.idx + Math.min(1, Cine.t / Cine.dur)) / Cine.data.scenes.length * 100) + "%";
  },
  draw(ctx) {
    if (!Cine.data) return;
    const sc = Cine.scene();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const src = sceneSource(sc), isVid = src && src.tagName === "VIDEO";
    const [cx, cy, z] = Cine.kbAt(Math.min(1, Cine.t / Cine.dur));
    // vidéo : léger zoom Ken Burns par-dessus le mouvement filmé
    if (isVid) drawCover(ctx, src, 0.5 + (cx - 0.5) * 0.3, 0.5 + (cy - 0.5) * 0.3, 1 + (z - 1) * 0.45);
    else drawCover(ctx, src, cx, cy, z);
    if (Cine.prevImg) { const pv = Cine.prevImg.video ? Vid.ready(Cine.prevImg.video) : null; drawCover(ctx, pv || IMG[Cine.prevImg.key], ...Cine.prevImg.kb, Cine.prevImg.a); }
    if (sc.fx === "portal") { ctx.save(); ctx.globalCompositeOperation = "lighter"; const s = 520 + 60 * Math.sin(frameCount * 0.05); ctx.globalAlpha = isVid ? 0.2 : 0.35; ctx.drawImage(glowSprite("#a855f7"), 640 - s / 2, 300 - s / 2, s, s); ctx.restore(); }
    if (sc.fx === "merkabah") drawSeal(ctx, 640, 250, 210, frameCount * 0.004, "#fbbf24", "#fde68a", 0.22, 1, true);
    if (sc.fx === "eclipse") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(217,70,239,0.35)"; ctx.lineWidth = 3; const r = 160 + (frameCount * 2) % 300; ctx.globalAlpha = 1 - r / 460; ctx.beginPath(); ctx.arc(640, 300, r, 0, 6.28); ctx.stroke(); ctx.restore(); }
    if (Cine.bolt) drawBolt(ctx, Cine.bolt[0], Cine.bolt[1], Cine.bolt[2], Cine.bolt[3], "#e9d5ff", 4, 60, "#fff", 3);
    Weather.drawBack(ctx, frameCount); drawParticles(ctx); Weather.drawFront(ctx);
    if (Weather.flash > 0.02) { ctx.fillStyle = `rgba(240,220,255,${Weather.flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
    // étalonnage cinéma : teinte, scanlines légères, grain + vignette
    if (isVid) { ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = sc.fx === "embers" || sc.fx === "merkabah" ? "rgba(251,160,40,0.25)" : sc.fx === "code" ? "rgba(34,211,238,0.22)" : "rgba(190,60,240,0.22)"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    ctx.drawImage(vignette(), 0, 0);
    ctx.globalAlpha = 0.05; for (let i = 0; i < 60; i++) { ctx.fillStyle = Math.random() < 0.5 ? "#fff" : "#000"; ctx.fillRect(rnd(W), rnd(H), 2, 2); } ctx.globalAlpha = 1;
    if (Cine.chroma > 0.05) chromaPass(ctx, Cine.chroma * 8);
    const fin = Math.min(1, Cine.t / 0.6); if (fin < 1 && Cine.idx === 0) { ctx.fillStyle = `rgba(0,0,0,${1 - fin})`; ctx.fillRect(0, 0, W, H); }
    if (Cine.fadeOut) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, Cine.fadeOut / 0.8)})`; ctx.fillRect(0, 0, W, H); }
  }
};

// Fond animé des menus (affiche en Ken Burns lent + particules)
const MenuBG = {
  key: "vs_poster", t: 0, parts: [],
  set(key) { this.key = key; },
  draw(ctx, dt) {
    this.t += dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const p = (Math.sin(this.t * 0.05) + 1) / 2;
    drawCover(ctx, IMG[this.key], 0.5 + 0.06 * Math.sin(this.t * 0.03), 0.45, 1.08 + 0.08 * p);
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "rgba(5,0,12,0.92)"); g.addColorStop(0.45, "rgba(5,0,12,0.55)"); g.addColorStop(1, "rgba(5,0,12,0.15)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (this.parts.length < 90) this.parts.push({ x: rnd(W), y: H + 10, vy: rnd(0.3, 1.4), s: rnd(2, 6), c: pick(["#d946ef", "#22d3ee", "#fbbf24"]), ph: rnd(6) });
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const q of this.parts) { q.y -= q.vy; q.x += Math.sin(q.ph += 0.02) * 0.4; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(q.ph * 3); const s = q.s * 5; ctx.drawImage(glowSprite(q.c), q.x - s / 2, q.y - s / 2, s, s); }
    this.parts = this.parts.filter(q => q.y > -20);
    ctx.restore();
    if (Math.random() < 0.004) this.bolt = [rnd(700, 1200), -10, rnd(600, 1200), rnd(200, 400), 8];
    if (this.bolt) { drawBolt(ctx, this.bolt[0], this.bolt[1], this.bolt[2], this.bolt[3], "#e9d5ff", 3, 50, "#fff", 2); if (--this.bolt[4] <= 0) this.bolt = null; }
    ctx.drawImage(vignette(), 0, 0);
  }
};

// Fond animé de l'écran VS : VRAIE VIDÉO vid_vs_clash + néons, éclairs, scanlines
const VsBG = {
  t: 0, bolt: null,
  draw(ctx, dt) {
    this.t += dt; frameCount++;
    const v = Vid.ready("vid_vs_clash");
    if (!v) { MenuBG.draw(ctx, dt); return; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    drawCover(ctx, v, 0.5, 0.45, 1.04 + 0.03 * Math.sin(this.t * 0.6));
    ctx.save(); ctx.globalCompositeOperation = "soft-light";
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "rgba(217,70,239,0.55)"); g.addColorStop(0.5, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(34,211,238,0.55)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    const d = ctx.createLinearGradient(0, H * 0.45, 0, H); d.addColorStop(0, "rgba(0,0,0,0)"); d.addColorStop(1, "rgba(0,0,0,0.75)"); ctx.fillStyle = d; ctx.fillRect(0, 0, W, H);
    // néons de la ligne de fracture centrale
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const pulse = 0.5 + 0.5 * Math.sin(this.t * 5);
    ctx.globalAlpha = 0.35 + 0.3 * pulse; ctx.drawImage(glowSprite("#fbbf24"), W / 2 - 160, H / 2 - 260, 320, 520); ctx.restore();
    if (Math.random() < 0.03) { this.bolt = [W / 2 + rnd(-60, 60), -10, W / 2 + rnd(-140, 140), rnd(300, 560), 7]; Audio2.play("lightning"); }
    if (this.bolt) { drawBolt(ctx, this.bolt[0], this.bolt[1], this.bolt[2], this.bolt[3], "#fde68a", 3, 50, "#fff", 2); if (--this.bolt[4] <= 0) this.bolt = null; }
    if (frameCount % 2 === 0) emit({ x: rnd(W), y: H + 10, vy: -rnd(1.5, 4), vx: rnd(-0.6, 0.6), type: "orb", color: pick(["#d946ef", "#22d3ee", "#fbbf24"]), size: rnd(2, 4), life: 90 });
    updateParticles(); drawParticles(ctx);
    ctx.globalAlpha = 0.1; ctx.fillStyle = "#000"; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); ctx.globalAlpha = 1;
    ctx.drawImage(vignette(), 0, 0);
    if (this.t < 0.6) chromaPass(ctx, (0.6 - this.t) * 18);
  }
};
