import { el, clear } from '../core/dom.js';

/* -------------------------------------------------------------------------
   Test del display: griglia di pattern (stile screen tester) + visore a
   schermo intero con navigazione da tastiera. Ogni pattern e' disegnato su
   canvas in pixel fisici del dispositivo, cosi' le trame da 1px sono nitide.
   Implementazione originale.
------------------------------------------------------------------------- */

function fill(color) {
  return (g, W, H) => {
    g.fillStyle = color;
    g.fillRect(0, 0, W, H);
  };
}

function linearGradient(stops, vertical = false) {
  return (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, vertical ? 0 : W, vertical ? H : 0);
    stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  };
}

function hueGradient(g, W, H) {
  for (let x = 0; x < W; x += 1) {
    g.fillStyle = `hsl(${(x / W) * 360}, 100%, 50%)`;
    g.fillRect(x, 0, 1, H);
  }
}

function grayBars(steps) {
  return (g, W, H) => {
    for (let i = 0; i < steps; i += 1) {
      const v = Math.round((i / (steps - 1)) * 255);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(Math.floor((i / steps) * W), 0, Math.ceil(W / steps) + 1, H);
    }
  };
}

function nearValuePatches(base, deltas, onBlack) {
  return (g, W, H) => {
    g.fillStyle = onBlack ? '#000' : '#fff';
    g.fillRect(0, 0, W, H);
    const cols = deltas.length;
    const cw = W / cols;
    deltas.forEach((d, i) => {
      const v = onBlack ? base + d : base - d;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(i * cw + cw * 0.15, H * 0.2, cw * 0.7, H * 0.6);
      g.fillStyle = onBlack ? '#555' : '#aaa';
      g.font = `${Math.round(H * 0.03)}px sans-serif`;
      g.fillText(String(v), i * cw + cw * 0.15, H * 0.16);
    });
  };
}

function colorBars(g, W, H) {
  const cols = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f', '#000'];
  const cw = W / cols.length;
  cols.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(i * cw, 0, cw + 1, H * 0.75);
  });
  // striscia PLUGE in basso
  const pl = ['#111', '#000', '#222', '#000', '#0a0a0a'];
  const pw = W / pl.length;
  pl.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(i * pw, H * 0.75, pw + 1, H * 0.25);
  });
}

function checker(size) {
  return (g, W, H) => {
    for (let y = 0; y < H; y += size) {
      for (let x = 0; x < W; x += size) {
        g.fillStyle = ((x / size + y / size) & 1) === 0 ? '#fff' : '#000';
        g.fillRect(x, y, size, size);
      }
    }
  };
}

function lines(size, vertical) {
  return (g, W, H) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    if (vertical) for (let x = 0; x < W; x += size * 2) g.fillRect(x, 0, size, H);
    else for (let y = 0; y < H; y += size * 2) g.fillRect(0, y, W, size);
  };
}

function concentric(g, W, H) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#fff';
  g.lineWidth = 1;
  const cx = W / 2;
  const cy = H / 2;
  for (let r = 4; r < Math.hypot(W, H); r += 6) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
}

function geometry(g, W, H) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#3a86ff';
  g.lineWidth = 1;
  const step = Math.round(Math.min(W, H) / 20);
  for (let x = 0; x <= W; x += step) {
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
    g.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
    g.stroke();
  }
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.strokeRect(1, 1, W - 2, H - 2);
  g.beginPath();
  g.ellipse(W / 2, H / 2, Math.min(W, H) / 2 - 2, Math.min(W, H) / 2 - 2, 0, 0, Math.PI * 2);
  g.stroke();
  // mirini negli angoli
  const m = step * 2;
  g.strokeStyle = '#ff006e';
  [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (x === 0 ? m : -m), y);
    g.moveTo(x, y);
    g.lineTo(x, y + (y === 0 ? m : -m));
    g.stroke();
  });
}

function splitBW(diagonal) {
  return (g, W, H) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    if (diagonal) {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(W, 0);
      g.lineTo(0, H);
      g.closePath();
      g.fill();
    } else {
      g.fillRect(0, 0, W / 2, H);
    }
  };
}

// pattern animati: draw(g, W, H, t) con t in ms; speed applica un moltiplicatore
function movingBar(g, W, H, t) {
  g.fillStyle = '#808080';
  g.fillRect(0, 0, W, H);
  const x = (t * 0.35) % (W + 120) - 120;
  g.fillStyle = '#000';
  g.fillRect(x, 0, 90, H);
  g.fillStyle = '#fff';
  g.fillRect(x + 90, 0, 8, H);
}

