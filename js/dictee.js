// ============================================================
// Pinyin Coach — Dictée & correction IA
// Enregistre la voix, la convertit en WAV 16 kHz mono,
// la fait transcrire par Voxtral (API Mistral), puis demande
// au modèle de chat une correction de prononciation en français.
// La clé API reste dans le localStorage du navigateur.
// ============================================================

(() => {
  const $ = id => document.getElementById(id);
  const LS_KEY = "pinyin-coach-mistral-key";
  const LS_MODEL = "pinyin-coach-mistral-model";
  const TRANSCRIBE_MODEL = "voxtral-mini-transcribe-3";

  const state = {
    mediaRecorder: null, chunks: [], audioBlob: null, playbackUrl: null,
    recording: false, busy: false,
  };

  // ---------- réglages ----------
  function loadSettings() {
    $("dictee-apikey").value = localStorage.getItem(LS_KEY) || "";
    $("dictee-modelname").value = localStorage.getItem(LS_MODEL) || "mistral-small-latest";
  }
  $("dictee-save-settings").onclick = () => {
    const key = $("dictee-apikey").value.trim();
    const model = $("dictee-modelname").value.trim() || "mistral-small-latest";
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

  // ---------- navigation / TTS ----------
  $("btn-dictee-open").onclick = () => {
    $("screen-home").classList.add("hidden");
    $("screen-dictee").classList.remove("hidden");
    updateKeyBanner();
  };
  $("btn-dictee-model").onclick = () => {
    const t = $("dictee-phrase").value;
    if (!t) return;
    if (!/[\u4e00-\u9fff]/.test(t)) { showWarn("Le modèle vocal lit les caractères chinois. Écrivez la phrase en 汉字 pour l'écouter (ou enregistrez-vous et la correction marchera quand même en pinyin)."); return; }
    hideWarn();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "zh-CN"; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith("zh"));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };

  // exemples cliquables
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
    const target = $("dictee-phrase").value;
    if (!target.trim()) { showWarn("Écrivez d'abord la phrase à prononcer (en 汉字 ou en pinyin, l'un ou l'autre suffit) — ou cliquez sur un exemple."); return; }
    const key = localStorage.getItem(LS_KEY);
    if (!key) { updateKeyBanner(); showWarn("Sans clé API, l'enregistrement ne peut pas être transcrit. Suivez les étapes 🔑 ci-dessus pour créer et coller votre clé Mistral."); return; }
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
        b.classList.remove("on"); b.textContent = "⏺ 2. Enregistrer et parler";
        if (state.playbackUrl) URL.revokeObjectURL(state.playbackUrl);
        state.audioBlob = new Blob(state.chunks, { type: "audio/webm" });
        state.playbackUrl = URL.createObjectURL(state.audioBlob);
        $("btn-dictee-playback").disabled = false;
        await runCorrection(target);
      };
      state.mediaRecorder.start();
      state.recording = true;
      const b = $("btn-dictee-record");
      b.classList.add("on"); b.textContent = "⏹ Arrêter";
      setStatus("● Enregistrement… lisez la phrase maintenant, puis re-cliquez pour arrêter.");
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

  // ---------- appel API ----------
  async function transcribe(wavBlob, key) {
    const call = withLang => {
      const fd = new FormData();
      fd.append("model", TRANSCRIBE_MODEL);
      fd.append("file", wavBlob, "recording.wav");
      if (withLang) fd.append("language", "zh");
      return fetch("https://api.mistral.ai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key },
        body: fd,
      });
    };
    let resp = await call(true);
    if (!resp.ok) resp = await call(false); // si "language" est refusé, réessayer sans
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error("Transcription Voxtral (HTTP " + resp.status + ") : " + t.slice(0, 200));
    }
    const j = await resp.json();
    return (j.text || "").trim();
  }

  const SYSTEM_PROMPT = "Tu es un coach expert de la prononciation du mandarin pour un apprenant francophone. On te donne : (1) une phrase cible, écrite en caractères chinois ou en pinyin ; (2) la transcription automatique (STT) de ce que l'apprenant a réellement prononcé. À partir des écarts entre la cible et la transcription, déduis ses erreurs de prononciation probables : consonnes confondues (s/sh, x/sh, j/zh, q/ch, z/zh, c/ch, n/l, r/l, f/h), tons inexacts, syllabes déformées ou manquantes. Réponds en français, en texte brut sans titres markdown, en 5 à 8 lignes courtes : d'abord ce qui est correct, puis chaque problème avec le mot ou la syllabe en pinyin (ton marqué) et un conseil articulatoire concret et bref, enfin la phrase cible en pinyin correctement toné comme modèle à imiter. Maximum 150 mots. Sois encourageant.";

  async function chatCorrect(key, model, target, transcript) {
    const body = {
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "Phrase cible : " + target + "\nTranscription de ce que j'ai dit : " + (transcript || "(rien détecté)") +
          "\nAnalyse ma prononciation et corrige-la." },
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
      showWarn("Ajoutez votre clé API Mistral dans « ⚙️ Clé API Mistral » ci-dessus (les étapes 🔑 sont affichées), puis réessayez.");
      return;
    }
    const model = localStorage.getItem(LS_MODEL) || "mistral-small-latest";
    state.busy = true;
    const btn = $("btn-dictee-record");
    btn.disabled = true;
    $("dictee-results").classList.add("hidden");
    try {
      setStatus("1/2 — Transcription de votre voix par Voxtral…");
      const wav = await blobToWav16k(state.audioBlob);
      const transcript = await transcribe(wav, key);
      setStatus("2/2 — Analyse et correction par " + model + "…");
      const feedback = await chatCorrect(key, model, target, transcript);
      $("dictee-transcript").textContent = transcript || "(aucune parole détectée)";
      $("dictee-feedback").innerHTML = escapeHtml(feedback).replace(/\n/g, "<br>");
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
