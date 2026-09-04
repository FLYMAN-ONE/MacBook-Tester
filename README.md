# MacBook Tester

Webapp guidata per controllare un **MacBook usato** prima dell'acquisto: display,
tastiera (ogni tasto), trackpad, altoparlanti, webcam, microfono, informazioni di
sistema/GPU e input avanzati. Nessuna installazione: funziona nel browser e, dopo
la prima visita, anche offline.

Interfaccia in italiano. Alla fine produce un **report esportabile** (Markdown /
JSON / stampa PDF).

## Cosa testa

| Passo | Contenuto |
| --- | --- |
| **Display** | Visore a schermo intero stile *screen tester*: tinte piene, gradienti, scala di grigi, barre colore, ricerca pixel difettosi (auto‑ciclo), nitidezza/moiré, geometria e bordi, contrasto, testo, movimento/ghosting, bleeding retroilluminazione. Navigazione da tastiera. |
| **Risoluzione** | Risoluzione fisica/logica, DPR, aspect ratio, densità (Retina/HiDPI), confronto con gli standard HD/FHD/QHD/4K, info finestra e scaling di sistema. |
| **Refresh & FPS** | Rilevamento in tempo reale della frequenza di aggiornamento: gauge Hz, FPS attuale/min/max/medio, grafico del frame time, motion test (1×/2×/4×), giudizio sul display e stabilità. |
| **Tastiera** | Layout ISO IT / ANSI US. Ogni tasto premuto diventa verde; rilevamento tasti "incollati"; lettura live di `code`/`key`/modificatori; conteggio tasti testati. |
| **Trackpad** | Movimento (copertura a quadranti), click sinistro/destro nelle 9 zone, doppio click, scroll X/Y, trascinamento, pinch‑zoom (wheel+ctrl / gesture Safari). |
| **Webcam** | Anteprima live, scelta dispositivo, risoluzione e frame rate reali, scatto di un fotogramma. |
| **Microfono** | VU meter (dBFS), forma d'onda, spettro, registrazione 5 s con riascolto. |
| **Altoparlanti** | Toni per canale L/R, sweep 20 Hz–20 kHz, frequenze fisse, quiz di identificazione canale. |
| **Sistema & GPU** | Risoluzione/Retina, refresh stimato, gamut P3 / HDR, core CPU, RAM (Chrome), vendor/renderer WebGL, WebGPU, storage, batteria (Chrome), rete, codec. |
| **Input & sensori** | Fullscreen, pointer lock, gamepad, clipboard, geolocalizzazione, notifiche, wake lock, matrice di capacità del browser. |
| **Report** | Riepilogo esiti + note + esportazione. |

### Cosa NON può testare (limiti del browser)

Salute e cicli batteria, Apple Diagnostics (tasto <kbd>D</kbd> all'avvio), porte
Thunderbolt/USB‑C/MagSafe/HDMI/SD, ventole e temperature, SSD SMART, tasto
<kbd>fn</kbd> e Touch ID, livello di forza del trackpad (Force Touch), copertura
AppleCare e Blocco di attivazione (*Dov'è*). Il tool lo ricorda nel report.

## Sviluppo

Richiede Node ≥ 18.18.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output statico in dist/
npm run preview  # anteprima del build
```

Stack: **Vite + JavaScript vanilla**, nessun framework. Routing hash, stato in
`localStorage`, service worker per l'uso offline (solo in produzione).

## Pubblicazione su GitHub Pages

1. Crea una repo su GitHub (es. `macbook-tester`) e collega questa cartella:

   ```bash
   git init
   git add .
   git commit -m "Primo commit: MacBook Tester"
   git branch -M main
   git remote add origin https://github.com/<utente>/<repo>.git
   git push -u origin main
   ```

2. Su GitHub: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Il workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) fa
   build e deploy a ogni push su `main`. Il sito sarà su
   `https://<utente>.github.io/<repo>/`.
4. (Consigliato) committa anche `package-lock.json` dopo `npm install`: il
   workflow userà automaticamente `npm ci`.

`base` in `vite.config.js` è `./` (percorsi relativi), quindi funziona sotto
qualsiasi sottocartella senza modifiche. Il routing è hash, quindi non serve una
SPA fallback.

### Altri host

Essendo un sito statico (`dist/`), va anche su Netlify, Vercel, Cloudflare Pages
o qualsiasi hosting statico: build command `npm run build`, publish directory
`dist`.

## Licenza

MIT — vedi [LICENSE](LICENSE).
