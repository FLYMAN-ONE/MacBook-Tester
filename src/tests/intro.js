import { el } from '../core/dom.js';

const PREP = [
  'Collega il MacBook alla corrente (o assicurati che la batteria sia carica).',
  'Porta la luminosità dello schermo al massimo e disattiva temporaneamente Night Shift / True Tone per i test colore.',
  'Pulisci lo schermo con un panno in microfibra: polvere e aloni sembrano difetti.',
  'Vai in una stanza che puoi oscurare (serve per bleeding e pixel difettosi) ma con luce sufficiente per la tastiera.',
  'Usa Safari o Chrome aggiornati. Alcuni test (webcam, microfono, sensori) chiederanno un permesso: accetta.',
  'Chiudi le altre app: alcuni test usano audio, fotocamera e schermo intero.',
  'Se il venditore è presente, spiega che farai una prova completa di circa 10 minuti.',
];

const CANNOT = [
  ['Salute e cicli della batteria', 'non accessibili dal browser. Usa <em>Impostazioni di sistema → Batteria → Stato batteria</em> oppure app come coconutBattery.'],
  ['Diagnostica hardware Apple', 'tieni premuto <kbd>D</kbd> all’accensione (Apple Diagnostics) per CPU, RAM, logic board, ventole.'],
  ['Tasto Fn / globo e Touch ID', 'non generano eventi web: vanno provati manualmente.'],
  ['Force Touch / pressione del trackpad', 'il livello di forza non è esposto ai browser: verifica il click a pressione manualmente.'],
  ['Porte Thunderbolt/USB-C, MagSafe, HDMI, SD', 'prova con cavi e dispositivi reali.'],
  ['Wi‑Fi / Bluetooth a fondo, SSD SMART, ventole e temperature', 'usa <em>Informazioni di sistema</em> o Apple Diagnostics.'],
  ['Copertura e provenienza', 'controlla il numero di serie su <em>checkcoverage.apple.com</em> e verifica che il Blocco di attivazione (<em>Dov’è</em>) sia disattivato.'],
];

export default {
  needsResult: false,
  intro: `
    <h2>Test guidato del MacBook</h2>
    <p>Questo strumento ti accompagna passo per passo nel controllo di un MacBook usato:
    display, tastiera, trackpad, altoparlanti, webcam, microfono e informazioni di sistema.
    Ad ogni passo segni l’esito (<strong>OK</strong>, <strong>Problema</strong> o <strong>Salta</strong>) e alla fine
    ottieni un <strong>report</strong> esportabile.</p>
    <p>I risultati restano salvati in questo browser: se ricarichi la pagina non perdi niente.
    Funziona online, senza installare nulla.</p>
    <h3>Prima di iniziare</h3>
    <ol>${PREP.map((t) => `<li>${t}</li>`).join('')}</ol>
    <h3>Cosa questo tool <u>non</u> può verificare</h3>
    <ul>${CANNOT.map(([a, b]) => `<li><strong>${a}:</strong> ${b}</li>`).join('')}</ul>
  `,

  async render(ctx) {
    const checks = { ...(ctx.store.result(ctx.stepId).data || {}) };
    const list = el('div', { class: 'checklist' });

    PREP.forEach((label, i) => {
      const key = `p${i}`;
      const box = el('span', { class: 'checklist__box' }, checks[key] ? '✔' : '');
      const item = el(
        'button',
        {
          type: 'button',
          class: `checklist__item ${checks[key] ? 'is-done' : ''}`,
          onClick: () => {
            checks[key] = !checks[key];
            item.classList.toggle('is-done', !!checks[key]);
            box.textContent = checks[key] ? '✔' : '';
            ctx.setData({ ...checks });
          },
        },
        box,
        el('span', {}, label),
      );
      list.append(item);
    });

    ctx.stage.append(
      el(
        'div',
        { class: 'stack' },
        el('h3', {}, 'Checklist di preparazione'),
        el('p', { class: 'mono' }, 'Spunta le voci man mano che sei pronto (facoltativo).'),
        list,
        el(
          'div',
          { class: 'btn-row' },
          el(
            'button',
            { class: 'btn btn--primary', type: 'button', onClick: () => ctx.go('display') },
            'Inizia dal display →',
          ),
        ),
      ),
    );
  },
};
