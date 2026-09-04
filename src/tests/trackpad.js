import { el, clear } from '../core/dom.js';

/* Test trackpad: una superficie che raccoglie pointer, wheel e gesture. Una
   serie di micro-attivita' (muovi, click nelle 9 zone, click destro, doppio
   click, scroll X/Y, trascinamento, pinch) che si spuntano da sole. */

export default {
  intro: `
    <h2>Test del trackpad</h2>
    <p>Completa le attività qui sotto usando <strong>solo il trackpad</strong>. Ogni voce si spunta
    da sola quando riuscita.</p>
    <ul>
      <li><strong>Click destro</strong> = tap con due dita o <kbd>⌃</kbd>+click.</li>
      <li><strong>Scroll</strong> = due dita su/giù e destra/sinistra.</li>
      <li><strong>Pinch/zoom</strong> = due dita che si avvicinano/allontanano.</li>
      <li>La <strong>pressione a scatto</strong> (Force Touch) e il <strong>tap-to-click</strong> non sono
        misurabili dal browser: provali a mano.</li>
    </ul>
  `,

  async render(ctx) {
    const state = {
      move: { q: new Set() },
      leftZones: new Set(),
      rightZones: new Set(),
      dbl: false,
      scroll: { up: false, down: false, left: false, right: false },
      drag: false,
      pinchIn: false,
      pinchOut: false,
    };

    const pad = el('div', { class: 'pad' });
    const canvas = el('canvas');
    pad.append(canvas);
    const info = el('div', { class: 'kb-readout' });
    const checklist = el('div', { class: 'checklist' });
    const modeRow = el('div', { class: 'btn-row' });

    ctx.stage.append(
      el('div', { class: 'stack' }, modeRow, pad, info, el('h3', {}, 'Attività'), checklist),
    );

    // canvas hi-dpi
    const g = canvas.getContext('2d');
    function sizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = pad.clientWidth * dpr;
      canvas.height = pad.clientHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    // --- trail di movimento + heatmap dei quadranti ---
    const trail = [];
    function quadrant(x, y) {
      const w = pad.clientWidth;
      const h = pad.clientHeight;
      const cx = x < w / 3 ? 0 : x > (2 * w) / 3 ? 2 : 1;
      const cy = y < h / 3 ? 0 : y > (2 * h) / 3 ? 2 : 1;
      return cy * 3 + cx;
    }
    function draw() {
      g.clearRect(0, 0, pad.clientWidth, pad.clientHeight);
      g.strokeStyle = 'rgba(58,134,255,0.7)';
      g.lineWidth = 2;
      g.beginPath();
      trail.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
      const last = trail[trail.length - 1];
      if (last) {
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(last.x, last.y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }

    const onMove = (e) => {
      const r = pad.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      trail.push({ x, y });
      if (trail.length > 260) trail.shift();
      state.move.q.add(quadrant(x, y));
      draw();
      info.innerHTML =
        `<span>x: ${x.toFixed(0)} y: ${y.toFixed(0)}</span>` +
        `<span>pointerType: ${e.pointerType || '—'}</span>` +
        `<span>pressure: ${e.pressure?.toFixed(2) ?? '—'}</span>` +
        `<span>buttons: ${e.buttons}</span>` +
        `<span>quadranti visitati: ${state.move.q.size}/9</span>` +
        `<span>maxTouchPoints: ${navigator.maxTouchPoints}</span>`;
      refresh();
    };
    pad.addEventListener('pointermove', onMove);

    // --- 9 zone per click sinistro / destro ---
    const zonesWrap = el('div');
    pad.append(zonesWrap);
    for (let i = 0; i < 9; i += 1) {
      const z = el('div', {
        class: 'pad__zone',
        dataset: { i: String(i) },
        style: {
          left: `${(i % 3) * 33.33}%`,
          top: `${Math.floor(i / 3) * 33.33}%`,
          width: '33.33%',
          height: '33.33%',
        },
      });
      z.textContent = 'L+R';
      zonesWrap.append(z);
    }
    function paintZones() {
      zonesWrap.querySelectorAll('.pad__zone').forEach((z) => {
        const i = Number(z.dataset.i);
        const l = state.leftZones.has(i);
        const r = state.rightZones.has(i);
        z.classList.toggle('is-hit', l && r);
        z.textContent = `${l ? '✔L' : 'L'} ${r ? '✔R' : 'R'}`;
      });
    }
    pad.addEventListener('click', (e) => {
      const r = pad.getBoundingClientRect();
      state.leftZones.add(quadrant(e.clientX - r.left, e.clientY - r.top));
      paintZones();
      refresh();
    });
    pad.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const r = pad.getBoundingClientRect();
      state.rightZones.add(quadrant(e.clientX - r.left, e.clientY - r.top));
      paintZones();
      refresh();
    });
    pad.addEventListener('dblclick', () => {
      state.dbl = true;
      refresh();
    });

    // --- scroll ---
    pad.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (e.ctrlKey) {
          // pinch-zoom su trackpad Mac in Chrome => wheel + ctrlKey
          if (e.deltaY < 0) state.pinchOut = true;
          if (e.deltaY > 0) state.pinchIn = true;
        } else {
          if (e.deltaY < -1) state.scroll.up = true;
          if (e.deltaY > 1) state.scroll.down = true;
          if (e.deltaX < -1) state.scroll.left = true;
          if (e.deltaX > 1) state.scroll.right = true;
        }
        refresh();
      },
      { passive: false },
    );

    // --- gesture Safari (pinch / rotate) ---
    ['gesturechange'].forEach((ev) =>
      pad.addEventListener(ev, (e) => {
        if (e.scale > 1.05) state.pinchOut = true;
        if (e.scale < 0.95) state.pinchIn = true;
        refresh();
      }),
    );

    // --- trascinamento: puck -> target ---
    const target = el('div', { class: 'pad__target', style: { right: '8%', bottom: '10%' } });
    const puck = el('div', { class: 'pad__puck', style: { left: '8%', top: '10%' } }, '↔');
    pad.append(target, puck);
    let dragging = false;
    puck.addEventListener('pointerdown', (e) => {
      dragging = true;
      puck.setPointerCapture(e.pointerId);
      puck.style.cursor = 'grabbing';
    });
    puck.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const r = pad.getBoundingClientRect();
      puck.style.left = `${e.clientX - r.left - 23}px`;
      puck.style.top = `${e.clientY - r.top - 23}px`;
      const tr = target.getBoundingClientRect();
      const pr = puck.getBoundingClientRect();
      const near =
        Math.abs(tr.left + tr.width / 2 - (pr.left + pr.width / 2)) < 30 &&
        Math.abs(tr.top + tr.height / 2 - (pr.top + pr.height / 2)) < 30;
      if (near) {
        state.drag = true;
        target.style.borderColor = 'var(--ok)';
        refresh();
      }
    });
    puck.addEventListener('pointerup', () => {
      dragging = false;
      puck.style.cursor = 'grab';
    });

    // --- checklist ---
    const TASKS = [
      ['Muovi il puntatore in tutte le zone dello schermo', () => state.move.q.size >= 9],
      ['Click sinistro in ognuna delle 9 zone', () => state.leftZones.size >= 9],
      ['Click destro (due dita) in ognuna delle 9 zone', () => state.rightZones.size >= 9],
      ['Doppio click', () => state.dbl],
      ['Scroll verso l’alto e verso il basso', () => state.scroll.up && state.scroll.down],
      ['Scroll verso sinistra e verso destra', () => state.scroll.left && state.scroll.right],
      ['Trascina il cerchio blu sul bersaglio', () => state.drag],
      ['Pinch: zoom avanti e zoom indietro', () => state.pinchIn && state.pinchOut],
    ];
    function refresh() {
      clear(checklist);
      let doneCount = 0;
      TASKS.forEach(([label, fn]) => {
        const done = !!fn();
        if (done) doneCount += 1;
        checklist.append(
          el(
            'div',
            { class: `checklist__item ${done ? 'is-done' : ''}` },
            el('span', { class: 'checklist__box' }, done ? '✔' : ''),
            el('span', {}, label),
          ),
        );
      });
      ctx.setData({
        completate: doneCount,
        totali: TASKS.length,
        quadranti: state.move.q.size,
        maxTouchPoints: navigator.maxTouchPoints,
      });
      if (doneCount === TASKS.length) ctx.setStatusHint?.('ok');
    }

    ctx.onCleanup(() => window.removeEventListener('resize', sizeCanvas));
    refresh();
    paintZones();
  },
};
