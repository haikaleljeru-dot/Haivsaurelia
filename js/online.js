/* =====================================================================
   v4 — DUEL EN LIGNE : WebRTC P2P (DataChannel)
   • Signalisation : PeerJS cloud public (code « mkav-XXXXXX » + lien ?join=CODE)
     ou repli manuel par copier-coller de l'offre / réponse SDP (aucun serveur).
   • Netcode : lockstep déterministe avec délai d'entrée adaptatif (2–8 frames),
     redondance des 8 dernières entrées, contrôle d'intégrité (checksum) toutes
     les 30 frames et resynchronisation sur instantané de l'hôte + re-simulation.
   ===================================================================== */
const NET_KEYS = ["l", "r", "u", "d", "lp", "hp", "sp", "tp", "gp", "ex", "xr", "f1", "f2", "f3", "f4", "f5", "dash", "brk", "tn"];
const Online = {
  peer: null, conn: null, pc: null, dc: null, role: null, code: "", connected: false, inMatch: false, localSide: 0, pendingJoin: null,
  delay: 3, local: {}, remote: {}, lastLocal: 0, acc: 0, stall: 0, rtt: 0, desyncs: 0, resyncs: 0, myCk: {}, remCk: {}, snaps: {}, cfg: null,
  lobby: { me: { ch: "aurelia", cs: "base", ready: false }, them: null, stage: 0 }, status: "", peerLoaded: false,
  // ---------- interface ----------
  checkJoinLink() { try { const q = new URLSearchParams(location.search); const j = q.get("join"); if (j && /^[A-Z0-9]{4,8}$/i.test(j)) Online.pendingJoin = j.toUpperCase(); } catch (e) { } },
  open(join) {
    Game.setMode("menu"); MenuBG.set("stage_telaviv"); Screens.show("title"); Screens.overlay("online");
    $("#onClose").onclick = () => { if (!Online.inMatch) Online.disconnect(true); Screens.title(); };
    if (Online.connected) Online.renderLobby(); else Online.renderHome(join);
  },
  body(html) { const b = $("#onBody"); b.innerHTML = html; I18N.apply(b); return b; },
  setStatus(t, cls) { Online.status = t; const s = $("#onStatus"); if (s) { s.textContent = L(t); s.className = "onStatus " + (cls || ""); } },
  renderHome(join) {
    const b = Online.body(`<div class="onCols"><div class="onCard"><h3>🌐 ${L("Héberger une salle")}</h3><p>${L("Crée un code et partage le lien : ton ami rejoint en un clic.")}</p><button class="mbtn gold" id="onHost">${L("Créer une salle (PeerJS)")}</button>
        <div id="onHostBox"></div></div>
      <div class="onCard"><h3>🔗 ${L("Rejoindre")}</h3><p>${L("Entre le code reçu (6 caractères) :")}</p><input id="onCode" maxlength="8" autocomplete="off" spellcheck="false" value="${join || ""}" placeholder="ABC123"><button class="mbtn" id="onJoin">${L("Rejoindre la salle")}</button></div>
      <div class="onCard"><h3>🛠 ${L("Mode manuel (sans serveur)")}</h3><p>${L("Échange l'offre puis la réponse par copier-coller (messagerie, e-mail…).")}</p>
        <button class="btn" id="onMOffer">${L("1. Créer une offre")}</button><button class="btn" id="onMAnswer">${L("2. Coller une offre et répondre")}</button>
        <textarea id="onSdp" spellcheck="false" placeholder="${L("Offre / réponse SDP")}"></textarea><div><button class="btn" id="onCopy">${L("Copier")}</button><button class="btn" id="onMApply">${L("3. Appliquer la réponse")}</button></div></div></div>
      <div class="onStatus" id="onStatus"></div>
      <p class="dim">${L("Netcode lockstep à délai d'entrée adaptatif + contrôles d'intégrité. Conseil : connexion filaire ou Wi-Fi stable. Les deux joueurs utilisent les commandes du Joueur 1 (clavier, manette ou tactile).")}</p>`);
    $("#onCode").onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") $("#onJoin").click(); };
    $("#onSdp").onkeydown = e => e.stopPropagation();
    $("#onHost").onclick = () => Online.host();
    $("#onJoin").onclick = () => Online.join($("#onCode").value);
    $("#onMOffer").onclick = () => Online.manualOffer();
    $("#onMAnswer").onclick = () => Online.manualAnswer();
    $("#onMApply").onclick = () => Online.manualApply();
    $("#onCopy").onclick = () => Online.copy($("#onSdp").value);
    if (join) setTimeout(() => Online.join(join), 200);
    Online.setStatus(Online.status || "");
  },
  copy(t) { try { navigator.clipboard.writeText(t).then(() => UI.toast(L("Copié !")), () => { }); } catch (e) { } },
  genCode() { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; const r = new Uint32Array(6); crypto.getRandomValues(r); for (const v of r) s += A[v % A.length]; return s; },
  loadPeer() {
    if (window.Peer) return Promise.resolve(true);
    if (location.protocol === "file:" && !document.querySelector("script[data-peer]")) return Promise.resolve(false);
    return new Promise(res => { const s = document.createElement("script"); s.src = "js/vendor/peerjs.min.js"; s.dataset.peer = 1; s.onload = () => res(!!window.Peer); s.onerror = () => res(false); document.head.appendChild(s); });
  },
  async host() {
    Online.disconnect(); Online.role = "host"; Online.setStatus("Connexion au serveur de signalisation…");
    if (!await Online.loadPeer()) { Online.setStatus("PeerJS indisponible — utilise le mode manuel.", "err"); return; }
    const code = Online.genCode(); Online.code = code;
    try { Online.peer = new Peer("mkav-" + code, { debug: 0 }); } catch (e) { Online.setStatus("PeerJS indisponible — utilise le mode manuel.", "err"); return; }
    Online.peer.on("open", () => {
      const link = location.origin + location.pathname + "?join=" + code;
      $("#onHostBox") && ($("#onHostBox").innerHTML = `<div class="onCode">${code}</div><input readonly id="onLink" value="${link}"><button class="btn" id="onCopyL">${L("Copier le lien")}</button>${navigator.share ? `<button class="btn" id="onShare">${L("Partager")}</button>` : ""}`);
      $("#onCopyL") && ($("#onCopyL").onclick = () => Online.copy(link));
      $("#onShare") && ($("#onShare").onclick = () => navigator.share({ title: "Aurélia vs Haï — " + L("Duel en ligne"), text: L("Rejoins-moi dans le Kombat ! Code") + " " + code, url: link }).catch(() => { }));
      Online.setStatus("Salle créée — en attente de ton adversaire…", "ok");
    });
    Online.peer.on("connection", c => { if (Online.conn) { c.close(); return; } Online.usePeerConn(c); });
    Online.peer.on("error", e => Online.setStatus(L("Erreur réseau") + " : " + (e && e.type || e), "err"));
  },
  async join(code) {
    code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); if (code.length < 4) { Online.setStatus("Code invalide", "err"); return; }
    Online.disconnect(); Online.role = "guest"; Online.code = code; Online.setStatus("Connexion au serveur de signalisation…");
    if (!await Online.loadPeer()) { Online.setStatus("PeerJS indisponible — utilise le mode manuel.", "err"); return; }
    try { Online.peer = new Peer(undefined, { debug: 0 }); } catch (e) { Online.setStatus("PeerJS indisponible — utilise le mode manuel.", "err"); return; }
    Online.peer.on("open", () => { Online.setStatus(L("Connexion à la salle") + " " + code + "…"); Online.usePeerConn(Online.peer.connect("mkav-" + code, { reliable: true, serialization: "json" })); });
    Online.peer.on("error", e => Online.setStatus((e && e.type === "peer-unavailable") ? L("Salle introuvable") + " : " + code : L("Erreur réseau") + " : " + (e && e.type || e), "err"));
  },
  usePeerConn(c) {
    Online.conn = c;
    const live = () => Online.conn === c; // ignore les évènements d'une ancienne connexion
    c.on("open", () => live() && Online.onOpen(o => c.send(o)));
    c.on("data", d => live() && Online.onData(d));
    c.on("close", () => live() && Online.onClose());
    c.on("error", () => live() && Online.onClose());
  },
  // ---------- signalisation manuelle (SDP copier-coller) ----------
  rtc() {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    Online.pc = pc; return pc;
  },
  waitIce(pc) { return new Promise(res => { if (pc.iceGatheringState === "complete") return res(); const t = setTimeout(res, 3500); pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } }); }); },
  enc(desc) { return "MKAV4:" + btoa(unescape(encodeURIComponent(JSON.stringify({ type: desc.type, sdp: desc.sdp })))); },
  dec(txt) { const t = String(txt || "").trim().replace(/^MKAV4:/, ""); return JSON.parse(decodeURIComponent(escape(atob(t)))); },
  useDC(dc) {
    Online.dc = dc;
    const live = () => Online.dc === dc; // ignore les évènements d'un ancien canal
    dc.onopen = () => live() && Online.onOpen(o => { if (dc.readyState === "open") dc.send(JSON.stringify(o)); });
    dc.onmessage = e => { if (!live()) return; try { Online.onData(JSON.parse(e.data)); } catch (x) { } };
    dc.onclose = () => live() && Online.onClose();
  },
  async manualOffer() {
    Online.disconnect(); Online.role = "host"; $("#onSdp").value = ""; Online.setStatus("Création de l'offre (collecte ICE)…");
    try {
      const pc = Online.rtc(); Online.useDC(pc.createDataChannel("mkav", { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer()); await Online.waitIce(pc);
      $("#onSdp").value = Online.enc(pc.localDescription); Online.offerReady = true;
      Online.setStatus("Offre prête : copie-la, envoie-la, puis colle la réponse et clique « Appliquer ».", "ok");
    } catch (e) { Online.setStatus(L("WebRTC indisponible") + " : " + e.message, "err"); }
  },
  async manualAnswer() {
    let off; try { off = Online.dec($("#onSdp").value); if (off.type !== "offer") throw 0; } catch (e) { Online.setStatus("Colle d'abord une offre valide (MKAV4:…)", "err"); return; }
    Online.disconnect(); Online.role = "guest"; $("#onSdp").value = ""; Online.setStatus("Création de la réponse…");
    try {
      const pc = Online.rtc(); pc.ondatachannel = e => Online.useDC(e.channel);
      await pc.setRemoteDescription(off); await pc.setLocalDescription(await pc.createAnswer()); await Online.waitIce(pc);
      $("#onSdp").value = Online.enc(pc.localDescription);
      Online.setStatus("Réponse prête : renvoie-la à l'hôte. La connexion s'établit dès qu'il l'applique.", "ok");
    } catch (e) { Online.setStatus(L("WebRTC indisponible") + " : " + e.message, "err"); }
  },
  async manualApply() {
    let ans; try { ans = Online.dec($("#onSdp").value); if (ans.type !== "answer") throw 0; } catch (e) { Online.setStatus("Colle une réponse valide (MKAV4:…)", "err"); return; }
    if (!Online.pc) { Online.setStatus("Crée d'abord une offre", "err"); return; }
    try { await Online.pc.setRemoteDescription(ans); Online.setStatus("Connexion…"); } catch (e) { Online.setStatus(e.message, "err"); }
  },
  // ---------- session ----------
  onOpen(send) {
    Online.send = send; Online.connected = true; Online.setStatus("Connecté !", "ok"); Audio2.play("gong");
    Online.lobby = { me: { ch: Progress.charAvailable(Sel.p1) ? Sel.p1 : "aurelia", cs: "base", ready: false }, them: null, stage: 0 };
    Online.lobby.me.cs = Progress.costumeOf(Online.lobby.me.ch);
    send({ t: "hello", v: 4, me: Online.lobby.me });
    clearInterval(Online.pingT); Online.pingT = setInterval(() => Online.send && Online.send({ t: "ping", ts: performance.now() }), 1000);
    if ($("#online").classList.contains("on")) Online.renderLobby();
  },
  onClose() {
    if (!Online.connected && !Online.inMatch) return;
    Online.connected = false; clearInterval(Online.pingT);
    if (Online.inMatch) { Online.inMatch = false; UI.toast(L("Adversaire déconnecté")); setTimeout(() => Screens.title(), 600); }
    else if ($("#online").classList.contains("on")) { Online.setStatus("Connexion perdue", "err"); Online.renderHome(); }
  },
  disconnect(bye) {
    try { if (bye && Online.send) Online.send({ t: "bye" }); } catch (e) { }
    clearInterval(Online.pingT); Online.send = null; Online.connected = false; Online.inMatch = false;
    try { Online.conn && Online.conn.close(); } catch (e) { } try { Online.peer && Online.peer.destroy(); } catch (e) { }
    try { Online.dc && Online.dc.close(); } catch (e) { } try { Online.pc && Online.pc.close(); } catch (e) { }
    Online.conn = Online.peer = Online.dc = Online.pc = null;
  },
  leaveMatch() { Online.inMatch = false; },
  renderLobby() {
    const Lb = Online.lobby, me = Lb.me, th = Lb.them, host = Online.role === "host";
    const chars = CHAR_IDS.filter(id => Progress.charAvailable(id));
    Online.body(`<div class="onStatus ok" id="onStatus">${L("Connecté")} • ${host ? L("Hôte") : L("Invité")} • ping ${Math.round(Online.rtt)} ms</div>
      <div class="onCols"><div class="onCard"><h3>${L("Ton combattant")}</h3>${chars.map(id => `<button class="btn rch${me.ch === id ? " sel" : ""}" data-ch="${id}" style="--c:${CHARACTERS[id].color}">${CHARACTERS[id].name}</button>`).join("")}
        <div style="margin-top:8px">${Progress.costumesFor(me.ch).map(k => `<button class="btn csb${me.cs === k ? " sel" : ""}" data-cs="${k}">${Costumes.label(me.ch, k)}</button>`).join("")}</div></div>
      <div class="onCard"><h3>${L("Adversaire")}</h3><p class="big">${th ? CHARACTERS[th.ch].name + (th.ready ? " ✓ " + L("PRÊT") : "") : L("en attente…")}</p></div>
      <div class="onCard"><h3>${L("Arène")} ${host ? "" : "(" + L("choisie par l'hôte") + ")"}</h3>${STAGES.map((s, i) => `<button class="btn stb${Lb.stage === i ? " sel" : ""}" data-st="${i}" ${host ? "" : "disabled"}>${L(STAGE_SHORT[s.id])}</button>`).join("")}</div></div>
      <button class="mbtn gold" id="onReady" style="width:340px;margin:12px auto">${me.ready ? L("✓ PRÊT — en attente…") : L("PRÊT ▸")}</button>`);
    $$("#onBody .rch").forEach(b => b.onclick = () => { me.ch = b.dataset.ch; me.cs = Progress.costumeOf(me.ch); me.ready = false; Online.send({ t: "pick", me }); Online.renderLobby(); });
    $$("#onBody .csb").forEach(b => b.onclick = () => { me.cs = b.dataset.cs; Online.send({ t: "pick", me }); Online.renderLobby(); });
    $$("#onBody .stb").forEach(b => b.onclick = () => { Lb.stage = +b.dataset.st; Online.send({ t: "stage", i: Lb.stage }); Online.renderLobby(); });
    $("#onReady").onclick = () => { me.ready = !me.ready; Online.send({ t: "pick", me }); Online.renderLobby(); Online.tryStart(); };
  },
  tryStart() {
    const Lb = Online.lobby; if (Online.role !== "host" || !Lb.me.ready || !Lb.them || !Lb.them.ready) return;
    const d = Math.max(2, Math.min(8, Math.ceil((Online.rtt / 2) / STEP) + 2));
    const cfg = { chars: [Lb.me.ch, Lb.them.ch], cs: [Lb.me.cs, Lb.them.cs], stage: Lb.stage, roundTime: 99, delay: d, id: Date.now() };
    Online.send({ t: "start", cfg }); Online.begin(cfg);
  },
  begin(cfg) {
    Online.cfg = cfg; Online.localSide = Online.role === "host" ? 0 : 1; Online.delay = cfg.delay;
    Online.local = {}; Online.remote = {}; Online.myCk = {}; Online.remCk = {}; Online.snaps = {}; Online.lastLocal = cfg.delay; Online.acc = 0; Online.stall = 0; Online.desyncs = 0; Online.resyncs = 0;
    for (let f = 1; f <= cfg.delay; f++) Online.local[f] = Online.remote[f] = [0, 0, ""];
    Online.lobby.me.ready = false; if (Online.lobby.them) Online.lobby.them.ready = false;
    Online.inMatch = true; Online.matchReady = false;
    Audio2.voice("ann_online", { ch: "ann" });
    Screens.vs(cfg.stage, () => {
      Flow.fight({ type: "online", stageIdx: cfg.stage, p1Char: cfg.chars[0], p2Char: cfg.chars[1], costumes: cfg.cs, roundTime: cfg.roundTime });
      Online.matchReady = true; Online.send && Online.send({ t: "go" });
    }, cfg.chars[0], cfg.chars[1]);
  },
  requestRematch() { Online.lobby.me.ready = true; Online.send && Online.send({ t: "pick", me: Online.lobby.me }); Online.open(); Online.tryStart(); },
  onData(m) {
    if (!m || !m.t) return;
    switch (m.t) {
      case "hello": case "pick": Online.lobby.them = m.me; if (!Online.inMatch && $("#online").classList.contains("on")) Online.renderLobby(); Online.tryStart(); break;
      case "stage": Online.lobby.stage = m.i; if (!Online.inMatch && $("#online").classList.contains("on")) Online.renderLobby(); break;
      case "start": if (Online.role === "guest") Online.begin(m.cfg); break;
      case "go": Online.remoteGo = true; break;
      case "in": for (let i = 0; i < m.d.length; i++) { const f = m.f - m.d.length + 1 + i; if (f > 0 && !Online.remote[f]) Online.remote[f] = m.d[i]; } break;
      case "ck": Online.remCk[m.f] = m.h; Online.checkCk(m.f); break;
      case "desync": if (Online.role === "host" && Online.snaps[m.f]) Online.send({ t: "snap", f: m.f, s: Online.snaps[m.f] }); break;
      case "snap": if (Online.role === "guest") Online.resync(m.f, m.s); break;
      case "ping": Online.send && Online.send({ t: "pong", ts: m.ts }); break;
      case "pong": Online.rtt = Online.rtt ? Online.rtt * 0.7 + (performance.now() - m.ts) * 0.3 : performance.now() - m.ts; break;
      case "bye": Online.onClose(); break;
    }
  },
  // ---------- lockstep ----------
  pack(s) { let h = 0, e = 0; NET_KEYS.forEach((k, i) => { if (s.I[k]) h |= 1 << i; if (s.edge[k]) e |= 1 << i; }); return [h, e, s.dirs.map(d => d[0]).join("")]; },
  unpack(p) { const I = blankInput(), edge = {}; NET_KEYS.forEach((k, i) => { if (p[0] & (1 << i)) I[k] = 1; if (p[1] & (1 << i)) edge[k] = 1; }); return { I, edge, dirs: (p[2] || "").split("").filter(Boolean) }; },
  read(f) {
    const src = f.side === Online.localSide ? Online.local : Online.remote, p = src[frameCount] || [0, 0, ""];
    const u = Online.unpack(p); f.edge = u.edge; f.evDirs = u.dirs; return u.I;
  },
  produceLocal() {
    while (Online.lastLocal < frameCount + Online.delay) {
      const fno = ++Online.lastLocal; Online.local[fno] = Online.pack(Input.sampleLocal());
      const d = []; for (let i = Math.max(1, fno - 7); i <= fno; i++) d.push(Online.local[i]);
      Online.send && Online.send({ t: "in", f: fno, d });
    }
  },
  frame(dt) {
    if (!Online.inMatch) return;
    const paused = $("#pause").classList.contains("on");
    Online.acc += dt * 1000 * Match.timeScale; let n = 0;
    while (Online.acc >= STEP && n < 4) {
      Online.produceLocal();
      const nf = frameCount + 1;
      if (!Online.local[nf] || !Online.remote[nf]) { Online.stall++; Online.acc = Math.min(Online.acc, STEP * 2); break; }
      const t0 = performance.now(); fightStep(); Match.logicMs = Match.logicMs * 0.9 + (performance.now() - t0) * 0.1; Input.endStep();
      Online.acc -= STEP; n++;
      Online.afterStep();
    }
    if (paused) { /* le menu par-dessus n'arrête pas la simulation */ }
    if (frameCount % 15 === 0 || n === 0) Online.info();
  },
  afterStep() {
    const f = frameCount;
    delete Online.local[f - 900]; delete Online.remote[f - 900];
    if (f % 30 === 0 && !Match.seq) {
      const h = Online.hash(); Online.myCk[f] = h; Online.send && Online.send({ t: "ck", f, h });
      if (Online.role === "host") { Online.snaps[f] = Online.snapshot(); delete Online.snaps[f - 600]; }
      Online.checkCk(f); delete Online.myCk[f - 900]; delete Online.remCk[f - 900];
    }
  },
  checkCk(f) {
    if (Online.myCk[f] == null || Online.remCk[f] == null) return;
    if (Online.myCk[f] !== Online.remCk[f]) { Online.desyncs++; if (Online.role === "guest") Online.send && Online.send({ t: "desync", f }); }
  },
  info() {
    const e = $("#netInfo"); if (!e) return;
    const waiting = !Online.remote[frameCount + 1];
    e.innerHTML = `🌐 ${Online.role === "host" ? L("Hôte") : L("Invité")} • ping <b>${Math.round(Online.rtt)}</b> ms • ${L("délai")} ${Online.delay}f${Online.desyncs ? ` • ⚠ ${Online.desyncs} desync / ${Online.resyncs} resync` : " • ✓ sync"}${waiting && frameCount < 5 ? " • " + L("Synchronisation…") : ""}`;
  },
  hash() {
    let h = 2166136261 >>> 0; const mix = v => { h ^= (v | 0); h = Math.imul(h, 16777619) >>> 0; };
    F.forEach(f => { mix(Math.round(f.x * 10)); mix(Math.round(f.y * 10)); mix(Math.round(f.hp * 100)); mix(Math.round(f.meter * 10)); mix(Math.round(f.guard * 10)); mix(f.t); mix(f.state.length * 31 + f.state.charCodeAt(0)); mix(f.combo); mix(f.face); });
    mix(Match.timer); mix(Match.wins[0] * 4 + Match.wins[1]); mix(Match.round); mix(Match.projectiles.length); mix(Match.hitstop); mix(Match.st);
    Match.projectiles.forEach(p => { mix(Math.round(p.x)); mix(p.hits); });
    return h;
  },
  snapshot() {
    const rep = (k, v) => (k === "ch" || k === "trail" || k === "ai") ? undefined : (k === "move" ? undefined : v);
    const fs = F.map(f => JSON.stringify(f, rep));
    const pr = Match.projectiles.map(p => JSON.stringify(Object.assign({}, p, { owner: p.owner.side })));
    const M = {}; ["state", "st", "timer", "tick", "round", "wins", "hitstop", "slowT", "timeScale", "perfect", "finisher", "firstBlood", "lastParryAnn", "winLineAt", "flawlessAt", "startFrame"].forEach(k => M[k] = Match[k]);
    M.winner = Match.winner ? Match.winner.side : -1; M.loser = Match.loser ? Match.loser.side : -1;
    return { fs, pr, M };
  },
  restore(s) {
    s.fs.forEach((js, i) => { const o = JSON.parse(js), f = F[i]; Object.assign(f, o); f.move = f.moveName && MOVES[f.moveName] && (f.state === "attack" || f.state === "airatk") ? MOVES[f.moveName] : null; f.trail = []; });
    Match.projectiles.length = 0; s.pr.forEach(js => { const p = JSON.parse(js); p.owner = F[p.owner]; Match.projectiles.push(p); });
    Object.assign(Match, s.M); Match.winner = s.M.winner >= 0 ? F[s.M.winner] : null; Match.loser = s.M.loser >= 0 ? F[s.M.loser] : null;
  },
  resync(f0, snap) {
    if (Match.seq || !Online.inMatch) return;
    const cur = frameCount; if (cur < f0 || cur - f0 > 600) return;
    for (let k = f0 + 1; k <= cur; k++) if (!Online.local[k] || !Online.remote[k]) return;
    const sfx = Audio2.settings.sfx, vo = Audio2.settings.voice; Audio2.set("sfx", false); Audio2.set("voice", false);
    try {
      Online.restore(snap); frameCount = f0;
      while (frameCount < cur) { fightStep(); if (Match.seq) break; }
    } finally { Audio2.set("sfx", sfx); Audio2.set("voice", vo); }
    Online.resyncs++; Online.myCk[f0] = Online.remCk[f0];
  }
};
GameEv.on("matchOver", () => { if (Match.type === "online") setTimeout(() => { Online.inMatch = false; }, 400); });
