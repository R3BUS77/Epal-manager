# Guida al Backup su GitHub 📦

Hai chiesto come salvare tutto il lavoro su GitHub. Ecco i passaggi semplici da seguire.
Abbiamo già salvato (committato) tutto il lavoro localmente sul tuo PC. Ora dobbiamo solo "spedirlo" al cloud.

## Prerequisiti
1.  Devi avere un account su [GitHub.com](https://github.com).
2.  Devi avere `git` installato (lo hai già).

## Procedura Passo-Passo

### 1. Crea un "Nuovo Repository" su GitHub
1.  Vai su [github.com/new](https://github.com/new).
2.  **Repository name**: Scrivi `Epal-Manager`.
3.  **Visibility**: Scegli **Private** (Privato) per tenere il codice aziendale al sicuro.
4.  Non aggiungere README, .gitignore o licenza (li abbiamo già).
5.  Clicca su **Create repository**.

### 2. Collega il tuo PC a GitHub
Una volta creato, GitHub ti mostrerà una pagina con dei codici. Cerca la sezione **"…or push an existing repository from the command line"**.

Copia ed incolla questi comandi nel tuo terminale (PowerShell), uno alla volta:

```powershell
git remote add origin https://github.com/TUO_NOME_UTENTE/Epal-Manager.git
git branch -M main
git push -u origin main
```
*(Sostituisci `TUO_NOME_UTENTE` con il tuo vero username GitHub)*.

### 3. Autenticazione (Solo la prima volta)
Quando lancerai l'ultimo comando (`git push`), Windows potrebbe aprirti una finestrella per fare il login a GitHub. Inserisci le tue credenziali o autorizza tramite browser.

### Fatto! ✅
Se tutto va a buon fine, vedrai una scritta come `Branch 'main' set up to track remote branch 'main'`.
Il tuo codice è ora al sicuro nel cloud.

---

## Come aggiornare il backup in futuro?
Ogni volta che faccio delle modifiche per te, per aggiornare il backup online ti basterà scrivere nel terminale:

```powershell
git push
```
E basta. Semplice!
