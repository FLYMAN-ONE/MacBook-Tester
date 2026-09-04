import { el, clear } from '../core/dom.js';
import { TEST_STEPS } from '../core/steps.js';
import { store } from '../core/store.js';
import { findModel } from '../core/apple-compare.js';

/* Report finale: riepilogo degli esiti + esportazione (Markdown / JSON / stampa). */

const STATUS_LABEL = { ok: 'OK', issue: 'Problema', skip: 'Saltato', todo: 'Da fare' };

function dataHighlights(id, data) {
  if (!data) return '';
  try {
    switch (id) {
      case 'display':
        return `${data.patterns} pattern disponibili`;
      case 'resolution':
        return `${data.fisica} (${data.classe}, ${data.aspectRatio})`;
      case 'refresh':
        return `${data.hz} Hz · ${data.giudizio} · stabilità ${data.stabilita}`;
      case 'keyboard':
        return `layout ${data.layout}, ${(data.tested || []).length} tasti registrati`;
      case 'trackpad':
        return `${data.completate}/${data.totali} attività completate`;
      case 'camera':
        return data.width ? `${data.label || 'camera'} — ${data.width}×${data.height}` : '';
      case 'microphone':
        return 'test livello/registrazione eseguito';
      case 'speakers':
        return data.quizCanali ? `quiz canali ${data.quizCanali}` : '';
      case 'sysinfo':
        return [data.gpu?.Renderer, data.display?.['Risoluzione logica'], data.display?.['Refresh stimato']]
          .filter(Boolean)
          .join(' · ');
      case 'advanced':
        return Object.keys(data).filter((k) => data[k]).join(', ');
      default:
        return '';
    }
  } catch {
    return '';
  }
}

function buildMarkdown() {
  const s = store.get();
  const lines = [];
  lines.push('# Report test MacBook');
  lines.push('');
  lines.push(`- Generato: ${new Date().toLocaleString('it-IT')}`);
  lines.push(`- Iniziato: ${new Date(s.startedAt).toLocaleString('it-IT')}`);
  const model = findModel(store.getDevice());
  if (model) lines.push(`- Modello dichiarato: ${model.name} (specifiche: support.apple.com/en-us/${model.doc})`);
  const sys = s.results.sysinfo?.data;
  if (sys) {
    lines.push(`- GPU: ${sys.gpu?.Renderer || '—'}`);
    lines.push(`- Display: ${sys.display?.['Risoluzione logica'] || '—'} @ ${sys.display?.devicePixelRatio || '—'} · ${sys.display?.['Refresh stimato'] || '—'}`);
    lines.push(`- CPU core: ${sys.sistema?.['Core CPU (logici)'] || '—'}`);
    lines.push(`- User agent: ${sys.sistema?.['User agent'] || '—'}`);
  }
  lines.push('');
  lines.push('| Test | Esito | Note | Dati |');
  lines.push('| --- | --- | --- | --- |');
  for (const step of TEST_STEPS) {
    const r = store.result(step.id);
    lines.push(
      `| ${step.label} | ${STATUS_LABEL[r.status || 'todo']} | ${(r.note || '').replace(/\n/g, ' ') || '—'} | ${dataHighlights(step.id, r.data) || '—'} |`,
    );
  }
  const counts = summary();
  lines.push('');
  lines.push(`**Riepilogo:** ${counts.ok} OK · ${counts.issue} problemi · ${counts.skip} saltati · ${counts.todo} da fare`);
  lines.push('');
  lines.push('> Non verificati dal tool: salute/cicli batteria, Apple Diagnostics (tasto D), porte e connettori,');
  lines.push('> ventole/temperature, SSD SMART, tasto Fn e Touch ID, Force Touch, copertura AppleCare e Blocco di attivazione.');
  return lines.join('\n');
}

function summary() {
  const c = { ok: 0, issue: 0, skip: 0, todo: 0 };
  for (const step of TEST_STEPS) {
    const st = store.result(step.id).status || 'todo';
    c[st] += 1;
  }
  return c;
}

