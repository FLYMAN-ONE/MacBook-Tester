import { el, clear } from '../core/dom.js';

/* Webcam: anteprima live, elenco dispositivi, risoluzione/frame rate reali,
   scatto di un fotogramma. Lo stream viene chiuso all'uscita dal passo. */

export default {
  intro: `
    <h2>Test della webcam</h2>
    <p>Concedi il permesso alla fotocamera. Controlla:</p>
    <ul>
      <li>Immagine nitida, esposizione corretta, colori naturali.</li>
      <li>Nessuna macchia fissa, righe o zone sfocate (polvere/danni sull’obiettivo).</li>
      <li>La spia verde accanto alla fotocamera si accende.</li>
      <li>Frame rate stabile (indicato sotto l’anteprima).</li>
    </ul>
    <p class="mono">La qualità dipende anche dalla luce dell’ambiente.</p>
  `,

  async render(ctx) {
    let stream = null;
    let rafId = null;
    let frames = 0;
    let lastT = performance.now();

    const video = el('video', { class: 'preview', autoplay: true, playsinline: true, muted: true });
    const status = el('p', { class: 'mono' }, 'In attesa del permesso…');
    const fps = el('p', { class: 'mono' });
    const settings = el('dl', { class: 'kv' });
    const deviceSelect = el('select', { class: 'btn' });
    const shot = el('canvas', { style: { display: 'none' } });
    const shotImg = el('img', { style: { maxWidth: '320px', borderRadius: '8px', border: '1px solid var(--border)' } });

    const controls = el(
      'div',
      { class: 'btn-row' },
      el('label', { class: 'mono' }, 'Camera: ', deviceSelect),
      el('button', { class: 'btn btn--sm', type: 'button', onClick: () => video.classList.toggle('mirror') }, 'Specchia'),
      el(
        'button',
        {
          class: 'btn btn--sm',
          type: 'button',
          onClick: () => {
            if (!video.videoWidth) return;
            shot.width = video.videoWidth;
            shot.height = video.videoHeight;
            shot.getContext('2d').drawImage(video, 0, 0);
            shotImg.src = shot.toDataURL('image/png');
          },
        },
        '📸 Scatta',
      ),
    );

    ctx.stage.append(
      el('div', { class: 'stack' }, status, controls, video, fps, el('h3', {}, 'Parametri stream'), settings, shotImg, shot),
    );

    async function start(deviceId) {
      stop();
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : { width: { ideal: 1280 } },
          audio: false,
        });
        video.srcObject = stream;
        status.textContent = 'Fotocamera attiva.';
        const track = stream.getVideoTracks()[0];
        const s = track.getSettings();
        clear(settings).append(
          ...Object.entries({
            Dispositivo: track.label || '—',
            Risoluzione: s.width && s.height ? `${s.width}×${s.height}` : '—',
            'Frame rate': s.frameRate ? `${Math.round(s.frameRate)} fps (richiesto)` : '—',
            'Facing mode': s.facingMode || 'n/d (tipico su Mac)',
          }).flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]),
        );
        ctx.setData({ label: track.label, width: s.width, height: s.height, frameRate: s.frameRate });
        ctx.setStatusHint?.('ok');
        measureFps();
        await populateDevices();
      } catch (err) {
        status.textContent = `Impossibile accedere alla fotocamera: ${err.name} — ${err.message}`;
      }
    }

    function measureFps() {
      const loop = () => {
        frames += 1;
        const now = performance.now();
        if (now - lastT >= 1000) {
          fps.textContent = `Frame rate misurato: ~${frames} fps`;
          frames = 0;
          lastT = now;
        }
        rafId = requestAnimationFrame(loop);
      };
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        const vloop = () => {
          frames += 1;
          const now = performance.now();
          if (now - lastT >= 1000) {
            fps.textContent = `Frame rate misurato: ~${frames} fps`;
            frames = 0;
            lastT = now;
          }
          video.requestVideoFrameCallback(vloop);
        };
        video.requestVideoFrameCallback(vloop);
      } else {
        rafId = requestAnimationFrame(loop);
      }
    }

    async function populateDevices() {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      clear(deviceSelect).append(
        ...devices.map((d, i) => el('option', { value: d.deviceId }, d.label || `Camera ${i + 1}`)),
      );
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    deviceSelect.addEventListener('change', () => start(deviceSelect.value));
    ctx.onCleanup(stop);
    start();
  },
};
