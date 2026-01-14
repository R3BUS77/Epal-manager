# Epal Manager

Software di gestione per la contabilità e movimentazione di bancali EPAL.

## Requisiti

*   Windows 10 o superiore
*   Node.js (versione 16 o superiore) installato sul sistema

## Installazione (Sviluppo)

1.  Clonare la repository:
    ```bash
    git clone https://github.com/R3BUS77/Epal-manager.git
    ```
2.  Entrare nella cartella del progetto:
    ```bash
    cd Epal-Manager
    ```
3.  Installare le dipendenze:
    ```bash
    npm install
    ```

## Utilizzo

### Modalità Sviluppo
Per avviare l'applicazione in modalità di test (con ricaricamento automatico):

```bash
npm run dev
```

### Compilazione (Build)
Per creare l'eseguibile finale per Windows (x64):

```bash
npm run electron:build:x64
```
Il file eseguibile verrà creato nella cartella `dist_electron/win-unpacked`.

## Aggiornamento Manuale
Per aggiornare una installazione esistente senza reinstallare tutto:
1.  Prendere il file `app.asar` dalla build più recente (cartella `resources`).
2.  Sostituirlo nella cartella `resources` dell'installazione di destinazione.

---
**Autore:** r3bus77
**Anno:** 2025-2026
