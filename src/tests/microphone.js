import { el, clear } from '../core/dom.js';

/* Microfono: VU meter (RMS -> dBFS), forma d'onda, spettro, e registrazione
   breve con riascolto. Tutto rilasciato all'uscita. */

export default {
  intro: `
    <h2>Test del microfono</h2>
    <p>Concedi il permesso al microfono. Parla a voce normale e batti le mani:</p>
    <ul>
      <li>Il livello deve salire quando parli e scendere nel silenzio.</li>
      <li>Nessun fruscio forte o ronzio costante con l’ambiente silenzioso.</li>
      <li>Registra qualche secondo e riascolta: la voce deve essere chiara.</li>
    </ul>
    <p class="mono">Il MacBook ha più microfoni: qui viene usato quello predefinito del sistema.</p>
  `,

  async render(ctx) {
    let stream = null;
    let audioCtx = null;
    let rafId = null;
    let recorder = null;
    let chunks = [];
    let peak = 0;

    const status = el('p', { class: 'mono' }, 'In attesa del permesso…');
    const meter = el('div', { class: 'meter' }, el('div', { class: 'meter__fill' }));
    const meterFill = meter.querySelector('.meter__fill');
    const readout = el('p', { class: 'mono' });
    const scope = el('canvas', { class: 'scope' });
    const spectrum = el('canvas', { class: 'scope' });
    const deviceInfo = el('p', { class: 'mono' });
    const recBtn = el('button', { class: 'btn', type: 'button' }, '⏺ Registra 5 s');
    const player = el('audio', { controls: true, style: { width: '100%', display: 'none' } });

    ctx.stage.append(
      el(
        'div',
        { class: 'stack' },
        status,
        deviceInfo,
        el('h3', {}, 'Livello'),
        meter,
        readout,
        el('h3', {}, 'Forma d’onda'),
        scope,
        el('h3', {}, 'Spettro'),
        spectrum,
        el('div', { class: 'btn-row' }, recBtn),
        player,
      ),
    );

    const sg = scope.getContext('2d');
    const fg = spectrum.getContext('2d');

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      status.textContent = 'Microfono attivo. Parla o batti le mani.';
      ctx.setStatusHint?.('ok');

      const track = stream.getAudioTracks()[0];
      deviceInfo.textContent = `Ingresso: ${track.label || 'predefinito'}`;

      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      const time = new Float32Array(analyser.fftSize);
      const freq = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getFloatTimeDomainData(time);
        analyser.getByteFrequencyData(freq);

        let sum = 0;
        let max = 0;
        for (let i = 0; i < time.length; i += 1) {
          sum += time[i] * time[i];
          max = Math.max(max, Math.abs(time[i]));
        }
        const rms = Math.sqrt(sum / time.length);
        const db = 20 * Math.log10(rms || 1e-8);
        peak = Math.max(peak * 0.995, max);
        meterFill.style.width = `${Math.min(100, Math.max(0, (db + 60) / 60 * 100))}%`;
        readout.textContent = `RMS ${db.toFixed(1)} dBFS · picco ${(20 * Math.log10(peak || 1e-8)).toFixed(1)} dBFS${max >= 0.99 ? ' · ⚠️ clipping' : ''}`;

        // waveform
        sg.fillStyle = '#12151b';
        sg.fillRect(0, 0, scope.width, scope.height);
        sg.strokeStyle = '#3a86ff';
        sg.lineWidth = 2;
        sg.beginPath();
        for (let i = 0; i < time.length; i += 1) {
          const x = (i / time.length) * scope.width;
          const y = (0.5 - time[i]) * scope.height;
          i ? sg.lineTo(x, y) : sg.moveTo(x, y);
        }
        sg.stroke();

        // spectrum
        fg.fillStyle = '#12151b';
        fg.fillRect(0, 0, spectrum.width, spectrum.height);
        const bars = 96;
        for (let i = 0; i < bars; i += 1) {
          const v = freq[Math.floor((i / bars) * freq.length)] / 255;
          fg.fillStyle = `hsl(${200 - v * 120}, 80%, 55%)`;
          fg.fillRect((i / bars) * spectrum.width, spectrum.height * (1 - v), spectrum.width / bars - 1, spectrum.height * v);
        }
        rafId = requestAnimationFrame(loop);
      };
      loop();

      recBtn.addEventListener('click', () => {
        if (recorder && recorder.state === 'recording') return;
        chunks = [];
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          player.src = URL.createObjectURL(blob);
          player.style.display = 'block';
        };
        recorder.start();
        recBtn.textContent = '⏺ Registrazione…';
        recBtn.disabled = true;
        setTimeout(() => {
          recorder.stop();
          recBtn.textContent = '⏺ Registra 5 s';
          recBtn.disabled = false;
        }, 5000);
      });
    } catch (err) {
      status.textContent = `Impossibile accedere al microfono: ${err.name} — ${err.message}`;
    }

    ctx.onCleanup(() => {
      if (rafId) cancelAnimationFrame(rafId);
      if (recorder && recorder.state === 'recording') recorder.stop();
      if (audioCtx) audioCtx.close();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (player.src) URL.revokeObjectURL(player.src);
    });
  },
};
