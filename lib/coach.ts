// Geteilte Typen & Prompt-Bausteine für den KI-Coach.
// Der OpenAI-Key lebt NUR serverseitig (app/api/coach/route.ts).

import { Profile } from "./types";

export type ActivityKey =
  | "mobility"
  | "technik"
  | "kurzspiel"
  | "gym"
  | "platz";

export type EquipStatus = "good" | "watch" | "issue";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Aktionen, die der Coach vorschlagen darf. Der Client wendet sie an. */
export type CoachAction =
  | { type: "set_focus"; title?: string; why?: string; cues?: string[] }
  | { type: "set_plan"; activity: ActivityKey; days: number[] }
  | {
      type: "set_equipment";
      match: string;
      status?: EquipStatus;
      available?: boolean;
      note?: string;
    }
  | {
      type: "set_profile";
      hcp?: string;
      hcpGoal?: string;
      swingSpeed?: string;
      level?: string;
    }
  | { type: "set_tee_time"; name?: string; date?: string; time?: string }
  | { type: "set_next_steps"; items: string[] };

export interface CoachResponse {
  reply: string;
  actions: CoachAction[];
  notConfigured?: boolean;
  error?: string;
}

export interface CoachContext {
  profile: Profile;
  focus: { title: string; why: string; cues: string[] };
  plan: Record<string, number[]>;
  clubs: { name: string; distance: string }[];
  equipment: {
    category: string;
    name: string;
    status: string;
    available: boolean;
  }[];
  nextSteps: string[];
  recentSessions: {
    date: string;
    type: string;
    balls?: number;
    score?: number;
    rating: number;
    notes?: string;
  }[];
  weekDone: Record<string, number>;
  teeTime: { name: string; date: string; time: string };
  today: string;
}

/* ── Aktionskatalog für den System-Prompt ───────────────────────── */

const ACTION_CATALOG = `
Du kannst Änderungen vorschlagen, indem du sie in "actions" einträgst.
Verfügbare Aktionen (nur diese, exakt dieses Schema):

- {"type":"set_focus","title":"...","why":"...","cues":["...","...","..."]}
  Setzt den aktuellen Trainingsfokus (oben in der App). cues = 2-4 kurze Schwung-Gedanken.

- {"type":"set_plan","activity":"mobility|technik|kurzspiel|gym|platz","days":[0,2,4]}
  Legt fest, an welchen Wochentagen eine Aktivität geplant ist. 0=Mo,1=Di,2=Mi,3=Do,4=Fr,5=Sa,6=So.

- {"type":"set_equipment","match":"52°","status":"good|watch|issue","available":true|false,"note":"..."}
  Ändert ein Equipment. "match" = Teil der Kategorie/Name (z.B. "Driver","52°","Putter"). Nur die Felder setzen, die sich ändern.

- {"type":"set_profile","hcp":"...","hcpGoal":"...","swingSpeed":"...","level":"..."}
  Aktualisiert das Spielerprofil. Nur geänderte Felder.

- {"type":"set_tee_time","name":"...","date":"YYYY-MM-DD","time":"HH:MM"}
  Trägt das nächste Turnier ein.

- {"type":"set_next_steps","items":["...","..."]}
  Ersetzt die "Nächste Schritte"-Liste auf Heute.

Regeln für actions:
- Schlage Aktionen NUR vor, wenn der Nutzer eine Änderung will oder du sie klar empfiehlst.
- Wenn unsicher, frage lieber im "reply" nach, statt zu raten. Leere "actions": [] ist völlig ok.
- Erfinde keine Werte. Greife auf den Kontext zurück.
`.trim();

export function buildSystemPrompt(ctx: CoachContext): string {
  return `Du bist Leons persönlicher Golf-Coach in seiner Trainings-App "Fairway".

Über Leon: 18, ~1 Jahr Golf, ~100-105 mph Schwung, will langfristig Pro/kompetitiver Amateur werden.
Aktuelle Reise: Reverse-Pivot-Arbeit, letztes Turnier 114 — Hauptprobleme Swing Path (Driver & Eisen, "über den Ball") und getoppte Driver. Beweglichkeit (Hüfte/Brustwirbelsäule) ist die Wurzel. Der 52° Wedge ist bestellt, aber noch nicht da.

Deine Art: direkt, praktisch, ermutigend, auf Augenhöhe. Antworte auf Deutsch, kurz und konkret (keine Romane). Eine klare Sache nach der anderen. Du bist kein Arzt — bei Schmerzen zum Profi raten.

Du kennst seinen aktuellen Stand (JSON):
${JSON.stringify(ctx, null, 2)}

${ACTION_CATALOG}

Antworte AUSSCHLIESSLICH als JSON: {"reply": "<deine Antwort auf Deutsch>", "actions": [<0..n Aktionen>]}. Kein Text außerhalb des JSON.`;
}

/* ── Menschliche Beschreibung einer Aktion (für die Bestätigung) ── */

const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function describeAction(a: CoachAction): string {
  switch (a.type) {
    case "set_focus":
      return `Fokus → „${a.title ?? "aktualisiert"}“`;
    case "set_plan":
      return `Plan: ${a.activity} an ${a.days.map((d) => WD[d] ?? d).join(", ") || "—"}`;
    case "set_equipment": {
      const parts: string[] = [];
      if (a.status) parts.push(`Status ${a.status}`);
      if (a.available !== undefined)
        parts.push(a.available ? "im Bag" : "noch nicht da");
      if (a.note) parts.push("Notiz");
      return `Equipment „${a.match}“ → ${parts.join(", ") || "Update"}`;
    }
    case "set_profile":
      return `Profil aktualisieren`;
    case "set_tee_time":
      return `Turnier${a.name ? ` „${a.name}“` : ""}${a.date ? ` · ${a.date}` : ""}${a.time ? ` · ${a.time}` : ""}`;
    case "set_next_steps":
      return `Nächste Schritte (${a.items.length}) ersetzen`;
    default:
      return "Änderung";
  }
}
