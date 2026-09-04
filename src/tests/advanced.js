import { el, clear } from '../core/dom.js';

/* Input avanzati e sensori: fullscreen, pointer lock, gamepad, clipboard,
   geolocalizzazione, notifiche, wake lock + matrice di capacita' del browser.
   Su Mac molti sensori (accelerometro, giroscopio, luce, vibrazione) non
   esistono: qui vengono segnalati come non disponibili, ed e' normale. */

function capRow(name, ok, note = '') {
  return el(
    'div',
    { class: 'checklist__item' },
    el('span', { class: `tag ${ok ? 'tag--yes' : 'tag--no'}` }, ok ? 'sì' : 'no'),
    el('span', {}, name, note ? el('span', { class: 'mono' }, ` — ${note}`) : null),
  );
}

export default {
  intro: `
    <h2>Input avanzati e sensori</h2>
    <p>Verifiche rapide di funzioni che passano dal browser. Su un MacBook è normale che
    accelerometro, giroscopio, luce ambientale e vibrazione risultino <em>non disponibili</em>.</p>
  `,

  async render(ctx) {
    const results = {};
    const stack = el('div', { class: 'stack' });
    ctx.stage.append(stack);

    // --- Fullscreen ---
    const fsBox = el('div', { class: 'card', style: { textAlign: 'center', padding: '2rem' } }, 'Area schermo intero');
    const fsStatus = el('span', { class: 'mono' }, '—');
    const onFs = () => {
      const on = !!document.fullscreenElement;
      fsStatus.textContent = on ? 'schermo intero attivo' : 'uscito';
      if (on) {
        results.fullscreen = true;
        ctx.setData({ ...results });
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    stack.append(
      el('h3', {}, 'Schermo intero'),
      fsBox,
      el(
        'div',
        { class: 'btn-row' },
        el(
          'button',
          { class: 'btn btn--sm', type: 'button', onClick: () => fsBox.requestFullscreen?.().catch(() => (fsStatus.textContent = 'negato')) },
          'Attiva su questo riquadro',
        ),
        el('button', { class: 'btn btn--sm', type: 'button', onClick: () => document.exitFullscreen?.() }, 'Esci'),
        fsStatus,
      ),
    );

    // --- Pointer lock ---
    const plBox = el('div', { class: 'card', style: { textAlign: 'center', padding: '2rem', cursor: 'crosshair' } }, 'Clicca e muovi il puntatore');
    const plStatus = el('span', { class: 'mono' }, '—');
    let acc = { x: 0, y: 0 };
    const onPlMove = (e) => {
      if (document.pointerLockElement !== plBox) return;
      acc.x += e.movementX;
      acc.y += e.movementY;
      plStatus.textContent = `Δ ${acc.x}, ${acc.y}`;
      if (Math.abs(acc.x) + Math.abs(acc.y) > 200) {
        results.pointerLock = true;
        ctx.setData({ ...results });
      }
    };
    document.addEventListener('mousemove', onPlMove);
    plBox.addEventListener('click', () => plBox.requestPointerLock?.());
    stack.append(el('h3', {}, 'Pointer lock'), plBox, el('div', { class: 'btn-row' }, plStatus, el('span', { class: 'mono' }, 'Esc per rilasciare')));

    // --- Gamepad ---
    const gpStatus = el('p', { class: 'mono' }, 'Nessun controller. Collegane uno e premi un tasto (opzionale).');
    let gpRaf = null;
    const pollGamepads = () => {
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      if (pads.length) {
        const p = pads[0];
        const pressed = p.buttons.map((b, i) => (b.pressed ? i : null)).filter((x) => x != null);
        gpStatus.textContent = `${p.id} · assi ${p.axes.map((a) => a.toFixed(2)).join(', ')} · tasti [${pressed.join(', ')}]`;
        results.gamepad = true;
      }
      gpRaf = requestAnimationFrame(pollGamepads);
    };
    pollGamepads();
    stack.append(el('h3', {}, 'Gamepad'), gpStatus);

    // --- Clipboard ---
    const clipStatus = el('span', { class: 'mono' }, '—');
    stack.append(
      el('h3', {}, 'Appunti (clipboard)'),
      el(
        'div',
        { class: 'btn-row' },
        el(
          'button',
          {
            class: 'btn btn--sm',
            type: 'button',
            onClick: async () => {
              const token = `macbook-tester ${Date.now()}`;
              try {
                await navigator.clipboard.writeText(token);
                const back = await navigator.clipboard.readText();
                results.clipboard = back === token;
                clipStatus.textContent = back === token ? 'scrittura+lettura OK' : `letto: ${back}`;
                ctx.setData({ ...results });
              } catch (e) {
                clipStatus.textContent = `negato: ${e.message}`;
              }
            },
          },
          'Prova scrittura/lettura',
        ),
        clipStatus,
      ),
    );

    // --- Geolocation ---
    const geoStatus = el('span', { class: 'mono' }, '—');
    const geoInclude = el('input', { type: 'checkbox' });
    stack.append(
      el('h3', {}, 'Geolocalizzazione'),
      el('p', { class: 'mono' }, 'Verifica solo che il permesso e il fix funzionino. Le coordinate NON entrano nel report se non spunti la casella.'),
      el(
        'div',
        { class: 'btn-row' },
        el(
          'button',
          {
            class: 'btn btn--sm',
            type: 'button',
            onClick: () => {
              navigator.geolocation?.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude, accuracy } = pos.coords;
                  geoStatus.textContent = `OK · accuratezza ~${Math.round(accuracy)} m`;
                  results.geolocation = geoInclude.checked
                    ? { lat: latitude, lon: longitude, accuracy }
                    : { ok: true, accuracy: Math.round(accuracy) };
                  ctx.setData({ ...results });
                },
                (err) => (geoStatus.textContent = `errore: ${err.message}`),
                { enableHighAccuracy: true, timeout: 10000 },
              );
            },
          },
          'Ottieni posizione',
        ),
        el('label', { class: 'mono' }, geoInclude, ' includi coordinate nel report'),
        geoStatus,
      ),
    );

    // --- Notifiche ---
    const notifStatus = el('span', { class: 'mono' }, `permesso: ${('Notification' in window) ? Notification.permission : 'n/d'}`);
    stack.append(
      el('h3', {}, 'Notifiche'),
      el(
        'div',
        { class: 'btn-row' },
        el(
          'button',
          {
            class: 'btn btn--sm',
            type: 'button',
            onClick: async () => {
              if (!('Notification' in window)) return;
              const p = await Notification.requestPermission();
              notifStatus.textContent = `permesso: ${p}`;
              if (p === 'granted') {
                new Notification('MacBook Tester', { body: 'Notifica di prova ✔' });
                results.notifications = true;
                ctx.setData({ ...results });
              }
            },
          },
          'Richiedi e invia notifica di prova',
        ),
        notifStatus,
      ),
    );

    // --- Wake lock ---
    const wlStatus = el('span', { class: 'mono' }, '—');
    stack.append(
      el('h3', {}, 'Wake lock (schermo sempre acceso)'),
      el(
        'div',
        { class: 'btn-row' },
        el(
          'button',
          {
            class: 'btn btn--sm',
            type: 'button',
            onClick: async () => {
              try {
                const wl = await navigator.wakeLock.request('screen');
                wlStatus.textContent = 'attivo per 8 s…';
                results.wakeLock = true;
                ctx.setData({ ...results });
                setTimeout(() => {
                  wl.release();
                  wlStatus.textContent = 'rilasciato';
                }, 8000);
              } catch (e) {
                wlStatus.textContent = `non disponibile: ${e.message}`;
              }
            },
          },
          'Prova wake lock',
        ),
        wlStatus,
      ),
    );

    // --- Matrice capacita' ---
    const matrix = el('div', { class: 'checklist' });
    const has = (v) => typeof v !== 'undefined' && v !== null;
    matrix.append(
      capRow('WebGL2', !!document.createElement('canvas').getContext('webgl2')),
      capRow('WebGPU', has(navigator.gpu)),
      capRow('WebAssembly', typeof WebAssembly === 'object'),
      capRow('SharedArrayBuffer', typeof SharedArrayBuffer !== 'undefined'),
      capRow('OffscreenCanvas', typeof OffscreenCanvas !== 'undefined'),
      capRow('WebCodecs', typeof window.VideoEncoder !== 'undefined'),
      capRow('WebXR', has(navigator.xr)),
      capRow('Web Bluetooth', has(navigator.bluetooth), 'Chrome'),
      capRow('WebUSB', has(navigator.usb), 'Chrome'),
      capRow('Web Serial', has(navigator.serial), 'Chrome'),
      capRow('Web HID', has(navigator.hid), 'Chrome'),
      capRow('Web MIDI', has(navigator.requestMIDIAccess)),
      capRow('EyeDropper', typeof window.EyeDropper !== 'undefined'),
      capRow('Screen Wake Lock', has(navigator.wakeLock)),
      capRow('Vibration', has(navigator.vibrate), 'non su Mac'),
      capRow('Accelerometro', typeof window.Accelerometer !== 'undefined', 'non su Mac'),
      capRow('Giroscopio', typeof window.Gyroscope !== 'undefined', 'non su Mac'),
      capRow('Luce ambientale', typeof window.AmbientLightSensor !== 'undefined', 'non su Mac'),
    );
    stack.append(el('h3', {}, 'Capacità del browser su questa macchina'), matrix);

    ctx.setData({ ...results });
    ctx.onCleanup(() => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('mousemove', onPlMove);
      if (gpRaf) cancelAnimationFrame(gpRaf);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (document.pointerLockElement) document.exitPointerLock();
    });
  },
};
