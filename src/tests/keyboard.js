import { el, clear } from '../core/dom.js';
import { LAYOUTS, testableCodes } from './keyboard-layouts.js';

/* Test tastiera: si ascoltano keydown/keyup su window. Ogni tasto premuto
   diventa verde (testato); mentre e' tenuto premuto e' blu. I tasti che il
   browser/macOS intercetta (Fn, ⌘Tab, luminosita', tasti multimediali) possono
   non arrivare: sono comunque da provare a mano. */

export default {
  intro: `
    <h2>Test della tastiera</h2>
    <p>Premi <strong>ogni tasto</strong> uno per uno. Diventa verde quando registrato.
    Tienilo premuto: se resta blu anche dopo averlo rilasciato, il tasto è “incollato”.</p>
    <ul>
      <li>Prova anche le combinazioni con <kbd>⇧</kbd>, <kbd>⌥</kbd>, <kbd>⌘</kbd>.</li>
      <li>Il tasto <kbd>fn</kbd>/🌐 e Touch ID non generano eventi: provali a mano
        (fn cambia la riga funzioni; Touch ID in <em>Impostazioni → Touch ID</em>).</li>
      <li>Alcune combinazioni (<kbd>⌘</kbd>+<kbd>Tab</kbd>, luminosità, volume) le cattura macOS:
        se non si illuminano non è un difetto, verificale osservando l’effetto sul sistema.</li>
    </ul>
    <p class="mono">La pagina blocca le scorciatoie del browser durante il test per evitare
    di cambiare pagina per sbaglio.</p>
  `,

  async render(ctx) {
    let layoutKey = (ctx.store.result(ctx.stepId).data || {}).layout || 'iso-it';
    const tested = new Set((ctx.store.result(ctx.stepId).data || {}).tested || []);
    const down = new Set();

    const wrap = el('div', { class: 'stack' });
    const controls = el('div', { class: 'btn-row' });
    const kb = el('div', { class: 'kb' });
    const readout = el('div', { class: 'kb-readout' });
    const progress = el('p', { class: 'mono' });
    wrap.append(controls, progress, kb, readout);
    ctx.stage.append(wrap);

    const layoutSelect = el(
      'select',
      {
        class: 'btn',
        onChange: (e) => {
          layoutKey = e.target.value;
          save();
          build();
        },
      },
      ...Object.entries(LAYOUTS).map(([k, v]) =>
        el('option', { value: k, selected: k === layoutKey }, v.label),
      ),
    );
    controls.append(
      el('label', { class: 'mono' }, 'Layout: ', layoutSelect),
      el(
        'button',
        {
          class: 'btn btn--sm',
          type: 'button',
          onClick: () => {
            tested.clear();
            down.clear();
            save();
            build();
          },
        },
        'Azzera tasti',
      ),
    );

    function save() {
      ctx.setData({ layout: layoutKey, tested: [...tested] });
    }

    function updateProgress() {
      const need = testableCodes(layoutKey);
      const hit = [...need].filter((c) => tested.has(c)).length;
      progress.textContent = `Tasti testati: ${hit} / ${need.size}`;
      if (hit === need.size) {
        progress.textContent += ' — completato ✔';
        ctx.setStatusHint?.('ok');
      }
    }

    function build() {
      clear(kb);
      const layout = LAYOUTS[layoutKey];
      layout.rows.forEach((row) => {
        const rowEl = el('div', { class: 'kb__row' });
        row.forEach((key) => {
          const k = el('div', {
            class: `key ${key.untestable ? 'is-untestable' : ''} ${tested.has(key.code) ? 'is-hit' : ''}`,
            dataset: { code: key.code },
            style: { '--u': `${42 * (key.w || 1)}px` },
            title: key.code,
          });
          k.textContent = key.label || (key.code === 'Space' ? 'space' : key.code);
          if (key.tall) k.style.height = '90px';
          rowEl.append(k);
        });
        kb.append(rowEl);
      });
      updateProgress();
    }

    function mark(code, isDown) {
      const cell = kb.querySelector(`.key[data-code="${CSS.escape(code)}"]`);
      if (isDown) {
        down.add(code);
        tested.add(code);
        if (cell) {
          cell.classList.add('is-hit', 'is-down');
        }
        save();
        updateProgress();
      } else {
        down.delete(code);
        if (cell) cell.classList.remove('is-down');
      }
    }

    const onDown = (e) => {
      // non bloccare l'uscita con Escape o gli strumenti sviluppatore
      if (e.key !== 'Escape' && !(e.metaKey && e.altKey && e.key === 'i')) {
        e.preventDefault();
      }
      mark(e.code, true);
      readout.innerHTML =
        `<span>code: <b>${e.code || '—'}</b></span>` +
        `<span>key: <b>${e.key === ' ' ? 'Space' : e.key}</b></span>` +
        `<span>location: ${e.location}</span>` +
        `<span>repeat: ${e.repeat}</span>` +
        `<span>mod: ${[e.shiftKey && '⇧', e.ctrlKey && '⌃', e.altKey && '⌥', e.metaKey && '⌘'].filter(Boolean).join(' ') || '—'}</span>`;
    };
    const onUp = (e) => {
      e.preventDefault();
      mark(e.code, false);
    };
    const onBlur = () => {
      down.forEach((c) => mark(c, false));
    };

    window.addEventListener('keydown', onDown, true);
    window.addEventListener('keyup', onUp, true);
    window.addEventListener('blur', onBlur);
    ctx.onCleanup(() => {
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp, true);
      window.removeEventListener('blur', onBlur);
    });

    build();
  },
};
