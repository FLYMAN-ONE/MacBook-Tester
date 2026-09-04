import { el, pill, dashCard, dashRow } from '../core/dom.js';
import { mountAppleCompare } from '../core/apple-compare.js';

/* Rilevamento refresh e FPS in tempo reale: gauge circolare, statistiche frame,
   grafico del frame time, motion test con 1x/2x/4x, giudizio sul display. */

export default {
  bare: true,
  intro: `
    <h2>Refresh rate & FPS</h2>
    <p>Misura in tempo reale la frequenza di aggiornamento del display tramite il ciclo di
    rendering del browser. Lascia la pagina in primo piano per qualche secondo.</p>
    <p class="mono">Un MacBook standard gira a ~60 Hz; i modelli con ProMotion arrivano a 120 Hz.
    Il valore misurato è indicativo (può essere limitato dal browser o dal risparmio energetico).</p>
    <p>In fondo puoi <strong>scegliere il modello</strong> e confrontare la frequenza misurata con le
    <strong>specifiche ufficiali Apple</strong> (dai chip M1 in poi).</p>
  `,

  async render(ctx) {
    // stato misurazione
    let last = performance.now();
    const intervals = [];
    let frames = 0;
    let fpsCurrent = 0;
    let fpsMin = Infinity;
    let fpsMax = 0;
    let fpsAvgAcc = 0;
    let fpsAvgN = 0;
    let windowStart = last;
    let rafId = null;
    let motionSpeed = 1;
    let motionX = 0;

    // ---- Hero: gauge ----
    const R = 85;
    const CIRC = 2 * Math.PI * R;
    const arc = el('circle', {
      cx: '100',
      cy: '100',
      r: String(R),
      fill: 'none',
      stroke: 'url(#gg)',
      'stroke-width': '12',
      'stroke-linecap': 'round',
      'stroke-dasharray': String(CIRC),
      'stroke-dashoffset': String(CIRC),
    });
    const gaugeSvg = el('svg', { viewBox: '0 0 200 200' });
    gaugeSvg.innerHTML = `
      <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/>
      </linearGradient></defs>
      <circle cx="100" cy="100" r="${R}" fill="none" stroke="#26262e" stroke-width="12"/>`;
    gaugeSvg.append(arc);

    const gaugeNum = el('div', { class: 'gauge__num' }, '—');
    const gauge = el(
      'div',
      { class: 'gauge' },
      gaugeSvg,
      el('div', { class: 'gauge__center' }, gaugeNum, el('div', { class: 'gauge__unit' }, 'Hz')),
    );
    const heroFootMono = el('span', { class: 'mono' }, 'min — · max —');
    const hero = dashCard(
      { icon: '⚡', iconColor: 'blue', title: 'Frequenza display', hero: true, badge: pill('Live', 'blue') },
      el('div', { class: 'hero-body' }, gauge),
      el('div', { class: 'hero-foot' }, el('span', {}, 'Rilevamento in tempo reale'), heroFootMono),
    );

    // ---- Frame stats ----
    const rowCur = dashRow('FPS attuale', '—', { icon: '⚡', color: 'blue' });
    const rowMax = dashRow('FPS massimo', '—', { icon: '▲', color: 'green' });
    const rowMin = dashRow('FPS minimo', '—', { icon: '▼', color: 'amber' });
    const rowAvg = dashRow('FPS medio', '—', { icon: '▦' });
    const statsCard = dashCard(
      { icon: '📊', iconColor: 'green', title: 'Statistiche frame' },
      rowCur,
      rowMax,
      rowMin,
      rowAvg,
    );
    const setRow = (row, txt) => {
      row.querySelector('.dash-row__value').textContent = txt;
    };

    // ---- Frame time ----
    const bars = el('div', { class: 'bars' });
    const ftBadge = pill('~—', 'blue');
    const ftCard = dashCard({ icon: '⏱️', iconColor: 'pink', title: 'Frame time', badge: ftBadge }, bars);

    // ---- Motion test ----
    const dot = el('div', { class: 'motion__dot' });
    const motion = el('div', { class: 'motion' }, dot);
    const speedBtns = [1, 2, 4].map((s) =>
      el(
        'button',
        {
          type: 'button',
          class: s === 1 ? 'is-active' : '',
          onClick: (e) => {
            motionSpeed = s;
            seg.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === e.currentTarget));
          },
        },
        `${s}x`,
      ),
    );
    const seg = el('div', { class: 'seg' }, ...speedBtns);
    const motionCard = dashCard(
      { icon: '👁️', iconColor: 'purple', title: 'Motion test', badge: pill('3 velocità', 'purple') },
      el('p', { class: 'mono' }, 'Segui il riquadro: cerca scie o scatti.'),
      seg,
      motion,
    );

    // ---- Display rating ----
    const rRating = dashRow('Giudizio display', '—', { icon: '◉' });
    const rInterval = dashRow('Intervallo frame', '—', { icon: '⏱️' });
    const rFps = dashRow('Frame al secondo', '—', { icon: '🖥️' });
    const rStab = dashRow('Stabilità', '—', { icon: '📈' });
    const ratingBadge = pill('—', 'amber');
    const ratingCard = dashCard(
      { icon: '◎', iconColor: 'amber', title: 'Valutazione', badge: ratingBadge },
      rRating,
      rInterval,
      rFps,
      rStab,
    );

    ctx.stage.append(
      el(
        'div',
        { class: 'dash-layout' },
        el('div', { class: 'dash-hero' }, hero),
        statsCard,
        ftCard,
        motionCard,
        ratingCard,
      ),
    );

    let measuredHz = 0;
    const cmp = mountAppleCompare(ctx.stage, { getHz: () => measuredHz || null });

    function classify(hz, stabMs) {
      let label = 'Standard';
      let color = 'amber';
      if (hz >= 100) {
        label = 'ProMotion / 120 Hz';
        color = 'green';
      } else if (hz >= 70) {
        label = 'Alta frequenza';
        color = 'green';
      } else if (hz >= 50) {
        label = 'Standard 60 Hz';
        color = 'blue';
      } else {
        label = 'Basso / limitato';
        color = 'amber';
      }
      let stab = 'Eccellente';
      if (stabMs > 3) stab = 'Instabile';
      else if (stabMs > 1.2) stab = 'Buona';
      return { label, color, stab };
    }

    function paint() {
      // gauge: 60 -> ~0.5, 120 -> ~1
      const frac = Math.max(0.04, Math.min(1, fpsCurrent / 132));
      arc.setAttribute('stroke-dashoffset', String(CIRC * (1 - frac)));
      gaugeNum.textContent = fpsCurrent ? String(Math.round(fpsCurrent)) : '—';

      setRow(rowCur, fpsCurrent ? `${Math.round(fpsCurrent)} FPS` : '—');
      setRow(rowMax, fpsMax ? `${Math.round(fpsMax)} FPS` : '—');
      setRow(rowMin, Number.isFinite(fpsMin) ? `${Math.round(fpsMin)} FPS` : '—');
      const avg = fpsAvgN ? fpsAvgAcc / fpsAvgN : 0;
      setRow(rowAvg, avg ? `${Math.round(avg)} FPS` : '—');

      const recent = intervals.slice(-70);
      const med = recent.length ? [...recent].sort((a, b) => a - b)[Math.floor(recent.length / 2)] : 0;
      ftBadge.textContent = med ? `~${med.toFixed(1)}ms` : '~—';
      heroFootMono.textContent = `min ${Number.isFinite(fpsMin) ? Math.round(fpsMin) : '—'} · max ${fpsMax ? Math.round(fpsMax) : '—'}`;

      // barre frame time (scala: 0..33ms)
      bars.replaceChildren(
        ...recent.map((v) => {
          const h = Math.max(4, Math.min(100, (v / 33) * 100));
          const b = el('div', { class: `bars__bar${v > 22 ? ' is-bad' : ''}`, style: { height: `${h}%` } });
          return b;
        }),
      );

      // stabilità = deviazione std degli intervalli recenti
      let stabMs = 0;
      if (recent.length > 5) {
        const m = recent.reduce((a, b) => a + b, 0) / recent.length;
        stabMs = Math.sqrt(recent.reduce((a, b) => a + (b - m) ** 2, 0) / recent.length);
      }
      const hz = avg || fpsCurrent;
      measuredHz = Math.round(hz);
      const c = classify(hz, stabMs);
      ratingBadge.textContent = c.label;
      ratingBadge.className = `pill pill--${c.color}`;
      setRow(rRating, c.label);
      setRow(rInterval, med ? `${med.toFixed(1)}ms` : '—');
      setRow(rFps, hz ? `${Math.round(hz)}` : '—');
      setRow(rStab, recent.length > 5 ? `${c.stab} (±${stabMs.toFixed(1)}ms)` : '—');

      ctx.setData({
        hz: Math.round(hz),
        fpsMin: Number.isFinite(fpsMin) ? Math.round(fpsMin) : null,
        fpsMax: Math.round(fpsMax),
        fpsMedio: Math.round(avg),
        frameIntervalMs: med ? +med.toFixed(1) : null,
        stabilita: c.stab,
        giudizio: c.label,
      });
    }

    let lastPaint = 0;
    let hinted = false;
    function loop(now) {
      const dt = now - last;
      last = now;
      if (dt > 0 && dt < 200) {
        intervals.push(dt);
        if (intervals.length > 400) intervals.shift();
      }
      frames += 1;

      // motion: avanti e indietro (ping-pong)
      const range = Math.max(1, motion.clientWidth - 46);
      motionX += (dt / 1000) * 260 * motionSpeed;
      const phase = motionX % (range * 2);
      dot.style.transform = `translateX(${phase > range ? range * 2 - phase : phase}px)`;

      if (now - windowStart >= 500) {
        fpsCurrent = (frames * 1000) / (now - windowStart);
        if (fpsCurrent > fpsMax) fpsMax = fpsCurrent;
        if (fpsCurrent < fpsMin) fpsMin = fpsCurrent;
        fpsAvgAcc += fpsCurrent;
        fpsAvgN += 1;
        frames = 0;
        windowStart = now;
      }

      if (now - lastPaint >= 250) {
        paint();
        lastPaint = now;
        if (fpsAvgN >= 6 && !hinted) {
          hinted = true;
          ctx.setStatusHint?.('ok');
          cmp.refresh();
        }
        if (fpsAvgN === 22) cmp.refresh(); // affinamento dopo ~10 s
      }
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    ctx.onCleanup(() => {
      if (rafId) cancelAnimationFrame(rafId);
    });
  },
};
