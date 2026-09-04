import { el, clear, fmtBytes } from '../core/dom.js';

/* Informazioni di sistema, GPU e caratteristiche del display raccolte dalle API
   del browser. Alcuni valori sono esposti solo da Chrome. */

function mq(query) {
  return window.matchMedia(query).matches;
}

function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function measureRefresh() {
  return new Promise((resolve) => {
    const samples = [];
    let last = performance.now();
    let count = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (!samples.length) return resolve(null);
      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(samples.length / 2)];
      resolve(median > 0 ? Math.round(1000 / median) : null);
    };
    const tick = (now) => {
      samples.push(now - last);
      last = now;
      count += 1;
      if (count < 90) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
    // se la scheda e' in background rAF non scatta: chiudi comunque
    setTimeout(finish, 2500);
  });
}

function webglInfo() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { supported: false };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      supported: true,
      version: gl.getParameter(gl.VERSION),
      glsl: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      webgl2: !!c.getContext('webgl2'),
    };
  } catch {
    return { supported: false };
  }
}

function codecs() {
  const v = document.createElement('video');
  const check = (t) => {
    const r = v.canPlayType(t);
    return r || 'no';
  };
  return {
    'H.264': check('video/mp4; codecs="avc1.42E01E"'),
    'HEVC / H.265': check('video/mp4; codecs="hvc1.1.6.L93.B0"'),
    'VP9': check('video/webm; codecs="vp09.00.10.08"'),
    'AV1': check('video/mp4; codecs="av01.0.05M.08"'),
    'AAC': check('audio/mp4; codecs="mp4a.40.2"'),
    'Opus': check('audio/webm; codecs="opus"'),
    'FLAC': check('audio/flac'),
  };
}

function section(title, rows) {
  return el(
    'div',
    { class: 'card' },
    el('h3', {}, title),
    el(
      'dl',
      { class: 'kv' },
      ...Object.entries(rows).flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v == null || v === '' ? '—' : String(v))]),
    ),
  );
}

