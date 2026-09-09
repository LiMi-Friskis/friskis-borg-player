# Friskis Borg Player v1.5

Första versionen med central lagring via Supabase.

## Supabase
Appen använder:
- Project URL: `https://eaapffhepvbfcryayipx.supabase.co`
- Publishable key i klientkoden

Tabellen måste heta `public.passes` och innehålla:
- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `parts jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS måste tillåta `anon` att select/insert/update/delete för demo-läget.

## Funktion
- Läser pass centralt från Supabase.
- Sparar, duplicerar och raderar centralt.
- Har localStorage som fallback om Supabase inte går att nå.
- Visar status `Centralt sparat` eller `Lokalt läge`.

GitHub Pages: `main` / `(root)`.
