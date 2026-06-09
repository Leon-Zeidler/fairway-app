import { Session } from "./types";
import { cloudGet, cloudSet } from "./cloud";
import { isCloudEnabled } from "./supabaseClient";

// Sessions liegen – wie alle anderen Daten – als ein JSONB-Array unter dem
// Key "sessions" in der Cloud (Tabelle fairway_state) und gespiegelt im
// localStorage als Offline-Cache. Gleiche API wie zuvor, damit die Seiten
// unverändert bleiben.

const KEY = "sessions";
const LS_KEY = "fairway." + KEY;

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

async function readAll(): Promise<Session[]> {
  if (isCloudEnabled) {
    const remote = await cloudGet<Session[]>(KEY);
    if (remote != null) {
      lsWrite(remote);
      return remote;
    }
  }
  return lsRead();
}

async function writeAll(sessions: Session[]): Promise<void> {
  lsWrite(sessions);
  await cloudSet(KEY, sessions);
}

export async function getSessions(): Promise<Session[]> {
  const all = await readAll();
  return [...all].sort((a, b) => b.date.localeCompare(a.date));
}

export async function addSession(s: Session): Promise<void> {
  const all = await readAll();
  await writeAll([...all, s]);
}

export async function deleteSession(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((s) => s.id !== id));
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
