# Friskis Training Player – update

Detta paket innehåller bara filerna som behöver ersättas i GitHub-repots rot:

- `index.html`
- `app.js`
- `style.css`

Ladda upp/ersätt dessa tre filer i `main`. Ingen SQL behöver köras och inga övriga filer ska ändras.

## Innehåll
- Väntrummets kontrast/färger från 2.5.3.
- `pass_snapshot.blocks[]` innehåller nu `intensityHeightPercent`, beräknat med exakt samma `intensityHeight(p, part)` som webbdiagrammet använder.
- `targets` och övrigt snapshot-kontrakt är oförändrade.
- Versionsvisningen är `Prototype 2.5.4 · Snapshot Height v0.1`.

## Kontroll efter deploy
1. Hårduppdatera sidan.
2. Kontrollera att versionsraden visar `Prototype 2.5.4 · Snapshot Height v0.1`.
3. Starta ett nytt `KÖR MED PRO`-pass.
4. Kontrollera i `live_sessions.pass_snapshot` att varje block har `intensityHeightPercent` på blocknivå.

Paketnamnet är avsiktligt generiskt och kan återanvändas för kommande webbuppdateringar.
