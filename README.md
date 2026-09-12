# Friskis Training Player – Music Import v0.1

Parallellt utvecklingsspår ovanpå stabila Prototype 2.3.4.

Music Import v0.1:
- endast Super User
- 1–10 FitnessPlayer-screenshots
- OpenAI bildtolkning via Supabase Edge Function
- deterministisk deduplicering av överlapp mellan screenshots
- redigerbar förhandsgranskning
- separat MusicTrack / MusicTimeline-datamodell
- PAUSE sparas som eget tidssegment
- pass skapas som Privat och öppnas direkt i den vanliga passeditorn
- om PAUSE finns grupperas låtarna mellan pauser till första blockutkast; PAUSE blir ett redigerbart pausblock
- utan PAUSE skapas initialt ett block per låt
- vanliga passeditorn har även “Slå ihop med nästa block” för fortsatt bearbetning

Ingen OpenAI-nyckel ligger i webbläsaren eller GitHub.

© 2026 LiMi Equus AB. Alla rättigheter förbehållna.
