/* =====================================================================
   VIDÉOS CINÉMATIQUES : préchargement asynchrone (http:// ET file://),
   data-URI -> Blob URL, lecture muette dessinée sur le canvas
   ===================================================================== */
function b64ToBytes(dataUri) {
  const b64 = dataUri.slice(dataUri.indexOf(",") + 1), bin = atob(b64), n = bin.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  return u;
}
const VID = {};   // id -> HTMLVideoElement prêt
const Vid = {
  errors: [], host: null, active: new Set(),
  url(src) {
    if (src.startsWith("data:")) { const mime = src.slice(5, src.indexOf(";")); return URL.createObjectURL(new Blob([b64ToBytes(src)], { type: mime })); }
    return src;
  },
  load(onStep) {
    const M = window.VIDEO_MANIFEST || {}, keys = Object.keys(M);
    if (!Vid.host) { Vid.host = el("div"); Vid.host.id = "vidHost"; $("#stage").appendChild(Vid.host); }
    return Promise.all(keys.map(k => new Promise(res => {
      let done = false; const v = document.createElement("video");
      const fin = ok => { if (done) return; done = true; if (ok) VID[k] = v; else Vid.errors.push(k); onStep && onStep(); res(); };
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("muted", ""); v.loop = true; v.preload = "auto";
      v.addEventListener("loadeddata", () => fin(v.videoWidth > 0), { once: true });
      v.addEventListener("error", () => fin(false), { once: true });
      setTimeout(() => fin(v.readyState >= 2 && v.videoWidth > 0), 20000);
      Vid.host.appendChild(v);
      // http(s) : téléchargement complet en Blob (lecture/boucle/seek fiables même sans support Range du serveur)
      // file:// : chemin direct ; data: (version autonome) : décodage base64 -> Blob URL
      const src = M[k], http = /^https?:$/.test(location.protocol) && !src.startsWith("data:");
      if (http && window.fetch) fetch(src).then(r => { if (!r.ok) throw 0; return r.blob(); }).then(bl => { v.src = URL.createObjectURL(bl); v.load(); }).catch(() => { v.src = src; v.load(); });
      else { try { v.src = Vid.url(src); } catch (e) { fin(false); return; } v.load(); }
    })));
  },
  ready(id) { const v = VID[id]; return v && v.readyState >= 2 && v.videoWidth > 0 ? v : null; },
  play(id, rate = 1, restart = true) {
    const v = VID[id]; if (!v) return null;
    try { if (restart) v.currentTime = 0; v.playbackRate = clamp(rate, 0.25, 2); v.loop = true; const p = v.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
    Vid.active.add(id); return v;
  },
  pause(id) { const v = VID[id]; if (v) try { v.pause(); } catch (e) { } },
  resume(id) { const v = VID[id]; if (v) { const p = v.play(); if (p && p.catch) p.catch(() => { }); } },
  pauseAll() { Vid.active.forEach(id => Vid.pause(id)); },
  resumeAll() { Vid.active.forEach(id => Vid.resume(id)); },
  stop(id) { Vid.pause(id); Vid.active.delete(id); },
  stopAll(except) { Array.from(Vid.active).forEach(id => { if (id !== except) Vid.stop(id); }); },
  dur(id) { const v = VID[id]; return v && isFinite(v.duration) ? v.duration : 6; }
};
