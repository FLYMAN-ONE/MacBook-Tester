// Ordine e metadati dei passi della procedura guidata.
// `meta: true`  -> passo informativo, non richiede un esito ne' entra nel conteggio.
// I moduli sono caricati in modo lazy: ogni test arriva solo quando serve.

export const STEPS = [
  {
    id: 'intro',
    label: 'Preparazione',
    icon: '📋',
    meta: true,
    loader: () => import('../tests/intro.js'),
  },
  {
    id: 'display',
    label: 'Display',
    icon: '🖥️',
    loader: () => import('../tests/display.js'),
  },
  {
    id: 'resolution',
    label: 'Risoluzione',
    icon: '📐',
    loader: () => import('../tests/resolution.js'),
  },
  {
    id: 'refresh',
    label: 'Refresh & FPS',
    icon: '⏱️',
    loader: () => import('../tests/refresh.js'),
  },
  {
    id: 'keyboard',
    label: 'Tastiera',
    icon: '⌨️',
    loader: () => import('../tests/keyboard.js'),
  },
  {
    id: 'trackpad',
    label: 'Trackpad',
    icon: '🖲️',
    loader: () => import('../tests/trackpad.js'),
  },
  {
    id: 'camera',
    label: 'Webcam',
    icon: '📷',
    loader: () => import('../tests/camera.js'),
  },
  {
    id: 'microphone',
    label: 'Microfono',
    icon: '🎙️',
    loader: () => import('../tests/microphone.js'),
  },
  {
    id: 'speakers',
    label: 'Altoparlanti',
    icon: '🔊',
    loader: () => import('../tests/speakers.js'),
  },
  {
    id: 'sysinfo',
    label: 'Sistema & GPU',
    icon: '🧠',
    loader: () => import('../tests/sysinfo.js'),
  },
  {
    id: 'advanced',
    label: 'Input & sensori',
    icon: '🧩',
    loader: () => import('../tests/advanced.js'),
  },
  {
    id: 'report',
    label: 'Report',
    icon: '📄',
    meta: true,
    loader: () => import('../tests/report.js'),
  },
];

export const TEST_STEPS = STEPS.filter((s) => !s.meta);

export function stepById(id) {
  return STEPS.find((s) => s.id === id);
}

export function stepIndex(id) {
  return STEPS.findIndex((s) => s.id === id);
}
