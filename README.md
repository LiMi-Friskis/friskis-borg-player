# Friskis Training Player — Prototype 2.3.4

Hotfix för utgångna inloggningssessioner.

- access token förnyas automatiskt med Supabase refresh token innan den går ut
- om PostgREST ändå svarar med `JWT expired` / `PGRST303` förnyas sessionen och anropet görs om en gång
- om sessionen inte längre kan förnyas visas ett begripligt meddelande om att logga in igen, i stället för rått JWT-fel
- övrig funktionalitet från 2.3.3 är oförändrad

Ingen SQL.
Ingen Edge Function.

© 2026 LiMi Equus AB. Alla rättigheter förbehållna.
