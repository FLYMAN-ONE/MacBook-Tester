// Guscio dell'applicazione: header, navigazione dei passi, area del test,
// barra dell'esito e paginazione. Coordina il caricamento lazy dei moduli e la
// pulizia delle risorse (stream, audio context, listener) al cambio di passo.

import { el, clear } from './dom.js';
import { STEPS, TEST_STEPS, stepById, stepIndex } from './steps.js';
import { store } from './store.js';
import { currentStepId, go, onRoute, startRouter } from './router.js';

const STATUS_META = {
  ok: { label: 'OK', cls: 'is-ok', dot: '✔' },
  issue: { label: 'Problema', cls: 'is-issue', dot: '!' },
  skip: { label: 'Saltato', cls: 'is-skip', dot: '–' },
  todo: { label: 'Da fare', cls: 'is-todo', dot: '' },
};

let cleanups = [];

function runCleanups() {
  const pending = cleanups;
  cleanups = [];
  for (const fn of pending) {
    try {
      fn();
    } catch (err) {
      console.warn('cleanup fallito', err);
    }
  }
}

export function mountShell(root) {
  const header = el('header', { class: 'app__header' });
  const nav = el('nav', { class: 'stepper', 'aria-label': 'Passi del test' });
  const main = el('main', { class: 'app__main' });
  const app = el(
    'div',
    { class: 'app' },
    header,
    el('div', { class: 'app__body' }, nav, main),
  );
  clear(root).append(app);

  function statusOf(id) {
    return store.result(id).status || 'todo';
  }

  function renderHeader() {
    const done = TEST_STEPS.filter((s) => store.result(s.id).status).length;
    clear(header).append(
      el(
        'a',
        { class: 'brand', href: '#/step/intro' },
        el('span', { class: 'brand__logo' }, '🧪'),
        el(
          'span',
          { class: 'brand__text' },
          el('strong', {}, 'MacBook Tester'),
          el('span', { class: 'brand__sub' }, 'Test guidato hardware & software'),
        ),
      ),
      el(
        'div',
        { class: 'header__actions' },
        el('span', { class: 'pill' }, `${done}/${TEST_STEPS.length} completati`),
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => go('report') }, '📄 Report'),
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: onReset }, 'Azzera'),
      ),
    );
  }

  function onReset() {
    if (confirm('Azzerare tutti i risultati e ricominciare da capo?')) {
      store.reset();
      go('intro');
    }
  }

  function renderNav() {
    const activeId = currentStepId();
    clear(nav).append(
      ...STEPS.map((step) => {
        const meta = STATUS_META[step.meta ? 'todo' : statusOf(step.id)];
        return el(
          'button',
          {
            type: 'button',
            class: `stepper__item ${meta.cls} ${step.id === activeId ? 'is-active' : ''}`,
            onClick: () => go(step.id),
          },
          el('span', { class: 'stepper__icon' }, step.icon),
          el('span', { class: 'stepper__label' }, step.label),
          step.meta ? null : el('span', { class: 'stepper__dot', title: meta.label }, meta.dot),
        );
      }),
    );
  }

  function renderResultBar(id) {
    const wrap = el('section', { class: 'resultbar' });

    function paint() {
      const r = store.result(id);
      const button = (status, label, cls) =>
        el(
          'button',
          {
            type: 'button',
            class: `btn btn--result ${cls} ${r.status === status ? 'is-selected' : ''}`,
            onClick: () => {
              store.setStatus(id, r.status === status ? null : status);
              paint();
              renderHeader();
              renderNav();
            },
          },
          label,
        );

      const note = el('textarea', {
        class: 'resultbar__note',
        rows: '2',
        placeholder: 'Note (opzionale): descrivi cosa hai notato…',
        onInput: (ev) => store.setNote(id, ev.target.value),
      });
      note.value = r.note || '';

      clear(wrap).append(
        el('span', { class: 'resultbar__title' }, 'Esito di questo test'),
        el(
          'div',
          { class: 'resultbar__buttons' },
          button('ok', '✅ Tutto ok', 'btn--ok'),
          button('issue', '⚠️ Problema', 'btn--issue'),
          button('skip', '⏭️ Salta', 'btn--skip'),
        ),
        note,
      );
    }

    paint();
    return wrap;
  }

  function renderPager(id) {
    const idx = stepIndex(id);
    const prev = STEPS[idx - 1];
    const next = STEPS[idx + 1];
    return el(
      'nav',
      { class: 'pager' },
      prev
        ? el('button', { type: 'button', class: 'btn', onClick: () => go(prev.id) }, `← ${prev.label}`)
        : el('span'),
      next
        ? el('button', { type: 'button', class: 'btn btn--primary', onClick: () => go(next.id) }, `${next.label} →`)
        : el('span'),
    );
  }

  async function renderStep(id) {
    runCleanups();
    const step = stepById(id) || STEPS[0];
    renderHeader();
    renderNav();
    clear(main).append(el('div', { class: 'loading' }, 'Carico il modulo…'));

    let mod;
    try {
      mod = (await step.loader()).default;
    } catch (err) {
      clear(main).append(
        el('div', { class: 'notice notice--error' }, `Impossibile caricare il modulo: ${err.message}`),
      );
      return;
    }

    // se nel frattempo l'utente ha cambiato passo, non montare quello vecchio
    if (currentStepId() !== id) return;

    const page = el('article', { class: 'page' });
    const intro = el('section', { class: 'panel panel--intro', html: mod.intro || '' });
    const stage = el('section', { class: 'panel panel--stage' });
    page.append(intro, stage);
    clear(main).append(page);

    const ctx = {
      stage,
      store,
      stepId: id,
      onCleanup: (fn) => cleanups.push(fn),
      setData: (data) => store.setData(id, data),
      setStatusHint: (status) => {
        if (!store.result(id).status) {
          store.setStatus(id, status);
          renderHeader();
          renderNav();
          const bar = main.querySelector('.resultbar');
          if (bar) bar.replaceWith(renderResultBar(id));
        }
      },
      go,
    };

    try {
      await mod.render(ctx);
    } catch (err) {
      console.error(err);
      stage.append(el('div', { class: 'notice notice--error' }, `Errore nel test: ${err && err.message}`));
    }

    if (mod.needsResult !== false) page.append(renderResultBar(id));
    page.append(renderPager(id));
    main.scrollTo({ top: 0 });
  }

  store.subscribe(() => {
    renderHeader();
    renderNav();
  });
  onRoute((id) => renderStep(id));

  return { start: () => startRouter() };
}