function scrollingChecker(g, W, H, t) {
  const s = 24;
  const off = (t * 0.08) % (s * 2);
  for (let y = -s * 2; y < H + s * 2; y += s) {
    for (let x = -s * 2; x < W + s * 2; x += s) {
      g.fillStyle = ((Math.round((x + off) / s) + Math.round((y + off) / s)) & 1) === 0 ? '#e8e8e8' : '#181818';
      g.fillRect(x + off, y + off, s, s);
    }
  }
}

function strobe(g, W, H, t) {
  g.fillStyle = Math.floor(t / 250) % 2 === 0 ? '#fff' : '#000';
  g.fillRect(0, 0, W, H);
}

const GROUPS = [
  {
    name: 'Tinte piatte',
    patterns: [
      { name: 'Bianco', hint: 'Uniformità, dominanti di colore, macchie.', draw: fill('#ffffff') },
      { name: 'Nero', hint: 'Bleeding retroilluminazione, pixel sempre accesi (bianchi/colorati).', draw: fill('#000000') },
      { name: 'Rosso', hint: 'Subpixel rossi spenti = punti neri; verdi/blu accesi = punti colorati.', draw: fill('#ff0000') },
      { name: 'Verde', hint: 'Come sopra per il canale verde.', draw: fill('#00ff00') },
      { name: 'Blu', hint: 'Come sopra per il canale blu.', draw: fill('#0000ff') },
      { name: 'Ciano', hint: 'Verde + blu.', draw: fill('#00ffff') },
      { name: 'Magenta', hint: 'Rosso + blu.', draw: fill('#ff00ff') },
      { name: 'Giallo', hint: 'Rosso + verde.', draw: fill('#ffff00') },
      { name: 'Grigio 75%', hint: 'Uniformità nei toni chiari.', draw: fill('#bfbfbf') },
      { name: 'Grigio 50%', hint: 'Il più rivelatore per le disuniformità e le dominanti.', draw: fill('#808080') },
      { name: 'Grigio 25%', hint: 'Uniformità nei toni scuri, clouding.', draw: fill('#404040') },
      { name: 'Grigio 12%', hint: 'Clouding e aloni ai bordi.', draw: fill('#1f1f1f') },
    ],
  },
  {
    name: 'Gradienti',
    patterns: [
      { name: 'Grigio orizzontale', hint: 'Banding: cerca gradini netti invece di sfumatura continua.', draw: linearGradient(['#000', '#fff']) },
      { name: 'Grigio verticale', hint: 'Banding in verticale.', draw: linearGradient(['#000', '#fff'], true) },
      { name: 'Spettro (HSL)', hint: 'Transizioni di tinta pulite.', draw: hueGradient },
      { name: 'Nero → Rosso', hint: 'Banding nel canale rosso.', draw: linearGradient(['#000', '#f00']) },
      { name: 'Nero → Verde', hint: 'Banding nel canale verde.', draw: linearGradient(['#000', '#0f0']) },
      { name: 'Nero → Blu', hint: 'Banding nel canale blu.', draw: linearGradient(['#000', '#00f']) },
    ],
  },
  {
    name: 'Scala di grigi',
    patterns: [
      { name: '16 gradini', hint: 'Ogni gradino deve essere distinguibile dal vicino.', draw: grayBars(16) },
      { name: '32 gradini', hint: 'Gradini fini: crush nei neri o clipping nei bianchi.', draw: grayBars(32) },
      { name: 'Neri profondi (0–12)', hint: 'Dovresti distinguere i primi gradini sopra il nero.', draw: nearValuePatches(0, [1, 2, 3, 5, 8, 12], true) },
      { name: 'Bianchi (243–255)', hint: 'Dovresti distinguere i gradini appena sotto il bianco.', draw: nearValuePatches(255, [0, 2, 4, 6, 9, 12], false) },
    ],
  },
  {
    name: 'Barre colore',
    patterns: [
      { name: 'Barre RGBCMY + PLUGE', hint: 'Riferimento colore e livelli del nero.', draw: colorBars },
    ],
  },
  {
    name: 'Pixel difettosi',
    patterns: [
      { name: 'Rosso pieno', hint: 'Auto‑ciclo consigliato (tasto A): guarda tutto lo schermo.', draw: fill('#ff0000') },
      { name: 'Verde pieno', hint: '', draw: fill('#00ff00') },
      { name: 'Blu pieno', hint: '', draw: fill('#0000ff') },
      { name: 'Bianco pieno', hint: 'Pixel neri = subpixel morti.', draw: fill('#ffffff') },
      { name: 'Nero pieno', hint: 'Pixel accesi = stuck pixel.', draw: fill('#000000') },
    ],
  },
  {
    name: 'Nitidezza & moiré',
    patterns: [
      { name: 'Scacchiera 1px', hint: 'Deve restare grigia uniforme a distanza; niente sfarfallio da messa a fuoco.', draw: checker(1) },
      { name: 'Righe orizzontali 1px', hint: 'Verifica messa a fuoco e crosstalk verticale.', draw: lines(1, false) },
      { name: 'Righe verticali 1px', hint: 'Verifica messa a fuoco e crosstalk orizzontale.', draw: lines(1, true) },
      { name: 'Cerchi concentrici', hint: 'Deformazioni e moiré.', draw: concentric },
    ],
  },
  {
    name: 'Geometria & bordi',
    patterns: [
      { name: 'Griglia + bordi + cerchio', hint: 'Linee dritte fino al bordo, nessun taglio, cerchio non ovale.', draw: geometry },
    ],
  },
  {
    name: 'Contrasto',
    patterns: [
      { name: 'Metà nero / metà bianco', hint: 'Bagliori (glow) sul lato scuro vicino al confine.', draw: splitBW(false) },
      { name: 'Diagonale nero/bianco', hint: 'Contrasto e uniformità lungo la diagonale.', draw: splitBW(true) },
      { name: 'Scacchi grandi', hint: 'Black crush e aloni.', draw: checker(64) },
    ],
  },
  {
    name: 'Testo',
    patterns: [
      {
        name: 'Testo nero su bianco',
        hint: 'Bordi netti, nessuna frangia colorata (aberrazione), niente sfocatura ai lati.',
        dom: (root) => textPattern(root, '#fff', '#000'),
      },
      {
        name: 'Testo bianco su nero',
        hint: 'Come sopra su fondo scuro.',
        dom: (root) => textPattern(root, '#000', '#fff'),
      },
    ],
  },
  {
    name: 'Movimento & ghosting',
    patterns: [
      { name: 'Barra in movimento', hint: 'Scie dietro il bordo bianco = ghosting; usa +/− per la velocità.', animated: true, draw: movingBar },
      { name: 'Scacchiera scorrevole', hint: 'Sfocatura e trascinamento nel movimento.', animated: true, draw: scrollingChecker },
      { name: 'Strobo (⚠️ fotosensibilità)', hint: 'Lampeggio bianco/nero. Premi SPAZIO per avviare/fermare. Salta se soffri di epilessia fotosensibile.', animated: true, warn: true, draw: strobe },
    ],
  },
];

