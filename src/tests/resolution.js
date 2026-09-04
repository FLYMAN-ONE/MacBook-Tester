import { el, pill, dashCard, dashRow } from '../core/dom.js';

/* Risoluzione e parametri schermo: risoluzione fisica, DPR, aspect ratio,
   confronto con gli standard e info su finestra/scaling. */

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

function aspectRatio(w, h) {
  const d = gcd(w, h) || 1;
  let rw = w / d;
  let rh = h / d;
  // arrotonda a rapporti "umani" quando è vicino
  const common = [
    [16, 9],
    [16, 10],
    [4, 3],
    [21, 9],
    [3, 2],
    [5, 4],
  ];
  for (const [cw, ch] of common) {
    if (Math.abs(rw / rh - cw / ch) < 0.03) return `${cw}:${ch}`;
  }
  if (rw > 40 || rh > 40) return (w / h).toFixed(2) + ':1';
  return `${rw}:${rh}`;
}

function resClass(w) {
  if (w >= 7000) return { label: '8K', color: 'pink' };
  if (w >= 3400) return { label: '4K UHD', color: 'green' };
  if (w >= 2400) return { label: 'QHD', color: 'purple' };
  if (w >= 1800) return { label: 'Full HD', color: 'blue' };
  if (w >= 1200) return { label: 'HD', color: 'amber' };
  return { label: 'SD', color: 'amber' };
}

async function estimateRefresh() {
  return new Promise((resolve) => {
    const samples = [];
    let last = performance.now();
    let n = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (!samples.length) return resolve(null);
      samples.sort((a, b) => a - b);
      const m = samples[Math.floor(samples.length / 2)];
      resolve(m > 0 ? Math.round(1000 / m) : null);
    };
    const tick = (now) => {
      samples.push(now - last);
      last = now;
      n += 1;
      if (n < 50) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
    setTimeout(finish, 1600);
  });
}

export default {
  bare: true,
  intro: `
    <h2>Risoluzione e schermo</h2>
    <p>Confronta questi dati con quanto dichiarato nell’annuncio: risoluzione nativa, aspect ratio
    e densità (Retina). Su un MacBook la risoluzione <em>fisica</em> è la logica moltiplicata per il
    fattore di scala.</p>
  `,

  async render(ctx) {
    const dpr = window.devicePixelRatio || 1;
    const logW = screen.width;
    const logH = screen.height;
    const physW = Math.round(logW * dpr);
    const physH = Math.round(logH * dpr);
    const total = physW * physH;
    const ar = aspectRatio(physW, physH);
    const rc = resClass(physW);
    const refresh = await estimateRefresh();

    const totalStr = total >= 1e6 ? `${(total / 1e6).toFixed(1)}M` : `${(total / 1e3).toFixed(0)}K`;
    const taskbar = Math.max(0, screen.height - screen.availHeight);
    const sidebar = Math.max(0, screen.width - screen.availWidth);

    // Hero
    const hero = dashCard(
      { icon: '🖥️', iconColor: 'blue', title: 'Risoluzione fisica', hero: true, badge: pill(rc.label, rc.color) },
      el(
        'div',
        { class: 'hero-body' },
        el('div', { class: 'hero-num hero-num--white' }, String(physW), el('span', { class: 'x' }, '×'), String(physH)),
        el('div', { class: 'hero-sub' }, 'pixel fisici del pannello'),
        el(
          'div',
          { class: 'hero-pills' },
          pill(rc.label, rc.color),
          pill(ar, 'purple'),
          pill(`@${dpr % 1 === 0 ? dpr : dpr.toFixed(2)}× ${dpr >= 2 ? 'Retina' : 'HiDPI'}`, 'green'),
        ),
      ),
      el(
        'div',
        { class: 'hero-foot' },
        el('span', {}, `Risoluzione logica: ${logW} × ${logH}`),
        el('span', { class: 'mono' }, `${screen.colorDepth}-bit`),
      ),
    );

    // Device info
    const deviceCard = dashCard(
      { icon: '🖥️', iconColor: 'blue', title: 'Info dispositivo', badge: pill(navigator.maxTouchPoints > 0 ? 'Touch' : 'Monitor', 'blue') },
      dashRow('Risoluzione logica', `${logW} × ${logH}`, { icon: '⛶' }),
      dashRow('Pixel ratio (DPR)', `${dpr}×`, { icon: '▦', color: 'blue' }),
      dashRow('Profondità colore', `${screen.colorDepth}-bit`, { icon: '🎨' }),
      dashRow('Refresh stimato', refresh ? `~${refresh} Hz` : '—', { icon: '⚡' }),
    );

    // Screen parameters
    const screenCard = dashCard(
      { icon: '⛶', iconColor: 'green', title: 'Parametri schermo', badge: pill(rc.label, rc.color) },
      dashRow('Risoluzione fisica', `${physW} × ${physH}`, { icon: '⛶', color: 'green' }),
      dashRow('Aspect ratio', ar, { icon: '▭' }),
      dashRow('Pixel totali', totalStr, { icon: '▦' }),
      dashRow('Area disponibile', `${screen.availWidth} × ${screen.availHeight}`, { icon: '◱' }),
    );

    // Resolution compare
    const STD = [
      ['HD', 1280],
      ['FHD', 1920],
      ['QHD', 2560],
      ['4K', 3840],
    ];
    const maxRef = 3840;
    let closest = 0;
    let bestDelta = Infinity;
    STD.forEach(([, w], i) => {
      const d = Math.abs(w - physW);
      if (d < bestDelta) {
        bestDelta = d;
        closest = i;
      }
    });
    const cmpCard = dashCard(
      { icon: '📊', iconColor: 'purple', title: 'Confronto standard' },
      ...STD.map(([name, w], i) =>
        el(
          'div',
          { class: `cmp-row ${i === closest ? 'is-you' : ''}` },
          el('span', { class: 'cmp-row__name' }, name),
          el('div', { class: 'cmp-row__track' }, el('div', { class: 'cmp-row__fill', style: { width: `${(w / maxRef) * 100}%` } })),
          el('span', { class: 'cmp-row__val' }, i === closest ? `★ ${w}px` : `${w}px`),
        ),
      ),
    );

    // Window & scaling
    const winCard = dashCard(
      { icon: '⛶', iconColor: 'cyan', title: 'Finestra & scaling' },
      dashRow('Finestra browser', `${window.innerWidth} × ${window.innerHeight}`, { icon: '▢' }),
      dashRow('Scala di sistema', `${Math.round(dpr * 100)}%`, { icon: '⤢', color: 'blue' }),
      dashRow('Orientamento', (screen.orientation?.type || 'landscape').split('-')[0] === 'portrait' ? 'Verticale' : 'Orizzontale', { icon: '🧭' }),
      dashRow('Ingombro UI', taskbar ? `${taskbar}px (barra)` : sidebar ? `${sidebar}px (dock lat.)` : '—', { icon: '▬' }),
    );

    ctx.stage.append(
      el(
        'div',
        { class: 'dash-layout' },
        el('div', { class: 'dash-hero' }, hero),
        deviceCard,
        screenCard,
        cmpCard,
        winCard,
      ),
    );

    ctx.setData({
      logica: `${logW}×${logH}`,
      fisica: `${physW}×${physH}`,
      dpr,
      aspectRatio: ar,
      classe: rc.label,
      refreshStimato: refresh,
      finestra: `${window.innerWidth}×${window.innerHeight}`,
    });
    ctx.setStatusHint?.('ok');
  },
};
