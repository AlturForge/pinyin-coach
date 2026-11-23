// ============================================================
// Pinyin Coach — application
// ============================================================

(() => {
  const $ = id => document.getElementById(id);
  const state = {
    mode: null, set: null, exIndex: 0, customSets: [],
    mediaRecorder: null, chunks: [], audioBlob: null, playbackUrl: null,
    recognition: null, heard: "", recording: false,
  };

  // ---------- persistance des textes perso ----------
  const LS_KEY = "pinyin-coach-custom";
  function loadCustom() {
    try { state.customSets = JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { state.customSets = []; }
    if (state.customSets.length) renderCustomList();
  }
  function saveCustom() {
    localStorage.setItem(LS_KEY, JSON.stringify(state.customSets));
    renderCustomList();
  }
  function parseCustom(text) {
    const exercises = [];
    for (const line of text.split(/\n+/)) {
      if (!line.trim()) continue;
      const [hanzi, pinyin] = line.split(";").map(s => (s || "").trim());
      if (!hanzi || !pinyin) continue;
      exercises.push({ hanzi, pinyin, focus: guessFocus(pinyin) });
    }
    return exercises;
  }
  // déduit le focus depuis le pinyin : initiales et tons (marques unicode)
  const TONE_MARKS = { ā:1,á:2,ǎ:3,à:4, ē:1,é:2,ě:3,è:4, ī:1,í:2,ǐ:3,ì:4,
    ō:1,ó:2,ǒ:3,ò:4, ū:1,ú:2,ǔ:3,ù:4, ǖ:1,ǘ:2,ǚ:3,ǜ:4 };
  const INITIALS = ["zh","ch","sh","b","p","m","f","d","t","n","l","g","k","h","j","q","x","z","c","s","r","y","w"];
  function guessFocus(pinyin) {
    const focus = [];
    for (const syll of pinyin.toLowerCase().split(/[ ,.!?;]+/).filter(Boolean)) {
      let ini = "";
      for (const i of INITIALS) if (syll.startsWith(i)) { ini = i; break; }
      let tone = 0;
      for (const ch of syll) if (TONE_MARKS[ch]) { tone = TONE_MARKS[ch]; break; }
      if (ini) focus.push({ pinyin: syll, initial: ini, tone });
    }
    return focus.slice(0, 4);
  }

  // ---------- accueil ----------
  function renderHome() {
    const lc = $("list-consonants"), lt = $("list-tones");
    const { CONSONANT_SETS, TONE_SETS } = window.PINYIN_CORPUS;
    const mk = (ul, sets, mode) => {
      ul.innerHTML = "";
      sets.forEach(s => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.innerHTML = `${s.title}<small>${s.tip.split(".")[0]}.</small>`;
        b.onclick = () => startSet(mode, s);
        li.appendChild(b); ul.appendChild(li);
      });
    };
    mk(lc, CONSONANT_SETS, "consonants");
    mk(lt, TONE_SETS, "tones");
  }
  function renderCustomList() {
    const ul = $("list-custom");
    ul.innerHTML = "";
    state.customSets.forEach((s, idx) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.innerHTML = `${s.title}<small>${s.exercises.length} phrase(s)</small>`;
      b.onclick = () => startSet(s.mode, s);
      const del = document.createElement("button");
      del.className = "link"; del.textContent = "✕"; del.title = "Supprimer";
      del.onclick = e => { e.stopPropagation(); state.customSets.splice(idx, 1); saveCustom(); };
      b.appendChild(del); li.appendChild(b); ul.appendChild(li);
    });
  }
  $("btn-custom-save").onclick = () => {
    const exs = parseCustom($("custom-input").value);
    if (!exs.length) { alert("Format attendu : 汉字 ; pīnyīn (une phrase par ligne)."); return; }
    state.customSets.push({
      id: "custom-" + Date.now(), title: "Mes phrases " + (state.customSets.length + 1),
      tip: "Vos propres phrases.",
      mode: "consonants",
      exercises: exs,
    });
    saveCustom();
    $("custom-input").value = "";
  };

  // ---------- exercice -----------
  function startSet(mode, set) {
    state.mode = mode; state.set = set; state.exIndex = 0;
    $("screen-home").classList.add("hidden");
    $("screen-exercise").classList.remove("hidden");
    showExercise();
  }
  function showExercise() {
    const ex = state.set.exercises[state.exIndex];
    $("ex-badge").textContent = state.set.title;
    $("ex-tip").textContent = state.set.tip;
    $("ex-hanzi").textContent = ex.hanzi;
    $("ex-pinyin").innerHTML = markedPinyin(ex);
    $("results").classList.add("hidden");
    $("btn-playback").disabled = true;
  }
  function markedPinyin(ex) {
    const focusPinyins = ex.focus.map(f => f.pinyin.replace(/\d/g, ""));
    return ex.pinyin.split(/(\s+|[,.!?])/).map(tok => {
      if (!tok || !/[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(tok)) return tok;
      const bare = tok.replace(/\d/g, "").toLowerCase();
      return focusPinyins.some(f => f === bare || f.includes(bare) || bare.includes(f))
        ? `<mark>${tok}</mark>` : tok;
    }).join("");
  }
  $("btn-home").onclick = () => {
    $("screen-exercise").classList.add("hidden");
    const dictee = $("screen-dictee");
    if (dictee) dictee.classList.add("hidden");
    $("screen-home").classList.remove("hidden");
  };
  $("btn-next").onclick = () => {
    state.exIndex = (state.exIndex + 1) % state.set.exercises.length;
    showExercise();
  };

  // ---------- modèle TTS ----------
  $("btn-model").onclick = () => {
    const ex = state.set.exercises[state.exIndex];
    const u = new SpeechSynthesisUtterance(ex.hanzi);
    u.lang = "zh-CN"; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith("zh"));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };

  // ---------- reconnaissance (aide orthographique, optionnelle) ----------
  function startRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    try {
      state.recognition = new SR();
      state.recognition.lang = "zh-CN";
      state.recognition.interimResults = false;
      state.recognition.maxAlternatives = 3;
      state.heard = "";
      state.recognition.onresult = e => { state.heard = e.results[0][0].transcript; };
      state.recognition.onerror = () => {};
      state.recognition.start();
    } catch { /* déjà démarrée */ }
  }
  function stopRecognition() {
    try { state.recognition && state.recognition.stop(); } catch {}
  }

  // ---------- enregistrement ----------
  $("btn-record").onclick = async () => {
    if (state.recording) { state.mediaRecorder.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.chunks = [];
      state.mediaRecorder = new MediaRecorder(stream);
      state.mediaRecorder.ondataavailable = e => state.chunks.push(e.data);
      state.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        state.recording = false;
        $("btn-record").classList.remove("on");
        $("btn-record").textContent = "⏺ Enregistrer";
        $("rec-status").classList.add("hidden");
        stopRecognition();
        if (state.playbackUrl) URL.revokeObjectURL(state.playbackUrl);
        state.audioBlob = new Blob(state.chunks, { type: "audio/webm" });
        state.playbackUrl = URL.createObjectURL(state.audioBlob);
        $("btn-playback").disabled = false;
        await runAnalysis();
      };
      state.mediaRecorder.start();
      state.recording = true;
      $("btn-record").classList.add("on");
      $("btn-record").textContent = "⏹ Arrêter";
      $("rec-status").classList.remove("hidden");
    startRecognition();
    } catch (e) {
      alert("Impossible d'accéder au micro : " + e.message);
    }
  };
    $("btn-playback").onclick = () => {
    if (!state.playbackUrl) return;
    new Audio(state.playbackUrl).play();
  };

  // ---------- analyse & rendu ----------
  async function runAnalysis() {
    const ex = state.set.exercises[state.exIndex];
    const hasSib = ex.focus.some(f => Analysis.SIBILANT_CLASS[f.initial]);
    const isToneSet = state.mode === "tones" || /tone/i.test(state.set.id);
    const mode = (isToneSet || (state.set.id.startsWith("custom") && !hasSib)) ? "tones" : "consonants";
    const res = await Analysis.analyze(state.audioBlob, ex, mode);
    renderResults(res);
    if (state.heard) {
      $("heard").innerHTML = `Le moteur de reconnaissance a entendu : <b>${state.heard}</b>` +
        (state.heard.replace(/\s/g, "").includes(ex.hanzi.replace(/[，。！？,.!?]/g, "")) ? " ✅ identique à la cible." :
        " — comparez avec la phrase cible pour repérer les syllabes confondues.");
    } else {
      $("heard").textContent = "";
    }
    $("results").classList.remove("hidden");
  }

  function renderResults(res) {
    const v = $("verdict");
    v.innerHTML = "";
    for (const it of res.items) {
      const d = document.createElement("div");
      d.className = "verdict-item verdict-" + it.verdict;
      d.textContent = it.msg;
      v.appendChild(d);
    }
    if (!res.items.length) {
      v.innerHTML = `<div class="verdict-item verdict-warn">Aucun élément analysé — enregistrez-vous à nouveau en parlant nettement.</div>`;
    }
    $("score").textContent = "Score global : " + res.score + " / 100";
    drawChart(res);
  }

  function drawChart(res) {
    const canvas = $("chart"), ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!res.chartData.length) return;
    ctx.font = "13px sans-serif";
    const n = res.chartData.length;
    const slotW = canvas.width / n;
    const colors = { ok: "#1e8449", warn: "#b9770e", bad: "#60392b" };
    res.chartData.forEach((cd, i) => {
      const x0 = i * slotW;
      const tpl = Analysis.TONE_TEMPLATES[cd.tone];
      ctx.strokeStyle = "#d8d0c0"; ctx.setLineDash([4, 3]);
      ctx.beginPath();
      tpl.forEach((val, k) => {
        const x = x0 + 20 + k * (slotW - 40) / 3;
        const y = canvas.height - 20 - val * (canvas.height - 50);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]);
      const item = res.items.find(it => it.focus.replace(/\d/g, "") === cd.label.replace(/\d/g, "")) || res.items[i];
      ctx.strokeStyle = colors[(item && item.verdict) || "warn"]; ctx.lineWidth = 2.5;
      ctx.beginPath();
      cd.contour.forEach((val, k) => {
        const x = x0 + 20 + k * (slotW - 40) / 3;
        const y = canvas.height - 20 - val * (canvas.height - 50);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = "#6b6357";
      ctx.fillText(cd.label + " (ton " + cd.tone + ")", x0 + 16, 14);
    });
    ctx.fillStyle = "#a39880";
    ctx.fillText("— vous   - - modèle", canvas.width - 150, canvas.height - 6);
  }

  // ---------- avertissement navigateur ----------
  function checkBrowser() {
    const probs = [];
    if (!navigator.mediaDevices || !window.MediaRecorder) probs.push("micro");
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) probs.push("reconnaissance vocale (facultative)");
    if (probs.length) {
      const w = $("browser-warn");
      w.classList.remove("hidden");
      w.textContent = "  Non disponible dans ce navigateur : " + probs.join(", ") + ". Utilisez Chrome ou Edge pour l'expérience complète.";
    }
    if (window.speechSynthesis) speechSynthesis.getVoices();
  }

  renderHome();
  loadCustom();
  checkBrowser();
})();
