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
  | { type: "set_next_steps"; items: string[] }
  | { type: "add_next_step"; item: string }
  | { type: "set_club"; name: string; distance: string }
  | {
      type: "log_session";
      sessionType: "range" | "course" | "gym" | "stretch";
      balls?: number;
      score?: number;
      rating?: number;
      notes?: string;
    }
  | { type: "complete_today"; activities: ActivityKey[] }
  | {
      type: "set_program";
      id: string;
      title?: string;
      focus?: string;
      sections: { title?: string; steps: string[] }[];
    }
  | { type: "add_program_step"; id: string; step: string };

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
  programs: {
    id: string;
    title: string;
    group: string;
    sections: { title?: string; steps: string[] }[];
  }[];
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
  Ersetzt die ganze "Nächste Schritte"-Liste auf Heute.

- {"type":"add_next_step","item":"..."}
  Hängt EINEN Punkt an "Nächste Schritte" an.

- {"type":"set_club","name":"7 Eisen","distance":"150 m"}
  Aktualisiert die Carry-Distanz eines Schlägers (match über den Namen).

- {"type":"log_session","sessionType":"range|course|gym|stretch","balls":60,"score":92,"rating":3,"notes":"..."}
  Loggt eine Trainingseinheit/Runde ins Journal. rating 1-5. Nur passende Felder (balls für Range, score für course).

- {"type":"complete_today","activities":["mobility","technik"]}
  Hakt heute Aktivitäten im Wochenplan als erledigt ab.

- {"type":"set_program","id":"range","title":"...","focus":"...","sections":[{"title":"1 · ...","steps":["Übung — Detail","..."]}]}
  Schreibt ein ganzes Programm/Workout neu (Schritte als "Name — Detail"). "id" aus dem programs-Kontext (z.B. range, kurzspiel, mob1..mob5, gym1..gym4). Behalte die Section-Struktur sinnvoll.

- {"type":"add_program_step","id":"gym1","step":"Hip Thrust — 3×10"}
  Hängt EINE Übung an ein Programm an.

Regeln für actions:
- Sei proaktiv: Wenn der Nutzer z.B. von einer Runde/Range-Session erzählt, biete an, sie zu loggen (log_session). Wenn er sagt "52° ist da", set_equipment available=true. Wenn er ein neues Gefühl/Problem schildert, passe Fokus & Plan an.
- Du darfst mehrere Aktionen in einem Schritt vorschlagen.
- Wenn unsicher, frage lieber im "reply" nach, statt zu raten. Leere "actions": [] ist völlig ok.
- Erfinde keine Werte. Greife auf den Kontext zurück. Erhalte bestehende Plan-Tage, wenn nur kleine Anpassungen gewünscht sind (nicht aus Versehen Mobility von täglich auf wenige Tage reduzieren).
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
    case "add_next_step":
      return `Nächster Schritt: „${a.item}“`;
    case "set_club":
      return `${a.name} → ${a.distance}`;
    case "log_session": {
      const bits: string[] = [a.sessionType];
      if (a.balls) bits.push(`${a.balls} Bälle`);
      if (a.score) bits.push(`${a.score} Pkt`);
      return `Session loggen (${bits.join(" · ")})`;
    }
    case "complete_today":
      return `Heute abhaken: ${a.activities.join(", ")}`;
    case "set_program": {
      const n = a.sections.reduce((s, sec) => s + sec.steps.length, 0);
      return `Programm „${a.title ?? a.id}“ neu (${n} Übungen)`;
    }
    case "add_program_step":
      return `Programm „${a.id}“: + „${a.step}“`;
    default:
      return "Änderung";
  }
}
