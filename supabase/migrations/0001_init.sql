-- Fairway · Cloud-State
-- Eine schlanke Key-Value-Tabelle: jede App-Sammlung (clubs, equipment,
-- sessions, profile, …) liegt als ein JSONB-Wert unter ihrem Key.

create table if not exists public.fairway_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.fairway_state enable row level security;

-- Persönliche Single-User-App ohne Login: anon (und authenticated) dürfen
-- alles. Hinweis: Der anon-Key liegt im Client-Bundle (öffentliches Repo),
-- d.h. ohne Auth könnte theoretisch jeder mit Key/URL lesen/schreiben.
-- Daten sind unkritisch (Golf-Training). Später per Supabase Auth absicherbar.
drop policy if exists "fairway anon all" on public.fairway_state;
create policy "fairway anon all"
  on public.fairway_state
  for all
  to anon, authenticated
  using (true)
  with check (true);
