import { el, clear, dashCard, pill } from './dom.js';
import { store } from './store.js';

/* -------------------------------------------------------------------------
   Confronto dei dati rilevati con le specifiche ufficiali del display
   dichiarate da Apple. Fonte: pagine "Specifiche tecniche" su
   support.apple.com di ciascun modello (numero articolo nel campo `doc`).
   Sono inclusi tutti i MacBook con Apple silicon, dal chip M1 in poi.

   I dati verificabili dal browser sono: risoluzione (render), proporzioni,
   frequenza di aggiornamento, wide color (P3) e HDR. Luminosità e ppi sono
   solo di riferimento.
------------------------------------------------------------------------- */

const XDR = { proMotion: true, hz: 120, gamut: 'P3', hdr: true };
const IPS = { proMotion: false, hz: 60, gamut: 'P3', hdr: false };

const AIR13_M1 = { ...IPS, w: 2560, h: 1600, ppi: 227, nitsSDR: '400 nit', scaled: ['1680 × 1050', '1440 × 900', '1024 × 640'] };
const AIR13 = { ...IPS, w: 2560, h: 1664, ppi: 224, nitsSDR: '500 nit' };
const AIR15 = { ...IPS, w: 2880, h: 1864, ppi: 224, nitsSDR: '500 nit' };
const MBP13 = { ...IPS, w: 2560, h: 1600, ppi: 227, nitsSDR: '500 nit' };
const XDR_NITS = '1000 nit sostenuti · 1600 nit di picco (HDR)';
const XDR14 = { ...XDR, w: 3024, h: 1964, ppi: 254, nitsXDR: XDR_NITS };
const XDR16 = { ...XDR, w: 3456, h: 2234, ppi: 254, nitsXDR: XDR_NITS };

export const MODELS = [
  // --- MacBook Air ---
  { id: 'mba13-m1-2020', family: 'MacBook Air', name: 'MacBook Air (M1, 2020) — 13,3"', doc: '111883', disp: AIR13_M1 },
  { id: 'mba13-m2-2022', family: 'MacBook Air', name: 'MacBook Air (M2, 2022) — 13,6"', doc: '111867', disp: AIR13 },
  { id: 'mba15-m2-2023', family: 'MacBook Air', name: 'MacBook Air (M2, 2023) — 15,3"', doc: '111346', disp: AIR15 },
  { id: 'mba13-m3-2024', family: 'MacBook Air', name: 'MacBook Air (M3, 2024) — 13,6"', doc: '118551', disp: AIR13 },
  { id: 'mba15-m3-2024', family: 'MacBook Air', name: 'MacBook Air (M3, 2024) — 15,3"', doc: '118552', disp: AIR15 },
  { id: 'mba13-m4-2025', family: 'MacBook Air', name: 'MacBook Air (M4, 2025) — 13,6"', doc: '122209', disp: AIR13 },
  { id: 'mba15-m4-2025', family: 'MacBook Air', name: 'MacBook Air (M4, 2025) — 15,3"', doc: '122210', disp: AIR15 },
  // --- MacBook Pro 13" ---
  { id: 'mbp13-m1-2020', family: 'MacBook Pro 13"', name: 'MacBook Pro 13" (M1, 2020)', doc: '111893', disp: MBP13 },
  { id: 'mbp13-m2-2022', family: 'MacBook Pro 13"', name: 'MacBook Pro 13" (M2, 2022)', doc: '111869', disp: MBP13 },
  // --- MacBook Pro 14" (Liquid Retina XDR) ---
  { id: 'mbp14-2021', family: 'MacBook Pro 14"', name: 'MacBook Pro 14" (M1 Pro/Max, 2021)', doc: '111902', disp: { ...XDR14, nitsSDR: '500 nit' } },
  { id: 'mbp14-m2-2023', family: 'MacBook Pro 14"', name: 'MacBook Pro 14" (M2 Pro/Max, 2023)', doc: '111340', disp: { ...XDR14, nitsSDR: '500 nit' } },
  { id: 'mbp14-m3-2023', family: 'MacBook Pro 14"', name: 'MacBook Pro 14" (M3/M3 Pro/M3 Max, 2023)', doc: '117735', disp: { ...XDR14, nitsSDR: '600 nit' } },
  { id: 'mbp14-m4-2024', family: 'MacBook Pro 14"', name: 'MacBook Pro 14" (M4/M4 Pro/M4 Max, 2024)', doc: '121552', disp: { ...XDR14, nitsSDR: '1000 nit (contenuti esterni)' } },
  // --- MacBook Pro 16" (Liquid Retina XDR) ---
  { id: 'mbp16-2021', family: 'MacBook Pro 16"', name: 'MacBook Pro 16" (M1 Pro/Max, 2021)', doc: '111901', disp: { ...XDR16, nitsSDR: '500 nit' } },
  { id: 'mbp16-m2-2023', family: 'MacBook Pro 16"', name: 'MacBook Pro 16" (M2 Pro/Max, 2023)', doc: '111838', disp: { ...XDR16, nitsSDR: '500 nit' } },
  { id: 'mbp16-m3-2023', family: 'MacBook Pro 16"', name: 'MacBook Pro 16" (M3 Pro/M3 Max, 2023)', doc: '117737', disp: { ...XDR16, nitsSDR: '600 nit' } },
  { id: 'mbp16-m4-2024', family: 'MacBook Pro 16"', name: 'MacBook Pro 16" (M4 Pro/M4 Max, 2024)', doc: '121554', disp: { ...XDR16, nitsSDR: '1000 nit (contenuti esterni)' } },
];