const FLAT = [];
GROUPS.forEach((grp, gi) => grp.patterns.forEach((p, pi) => FLAT.push({ ...p, group: grp.name, gi, pi })));

function textPattern(root, bg, fg) {
  const box = el('div', {
    style: {
      position: 'absolute',
      inset: '0',
      background: bg,
      color: fg,
      overflow: 'auto',
      padding: '4vh 4vw',
      fontFamily: 'sans-serif',
    },
  });
  const sizes = [10, 12, 14, 16, 20, 28, 40];
  const sample =
    'Nel mezzo del cammin — 0123456789 — AaBbCcDdEeFfGg — il quick brown fox salta 1,234.56 €';
  sizes.forEach((s) => {
    box.append(el('p', { style: { fontSize: `${s}px`, margin: '0.4em 0' } }, `${s}px — ${sample}`));
  });
  root.append(box);
  return () => box.remove();
}

function makeCanvas() {
  const c = document.createElement('canvas');
  c.className = 'surface__canvas';
  return c;
}

function drawInto(canvas, pattern, t) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || window.innerWidth;
  const cssH = canvas.clientHeight || window.innerHeight;
  const W = Math.max(1, Math.round(cssW * dpr));
  const H = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  pattern.draw(g, W, H, t);
}

/* --------------------------- Visore schermo intero --------------------------- */

