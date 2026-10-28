# Friskis Training Player — Beta 1.01

## Installation
1. Ta backup på befintliga `app.js`, `style.css` och `index.html`.
2. Kör `10_beta_1_01_pass_statistics.sql` i **Supabase SQL Editor** och kontrollera att det körs utan fel.
3. Ersätt de tre filerna på GitHub Pages med filerna i paketet. Låt övriga filer vara orörda.
4. Uppdatera sidan och kontrollera att **Beta 1.01** visas.

## Ändringar
- Helsskärm begärs automatiskt när ett pass startas (Standard och Pro). Den manuella knappen finns kvar om webbläsaren nekar. För Pro sker detta vid knappen **STARTA PASS**, inte vid öppning av Pro-väntrummet.
- Statistik skapas först efter 120 sekunders **aktiv uppspelningstid**, exklusive förstart och paus. Pass kortare än 120 sekunder registreras om de körs klart.
- En session markeras slutförd endast när passet når sitt slut; manuell förtida avslutning markeras avbruten. Oväntat stängda fönster lämnas som ofullständiga.
- Statistik nås via **▥** i administratörens toppmeny. Admin kan läsa; Super User kan också radera enskilda poster.
- Registrerar Standard/Pro, passnamn, aktivitet, start, aktiv tid och status. Ingen inloggning krävs för att ett publikt pass ska räknas.

## Viktiga begränsningar
- Statistiken räknar **spelade pass på enheter**, inte unika deltagare. Pro-väntande deltagartelefoner räknas inte.
- Klockan mäter faktisk tid i körläge; hoppa mellan block räknas inte som tränade minuter.
- Om nätverket bryts när gränsen nås kan en session missas; loggning är best effort och stör inte passuppspelningen.
- Ofullständiga sessioner kan ha en sista rapporterad aktiv tid som är upp till 30 sekunder gammal.
- Webbläsaren kan neka automatisk helskärm, särskilt på iPhone/iPad; manuell knapp finns kvar.
- SQL-funktionen är öppet anropbar även utan inloggning för att stödja anonyma pass. Den begränsar indata och skyddar läsning, men kan inte helt förhindra avsiktligt falska statistikposter från en illvillig klient. Vid större användning bör ytterligare missbruksskydd läggas till.

## Testa innan skarp användning
1. Starta ett Standard-pass utan inloggning. Kontrollera helskärm och att 30 sekunder inte skapar någon statistikpost.
2. Låt det köra 2 minuter och kontrollera att en ofullständig post skapas.
3. Avsluta manuellt och kontrollera status **Avbrutet**.
4. Kör ett pass till slutet och kontrollera **Slutfört**.
5. Testa Pro-väntrum → STARTA PASS och kontrollera att det bara blir en statistikpost.
6. Testa paus, fortsätt och radering från Super User.
