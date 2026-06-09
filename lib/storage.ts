import { Session } from "./types";
import { supabase, isCloudEnabled } from "./supabaseClient";

// Einheitliche Datenschnittstelle. Nutzt Supabase, wenn konfiguriert,
// sonst localStorage. So läuft die App sofort und migriert später ohne
// Code-Änderungen in die Cloud.

const LS_KEY = "fairway.sessions";

function lsRead(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsWrite(sessions: Session[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(sessions));
}

export async function getSessions(): Promise<Session[]> {
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data as Session[]) || [];
  }
  return lsRead().sort((a, b) => b.date.localeCompare(a.date));
}

export async function addSession(s: Session): Promise<void> {
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from("sessions").insert(s);
    if (error) throw error;
    return;
  }
  const all = lsRead();
  all.push(s);
  lsWrite(all);
}

export async function deleteSession(id: string): Promise<void> {
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  lsWrite(lsRead().filter((s) => s.id !== id));
}

// Aktueller Streak in Tagen: aufeinanderfolgende Tage mit mind. einer Session.
export function computeStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const d = new Date();
  // Wenn heute noch nichts geloggt ist, erlauben wir gestern als Start.
  const today = d.toISOString().slice(0, 10);
  if (!days.has(today)) d.setDate(d.getDate() - 1);
  for (;;) {
    const iso = d.toISOString().slice(0, 10);
    if (days.has(iso)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