function openFullscreen(startIndex, onExit) {
  let index = startIndex;
  let hudHidden = false;
  let autoCycle = false;
  let autoTimer = null;
  let speed = 1;
  let rafId = null;
  let animStart = 0;
  let strobeRunning = false;
  let domCleanup = null;
  let menuOpen = false;

  const surface = el('div', { class: 'surface' });
  const canvas = makeCanvas();
  const hud = el('div', { class: 'surface__hud' });
  const foot = el('div', { class: 'surface__foot' });
  foot.innerHTML =
    '<span><kbd>←</kbd><kbd>→</kbd> pattern</span>' +
    '<span><kbd>↑</kbd><kbd>↓</kbd> gruppo</span>' +
    '<span><kbd>M</kbd> elenco</span>' +
    '<span><kbd>A</kbd> auto‑ciclo</span>' +
    '<span><kbd>H</kbd> nascondi info</span>' +
    '<span><kbd>+</kbd><kbd>−</kbd> velocità</span>' +
    '<span><kbd>Esc</kbd> esci</span>';
  const menu = el('div', { class: 'surface__menu', hidden: true });
  surface.append(canvas, hud, foot, menu);
  document.body.append(surface);

  buildMenu();

  function stopAnim() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function render() {
    const p = FLAT[index];
    stopAnim();
    if (domCleanup) {
      domCleanup();
      domCleanup = null;
    }
    canvas.style.display = p.dom ? 'none' : 'block';
    hud.innerHTML =
      `<b>${p.name}</b><br>${p.group} · ${index + 1}/${FLAT.length}` +
      (p.hint ? `<br><span style="opacity:.8">${p.hint}</span>` : '') +
      (autoCycle ? '<br><span style="opacity:.8">auto‑ciclo attivo</span>' : '');

    if (p.dom) {
      domCleanup = p.dom(surface);
      // reinserisci hud/foot sopra il contenuto DOM
      surface.append(hud, foot, menu);
      return;
    }
    if (p.animated) {
      if (p.warn && !strobeRunning) {
        drawInto(canvas, { draw: (g, W, H) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); } }, 0);
        return;
      }
      animStart = performance.now();
      const loop = (now) => {
        drawInto(canvas, p, (now - animStart) * speed);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    } else {
      drawInto(canvas, p, 0);
    }
  }

  function go(delta) {
    strobeRunning = false;
    index = (index + delta + FLAT.length) % FLAT.length;
    render();
  }

  function jumpGroup(dir) {
    strobeRunning = false;
    const cur = FLAT[index].gi;
    let gi = (cur + dir + GROUPS.length) % GROUPS.length;
    index = FLAT.findIndex((p) => p.gi === gi);
    render();
  }

  function setAuto(on) {
    autoCycle = on;
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
    if (on) autoTimer = setInterval(() => go(1), 2500);
    render();
  }

  function buildMenu() {
    clear(menu);
    GROUPS.forEach((grp, gi) => {
      menu.append(el('h3', {}, grp.name));
      grp.patterns.forEach((p, pi) => {
        const fi = FLAT.findIndex((f) => f.gi === gi && f.pi === pi);
        const prev = document.createElement('canvas');
        prev.className = 'swatch__prev';
        prev.width = 120;
        prev.height = 60;
        if (!p.dom) {
          const g = prev.getContext('2d');
          try {
            p.draw(g, 120, 60, 0);
          } catch {
            /* ignora anteprima non disegnabile */
          }
        }
        menu.append(
          el(
            'button',
            {
              class: 'swatch',
              type: 'button',
              onClick: (e) => {
                e.stopPropagation();
                index = fi;
                toggleMenu(false);
                render();
              },
            },
            prev,
            el('span', {}, p.name),
          ),
        );
      });
    });
  }

  function toggleMenu(force) {
    menuOpen = force ?? !menuOpen;
    menu.hidden = !menuOpen;
  }

  function onKey(e) {
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault();
        go(1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        go(-1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        jumpGroup(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        jumpGroup(1);
        break;
      case 'Home':
        index = 0;
        render();
        break;
      case 'End':
        index = FLAT.length - 1;
        render();
        break;
      case 'm':
      case 'M':
        toggleMenu();
        break;
      case 'h':
      case 'H':
        hudHidden = !hudHidden;
        surface.classList.toggle('hud-hidden', hudHidden);
        break;
      case 'a':
      case 'A':
        setAuto(!autoCycle);
        break;
      case '+':
      case '=':
        speed = Math.min(4, speed + 0.25);
        break;
      case '-':
      case '_':
        speed = Math.max(0.25, speed - 0.25);
        break;
      case ' ':
        if (FLAT[index].warn) {
          e.preventDefault();
          strobeRunning = !strobeRunning;
          render();
        }
        break;
      case 'Escape':
        close();
        break;
      default:
        break;
    }
  }

  function onClick(e) {
    if (menuOpen || (e.target && e.target.closest && e.target.closest('.surface__menu'))) return;
    const half = window.innerWidth / 2;
    go(e.clientX > half ? 1 : -1);
  }

  function onFsChange() {
    if (!document.fullscreenElement) close();
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    stopAnim();
    if (autoTimer) clearInterval(autoTimer);
    if (domCleanup) domCleanup();
    window.removeEventListener('keydown', onKey, true);
    surface.removeEventListener('click', onClick);
    document.removeEventListener('fullscreenchange', onFsChange);
    window.removeEventListener('resize', render);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    surface.remove();
    onExit();
  }

  window.addEventListener('keydown', onKey, true);
  surface.addEventListener('click', onClick);
  document.addEventListener('fullscreenchange', onFsChange);
  window.addEventListener('resize', render);
  surface.requestFullscreen?.().catch(() => {});
  render();

  return close;
}

/* --------------------------- Pagina del passo --------------------------- */

export default {
  intro: `
    <h2>Test del display</h2>
    <p>Apri il visore a schermo intero e scorri i pattern con le frecce. Per ogni pattern
    l’aiuto in alto a sinistra spiega cosa cercare.</p>
    <ul>
      <li><strong>Pixel difettosi:</strong> usa <kbd>A</kbd> per l’auto‑ciclo e osserva tutto lo schermo da vicino.</li>
      <li><strong>Bleeding retroilluminazione:</strong> pattern <em>Nero pieno</em> in stanza buia, guarda i bordi.</li>
      <li><strong>Uniformità e dominanti:</strong> <em>Grigio 50%</em> e <em>Bianco</em>.</li>
      <li><strong>Banding:</strong> i gradienti devono essere sfumature continue, non a gradini.</li>
      <li><strong>Ghosting / risposta:</strong> gruppo <em>Movimento</em>.</li>
    </ul>
    <p class="mono">Nota: il browser non espone luminosità in nit, contrasto reale, refresh massimo effettivo,
    né True Tone/ProMotion in modo diretto (una stima del refresh è nel passo “Sistema &amp; GPU”).</p>
  `,

  async render(ctx) {
    const container = el('div', { class: 'stack' });

    const startBtn = el(
      'button',
      {
        class: 'btn btn--primary',
        type: 'button',
        onClick: () => launch(0),
      },
      '▶︎ Avvia il visore a schermo intero',
    );

    function launch(startIndex) {
      // nessun esito automatico: la qualita' del pannello la giudica la persona
      const close = openFullscreen(startIndex, () => {});
      ctx.onCleanup(close);
    }

    container.append(
      el('div', { class: 'btn-row' }, startBtn),
      el('p', { class: 'mono' }, 'Oppure tocca un pattern per aprirlo direttamente:'),
    );

    GROUPS.forEach((grp, gi) => {
      container.append(el('div', { class: 'group-title' }, grp.name));
      const grid = el('div', { class: 'pattern-grid' });
      grp.patterns.forEach((p, pi) => {
        const fi = FLAT.findIndex((f) => f.gi === gi && f.pi === pi);
        const tile = el('button', { class: 'pattern-tile', type: 'button', onClick: () => launch(fi) });
        const cv = document.createElement('canvas');
        cv.width = 240;
        cv.height = 156;
        if (!p.dom) {
          try {
            p.draw(cv.getContext('2d'), 240, 156, 0);
          } catch {
            /* ignora */
          }
        } else {
          const g = cv.getContext('2d');
          g.fillStyle = '#fff';
          g.fillRect(0, 0, 240, 156);
          g.fillStyle = '#000';
          g.font = '16px sans-serif';
          g.fillText('Abc 123', 12, 40);
        }
        tile.append(cv, el('span', {}, p.name));
        grid.append(tile);
      });
      container.append(grid);
    });

    ctx.stage.append(container);
    ctx.setData({ patterns: FLAT.length, groups: GROUPS.map((g) => g.name) });
  },
};
