# Friskis Training Player — Prototype 2.1.4

Fix:
- Korrigerad redirect för lösenordsåterställning.
- Supabase `recover` får nu `redirect_to` som query-parameter, vilket gör att hela GitHub Pages-sökvägen används:
  `https://limi-friskis.github.io/friskis-borg-player/`
- Gäller både:
  - Glömt lösenord
  - Nytt lösenord från användaradministrationen

Ingen ny SQL krävs.
Ingen ändring av Edge Function `invite-user` krävs jämfört med 2.1.3.

© 2026 LiMi Equus AB. Alla rättigheter förbehållna.
