# Fairway 🏌️

Golf-Training & Turnier-Tracking. Next.js (App Router) + TypeScript + Supabase.

Die App läuft **sofort** mit localStorage. Sobald du Supabase-Keys einträgst,
schaltet sie automatisch auf Cloud-Sync um — gleiche Daten auf allen Geräten.
Das Datenmodell hat von Anfang an `user_id` + Row Level Security, damit du
später ohne Umbau Multi-User (Login) aktivieren kannst.

## Lokal starten

```bash
npm install
npm run dev
# http://localhost:3000
```

Oben rechts zeigt ein Badge "⚠ Lokal" (kein Sync) oder "☁ Cloud-Sync aktiv".

## Cloud-Sync aktivieren (Supabase)

1. Account auf https://supabase.com → neues Projekt erstellen.
2. Im Projekt: **SQL Editor** → Inhalt von `supabase/schema.sql` einfügen & ausführen.
3. **Project Settings → API** → kopiere `Project URL` und `anon public key`.
4. `.env.local.example` zu `.env.local` kopieren und die zwei Werte eintragen:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. `npm run dev` neu starten. Badge wechselt auf "☁ Cloud-Sync aktiv".

## Auf Vercel launchen

1. Code auf GitHub pushen.
2. https://vercel.com → "New Project" → Repo importieren.
3. Bei "Environment Variables" die zwei `NEXT_PUBLIC_SUPABASE_*` Werte eintragen.
4. Deploy. Fertig — deine App ist unter einer `*.vercel.app` URL live.

## Später: Login / Multi-User

- Supabase Auth aktivieren (Email/Magic-Link oder Google).
- In `schema.sql` die Policy `own or anon rows` auf nur `auth.uid() = user_id` umstellen.
- Beim Speichern `user_id` mit der eingeloggten User-ID füllen (statt `null`).

Die Struktur ist schon darauf ausgelegt, also ist das ein kleiner Schritt.

## Features

- **Heute** — Streak, Sessions & Bälle der letzten 7 Tage, letzte Einträge, Mantra
- **Journal** — Sessions loggen (Range / Platz / Gym / Mobility), Bälle, Punkte, Gefühl, Notizen
- **Drills** — Reverse-Pivot-Checkliste, als Session loggbar

## Struktur

```
app/            Seiten (Dashboard, Journal, Drills) + Nav
lib/types.ts    Datenmodelle + Drill-Definitionen
lib/storage.ts  Datenschicht (Supabase ODER localStorage) + Streak-Logik
lib/supabaseClient.ts  Supabase-Init (nur wenn Keys gesetzt)
supabase/schema.sql    DB-Schema für Supabase
```
