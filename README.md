# Friskis Training Player — Prototype 2.4.2 · Music Import v0.1.2

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
