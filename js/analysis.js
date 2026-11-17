// ============================================================
// Pinyin Coach — moteur d'analyse audio (100 % local)
// Web Audio API : FFT maison, pitch tracking par autocorrélation,
// classification des sibilantes, contour mélodique des tons.
// ============================================================

const Analysis = (() => {

  // ---------- utilitaires ----------

  async function decode(blob) {
    const buf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audio = await ctx.decodeAudioData(buf);
    ctx.close();
    return { data: audio.getChannelData(0), sr: audio.sampleRate };
  }

  function rms(buf) {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  function hanning(buf) {
    const w = new Float32Array(buf.length);
    for (let i = 0; i < buf.length; i++)
      w[i] = buf[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (buf.length - 1)));
    return w;
  }

  // FFT radix-2, taille puissance de 2
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < len / 2; k++) {
          const c = Math.cos(ang * k), s = Math.sin(ang * k);
          const ur = re[i+k], ui = im[i+k];
          const vr = re[i+k+len/2] * c - im[i+k+len/2] * s;
          const vi = re[i+k+len/2] * s + im[i+k+len/2] * c;
          re[i+k] = ur + vr; im[i+k] = ui + vi;
          re[i+k+len/2] = ur - vr; im[i+k+len/2] = ui - vi;
        }
      }
    }
  }

  // spectre d'amplitude d'une frame
  function spectrum(buf, sr) {
    const n = 1 << Math.ceil(Math.log2(buf.length)); // pad
    const re = new Float32Array(n), im = new Float32Array(n);
    const win = hanning(buf);
    for (let i = 0; i < buf.length; i++) re[i] = win[i];
    fft(re, im);
    const mags = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) mags[i] = Math.hypot(re[i], im[i]);
    const hzPerBin = sr / n;
    return { mags, hzPerBin };
  }

  // énergie dans une bande de fréquences (Hz)
  function bandEnergy(mags, hzPerBin, lo, hi) {
    let e = 0;
    const a = Math.max(0, Math.floor(lo / hzPerBin));
    const b = Math.min(mags.length - 1, Math.ceil(hi / hzPerBin));
    for (let i = a; i <= b; i++) e += mags[i] * mags[i];
    return e;
  }

  function centroid(mags, hzPerBin, lo, hi) {
    let num = 0, den = 0;
    const a = Math.max(0, Math.floor(lo / hzPerBin));
    const b = Math.min(mags.length - 1, Math.ceil(hi / hzPerBin));
    for (let i = a; i <= b; i++) {
      const m = mags[i] * mags[i];
      num += m * (i * hzPerBin); den += m;
    }
    return den ? num / den : 0;
  }

  // ---------- pitch (F0) par autocorrélation ----------

  function pitchOf(buf, sr) {
    const minLag = Math.floor(sr / 400), maxLag = Math.floor(sr / 75);
    let best = -1, bestVal = 0;
    let energy = 0;
    for (let i = 0; i < buf.length; i++) energy += buf[i] * buf[i];
    if (energy < 1e-5) return 0;
    for (let lag = minLag; lag <= maxLag && lag < buf.length; lag++) {
      let c = 0;
      for (let i = 0; i < buf.length - lag; i++) c += buf[i] * buf[i + lag];
      c /= (buf.length - lag);
      if (c > bestVal) { bestVal = c; best = lag; }
    }
    if (best < 0 || bestVal < energy / buf.length * 0.25) return 0; // non voisé
    return sr / best;
  }

  function trackPitch(data, sr) {
    const size = Math.floor(sr * 0.032), hop = Math.floor(sr * 0.012);
    const pts = [];
    for (let i = 0; i + size <= data.length; i += hop) {
      const f0 = pitchOf(data.subarray(i, i + size), sr);
      pts.push({ t: (i + size / 2) / sr, f0, energy: rms(data.subarray(i, i + size)) });
    }
    return pts;
  }

  // ---------- segmentation par énergie (syllabes) ----------

  function segmentsFromEnergy(pts) {
    if (!pts.length) return [];
    const max = Math.max(...pts.map(p => p.energy));
    const on = max * 0.12;
    const segs = [];
    let cur = null;
    for (const p of pts) {
      if (p.energy >= on) { if (!cur) cur = { start: p.t, end: p.t }; cur.end = p.t; }
      else if (cur) { segs.push(cur); cur = null; }
    }
    if (cur) segs.push(cur);
    // fusion des segments trop proches (<120 ms de silence)
    const merged = [];
    for (const s of segs) {
      const last = merged[merged.length - 1];
      if (last && s.start - last.end < 0.12) last.end = s.end;
      else merged.push(s);
    }
    return merged.filter(s => s.end - s.start > 0.08);
  }

  // ---------- classification des sibilantes ----------
  // Classes acoustiques : "s" (dentale, énergie 5,5–11 kHz),
  // "x" (alvéolo-palatale, 3,5–5,5 kHz), "sh" (rétroflexe, 1,5–3,5 kHz)

  const SIBILANT_CLASS = {
    s: "s", z: "s", c: "s",
    x: "x", j: "x", q: "x",
    sh: "sh", zh: "sh", ch: "sh",
  };

  function classifyFricative(data, sr) {
    const size = Math.floor(sr * 0.03), hop = Math.floor(sr * 0.012);
    let best = null, bestScore = 0;
    for (let i = 0; i + size <= data.length; i += hop) {
      const buf = data.subarray(i, i + size);
      const { mags, hzPerBin } = spectrum(buf, sr);
      const hiE = bandEnergy(mags, hzPerBin, 3000, 11000);
      const lowE = bandEnergy(mags, hzPerBin, 80, 3000);
      const voiced = pitchOf(buf, sr) > 0;
      const score = hiE / (hiE + lowE + 1e-9) * (voiced ? 0.3 : 1);
      if (!voiced && score > bestScore) { bestScore = score; best = { mags, hzPerBin, t: i / sr }; }
    }
    if (!best) return null;
    const e1 = bandEnergy(best.mags, best.hzPerBin, 1500, 3500);
    const e2 = bandEnergy(best.mags, best.hzPerBin, 3500, 5500);
    const e3 = bandEnergy(best.mags, best.hzPerBin, 5500, 11000);
    const tot = e1 + e2 + e3 || 1;
    const r1 = e1 / tot, r2 = e2 / tot, r3 = e3 / tot;
    const cen = centroid(best.mags, best.hzPerBin, 1500, 11000);
    let cls;
    if (r3 > 0.45) cls = "s";
    else if (r1 > 0.45 && r3 < 0.2) cls = "sh";
    else if (r2 >= r1 && r2 >= r3) cls = "x";
    else if (r1 > r3) cls = "sh";
    else cls = "s";
    return { cls, ratios: { grave: r1, moyen: r2, aigu: r3 }, centroid: cen };
  }

  // ---------- contours de tons ----------

  const TONE_TEMPLATES = {
    1: [0.80, 0.82, 0.84, 0.82],
    2: [0.35, 0.50, 0.70, 0.88],
    3: [0.55, 0.35, 0.18, 0.45],
    4: [0.90, 0.70, 0.40, 0.15],
  };

  function contourOfSeg(pts, seg) {
    const vals = pts.filter(p => p.t >= seg.start && p.t <= seg.end && p.f0 > 0).map(p => p.f0);
    if (vals.length < 2) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.1)];
    const hi = sorted[Math.floor(sorted.length * 0.9)];
    const norm = vals.map(v => hi > lo ? (v - lo) / (hi - lo) : 0.5);
    const out = [];
    for (let k = 0; k < 4; k++) {
      const a = Math.floor(k * (norm.length - 1) / 3);
      const b = Math.ceil(k * (norm.length - 1) / 3);
      out.push((norm[a] + norm[b]) / 2);
    }
    return out;
  }

  function compareTone(contour, tone) {
    const tpl = TONE_TEMPLATES[tone];
    let err = 0;
    for (let i = 0; i < 4; i++) err += Math.abs(contour[i] - tpl[i]);
    err /= 4;
    return Math.max(0, Math.round((1 - err / 0.9) * 100));
  }

  // ---------- API principale ----------

  async function analyze(blob, exercise, mode) {
    const { data, sr } = await decode(blob);
    const pts = trackPitch(data, sr);
    const segs = segmentsFromEnergy(pts);
    const result = { mode, segs, pts, items: [], chartData: [] };

    if (mode === "consonants") {
      const sibs = exercise.focus.filter(f => SIBILANT_CLASS[f.initial]);
      const withSib = sibs.length ? sibs : exercise.focus;
      const analysis = classifyFricative(data, sr);
      for (const f of withSib.slice(0, 4)) {
        const targetCls = SIBILANT_CLASS[f.initial] || null;
        if (!targetCls) continue;
        if (!analysis) {
          result.items.push({ focus: f.pinyin, target: f.initial, verdict: "warn",
            msg: "Fricative non détectée — parlez plus fort ou rapprochez le micro." });
          continue;
        }
        const ok = analysis.cls === targetCls;
        const clsDesc = analysis.cls === "s" ? "une sifflante dentale (aiguë)"
          : analysis.cls === "x" ? "une fricative palatale (médiane)"
          : "une rétroflexe (grave)";
        result.items.push({
          focus: f.pinyin, target: f.initial, heard: analysis.cls, verdict: ok ? "ok" : "bad",
          msg: ok
            ? `« ${f.pinyin} » (${f.initial}) : bien positionné, votre son correspond à ${clsDesc}.`
            : `« ${f.pinyin} » : vous visiez ${f.initial} mais le son entendu ressemble plutôt à ${analysis.cls}. Répartition : grave ${(analysis.ratios.grave*100)|0}% · moyen ${(analysis.ratios.moyen*100)|0}% · aigu ${(analysis.ratios.aigu*100)|0}% (centre ${Math.round(analysis.centroid)} Hz).`,
        });
      }
    }

    if (mode === "tones") {
      const tones = exercise.focus.slice(0, 4);
      for (let i = 0; i < tones.length; i++) {
        const seg = segs[i];
        if (!seg) { result.items.push({ focus: tones[i].pinyin, verdict: "warn",
          msg: "Syllabe non détectée — réessayez plus près du micro." }); continue; }
        const c = contourOfSeg(pts, seg);
        if (!c) { result.items.push({ focus: tones[i].pinyin, verdict: "warn",
          msg: "Pas assez de voix détectée sur cette syllabe." }); continue; }
        const score = compareTone(c, tones[i].tone);
        result.items.push({
          focus: tones[i].pinyin, tone: tones[i].tone, contour: c, verdict: score >= 75 ? "ok" : score >= 45 ? "warn" : "bad",
          msg: `Ton ${tones[i].tone} sur « ${tones[i].pinyin} » : ${score}%. ` +
            (score >= 75 ? "c'est juste !" : score >= 45 ? "presque — " : "hmm — ") +
            tonAdvice(tones[i].tone),
        });
        result.chartData.push({ label: tones[i].pinyin, contour: c, tone: tones[i].tone });
      }
    }

    const scores = result.items.map(i => i.verdict === "ok" ? 100 : i.verdict === "warn" ? 50 : 10);
    result.score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return result;
  }

  function tonAdvice(t) {
    return {
      1: "gardez la voix haute et stable, sans monter ni descendre.",
      2: "partez du milieu et montez franchement, comme une question « hein ? »",
      3: "descendez d'abord dans le grave, puis remontez un peu — c'est le ton le plus bas des quatre.",
      4: "partez du plus haut et laissez tomber la voix, sec et affirmatif.",
    }[t] || "";
  }

  return { analyze, SIBILANT_CLASS, TONE_TEMPLATES };
})();

window.Analysis = Analysis;
