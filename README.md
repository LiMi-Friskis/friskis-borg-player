# Friskis Training Player — Prototype 2.5.0 · Pro Realtime v0.1

Ändringar i denna version:
- screenshot-import går direkt till Redigera pass efter AI-analys
- låttitel + artist läggs i blockets Beskrivning
- passnamn hämtas från FitnessPlayer-listans namn när det är synligt
- dublettnamn får automatiskt suffix `_2`, `_3`, osv.
- MusicTrack/MusicTimeline ligger fortsatt separat från WorkoutBlock

## Deploy
1. Ersätt webbfilerna i `main`.
2. Deploya Edge Function `music-import` igen eftersom prompten för listnamn har förbättrats.
3. Ingen ny SQL behövs.

## Prototype 2.5.0 · Pro Realtime v0.1

Adds a Super User-only `KÖR MED PRO` flow backed by Supabase `live_sessions`. The web player is the master clock using `clock_anchor_at + position_ms`. See `SETUP_PRO_REALTIME_0.1.md` and `09_pro_realtime_v0_1.sql`.