export function findModel(id) {
  return MODELS.find((m) => m.id === id) || null;
}

function ratioLabel(w, h) {
  const r = w / h;
  const known = [
    ['16:10', 16 / 10],
    ['16:9', 16 / 9],
    ['3:2', 3 / 2],
  ];
  for (const [label, value] of known) if (Math.abs(r - value) < 0.02) return label;
  // i pannelli con notch (14"/16", Air recenti) hanno un rapporto ~1,54
  return `${r.toFixed(2)}:1`;
}

export function detectedDisplay(measuredHz) {
  const dpr = window.devicePixelRatio || 1;
  const sw = screen.width || window.innerWidth || 0;
  const sh = screen.height || window.innerHeight || 0;
  return {
    renderW: Math.round(sw * dpr),
    renderH: Math.round(sh * dpr),
    dpr,
    hz: measuredHz || null,
    p3: window.matchMedia('(color-gamut: p3)').matches,
    hdr: window.matchMedia('(dynamic-range: high)').matches,
  };
}

export function guessModels(d) {
  return MODELS.filter((m) => m.disp.w === d.renderW && m.disp.h === d.renderH);
}

/* Restituisce le righe di confronto: { name, apple, got, verdict, note } */
export function evaluate(model, d) {
  const s = model.disp;
  const rows = [];

  const nativeMatch = d.renderW === s.w && d.renderH === s.h;
  rows.push({
    name: 'Risoluzione nativa',
    apple: `${s.w} × ${s.h}`,
    got: `${d.renderW} × ${d.renderH}`,
    verdict: nativeMatch ? 'ok' : 'info',
    note: nativeMatch
      ? 'il Mac è impostato sulla risoluzione nativa'
      : `macOS è su una risoluzione scalata: il pannello fisico resta ${s.w} × ${s.h}. Non è un difetto.`,
  });

  const arApple = ratioLabel(s.w, s.h);
  const arGot = ratioLabel(d.renderW, d.renderH);
  const arMatch = arApple === arGot || Math.abs(s.w / s.h - d.renderW / d.renderH) < 0.03;
  rows.push({
    name: 'Proporzioni',
    apple: arApple,
    got: arGot,
    verdict: arMatch ? 'ok' : 'warn',
    note: arMatch ? '' : 'proporzioni diverse: probabile monitor esterno collegato, zoom del browser attivo, o pannello non originale.',
  });

  const appleHz = s.proMotion ? 'adattiva fino a 120 Hz (ProMotion)' : '60 Hz';
  let hzVerdict = 'info';
  let hzNote = '';
  if (d.hz) {
    if (s.proMotion) {
      if (d.hz >= 100) hzVerdict = 'ok';
      else {
        hzVerdict = 'warn';
        hzNote = 'misurati ~60 Hz: il browser potrebbe limitare la frequenza. Verifica in Impostazioni ▸ Monitor che sia selezionato "ProMotion" e riprova.';
      }
    } else {
      hzVerdict = d.hz >= 55 && d.hz <= 66 ? 'ok' : 'warn';
      if (hzVerdict === 'warn') hzNote = 'valore lontano dai 60 Hz dichiarati: rifai la misura con la pagina in primo piano.';
    }
  }
  rows.push({ name: 'Frequenza di aggiornamento', apple: appleHz, got: d.hz ? `~${d.hz} Hz` : 'non misurata', verdict: hzVerdict, note: hzNote });

  rows.push({
    name: 'ProMotion',
    apple: s.proMotion ? 'Sì' : 'No',
    got: d.hz ? (d.hz >= 100 ? 'rilevata (>100 Hz)' : 'non rilevata (~60 Hz)') : '—',
    verdict: s.proMotion ? (d.hz >= 100 ? 'ok' : d.hz ? 'warn' : 'info') : 'ok',
  });

  rows.push({
    name: 'Wide color (P3)',
    apple: 'Sì',
    got: d.p3 ? 'Sì' : 'No',
    verdict: d.p3 ? 'ok' : 'warn',
    note: d.p3 ? '' : 'il browser non riporta il gamut P3: possibile profilo colore non standard.',
  });

  if (s.hdr) {
    rows.push({
      name: 'HDR (Liquid Retina XDR)',
      apple: 'Sì',
      got: d.hdr ? 'attivo' : 'non attivo ora',
      verdict: d.hdr ? 'ok' : 'info',
      note: d.hdr ? '' : "l'HDR si attiva solo con contenuti/impostazioni HDR: non è un difetto.",
    });
  }

  rows.push({ name: 'Densità pixel', apple: `${s.ppi} ppi`, got: 'non rilevabile dal browser', verdict: 'na' });
  const nits = [s.nitsSDR, s.nitsXDR].filter(Boolean).join(' · ');
  if (nits) rows.push({ name: 'Luminosità', apple: nits, got: 'non rilevabile dal browser', verdict: 'na' });

  if (s.scaled) {
    rows.push({ name: 'Risoluzioni scalate supportate', apple: s.scaled.join('  ·  '), got: `attuale "sembra" ${screen.width} × ${screen.height}`, verdict: 'na' });
  }

  return rows;
}

