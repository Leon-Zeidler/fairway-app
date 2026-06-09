import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Nur initialisieren, wenn beide Keys gesetzt sind. Sonst läuft die App
// im localStorage-Modus weiter (siehe lib/storage.ts).
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const isCloudEnabled = Boolean(supabase);
