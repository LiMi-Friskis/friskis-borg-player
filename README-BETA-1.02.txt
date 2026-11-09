Friskis Training Player — Beta 1.02, FILIMPORT (TESTVERSION)

BAS: Beta 1.01 Hotfix 3. Uppspelningsmotorn har inte ändrats.

INSTALLATION:
1. Spara en kopia av nuvarande app.js och index.html (Hotfix 3).
2. Publicera app.js och index.html från detta paket på GitHub Pages.
3. I Supabase: Edge Functions > music-import > Code: ersätt innehållet med music-import-edge.ts och deploya.
4. Ingen ny SQL behövs för schemaimport utan musik.
5. Prova med ett PRIVAT testpass och granska alla tider/intensiteter innan skarp användning.

NYTT:
- Knapp 'Skapa pass från fil', PDF/PNG/JPG/WEBP (högst 10 filer, 10 MB/fil).
- AI känner igen schema eller musiklista.
- Sorterar separata filer efter tryckta sidnummer, även om numrering börjar på annat än 1.
- Manuell ändring av sidnummer och om-sortering i förhandsgranskning.
- Val Borg eller FTP; tid från träningsraderna, inte rubriker eller musik.
- Förhandsgranskning med redigerbara tider och intensiteter.
- Befintlig musikimport bevaras, men visar nu granskning före skapande.

BEGRÄNSNINGAR I DENNA TESTVERSION:
- Vid blandat underlag med både schema och musik importeras schemat; musikposter kopplas ännu inte till passet. Musikimport som ENDA underlag fungerar som tidigare.
- Flera sidor inuti en enskild PDF analyseras i PDF:ens inbyggda sidordning. Manuell sortering gäller separata uppladdade filer.
- Inga automatiska kontroller av total tid mot rubrik.
- OpenAI-modellens stöd för PDF input_file måste verifieras i din Supabase-miljö.
- Ännu inte end-to-end-testad mot live Supabase, OpenAI eller Safari.

ÅTERGÅNG:
Återställ app.js och index.html från Beta 1.01 Hotfix 3. Om det behövs, återställ även tidigare Edge Function.