const V_ICON = { ok: '✓', warn: '⚠', info: 'ⓘ', na: '–' };

function comparisonCard(model, d) {
  const rows = evaluate(model, d);
  const hasWarn = rows.some((r) => r.verdict === 'warn');
  const badge = hasWarn ? pill('Da verificare', 'amber') : pill('Coerente', 'green');

  const list = el('div', { class: 'cmp' });
  rows.forEach((r) => {
    list.append(
      el(
        'div',
        { class: 'cmp-item' },
        el(
          'div',
          { class: 'cmp-item__top' },
          el('span', { class: 'cmp-item__name' }, r.name),
          el('span', { class: `cmp-item__icon is-${r.verdict}` }, V_ICON[r.verdict]),
        ),
        el(
          'div',
          { class: 'cmp-item__pair' },
          el('span', {}, el('b', {}, 'Apple: '), r.apple),
          el('span', { class: `cmp-item__got is-${r.verdict}` }, el('b', {}, 'Rilevato: '), r.got),
        ),
        r.note ? el('div', { class: 'cmp-item__note' }, r.note) : null,
      ),
    );
  });

  return dashCard(
    { icon: '⚖️', iconColor: 'purple', title: 'Confronto con le specifiche Apple', badge },
    list,
    el(
      'p',
      { class: 'cmp-source' },
      'Dati ufficiali: ',
      el('a', { href: `https://support.apple.com/en-us/${model.doc}`, target: '_blank', rel: 'noopener' }, `support.apple.com/${model.doc}`),
      ' · se hai ingrandito la pagina (⌘ +/−) o usi un monitor esterno i valori rilevati non sono attendibili.',
    ),
  );
}

function selectorCard(currentId, measuredHz, onPick) {
  const d = detectedDisplay(measuredHz);
  const hint = el('p', { class: 'cmp-source' });

  const select = el('select', {
    class: 'btn',
    onChange: (e) => onPick(e.target.value || null),
  });
  select.append(el('option', { value: '' }, '— scegli il tuo modello —'));
  const families = {};
  MODELS.forEach((m) => (families[m.family] = families[m.family] || []).push(m));
  Object.entries(families).forEach(([fam, list]) => {
    const og = el('optgroup', { label: fam });
    list.forEach((m) => og.append(el('option', { value: m.id, selected: m.id === currentId }, m.name)));
    select.append(og);
  });

  const autoBtn = el(
    'button',
    {
      class: 'btn btn--sm',
      type: 'button',
      onClick: () => {
        const g = guessModels(d);
        if (g.length === 1) {
          onPick(g[0].id);
        } else if (g.length > 1) {
          hint.textContent = `Pannello ${d.renderW}×${d.renderH} compatibile con: ${g.map((m) => m.name).join(' · ')}. Scegli il tuo dall'elenco.`;
        } else {
          hint.textContent = `Nessuna corrispondenza esatta per ${d.renderW}×${d.renderH} (probabile risoluzione scalata). Scegli il modello manualmente.`;
        }
      },
    },
    'Rileva automaticamente',
  );

  return dashCard(
    { icon: '💻', iconColor: 'blue', title: 'Modello da confrontare' },
    el('p', { class: 'cmp-source' }, 'Seleziona il MacBook che stai valutando (dai chip M1 in poi) per confrontare i dati misurati con le specifiche ufficiali Apple.'),
    el('div', { class: 'btn-row', style: { alignItems: 'center' } }, select, autoBtn),
    hint,
  );
}

/* Monta il blocco confronto dentro `parent`. Si auto-aggiorna alla scelta del
   modello (persistita, condivisa tra i passi Risoluzione e Refresh).
   `getHz` (opzionale) fornisce la frequenza misurata più aggiornata.
   Restituisce { refresh } per forzare un ridisegno quando la misura cambia. */
export function mountAppleCompare(parent, { measuredHz = null, getHz = null } = {}) {
  const wrap = el('div', { class: 'stack', style: { marginTop: '1rem' } });
  parent.append(wrap);

  const currentHz = () => (getHz ? getHz() : measuredHz) || null;

  function paint() {
    const id = store.getDevice();
    const model = findModel(id);
    const hz = currentHz();
    clear(wrap).append(selectorCard(id, hz, (newId) => { store.setDevice(newId); paint(); }));
    if (model) {
      wrap.append(comparisonCard(model, detectedDisplay(hz)));
    }
  }

  paint();
  return { refresh: paint };
}
