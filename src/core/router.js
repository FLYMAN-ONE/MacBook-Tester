// Router hash minimale. Tutte le rotte hanno la forma #/step/<id>.

const handlers = new Set();

export function onRoute(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

export function currentStepId() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/');
  if (parts[0] === 'step' && parts[1]) return parts[1];
  return 'intro';
}

export function go(stepId) {
  location.hash = `#/step/${stepId}`;
}

window.addEventListener('hashchange', () => {
  const id = currentStepId();
  handlers.forEach((fn) => fn(id));
});

export function startRouter() {
  if (!location.hash) {
    location.replace(`${location.pathname}${location.search}#/step/intro`);
  }
  const id = currentStepId();
  handlers.forEach((fn) => fn(id));
}
