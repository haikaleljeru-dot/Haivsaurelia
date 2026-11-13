/* =====================================================================
   MOTEUR AUDIO HYBRIDE (Web Audio API) — musique adaptative par stage,
   SFX synthétisés, VRAIES VOIX MP3 décodées (bus voix dédié, latence zéro)
   + speechSynthesis en ultime secours
   ===================================================================== */
const Audio2 = (() => {
  let ctx = null, master, musicBus, sfxBus, voiceBus, analyser, anaData, reverb, reverbSend, comp;
  const settings = { music: true, sfx: true, voice: true, musicVol: 0.55, sfxVol: 0.8, voiceVol: 1 };
  const VBUF = {}, VHTML = {}; let voicesLoaded = 0, voicesFailed = [];
  let vduck = 1; const chans = {};
  let seq = null; // séquenceur courant
  let intensity = 0; // 0..1 adaptatif
  let duck = 1;

  function init() {
    if (ctx) { if (ctx.state === "suspended" || ctx.state === "interrupted") { try { const r = ctx.resume(); if (r && r.catch) r.catch(() => { }); } catch (e) { } } return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = 0.9;
    musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(2.6, 2.2);
    reverbSend = ctx.createGain(); reverbSend.gain.value = 0.32;
    voiceBus = ctx.createGain(); analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.55; anaData = new Uint8Array(analyser.fftSize);
    voiceBus.connect(analyser); analyser.connect(master);
    musicBus.connect(master); sfxBus.connect(master);
    reverbSend.connect(reverb); reverb.connect(master);
    master.connect(comp); comp.connect(ctx.destination);
    applyVolumes();
    return true;
  }
  // ---------- DÉBLOCAGE AUDIO WEB (politique autoplay Chrome / Safari / Firefox) ----------
  // L'AudioContext n'est JAMAIS créé avant un geste utilisateur (aucun avertissement console) ;
  // au 1er clic / appui / touche : création + resume() + tampon silencieux (iOS), puis retrait des écouteurs.
  const UNLOCK_EVTS = ["pointerdown", "touchend", "mousedown", "keydown", "click"];
  let unlocked = false, hiddenSuspended = false;
  function unlock(e) {
    if (unlocked) return;
    if (e && e.type === "keydown" && /^(Shift|Control|Alt|Meta|CapsLock|Tab|F\d+)/.test(e.key || "")) return;
    if (!init()) return;
    const done = () => {
      if (!ctx || ctx.state !== "running" || unlocked) return;
      unlocked = true;
      try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (x) { }
      UNLOCK_EVTS.forEach(t => removeEventListener(t, unlock, true));
      document.documentElement.classList.add("audio-on");
    };
    if (ctx.state !== "running") { try { const r = ctx.resume(); if (r && r.then) r.then(done, () => { }); } catch (x) { } } else done();
  }
  UNLOCK_EVTS.forEach(t => addEventListener(t, unlock, { capture: true, passive: true }));
  // onglet masqué (mobile, changement d'appli) : on coupe le son et on le relance au retour
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    try {
      if (document.hidden) { if (ctx.state === "running") { hiddenSuspended = true; ctx.suspend().catch(() => { }); } }
      else if (hiddenSuspended) { hiddenSuspended = false; ctx.resume().catch(() => { }); }
    } catch (x) { }
  });
  function makeImpulse(sec, decay) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) { const len = ctx.sampleRate * 1.5; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function applyVolumes() {
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(settings.music ? settings.musicVol * 0.55 * duck * vduck : 0, ctx.currentTime, 0.12);
    sfxBus.gain.setTargetAtTime(settings.sfx ? settings.sfxVol : 0, ctx.currentTime, 0.03);
    voiceBus.gain.setTargetAtTime(settings.voice ? settings.voiceVol * 1.15 : 0, ctx.currentTime, 0.03);
    for (const k in chans) if (chans[k].el) chans[k].el.volume = clamp(settings.voice ? settings.voiceVol : 0, 0, 1);
  }
  function set(k, v) { if (settings[k] === v) return; settings[k] = v; applyVolumes(); if (k === "voice" && !v) { if (window.speechSynthesis) speechSynthesis.cancel(); stopVoice(); } }
  function setDuck(v) { duck = v; applyVolumes(); }

  // ---------- primitives ----------
  function env(g, t, a, peak, d, sustain = 0.0001) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  function tone(type, f0, f1, t, dur, vol, dest, opts = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    let node = o;
    if (opts.filter) { const f = ctx.createBiquadFilter(); f.type = opts.filter; f.frequency.value = opts.ff || 1200; f.Q.value = opts.q || 1; o.connect(f); node = f; }
    node.connect(g); g.connect(dest || sfxBus);
    if (opts.rev) { const s = ctx.createGain(); s.gain.value = opts.rev; g.connect(s); s.connect(reverbSend); }
    env(g, t, opts.a || 0.004, vol, dur);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function nz(t, dur, vol, ftype, f0, f1, q, dest, rev) {
    const s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = ftype; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(reverbSend); }
    env(g, t, 0.003, vol, dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // ---------- SFX ----------
  const SFX = {
    whoosh(p = 1) { const t = ctx.currentTime; nz(t, 0.18, 0.35, "bandpass", 600 * p, 3200 * p, 2.5); },
    light() { const t = ctx.currentTime; tone("sine", 180, 60, t, 0.12, 0.7); nz(t, 0.06, 0.5, "highpass", 2500, 1200, 0.7); },
    heavy() { const t = ctx.currentTime; tone("sine", 140, 38, t, 0.25, 0.95); tone("square", 90, 40, t, 0.12, 0.22, null, { filter: "lowpass", ff: 600 }); nz(t, 0.14, 0.7, "lowpass", 3000, 300, 0.8, null, 0.2); },
    slash() { const t = ctx.currentTime; nz(t, 0.16, 0.55, "bandpass", 5000, 1500, 4); tone("sawtooth", 1800, 900, t, 0.22, 0.08, null, { rev: 0.3 }); tone("sine", 2600, 2500, t + 0.02, 0.4, 0.05, null, { rev: 0.4 }); },
    block() { const t = ctx.currentTime; [523, 1245, 1870, 2690].forEach((f, i) => tone("triangle", f, f * 0.98, t, 0.35 - i * 0.05, 0.12, null, { rev: 0.35 })); nz(t, 0.05, 0.4, "highpass", 4000, 3000, 1); },
    projectile(hai) { const t = ctx.currentTime; if (hai) { tone("square", 220, 880, t, 0.28, 0.15, null, { filter: "bandpass", ff: 1400, q: 3, rev: 0.4 }); for (let i = 0; i < 6; i++) tone("square", 800 + Math.random() * 1600, 0, t + i * 0.04, 0.03, 0.06); } else { tone("sawtooth", 120, 520, t, 0.35, 0.22, null, { filter: "lowpass", ff: 1800, rev: 0.5 }); nz(t, 0.3, 0.25, "bandpass", 400, 2400, 3); } },
    explode() { const t = ctx.currentTime; tone("sine", 90, 28, t, 0.6, 1); nz(t, 0.7, 0.8, "lowpass", 2400, 80, 0.7, null, 0.5); },
    lightning() { const t = ctx.currentTime; for (let i = 0; i < 7; i++) nz(t + i * 0.035 * Math.random() * 2, 0.06, 0.5, "highpass", 1500 + Math.random() * 3000, 0, 1); nz(t, 0.9, 0.4, "lowpass", 900, 60, 0.5, null, 0.6); },
    teleport() { const t = ctx.currentTime; tone("sine", 1800, 120, t, 0.22, 0.25, null, { rev: 0.4 }); tone("square", 90, 1400, t + 0.12, 0.16, 0.08, null, { filter: "bandpass", ff: 1500 }); },
    grab() { const t = ctx.currentTime; nz(t, 0.08, 0.6, "bandpass", 900, 600, 1.5); tone("sine", 110, 55, t + 0.05, 0.2, 0.6); },
    jump() { const t = ctx.currentTime; nz(t, 0.1, 0.18, "bandpass", 500, 1500, 1.5); },
    land() { const t = ctx.currentTime; tone("sine", 90, 40, t, 0.1, 0.35); },
    dash() { const t = ctx.currentTime; nz(t, 0.22, 0.4, "bandpass", 300, 2500, 1.4); },
    counter() { const t = ctx.currentTime; tone("square", 880, 880, t, 0.08, 0.15); tone("square", 1320, 1320, t + 0.07, 0.12, 0.15); },
    breaker() { const t = ctx.currentTime; tone("sawtooth", 60, 400, t, 0.4, 0.4, null, { rev: 0.6 }); nz(t, 0.5, 0.6, "bandpass", 300, 4000, 1, null, 0.5); },
    guardbreak() { const t = ctx.currentTime; [400, 610, 977].forEach(f => tone("triangle", f, f * 0.5, t, 0.6, 0.2, null, { rev: 0.5 })); nz(t, 0.3, 0.6, "highpass", 2000, 600, 0.5); },
    xray() { const t = ctx.currentTime; tone("sine", 50, 30, t, 1.2, 1); tone("sawtooth", 55, 55, t, 1.0, 0.25, null, { filter: "lowpass", ff: 400, rev: 0.6 }); nz(t, 1.1, 0.6, "lowpass", 5000, 100, 0.5, null, 0.7); },
    bone() { const t = ctx.currentTime; for (let i = 0; i < 4; i++) nz(t + i * 0.025, 0.04, 0.7, "bandpass", 1800 + i * 300, 0, 6); tone("sine", 160, 50, t, 0.25, 0.9); },
    heartbeat() { const t = ctx.currentTime; tone("sine", 60, 40, t, 0.15, 0.8); tone("sine", 55, 38, t + 0.22, 0.18, 0.6); },
    glitch() { const t = ctx.currentTime; for (let i = 0; i < 10; i++) tone("square", 100 + Math.random() * 3000, 0, t + i * 0.03, 0.025, 0.08); },
    choir(root = 220) { const t = ctx.currentTime; [1, 1.5, 2, 2.52].forEach(m => formantVoice(root * m, t, 2.2, 0.06, sfxBus)); },
    fatality() { const t = ctx.currentTime; [55, 82.4, 110, 164.8].forEach((f, i) => tone("sawtooth", f, f * 0.97, t, 2.6, 0.18, null, { filter: "lowpass", ff: 900, rev: 0.8, a: 0.05 })); tone("sine", 40, 25, t, 1.6, 1); nz(t, 1.6, 0.5, "lowpass", 1200, 60, 0.5, null, 0.8); },
    parry() { const t = ctx.currentTime; [1568, 2349, 3136, 4186].forEach((f, i) => tone("triangle", f, f * 1.01, t + i * 0.012, 0.55 - i * 0.08, 0.13, null, { rev: 0.7 })); tone("sine", 220, 880, t, 0.12, 0.25); nz(t, 0.09, 0.5, "highpass", 6000, 3000, 0.8, null, 0.4); },
    taunt() { const t = ctx.currentTime; tone("sawtooth", 330, 660, t, 0.18, 0.08, null, { filter: "bandpass", ff: 1500, rev: 0.4 }); },
    ui() { const t = ctx.currentTime; tone("triangle", 1200, 1500, t, 0.05, 0.08); },
    select() { const t = ctx.currentTime; tone("sawtooth", 220, 880, t, 0.18, 0.12, null, { filter: "lowpass", ff: 2500, rev: 0.4 }); tone("sine", 110, 55, t, 0.3, 0.4); },
    gong() { const t = ctx.currentTime; [110, 233, 371, 523, 741].forEach((f, i) => tone("sine", f, f * 0.995, t, 3.5 - i * 0.4, 0.22 / (i + 1), null, { rev: 0.9 })); nz(t, 0.2, 0.3, "lowpass", 800, 200, 1, null, 0.6); },
    vsclash() { const t = ctx.currentTime; SFX.explode(); tone("sawtooth", 40, 900, t, 0.5, 0.25, null, { filter: "bandpass", ff: 1200, rev: 0.7 }); SFX.lightning(); },
    shatter() { const t = ctx.currentTime; for (let i = 0; i < 18; i++) tone("triangle", 2000 + Math.random() * 5000, 0, t + Math.random() * 0.4, 0.08, 0.05, null, { rev: 0.5 }); nz(t, 0.5, 0.5, "highpass", 3000, 8000, 0.7); },
    beam() { const t = ctx.currentTime; tone("sawtooth", 80, 80, t, 2.0, 0.2, null, { filter: "lowpass", ff: 1200, rev: 0.6, a: 0.3 }); tone("sine", 880, 1760, t, 2.0, 0.08, null, { rev: 0.7, a: 0.4 }); nz(t, 2.0, 0.3, "bandpass", 600, 3000, 2, null, 0.4); }
  };
  function formantVoice(f, t, dur, vol, dest) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.value = f * 0.012; lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain(); g.gain.value = 0;
    [[730, 8], [1090, 10], [2440, 12]].forEach(([ff, q], i) => { const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = ff; bp.Q.value = q; const bg = ctx.createGain(); bg.gain.value = [1, 0.6, 0.25][i]; o.connect(bp); bp.connect(bg); bg.connect(g); });
    g.connect(dest); const rs = ctx.createGain(); rs.gain.value = 0.7; g.connect(rs); rs.connect(reverbSend);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 4, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }
  function play(name, ...a) { if (!ctx || !settings.sfx) return; try { SFX[name] && SFX[name](...a); } catch (e) { } }

  // ---------- MUSIQUE : séquenceur à lookahead ----------
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz
  const THEMES = {
    menu: { bpm: 76, steps: 16, bars: 4, root: 45,
      chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]],
      voice(step, bar, t, sd, I) {
        if (step === 0) { this.chords[bar % 4].forEach(iv => pad(N(this.root + 12 + iv), t, sd * 16, 0.05, "sawtooth", 700)); formantVoice(N(this.root + 24 + this.chords[bar % 4][1]), t, sd * 15, 0.035, musicBus); }
        if (step === 0 || step === 10) drum("taiko", t, 0.8);
        if (step === 8 && bar % 2 === 1) drum("taiko", t, 0.5);
        if (I > 0.3 && step % 4 === 2) drum("tick", t, 0.15);
        if (step % 8 === 4) bass(N(this.root + this.chords[bar % 4][0]), t, sd * 3, 0.25);
      } },
    cine: { bpm: 60, steps: 16, bars: 4, root: 41,
      chords: [[0, 3, 7], [1, 5, 8], [-2, 3, 7], [0, 3, 8]],
      voice(step, bar, t, sd) {
        if (step === 0) { this.chords[bar % 4].forEach(iv => pad(N(this.root + 12 + iv), t, sd * 16, 0.045, "sawtooth", 500)); bass(N(this.root - 12), t, sd * 14, 0.2); }
        if (step === 0 && bar % 2 === 0) drum("boom", t, 0.7);
        if (step % 4 === 0) pluck(N(this.root + 36 + [0, 7, 3, 10, 12, 7, 3, 5][(step / 4 + bar * 4) % 8]), t, 0.04);
      } },
    paris: { bpm: 108, steps: 16, bars: 4, root: 45, // La mineur synthwave sombre
      chords: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]],
      arp: [0, 7, 12, 15, 12, 7, 3, 7],
      voice(step, bar, t, sd, I) {
        const ch = this.chords[bar % 4];
        if (step % 4 === 0) drum("kick", t, 0.9);
        if (step === 4 || step === 12) drum("snare", t, 0.55);
        if (step % 2 === 1 || I > 0.5) drum("hat", t, step % 2 ? 0.16 : 0.08);
        bass(N(this.root - 12 + ch[0] + (step % 4 === 3 ? 12 : 0)), t, sd * 0.9, 0.32, "sawtooth");
        if (step === 0) ch.forEach(iv => pad(N(this.root + 12 + iv), t, sd * 16, 0.04, "sawtooth", 1100));
        if (step % 2 === 0) lead(N(this.root + 24 + ch[0] + this.arp[(step / 2) % 8]), t, sd * 1.5, I > 0.4 ? 0.05 : 0.03);
        if (I > 0.7 && step % 4 === 2) drum("clap", t, 0.25);
      } },
    jerusalem: { bpm: 96, steps: 16, bars: 4, root: 50, // Ré phrygien dominant
      scale: [0, 1, 4, 5, 7, 8, 10, 12],
      mel: [0, 1, 4, 5, 4, 1, 0, -1, 7, 8, 7, 5, 4, 5, 4, 1],
      voice(step, bar, t, sd, I) {
        // darbouka : doum-tek-tek
        const pat = ["D", "", "t", "t", "", "t", "D", "", "D", "", "t", "", "t", "t", "k", "t"];
        const p = pat[step];
        if (p === "D") drum("doum", t, 0.8); else if (p === "t") drum("tek", t, 0.35); else if (p === "k") drum("tek", t, 0.2);
        if (step === 0) { drone(N(this.root - 12), t, sd * 16, 0.12); formantVoice(N(this.root + 12 + (bar % 2 ? 5 : 0)), t, sd * 16, 0.05, musicBus); formantVoice(N(this.root + 19), t, sd * 16, 0.03, musicBus); }
        if (step % 2 === 0) { const idx = this.mel[(step / 2 + bar * 8) % 16]; const sc = this.scale; const n = idx < 0 ? -2 : sc[idx % sc.length] + (idx >= sc.length ? 12 : 0); pluck(N(this.root + 12 + n), t, I > 0.4 ? 0.09 : 0.06); }
        if (I > 0.5 && step % 8 === 4) drum("taiko", t, 0.5);
        if (step === 0 && bar % 4 === 0) drum("frame", t, 0.4);
      } },
    singularity: { bpm: 128, steps: 16, bars: 4, root: 40, // électro quantique
      chords: [[0, 3, 7, 10], [-2, 2, 5, 9], [-4, 0, 3, 7], [-5, -1, 2, 5]],
      voice(step, bar, t, sd, I) {
        const ch = this.chords[bar % 4];
        if (step % 4 === 0) drum("kick", t, 1);
        if (step % 4 === 2) drum("hat", t, 0.22);
        if (step === 4 || step === 12) drum("clap", t, 0.35);
        if (step % 2 === 1) bass(N(this.root + ch[0]), t, sd * 0.8, 0.3, "square");
        if (step % 4 === 0) pump(ch.map(iv => N(this.root + 24 + iv)), t, sd * 3.6, 0.035);
        if (Math.random() < 0.55) blip(N(this.root + 36 + ch[Math.floor(Math.random() * 4)] + (Math.random() < 0.3 ? 12 : 0)), t, 0.035);
        if (I > 0.6 && step % 8 === 7) noiseRiser(t, sd * 2);
      } },
    finish: { bpm: 70, steps: 16, bars: 1, root: 33,
      voice(step, bar, t, sd) { if (step === 0 || step === 3) drum("heart", t, 0.9); if (step === 0) drone(N(this.root), t, sd * 16, 0.15); } }
  };
  // instruments musique
  function pad(f, t, dur, vol, type = "sawtooth", ff = 900) {
    [-8, 8].forEach(dt => { const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = type; o.frequency.value = f; o.detune.value = dt; fl.type = "lowpass"; fl.frequency.value = ff; o.connect(fl); fl.connect(g); g.connect(musicBus); const r = ctx.createGain(); r.gain.value = 0.5; g.connect(r); r.connect(reverbSend); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.linearRampToValueAtTime(0, t + dur); o.start(t); o.stop(t + dur + 0.05); });
  }
  function pump(fs, t, dur, vol) { fs.forEach(f => { const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.setValueAtTime(400, t); fl.frequency.linearRampToValueAtTime(2400, t + dur * 0.5); o.connect(fl); fl.connect(g); g.connect(musicBus); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.02); }); }
  function bass(f, t, dur, vol, type = "sawtooth") { const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = type; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(160, t + dur); o.connect(fl); fl.connect(g); g.connect(musicBus); env(g, t, 0.005, vol, dur); o.start(t); o.stop(t + dur + 0.05); }
  function lead(f, t, dur, vol) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.value = f; const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 2200; o.connect(fl); fl.connect(g); g.connect(musicBus); const r = ctx.createGain(); r.gain.value = 0.6; g.connect(r); r.connect(reverbSend); env(g, t, 0.005, vol, dur); o.start(t); o.stop(t + dur + 0.05); }
  function pluck(f, t, vol) { const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.setValueAtTime(4000, t); fl.frequency.exponentialRampToValueAtTime(300, t + 0.3); o.connect(fl); fl.connect(g); g.connect(musicBus); const r = ctx.createGain(); r.gain.value = 0.6; g.connect(r); r.connect(reverbSend); env(g, t, 0.003, vol, 0.45); o.start(t); o.stop(t + 0.5); }
  function blip(f, t, vol) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.value = f; o.connect(g); g.connect(musicBus); const r = ctx.createGain(); r.gain.value = 0.5; g.connect(r); r.connect(reverbSend); env(g, t, 0.002, vol, 0.09); o.start(t); o.stop(t + 0.12); }
  function drone(f, t, dur, vol) { [1, 1.5, 2.005].forEach((m, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i ? "triangle" : "sawtooth"; o.frequency.value = f * m; const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 500; o.connect(fl); fl.connect(g); g.connect(musicBus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol / (i + 1), t + dur * 0.2); g.gain.linearRampToValueAtTime(0, t + dur); o.start(t); o.stop(t + dur + 0.05); }); }
  function noiseRiser(t, dur) { nz(t, dur, 0.12, "bandpass", 300, 6000, 2, musicBus); }
  function drum(kind, t, v) {
    const B = musicBus;
    switch (kind) {
      case "kick": tone("sine", 150, 42, t, 0.28, v, B); break;
      case "snare": nz(t, 0.18, v * 0.7, "bandpass", 1800, 900, 0.8, B, 0.3); tone("triangle", 220, 160, t, 0.1, v * 0.4, B); break;
      case "clap": for (let i = 0; i < 3; i++) nz(t + i * 0.012, 0.09, v, "bandpass", 1400, 1200, 1.5, B, 0.4); break;
      case "hat": nz(t, 0.05, v, "highpass", 8000, 7000, 0.7, B); break;
      case "tick": nz(t, 0.03, v, "highpass", 6000, 6000, 1, B); break;
      case "taiko": tone("sine", 90, 50, t, 0.6, v, B, { rev: 0.6 }); nz(t, 0.12, v * 0.4, "lowpass", 800, 200, 1, B, 0.4); break;
      case "boom": tone("sine", 55, 30, t, 1.6, v, B, { rev: 0.8 }); break;
      case "doum": tone("sine", 110, 70, t, 0.35, v, B, { rev: 0.3 }); break;
      case "tek": nz(t, 0.06, v, "bandpass", 3200, 2600, 3, B, 0.2); tone("triangle", 600, 500, t, 0.05, v * 0.3, B); break;
      case "frame": nz(t, 0.5, v, "bandpass", 300, 150, 1, B, 0.6); break;
      case "heart": tone("sine", 60, 38, t, 0.18, v, B); tone("sine", 52, 34, t + 0.2, 0.2, v * 0.7, B); break;
    }
  }
  function playMusic(name) {
    if (!ctx) return;
    if (seq && seq.name === name) return;
    stopMusic();
    const th = THEMES[name]; if (!th) return;
    const s = { name, th, step: 0, bar: 0, next: ctx.currentTime + 0.08, timer: null };
    const sd = 60 / th.bpm / 4;
    s.timer = setInterval(() => {
      if (!ctx) return;
      while (s.next < ctx.currentTime + 0.18) {
        try { th.voice(s.step, s.bar, s.next, sd, intensity); } catch (e) { }
        s.step++; if (s.step >= th.steps) { s.step = 0; s.bar++; }
        s.next += sd;
      }
    }, 30);
    seq = s;
  }
  function stopMusic() { if (seq) { clearInterval(seq.timer); seq = null; } }
  function setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); }

  // ---------- Annonceur ----------
  let frVoice = null;
  function pickVoice() { if (!window.speechSynthesis) return; const vs = speechSynthesis.getVoices(); frVoice = vs.find(v => /fr/i.test(v.lang) && /male|homme|thomas|paul/i.test(v.name)) || vs.find(v => /fr/i.test(v.lang)) || null; }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text, pitch = 0.5, rate = 0.92, lang = "fr-FR") {
    if (!settings.voice || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang; if (frVoice && lang === "fr-FR") u.voice = frVoice; u.pitch = pitch; u.rate = rate; u.volume = 0.95; speechSynthesis.speak(u); } catch (e) { }
  }
  // ---------- VOIX MP3 (préchargées, décodées hors-ligne, jouées sur voiceBus) ----------
  function loadVoices(onStep) {
    const M = window.VOICE_MANIFEST || {}, keys = Object.keys(M);
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const dec = OAC ? new OAC(1, 1, 24000) : null;
    const isFile = location.protocol === "file:";
    return Promise.all(keys.map(async k => {
      const src = M[k];
      try {
        if (!dec) throw 0;
        let ab;
        if (src.startsWith("data:")) ab = b64ToBytes(src).buffer;
        else { if (isFile) throw 0; const r = await fetch(src); if (!r.ok) throw 0; ab = await r.arrayBuffer(); }
        VBUF[k] = await dec.decodeAudioData(ab); voicesLoaded++;
      } catch (e) {
        try { const a = new Audio(); a.preload = "auto"; a.src = src; VHTML[k] = a; voicesLoaded++; } catch (e2) { voicesFailed.push(k); }
      }
      onStep && onStep();
    }));
  }
  function hasVoice(id) { return !!(VBUF[id] || VHTML[id]); }
  function voiceDur(id) { if (VBUF[id]) return VBUF[id].duration; const m = typeof VOICE_LINES !== "undefined" && VOICE_LINES[id]; return m ? m.dur : 0; }
  function stopVoice(ch) {
    const list = ch ? [ch] : Object.keys(chans);
    for (const c of list) { const v = chans[c]; if (!v) continue; try { if (v.src) v.src.stop(); if (v.el) { v.el.pause(); } } catch (e) { } delete chans[c]; }
  }
  function busy(ch) { const v = chans[ch]; return !!(v && v.end > performance.now()); }
  // o = { ch, pan, vol, ifFree, delay }
  function voice(id, o = {}) {
    if (!settings.voice) return 0;
    const ch = o.ch || "main"; if (o.ifFree && busy(ch)) return 0;
    const meta = typeof VOICE_LINES !== "undefined" ? VOICE_LINES[id] : null;
    stopVoice(ch);
    let dur = 0;
    if (ctx && VBUF[id]) {
      const s = ctx.createBufferSource(); s.buffer = VBUF[id];
      const g = ctx.createGain(); g.gain.value = o.vol || 1; s.connect(g);
      if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); p.connect(voiceBus); } else g.connect(voiceBus);
      const t0 = ctx.currentTime + (o.delay || 0); s.start(t0); dur = VBUF[id].duration;
      chans[ch] = { src: s, id, end: performance.now() + (dur + (o.delay || 0)) * 1000 };
      s.onended = () => { if (chans[ch] && chans[ch].src === s) delete chans[ch]; };
    } else if (VHTML[id]) {
      const a = VHTML[id]; try { a.pause(); a.currentTime = 0; } catch (e) { }
      a.volume = clamp(settings.voiceVol, 0, 1); const p = a.play(); if (p && p.catch) p.catch(() => { });
      dur = meta ? meta.dur : 1.5; chans[ch] = { el: a, id, end: performance.now() + dur * 1000 };
    } else if (meta) { say(meta.text, 0.8, 1); dur = meta.dur || meta.text.length / 14; chans[ch] = { id, end: performance.now() + dur * 1000 }; }
    else return 0;
    if (Audio2.onVoice) try { Audio2.onVoice(id, meta, dur, ch); } catch (e) { }
    return dur;
  }
  function level(ch) { // niveau vocal 0..1 (pour HUD / onde)
    if (ch && !busy(ch)) return 0;
    if (!analyser) return busy(ch || "main") ? 0.5 + 0.4 * Math.random() : 0;
    analyser.getByteTimeDomainData(anaData); let s = 0; for (let i = 0; i < anaData.length; i += 4) { const v = (anaData[i] - 128) / 128; s += v * v; }
    return Math.min(1, Math.sqrt(s / (anaData.length / 4)) * 4);
  }
  function wave(n) { const out = new Array(n).fill(0); if (!analyser) return out; analyser.getByteTimeDomainData(anaData); const step = (anaData.length / n) | 0; for (let i = 0; i < n; i++) { let m = 0; for (let j = 0; j < step; j++) m = Math.max(m, Math.abs(anaData[i * step + j] - 128)); out[i] = m / 128; } return out; }
  function tick() { // ducking de la musique sous les voix
    const any = Object.keys(chans).some(busy), target = any ? 0.42 : 1;
    if (Math.abs(target - vduck) > 0.01) { vduck = target; applyVolumes(); }
  }
  function suspend(on) { if (!ctx) return; try { on ? ctx.suspend() : ctx.resume(); } catch (e) { } for (const k in chans) if (chans[k].el) try { on ? chans[k].el.pause() : chans[k].el.play().catch(() => { }); } catch (e) { } }
  // Annonce = stinger synthétique + vraie voix (clip MP3), secours speechSynthesis
  function announce(kind, text, vid) {
    if (ctx && settings.sfx) {
      const t = ctx.currentTime;
      if (kind === "round") { tone("sawtooth", 110, 110, t, 0.9, 0.18, sfxBus, { filter: "lowpass", ff: 1200, rev: 0.7 }); tone("sawtooth", 165, 165, t, 0.9, 0.12, sfxBus, { filter: "lowpass", ff: 1200, rev: 0.7 }); }
      if (kind === "fight") { SFX.explode(); tone("sawtooth", 220, 55, t, 0.6, 0.25, sfxBus, { rev: 0.7 }); }
      if (kind === "finish") { SFX.gong(); }
      if (kind === "fatality") { SFX.fatality(); }
      if (kind === "win") { SFX.gong(); }
    }
    if (vid && hasVoice(vid)) voice(vid, { ch: "ann", delay: kind === "fight" ? 0.02 : 0 });
    else if (text && !voicesLoaded) say(text, kind === "fatality" ? 0.3 : 0.45, kind === "fatality" ? 0.75 : 0.9);
  }

  return { init, unlock, play, playMusic, stopMusic, setIntensity, set, settings, say, announce, setDuck, loadVoices, voice, stopVoice, hasVoice, voiceDur, busy, level, wave, tick, suspend,
    get ctx() { return ctx; }, get unlocked() { return unlocked; }, get state() { return ctx ? ctx.state : "none"; }, get voiceCount() { return Object.keys(VBUF).length + Object.keys(VHTML).length; }, get decodedCount() { return Object.keys(VBUF).length; }, get voiceErrors() { return voicesFailed; }, onVoice: null };
})();
