/* =====================================================================
   v4 — CLIP REPLAY : enregistre en continu (MediaRecorder WebM, 640×360,
   30 i/s + son du jeu) avec deux enregistreurs décalés de 10 s qui se
   relaient toutes les 20 s : le clip sauvegardé contient TOUJOURS les
   10 dernières secondes au minimum (10 à 20 s). Téléchargement ou Web Share.
   ===================================================================== */
const Replay = {
  on: false, cv: null, g: null, stream: null, recs: [], fc: 0, mime: "", overT: 0, PERIOD: 20000,
  supported() { return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream); },
  pickMime() { const c = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"]; for (const m of c) if (MediaRecorder.isTypeSupported(m)) return m; return ""; },
  start() {
    Replay.stop();
    if (!Replay.supported() || Settings.replay === false) return;
    if (["training", "tutorial", "demo"].includes(Match.type)) return;
    try {
      Replay.cv = Replay.cv || Object.assign(document.createElement("canvas"), { width: 640, height: 360 });
      Replay.g = Replay.cv.getContext("2d"); Replay.g.fillStyle = "#000"; Replay.g.fillRect(0, 0, 640, 360);
      Replay.stream = Replay.cv.captureStream(30);
      const ad = Audio2.streamDest && Audio2.streamDest();
      if (ad && ad.stream) ad.stream.getAudioTracks().forEach(t => Replay.stream.addTrack(t));
      Replay.mime = Replay.pickMime(); Replay.on = true; Replay.fc = 0; Replay.overT = 0;
      Replay.recs = [Replay.mk(), null];
      Replay.t2 = setTimeout(() => { if (Replay.on) Replay.recs[1] = Replay.mk(); }, Replay.PERIOD / 2);
    } catch (e) { Replay.on = false; }
  },
  mk() {
    const r = { chunks: [], t0: performance.now(), keep: null };
    try { r.mr = new MediaRecorder(Replay.stream, Replay.mime ? { mimeType: Replay.mime, videoBitsPerSecond: 1600000 } : {}); } catch (e) { return null; }
    r.mr.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); };
    r.mr.onstop = () => { if (r.keep) r.keep(new Blob(r.chunks, { type: (Replay.mime || "video/webm").split(";")[0] })); r.chunks = []; };
    r.mr.start(1000); return r;
  },
  frame() {
    if (!Replay.on) return;
    if (Match.state === "over") { if (++Replay.overT === 90) Replay.recs.forEach(r => r && r.mr.state === "recording" && r.mr.pause()); if (Replay.overT >= 90) return; }
    else if (Replay.overT) { Replay.overT = 0; Replay.recs.forEach(r => r && r.mr.state === "paused" && r.mr.resume()); }
    if ((++Replay.fc & 1) === 0) { try { Replay.g.drawImage(CTX.canvas, 0, 0, 640, 360); } catch (e) { } }
    const now = performance.now();
    Replay.recs.forEach((r, i) => { if (r && Replay.overT === 0 && now - r.t0 >= Replay.PERIOD) { try { r.mr.stop(); } catch (e) { } Replay.recs[i] = Replay.mk(); } });
  },
  oldest() { let best = null; Replay.recs.forEach(r => { if (r && r.mr.state !== "inactive" && (!best || r.t0 < best.t0)) best = r; }); return best; },
  canSave() { const r = Replay.on && Replay.oldest(); return !!r && performance.now() - r.t0 > 1500; },
  save() {
    const r = Replay.oldest(); if (!r) { UI.toast(L("Aucun clip disponible")); return; }
    const i = Replay.recs.indexOf(r);
    r.keep = blob => Replay.offer(blob);
    try { if (r.mr.state === "paused") r.mr.resume(); r.mr.requestData(); r.mr.stop(); } catch (e) { }
    if (Replay.on && i >= 0) Replay.recs[i] = Replay.mk();
    UI.toast(L("🎬 Clip en préparation…"), 1200);
  },
  offer(blob) {
    const name = "aurelia-vs-hai-clip-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".webm";
    const url = URL.createObjectURL(blob), file = (() => { try { return new File([blob], name, { type: "video/webm" }); } catch (e) { return null; } })();
    const box = el("div", "clipBox"); box.id = "clipBox";
    box.innerHTML = `<video src="${url}" controls autoplay muted loop playsinline></video><div class="clipBtns"><a class="btn" id="clipDl" href="${url}" download="${name}">${L("⬇ Télécharger (.webm)")}</a>${file && navigator.canShare && navigator.canShare({ files: [file] }) ? `<button class="btn" id="clipShare">${L("📤 Partager")}</button>` : ""}<button class="btn" id="clipClose">${L("Fermer")}</button></div><div class="dim">${(blob.size / 1e6).toFixed(1)} Mo</div>`;
    const old = $("#clipBox"); if (old) old.remove();
    $("#stage").appendChild(box);
    $("#clipClose").onclick = () => { box.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    const sh = $("#clipShare"); if (sh) sh.onclick = () => navigator.share({ files: [file], title: "Aurélia vs Haï", text: L("Mon meilleur moment dans le Kombat !") }).catch(() => { });
    Progress.award("clip");
  },
  stop() {
    clearTimeout(Replay.t2); Replay.on = false;
    Replay.recs.forEach(r => { if (r && !r.keep) { try { r.mr.state !== "inactive" && r.mr.stop(); } catch (e) { } } });
    Replay.recs = [];
    if (Replay.stream) { Replay.stream.getVideoTracks().forEach(t => t.stop()); Replay.stream = null; }
  }
};
