/* v4 — PWA hors-ligne : enregistre le service worker (cache versionné).
   Une nouvelle version ne remplace JAMAIS la page en plein combat : un toast propose « Mettre à jour ». */
(function () {
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol) || !window.isSecureContext) return;
  let userAsked = false;
  const offer = w => {
    if (!w || $("#swUpd")) return;
    const t = el("div", "swUpd"); t.id = "swUpd";
    t.innerHTML = `<span>${L("✨ Nouvelle version disponible")}</span><button class="btn" id="swGo">${L("Mettre à jour")}</button><button class="btn" id="swNo">✕</button>`;
    $("#stage").appendChild(t);
    $("#swGo").onclick = () => { userAsked = true; w.postMessage({ type: "SKIP_WAITING" }); t.remove(); };
    $("#swNo").onclick = () => t.remove();
  };
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (userAsked) location.reload(); });
  const reg = () => navigator.serviceWorker.register("sw.js").then(r => {
    window.MK_SW = r;
    if (r.waiting && navigator.serviceWorker.controller) offer(r.waiting);
    r.addEventListener("updatefound", () => { const w = r.installing; if (w) w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); }); });
    setInterval(() => { if (Game.mode !== "fight") r.update().catch(() => { }); }, 30 * 60 * 1000);
  }).catch(() => { });
  const wait = () => { if (typeof Boot !== "undefined" && Boot.ready) setTimeout(reg, 3000); else setTimeout(wait, 500); };
  if (document.readyState === "complete") wait(); else addEventListener("load", wait);
})();