export default {
  intro: `
    <h2>Informazioni di sistema, GPU e display</h2>
    <p>Dati letti dal browser. Utili per confrontare l’annuncio con la realtà (GPU, core, risoluzione,
    Retina, refresh, gamut e HDR).</p>
    <p class="mono">Nota: il modello esatto, la RAM totale su Safari, la salute della batteria e i cicli
    non sono esposti al browser. Verificali in <em>Informazioni su questo Mac</em> e
    <em>Impostazioni → Batteria</em>.</p>
  `,

  async render(ctx) {
    const grid = el('div', { class: 'grid-auto' });
    const actions = el('div', { class: 'btn-row' });
    ctx.stage.append(el('div', { class: 'stack' }, actions, grid));
    grid.append(el('p', { class: 'mono' }, 'Raccolgo i dati…'));

    const dpr = window.devicePixelRatio || 1;
    const gl = webglInfo();
    const refresh = await measureRefresh();

    let battery = null;
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        battery = {
          livello: `${Math.round(b.level * 100)}%`,
          'in carica': b.charging ? 'sì' : 'no',
          'tempo a carico': Number.isFinite(b.chargingTime) && b.chargingTime > 0 ? `${Math.round(b.chargingTime / 60)} min` : '—',
          'autonomia stimata': Number.isFinite(b.dischargingTime) && b.dischargingTime > 0 ? `${Math.round(b.dischargingTime / 60)} min` : '—',
        };
      }
    } catch {
      /* non disponibile */
    }

    let storage = null;
    try {
      if (navigator.storage?.estimate) {
        const e = await navigator.storage.estimate();
        storage = { 'quota disponibile all’app': fmtBytes(e.quota), 'in uso': fmtBytes(e.usage) };
      }
    } catch {
      /* ignora */
    }

    let webgpu = 'non rilevabile';
    try {
      if (!navigator.gpu) {
        webgpu = 'API assente';
      } else {
        const adapter = await withTimeout(navigator.gpu.requestAdapter(), 2500, 'timeout');
        if (adapter === 'timeout') {
          webgpu = 'non rilevabile (timeout)';
        } else if (!adapter) {
          webgpu = 'nessun adapter';
        } else {
          const info = adapter.info || (adapter.requestAdapterInfo ? await withTimeout(adapter.requestAdapterInfo(), 1500, null) : null);
          webgpu = info
            ? [info.vendor, info.architecture, info.description].filter(Boolean).join(' / ') || 'adapter disponibile'
            : 'adapter disponibile';
        }
      }
    } catch {
      webgpu = 'errore';
    }

    const conn = navigator.connection || {};
    const uaData = navigator.userAgentData || {};

    const data = {
      display: {
        'Risoluzione logica': `${screen.width}×${screen.height}`,
        'Risoluzione fisica (stimata)': `${Math.round(screen.width * dpr)}×${Math.round(screen.height * dpr)}`,
        'Area disponibile': `${screen.availWidth}×${screen.availHeight}`,
        'devicePixelRatio': `${dpr} ${dpr >= 2 ? '(Retina)' : ''}`,
        'Finestra': `${innerWidth}×${innerHeight}`,
        'Profondità colore': `${screen.colorDepth} bit`,
        'Refresh stimato': refresh ? `~${refresh} Hz${refresh >= 100 ? ' (ProMotion?)' : ''}` : '—',
        'Orientamento': screen.orientation?.type || '—',
        'Schermi estesi': typeof screen.isExtended === 'boolean' ? (screen.isExtended ? 'sì' : 'no') : '—',
      },
      colore: {
        'Gamut P3': mq('(color-gamut: p3)') ? 'sì' : 'no',
        'Gamut Rec2020': mq('(color-gamut: rec2020)') ? 'sì' : 'no',
        'HDR (dynamic-range: high)': mq('(dynamic-range: high)') ? 'sì' : 'no',
        'Schema colori': mq('(prefers-color-scheme: dark)') ? 'scuro' : 'chiaro',
        'Contrasto elevato': mq('(prefers-contrast: more)') ? 'sì' : 'no',
        'Riduci movimento': mq('(prefers-reduced-motion: reduce)') ? 'sì' : 'no',
      },
      sistema: {
        'Core CPU (logici)': navigator.hardwareConcurrency || '—',
        'RAM (≈, solo Chrome)': navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'non esposta',
        'Piattaforma': uaData.platform || navigator.platform || '—',
        'Mobile': uaData.mobile === undefined ? '—' : uaData.mobile ? 'sì' : 'no',
        'Lingue': (navigator.languages || [navigator.language]).join(', '),
        'Fuso orario': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'Touch points': navigator.maxTouchPoints,
        'Puntatore fine': mq('(pointer: fine)') ? 'sì' : 'no',
        'User agent': navigator.userAgent,
      },
      gpu: gl.supported
        ? {
            'Renderer': gl.renderer,
            'Vendor': gl.vendor,
            'Versione GL': gl.version,
            'WebGL2': gl.webgl2 ? 'sì' : 'no',
            'Max texture': gl.maxTexture,
            'WebGPU': webgpu,
          }
        : { WebGL: 'non supportato', WebGPU: webgpu },
      batteria: battery || { stato: 'API non disponibile su questo browser' },
      archiviazione: storage || { stato: 'API non disponibile' },
      rete: {
        'Online': navigator.onLine ? 'sì' : 'no',
        'Tipo (stimato)': conn.effectiveType || '—',
        'Downlink': conn.downlink ? `${conn.downlink} Mbps` : '—',
        'RTT': conn.rtt ? `${conn.rtt} ms` : '—',
        'Risparmio dati': conn.saveData ? 'sì' : 'no',
      },
      codec: codecs(),
    };

    clear(grid).append(
      section('Display', data.display),
      section('Colore & gamut', data.colore),
      section('Sistema', data.sistema),
      section('GPU', data.gpu),
      section('Batteria', data.batteria),
      section('Archiviazione', data.archiviazione),
      section('Rete', data.rete),
      section('Codec video/audio', data.codec),
    );

    actions.append(
      el(
        'button',
        {
          class: 'btn btn--sm',
          type: 'button',
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
              actions.querySelector('button').textContent = 'Copiato ✔';
            } catch {
              actions.querySelector('button').textContent = 'Copia non riuscita';
            }
          },
        },
        '📋 Copia tutti i dati',
      ),
    );

    ctx.setData(data);
    ctx.setStatusHint?.('ok');
  },
};
