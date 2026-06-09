-- Fairway — Supabase Schema
-- Im Supabase Dashboard unter "SQL Editor" einfügen und ausführen.

create table if not exists public.sessions (
  id            text primary key,
  date          date not null,
  type          text not null check (type in ('range','course','gym','stretch')),
  "durationMin" int,
  balls         int,
  score         int,
  rating        int not null default 3,
  drills        jsonb not null default '[]'::jsonb,
  notes         text,
  "createdAt"   timestamptz not null default now(),
  user_id       uuid references auth.users(id) default auth.uid()
);

-- Row Level Security: jetzt schon aktiviert, damit Multi-User später
-- ohne Migration funktioniert.
alter table public.sessions enable row level security;

-- Single-User-Phase: solange du ohne Login arbeitest, erlaubt diese Policy
-- Zugriff auf Zeilen ohne user_id ODER eigene Zeilen.
-- Wenn du Auth aktivierst, entferne den "user_id is null"-Teil.
create policy "own or anon rows"
  on public.sessions
  for all
  using (user_id is null or auth.uid() = user_id)
  with check (user_id is null or auth.uid() = user_id);

create index if not exists sessions_date_idx on public.sessions (date desc);
create index if not exists sessions_user_idx on public.sessions (user_id);
