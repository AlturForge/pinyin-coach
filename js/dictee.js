// ============================================================
// Pinyin Coach — Parler & se faire corriger (IA)
// Deux modes : parole libre (rien à écrire) ou phrase à viser.
// L'enregistrement est converti en WAV 16 kHz mono puis envoyé
// directement à un modèle de chat audio Mistral (voxtral),
// qui transcrit et corrige la prononciation en français.
// La clé API reste dans le localStorage du navigateur.
// ============================================================

(() => {
  const $ = id => document.getElementById(id);
  const LS_KEY = "pinyin-coach-mistral-key";
  const LS_MODEL = "pinyin-coach-audio-model";
  const DEFAULT_MODEL = "voxtral-small-latest";

  const state = {
    mediaRecorder: null, chunks: [], audioBlob: null, playbackUrl: null,
    recording: false, busy: false, mode: "talk",
  };

  // ---------- réglages ----------
  function loadSettings() {
    $("dictee-apikey").value = localStorage.getItem(LS_KEY) || "";
    $("dictee-modelname").value = localStorage.getItem(LS_MODEL) || DEFAULT_MODEL;
  }
  $("dictee-save-settings").onclick = () => {
    const key = $("dictee-apikey").value.trim();
    const model = $("dictee-modelname").value.trim() || DEFAULT_MODEL;
    if (key) localStorage.setItem(LS_KEY, key); else localStorage.removeItem(LS_KEY);
    localStorage.setItem(LS_MODEL, model);
    $("dictee-settings-msg").textContent = "✓ Enregistré" + (key ? "" : " (sans clé)");
    setTimeout(() => $("dictee-settings-msg").textContent = "", 2500);
    if (key) { $("dictee-key-banner").classList.add("hidden"); $("dictee-settings").open = false; }
    else updateKeyBanner();
  };

  function updateKeyBanner() {
    const hasKey = !!localStorage.getItem(LS_KEY);
    $("dictee-key-banner").classList.toggle("hidden", hasKey);
    $("dictee-settings").open = !hasKey;
  }

  // ---------- bascule des deux modes ----------
  function setMode(mode) {
    state.mode = mode;
    const talk = mode === "talk";
    $("seg-talk").classList.toggle("seg-on", talk);
    $("seg-target").classList.toggle("seg-on", !talk);
    $("dictee-target-zone").classList.toggle("hidden", talk);
    $("talk-hint").classList.toggle("hidden", !talk);
    hideWarn();
  }
  $("seg-talk").onclick = () => setMode("talk");
  $("seg-target").onclick = () => setMode("target");

  // ---------- navigation / TTS ----------
  $("btn-dictee-open").onclick = () => {
    $("screen-home").classList.add("hidden");
    $("screen-dictee").classList.remove("hidden");
    updateKeyBanner();
    setMode(state.mode);
  };
  $("btn-dictee-model").onclick = () => {
    const t = $("dictee-phrase").value;
    if (!t) return;
    if (!/[\u4e00-\u9fff]/.test(t)) { showWarn("La synthèse vocale lit les caractères chinois : écrivez la phrase visée en 汉字 pour l'écouter."); return; }
    hideWarn();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "zh-CN"; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith("zh"));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };

  document.querySelectorAll(".chip").forEach(ch => {
    ch.onclick = () => { $("dictee-phrase").value = ch.dataset.ex; hideWarn(); };
  });

  function showWarn(msg) { const w = $("dictee-warn"); w.textContent = msg; w.classList.remove("hidden"); }
  function hideWarn() { $("dictee-warn").classList.add("hidden"); }
  function setStatus(msg) {
    const s = $("dictee-status");
    if (!msg) { s.classList.add("hidden"); s.textContent = ""; }
    else { s.textContent = msg; s.classList.remove("hidden"); }
  }

  // ---------- enregistrement ----------
  $("btn-dictee-record").onclick = async () => {
    if (state.busy) return;
    if (state.recording) { state.mediaRecorder.stop(); return; }
    const key = localStorage.getItem(LS_KEY);
    if (!key) { updateKeyBanner(); showWarn("Sans clé API, votre enregistrement ne peut pas être analysé. Suivez les étapes 🔑 ci-dessus pour créer et coller votre clé Mistral."); return; }
    let target = "";
    if (state.mode === "target") {
      target = $("dictee-phrase").value.trim();
      if (!target) { showWarn("Mode « Viser une phrase » : écrivez d'abord la phrase (汉字 ou pinyin, l'un ou l'autre) — ou cliquez sur une suggestion — ou revenez au mode « Parler librement »."); return; }
    }
    hideWarn();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.chunks = [];
      state.mediaRecorder = new MediaRecorder(stream);
      state.mediaRecorder.ondataavailable = e => state.chunks.push(e.data);
      state.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        state.recording = false;
        const b = $("btn-dictee-record");
        b.classList.remove("on"); b.textContent = "🎤 Parler";
        if (state.playbackUrl) URL.revokeObjectURL(state.playbackUrl);
        state.audioBlob = new Blob(state.chunks, { type: "audio/webm" });
        state.playbackUrl = URL.createObjectURL(state.audioBlob);
        $("btn-dictee-playback").disabled = false;
        await runCorrection(target);
      };
      state.mediaRecorder.start();
      state.recording = true;
      const b = $("btn-dictee-record");
      b.classList.add("on"); b.textContent = "⏹ Arrêter (parlez maintenant)";
      setStatus("● Enregistrement… parlez en chinois, puis réappuyez pour arrêter.");
    } catch (e) {
      showWarn("Impossible d'accéder au micro : " + e.message + ". Utilisez Chrome ou Edge en HTTPS.");
    }
  };
  $("btn-dictee-playback").onclick = () => {
    if (state.playbackUrl) new Audio(state.playbackUrl).play();
  };

  // ---------- conversion en WAV 16 kHz mono ----------
  async function blobToWav16k(blob) {
    const buf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audio = await ctx.decodeAudioData(buf);
    ctx.close();
    const sr = 16000;
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * sr)), sr);
    const src = off.createBufferSource();
    src.buffer = audio;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    const data = rendered.getChannelData(0);
    const len = data.length;
    const ab = new ArrayBuffer(44 + len * 2);
    const view = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); view.setUint32(4, 36 + len * 2, true); w(8, "WAVE");
    w(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    w(36, "data"); view.setUint32(40, len * 2, true);
    let o = 44;
    for (let i = 0; i < len; i++, o += 2) {
      const s = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([ab], { type: "audio/wav" });
  }

  function arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(bin);
  }

  // ---------- appel API : audio directement dans le chat ----------
  const SYSTEM_PROMPT = "Tu es un coach expert de la prononciation du mandarin pour un apprenant francophone. On t'envoie l'enregistrement de sa voix. Réponds en français, en texte brut sans markdown, en deux parties. Première ligne, commence exactement par « Entendu : » puis la transcription fidèle, en caractères chinois, de ce qu'il a dit (avec le pinyin entre parenthèses). Ensuite l'analyse de sa prononciation, en 4 à 8 lignes courtes : ce qui est bien prononcé, puis les erreurs probables (consonnes confondues s/sh, x/sh, j/zh, q/ch, z/zh, c/ch, n/l, r/l, f/h, tons inexacts, syllabes déformées ou manquantes), chacune avec la syllabe en pinyin toné et un conseil articulatoire concret et bref. Termine par son niveau global en une phrase. Maximum 180 mots au total. Sois encourageant.";

  async function chatCorrect(key, model, audioB64, target) {
    let instruction;
    if (target) {
      instruction = "J'ai essayé de dire cette phrase : " + target +
        ". Écoute mon enregistrement : transcris ce que j'ai réellement dit, puis corrige ma prononciation.";
    } else {
      instruction = "J'ai parlé librement en mandarin. Écoute mon enregistrement : transcris ce que j'ai dit, puis corrige ma prononciation.";
    }
    const body = {
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: [
          { type: "input_audio", input_audio: audioB64 },
          { type: "text", text: instruction },
        ] },
      ],
    };
    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error("Correction IA (HTTP " + resp.status + ") : " + t.slice(0, 200));
    }
    const j = await resp.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || "").trim();
  }

  // ---------- pipeline ----------
  async function runCorrection(target) {
    const key = localStorage.getItem(LS_KEY);
    if (!key) {
      updateKeyBanner();
      showWarn("Ajoutez votre clé API Mistral dans « ⚙️ Clé API Mistral » (les étapes 🔑 sont affichées), puis réessayez.");
      return;
    }
    const model = localStorage.getItem(LS_MODEL) || DEFAULT_MODEL;
    state.busy = true;
    const btn = $("btn-dictee-record");
    btn.disabled = true;
    $("dictee-results").classList.add("hidden");
    try {
      setStatus("Envoi de votre voix au modèle " + model + "…");
      const wav = await blobToWav16k(state.audioBlob);
      const b64 = arrayBufferToBase64(await wav.arrayBuffer());
      const feedback = await chatCorrect(key, model, b64, target);
      let transcript = "", analyse = feedback;
      const m = feedback.match(/Entendu\s*[:：]\s*(.+)/i);
      if (m) { transcript = m[1].trim(); analyse = feedback.slice(feedback.indexOf(m[0]) + m[0].length).trim(); }
      $("dictee-transcript").textContent = transcript || "(voir l'analyse)";
      $("dictee-feedback").innerHTML = escapeHtml(analyse || feedback).replace(/\n/g, "<br>");
      $("dictee-results").classList.remove("hidden");
      setStatus("");
    } catch (e) {
      showWarn("Erreur : " + e.message);
      setStatus("");
    } finally {
      state.busy = false;
      btn.disabled = false;
    }
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  loadSettings();
})();
