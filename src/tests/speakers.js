import { el } from '../core/dom.js';

/* Altoparlanti: toni per canale sinistro/destro, sweep di frequenza, quiz di
   identificazione canale. Volume di sicurezza con rampa dolce del guadagno. */

export default {
  intro: `
    <h2>Test degli altoparlanti</h2>
    <p><strong>Abbassa il volume di sistema</strong> prima di iniziare, poi alzalo con calma.</p>
    <ul>
      <li>Suono pulito, senza distorsione, vibrazioni o crepitii.</li>
      <li>Canali sinistro e destro entrambi funzionanti e bilanciati.</li>
      <li>Lo sweep deve essere continuo, senza buchi o rumori anomali.</li>
    </ul>
    <p class="mono">Volume, distorsione a volume alto e risposta in frequenza reale dipendono
    dall’hardware e non sono misurabili con precisione dal browser.</p>
  `,

  async render(ctx) {
    let audioCtx = null;
    const ensureCtx = () => {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    };

    let volume = 0.15;

    function tone(freq, pan, seconds = 1.4) {
      const ac = ensureCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const panner = ac.createStereoPanner();
      osc.type = 'sine';
      osc.frequency.value = freq;
      panner.pan.value = pan;
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(panner).connect(ac.destination);
      const t = ac.currentTime;
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.05);
      gain.gain.setValueAtTime(volume, t + seconds - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
      osc.start(t);
      osc.stop(t + seconds + 0.02);
    }

    function sweep(seconds = 8) {
      const ac = ensureCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(ac.destination);
      const t = ac.currentTime;
      osc.frequency.setValueAtTime(20, t);
      osc.frequency.exponentialRampToValueAtTime(20000, t + seconds);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.05);
      gain.gain.setValueAtTime(volume, t + seconds - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
      osc.start(t);
      osc.stop(t + seconds + 0.05);
    }

    const volSlider = el('input', {
      type: 'range',
      min: '0.02',
      max: '0.5',
      step: '0.01',
      value: String(volume),
      onInput: (e) => {
        volume = Number(e.target.value);
      },
    });

    // quiz canali
    let round = 0;
    let score = 0;
    let currentSide = null;
    const quizStatus = el('p', { class: 'mono' }, 'Premi “Nuova prova” e indica da che lato senti il suono.');
    function newRound() {
      currentSide = Math.random() < 0.5 ? -1 : 1;
      tone(440, currentSide, 1.2);
      quizStatus.textContent = `Prova ${round + 1}/4 — ascolta…`;
    }
    function answer(side) {
      if (currentSide == null) return;
      if (side === currentSide) score += 1;
      round += 1;
      currentSide = null;
      ctx.setData({ quizCanali: `${score}/${round}`, volume });
      if (round >= 4) {
        quizStatus.textContent = `Risultato: ${score}/4 corrette.`;
        if (score === 4) ctx.setStatusHint?.('ok');
      } else {
        quizStatus.textContent = `${score}/${round} — premi “Nuova prova”.`;
      }
    }

    const freqs = [60, 125, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000];

    ctx.stage.append(
      el(
        'div',
        { class: 'stack' },
        el('div', { class: 'notice notice--warn' }, 'Controlla che il volume di sistema non sia al massimo.'),
        el('label', { class: 'mono' }, 'Volume test: ', volSlider),
        el('h3', {}, 'Canali'),
        el(
          'div',
          { class: 'btn-row' },
          el('button', { class: 'btn', type: 'button', onClick: () => tone(440, -1) }, '◀ Solo sinistro'),
          el('button', { class: 'btn', type: 'button', onClick: () => tone(440, 1) }, 'Solo destro ▶'),
          el('button', { class: 'btn', type: 'button', onClick: () => tone(440, 0) }, '● Entrambi'),
        ),
        el('h3', {}, 'Sweep di frequenza'),
        el('div', { class: 'btn-row' }, el('button', { class: 'btn', type: 'button', onClick: () => sweep(8) }, '20 Hz → 20 kHz (8 s)')),
        el('h3', {}, 'Frequenze fisse'),
        el(
          'div',
          { class: 'btn-row' },
          ...freqs.map((f) =>
            el('button', { class: 'btn btn--sm', type: 'button', onClick: () => tone(f, 0, 1.2) }, f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`),
          ),
        ),
        el('h3', {}, 'Quiz identificazione canale'),
        quizStatus,
        el(
          'div',
          { class: 'btn-row' },
          el('button', { class: 'btn', type: 'button', onClick: () => round < 4 && newRound() }, '🔁 Nuova prova'),
          el('button', { class: 'btn', type: 'button', onClick: () => answer(-1) }, 'Ho sentito a SINISTRA'),
          el('button', { class: 'btn', type: 'button', onClick: () => answer(1) }, 'Ho sentito a DESTRA'),
        ),
      ),
    );

    ctx.onCleanup(() => {
      if (audioCtx) audioCtx.close();
    });
  },
};