function download(name, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default {
  needsResult: false,
  intro: `
    <h2>Report finale</h2>
    <p>Riepilogo di tutti i test. Esportalo in Markdown o JSON, oppure stampalo in PDF
    per allegarlo alla trattativa.</p>
  `,

  async render(ctx) {
    const root = el('div', { class: 'stack' });
    ctx.stage.append(root);

    function paint() {
      clear(root);
      const c = summary();
      const stamp = new Date().toLocaleString('it-IT');

      const verdict =
        c.issue > 0
          ? `⚠️ ${c.issue} problema/i rilevato/i — valuta con attenzione o tratta il prezzo.`
          : c.todo > 0
            ? `${c.todo} test ancora da completare.`
            : '✅ Nessun problema rilevato nei test eseguiti.';

      const model = findModel(store.getDevice());
      root.append(
        el('p', { class: 'mono' }, `Generato il ${stamp}`),
        model ? el('p', { class: 'mono' }, `Modello dichiarato: ${model.name}`) : null,
        el('div', { class: 'notice notice--info' }, verdict),
        el(
          'div',
          { class: 'report-summary' },
          el('div', { class: 'card' }, el('div', { class: 'num', style: { color: 'var(--ok)' } }, String(c.ok)), 'OK'),
          el('div', { class: 'card' }, el('div', { class: 'num', style: { color: 'var(--issue)' } }, String(c.issue)), 'Problemi'),
          el('div', { class: 'card' }, el('div', { class: 'num', style: { color: 'var(--skip)' } }, String(c.skip)), 'Saltati'),
          el('div', { class: 'card' }, el('div', { class: 'num', style: { color: 'var(--text-faint)' } }, String(c.todo)), 'Da fare'),
        ),
      );

      const rows = TEST_STEPS.map((step) => {
        const r = store.result(step.id);
        const st = r.status || 'todo';
        return el(
          'tr',
          {},
          el('td', {}, `${step.icon} ${step.label}`),
          el('td', {}, el('span', { class: `status-chip ${st}` }, STATUS_LABEL[st])),
          el('td', {}, r.note || '—'),
          el('td', { class: 'mono' }, dataHighlights(step.id, r.data) || '—'),
        );
      });

      root.append(
        el(
          'table',
          { class: 'report-table' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Test'), el('th', {}, 'Esito'), el('th', {}, 'Note'), el('th', {}, 'Dati'))),
          el('tbody', {}, ...rows),
        ),
        el(
          'div',
          { class: 'notice notice--warn' },
          'Non verificati dal tool: salute e cicli batteria, Apple Diagnostics (tasto D all’avvio), ' +
            'porte/Thunderbolt/MagSafe/SD, ventole e temperature, SSD SMART, tasto Fn e Touch ID, ' +
            'Force Touch, copertura AppleCare e Blocco di attivazione (Dov’è).',
        ),
        el(
          'div',
          { class: 'report-actions btn-row' },
          el(
            'button',
            {
              class: 'btn btn--primary',
              type: 'button',
              onClick: async () => {
                try {
                  await navigator.clipboard.writeText(buildMarkdown());
                  ev(root, 'Report copiato negli appunti ✔');
                } catch {
                  ev(root, 'Copia non riuscita');
                }
              },
            },
            '📋 Copia (Markdown)',
          ),
          el('button', { class: 'btn', type: 'button', onClick: () => download('report-macbook.md', buildMarkdown(), 'text/markdown') }, '⬇︎ .md'),
          el(
            'button',
            {
              class: 'btn',
              type: 'button',
              onClick: () => download('report-macbook.json', JSON.stringify(store.get(), null, 2), 'application/json'),
            },
            '⬇︎ .json',
          ),
          el('button', { class: 'btn', type: 'button', onClick: () => window.print() }, '🖨 Stampa / PDF'),
          el(
            'button',
            {
              class: 'btn btn--danger',
              type: 'button',
              onClick: () => {
                if (confirm('Azzerare tutti i risultati?')) {
                  store.reset();
                  paint();
                }
              },
            },
            'Azzera e ricomincia',
          ),
        ),
      );
    }

    function ev(container, msg) {
      const n = el('span', { class: 'mono', style: { marginLeft: '0.5rem' } }, msg);
      container.querySelector('.report-actions').append(n);
      setTimeout(() => n.remove(), 3000);
    }

    const unsub = store.subscribe(paint);
    ctx.onCleanup(unsub);
    paint();
  },
};
