import { supabase, isCloudEnabled } from "./supabaseClient";

// Schlanke Key-Value-Cloud-Schicht. Jede App-Sammlung (clubs, equipment,
// sessions, …) wird als ein JSONB-Wert unter ihrem Key in der Tabelle
// `fairway_state` abgelegt. Klein, robust, ein einziges Schema für alles.
//
// Fehler werden geloggt, aber nie geworfen — die App fällt dann sauber auf
// localStorage zurück (z.B. wenn die Tabelle noch nicht existiert oder
// gerade kein Netz da ist).

const TABLE = "fairway_state";

export async function cloudGet<T>(key: string): Promise<T | null> {
  if (!isCloudEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("[cloud] get", key, error.message);
    return null;
  }
  return (data?.value as T) ?? null;
}

export async function cloudSet<T>(key: string, value: T): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) console.error("[cloud] set", key, error.message);
}
