// Stato persistente dei risultati del test. Salvato in localStorage cosi' un
// refresh accidentale non perde i progressi.

const KEY = 'macbook-tester:v1';
const listeners = new Set();

function fresh() {
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    results: {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && parsed.results && typeof parsed.results === 'object') {
      return parsed;
    }
  } catch {
    /* storage non disponibile o dati corrotti: si riparte puliti */
  }
  return fresh();
}

let state = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* modalita' privata / quota piena: si continua solo in memoria */
  }
  listeners.forEach((fn) => fn(state));
}

function entry(id) {
  if (!state.results[id]) {
    state.results[id] = { status: null, note: '', data: null, updatedAt: null };
  }
  return state.results[id];
}

export const store = {
  get() {
    return state;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  result(id) {
    return state.results[id] || { status: null, note: '', data: null, updatedAt: null };
  },
  setStatus(id, status) {
    const e = entry(id);
    e.status = status;
    e.updatedAt = new Date().toISOString();
    persist();
  },
  setNote(id, note) {
    const e = entry(id);
    e.note = note;
    e.updatedAt = new Date().toISOString();
    persist();
  },
  setData(id, data) {
    const e = entry(id);
    e.data = data;
    e.updatedAt = new Date().toISOString();
    persist();
  },
  reset() {
    state = fresh();
    persist();
  },
};
