# Training Player update — Prototype 2.5.7

Hotfix för färgen i intensitetsfältet i passeditor.

## Varför 2.5.6 inte räckte
JavaScriptet hämtade rätt `color_hex` från registret, men webbläsarens inbyggda/native styling av `<select>` kunde ändra färgen visuellt, framför allt i fokusläget. Det syntes tydligt på Borg 20.

## Ändring
- Intensitetsfältet använder fortfarande `intensityColor()` och därmed registervärdet.
- Native select-utseende stängs av för just `.borginput`.
- Exakt registerfärg skickas via CSS-variabeln `--intensity-color`.
- En enkel egen vit dropdown-pil visas i stället.
- Ingen ändring av diagram, passdata, snapshot, Supabase eller Realtime.

## Installera
Ersätt dessa filer i GitHub `main`:
- `app.js`
- `style.css`
- `index.html`

Ingen SQL behövs.

## Test
Kontrollera särskilt Borg 18, 19 och 20 både med och utan fokus i fältet. De ska visuellt följa `color_hex` i Registervård.
