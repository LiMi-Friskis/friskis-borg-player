# Friskis Training Player – update

Ersätt dessa filer i GitHub-repots rot på `main`:

- `app.js`
- `index.html`

Ingen SQL behöver köras. `style.css` och övriga filer är oförändrade.

## Ändring
Borg-färger hämtas nu från intensitetsregistrets `color_hex`, på samma sätt som övriga dynamiska intensitetsvärden. Den gamla hårdkodade Borg-färgskalan finns kvar endast som fallback om ett registervärde saknas.

Det innebär exempelvis att Borg 20 använder den färg som är satt i registret (`#E31836` i nuvarande inställning), i stället för den gamla hårdkodade mörkröda färgen.

Snapshot-kontrakt, `targets`, `intensityHeightPercent`, FTP-logik och övrig spelarlogik är oförändrade.

Version: `Prototype 2.5.5 · Borg Register Colors v0.1`

## Kontroll efter deploy
1. Hårduppdatera sidan.
2. Kontrollera versionsraden.
3. Öppna ett Borg-pass och kontrollera nivå 20 mot Registervård → Intensitetsvärden.
4. Starta gärna ett Pro-pass och kontrollera att `block.color` i ett nytt snapshot följer samma registerfärg.
