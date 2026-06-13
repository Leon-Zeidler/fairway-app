"use client";

import { useEffect, useRef, useState } from "react";
import {
  Club,
  EquipItem,
  Focus,
  Profile,
  Session,
  TeeTime,
} from "@/lib/types";
import { useCollection, useObject, useStringList, uid } from "@/lib/store";
import { getSessions, addSession, deleteSession } from "@/lib/storage";
import {
  CLUBS,
  EQUIPMENT,
  FOCUS,
  NEXT_STEPS,
  PROFILE,
  TEE_TIME,
  WARMUP,
  INSIGHTS,
  MENTAL_CHECK,
} from "@/lib/seed";
import { PLAN, isoLocal, mondayOf } from "@/lib/plan";
import {
  programsForContext,
  resolveProgram,
  ProgramOverrides,
} from "@/lib/programs";
import {
  ChatMessage,
  CoachAction,
  CoachContext,
  CoachResponse,
  describeAction,
} from "@/lib/coach";
import Icon from "@/app/components/Icon";

interface UndoToken {
  snapshot: {
    focus: Focus;
    plan: Record<string, number[]>;
    profile: Profile;
    tee: TeeTime;
    nextSteps: string[];
    clubs: Club[];
    equip: EquipItem[];
    weekLog: Record<string, string[]>;
    overrides: ProgramOverrides;
  };
  createdSessions: string[];
}

interface Msg extends ChatMessage {
  actions?: CoachAction[];
  undo?: UndoToken;
  undone?: boolean;
}

const SUGGESTIONS = [
  "Wie fühlt sich mein Training gerade an? Woran soll ich arbeiten?",
  "Mein Slice war heute schlimm — was tun?",
  "Pass meinen Wochenplan an, ich hab nur 3 Tage Zeit.",
  "Welchen Schläger nehme ich vom engen Tee?",
];

export default function Coach() {
  const focus = useObject<Focus>("focus", FOCUS);
  const plan = useObject<Record<string, number[]>>("plan", PLAN);
  const profile = useObject<Profile>("profile", PROFILE);
  const tee = useObject<TeeTime>("teeTime", TEE_TIME);
  const equip = useCollection<EquipItem>("equipment2", EQUIPMENT);
  const clubs = useCollection<Club>("clubs", CLUBS);
  const nextSteps = useStringList("nextSteps", NEXT_STEPS);
  const weekLog = useObject<Record<string, string[]>>("weekLog", {});
  const overrides = useObject<ProgramOverrides>("programOverrides", {});

  const [sessions, setSessions] = useState<Session[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSessions().then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  function buildContext(): CoachContext {
    const monday = mondayOf(0);
    const weekIsos = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return isoLocal(d);
    });
    const weekDone: Record<string, number> = {};
    weekIsos.forEach((iso) => {
      (weekLog.value[iso] || []).forEach((k) => {
        weekDone[k] = (weekDone[k] || 0) + 1;
      });
    });

    return {
      profile: profile.value,
      focus: focus.value,
      plan: plan.value,
      clubs: clubs.items.map((c) => ({ name: c.name, distance: c.distance })),
      equipment: equip.items.map((e) => ({
        category: e.category,
        name: e.name,
        status: e.status,
        available: e.available !== false,
      })),
      nextSteps: nextSteps.items,
      recentSessions: sessions.slice(0, 12).map((s) => ({
        date: s.date,
        type: s.type,
        balls: s.balls,
        score: s.score,
        rating: s.rating,
        notes: s.notes,
      })),
      weekDone,
      teeTime: tee.value,
      programs: programsForContext(overrides.value),
      warmup: WARMUP.map((w) => ({
        club: w.club,
        balls: w.balls,
        detail: w.detail,
      })),
      insights: INSIGHTS,
      mentalCheck: MENTAL_CHECK,
      today: new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    };
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content: clean }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: buildContext(),
        }),
      });
      const data: CoachResponse = await res.json();
      const acts = data.actions?.length ? data.actions : undefined;
      // Auto-übernehmen, sobald die Antwort da ist (mit Rückgängig-Token).
      const undo = acts ? applyNow(acts) : undefined;
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply, actions: acts, undo },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Verbindung fehlgeschlagen — nochmal?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function applyNow(actions: CoachAction[]): UndoToken {
    const snapshot = {
      focus: focus.value,
      plan: plan.value,
      profile: profile.value,
      tee: tee.value,
      nextSteps: nextSteps.items,
      clubs: clubs.items,
      equip: equip.items,
      weekLog: weekLog.value,
      overrides: overrides.value,
    };
    const createdSessions: string[] = [];
    actions.forEach((a) => applyOne(a, createdSessions));
    return { snapshot, createdSessions };
  }

  function undo(index: number, token: UndoToken) {
    const s = token.snapshot;
    focus.replace(s.focus);
    plan.replace(s.plan);
    profile.replace(s.profile);
    tee.replace(s.tee);
    nextSteps.setAll(s.nextSteps);
    clubs.setAll(s.clubs);
    equip.setAll(s.equip);
    weekLog.replace(s.weekLog);
    overrides.replace(s.overrides);
    token.createdSessions.forEach((id) => void deleteSession(id));
    setMsgs((m) =>
      m.map((x, i) => (i === index ? { ...x, undone: true, undo: undefined } : x))
    );
  }

  function applyOne(a: CoachAction, created: string[]) {
    switch (a.type) {
      case "set_focus":
        focus.set({
          ...(a.title !== undefined ? { title: a.title } : {}),
          ...(a.why !== undefined ? { why: a.why } : {}),
          ...(a.cues !== undefined ? { cues: a.cues } : {}),
        });
        break;
      case "set_plan":
        plan.set({ [a.activity]: a.days });
        break;
      case "set_equipment": {
        const needle = a.match.toLowerCase();
        const item = equip.items.find(
          (e) =>
            e.category.toLowerCase().includes(needle) ||
            e.name.toLowerCase().includes(needle) ||
            (e.routineTag ?? "").toLowerCase().includes(needle)
        );
        if (item) {
          equip.update(item.id, {
            ...(a.status !== undefined ? { status: a.status } : {}),
            ...(a.available !== undefined ? { available: a.available } : {}),
            ...(a.note !== undefined ? { note: a.note } : {}),
          });
        }
        break;
      }
      case "set_profile":
        profile.set({
          ...(a.hcp !== undefined ? { hcp: a.hcp } : {}),
          ...(a.hcpGoal !== undefined ? { hcpGoal: a.hcpGoal } : {}),
          ...(a.swingSpeed !== undefined ? { swingSpeed: a.swingSpeed } : {}),
          ...(a.level !== undefined ? { level: a.level } : {}),
        });
        break;
      case "set_tee_time":
        tee.set({
          ...(a.name !== undefined ? { name: a.name } : {}),
          ...(a.date !== undefined ? { date: a.date } : {}),
          ...(a.time !== undefined ? { time: a.time } : {}),
        });
        break;
      case "set_next_steps":
        nextSteps.setAll(a.items);
        break;
      case "add_next_step":
        nextSteps.setAll([...nextSteps.items, a.item]);
        break;
      case "set_club": {
        const needle = a.name.toLowerCase();
        const club = clubs.items.find((c) =>
          c.name.toLowerCase().includes(needle)
        );
        if (club) clubs.update(club.id, { distance: a.distance });
        break;
      }
      case "log_session": {
        const id = uid("s");
        created.push(id);
        void addSession({
          id,
          date: isoLocal(new Date()),
          type: a.sessionType,
          rating: a.rating ?? 3,
          drills: [],
          balls: a.balls,
          score: a.score,
          notes: a.notes,
          createdAt: new Date().toISOString(),
          user_id: null,
        });
        break;
      }
      case "complete_today": {
        const today = isoLocal(new Date());
        const cur = weekLog.value[today] || [];
        const merged = Array.from(new Set([...cur, ...a.activities]));
        weekLog.set({ [today]: merged });
        break;
      }
      case "set_program":
        overrides.set({
          [a.id]: { title: a.title, focus: a.focus, sections: a.sections },
        });
        break;
      case "add_program_step": {
        const resolved = resolveProgram(a.id, overrides.value);
        if (resolved) {
          const sections = resolved.sections.map((s) => ({
            ...s,
            steps: [...s.steps],
          }));
          if (sections.length) sections[sections.length - 1].steps.push(a.step);
          else sections.push({ steps: [a.step] });
          overrides.set({
            [a.id]: { ...overrides.value[a.id], sections },
          });
        }
        break;
      }
    }
  }

  return (
    <>
      <header className="topbar">
        <h1>Coach</h1>
        <div className="tag">Dein KI-Golfcoach — frag alles</div>
      </header>

      <div className="container coach-pad">
        {msgs.length === 0 && (
          <div className="card">
            <h2>Wie kann ich helfen?</h2>
            <div className="sub">
              Erzähl mir, wie's läuft oder was du brauchst. Ich kenne dein Bag,
              deinen Plan und deine letzten Sessions — und passe sie auf Wunsch
              direkt an.
            </div>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="suggest"
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="chat">
          {msgs.map((m, i) => (
            <div key={i} className="chat-block">
              <div className={`chat-msg ${m.role === "user" ? "user" : "ai"}`}>
                {m.content}
              </div>
              {m.actions && (
                <div className={`chat-actions ${m.undone ? "undone" : ""}`}>
                  <div className="ca-title">
                    {m.undone ? "Rückgängig gemacht" : "✓ Automatisch übernommen"}
                  </div>
                  {m.actions.map((a, j) => (
                    <div className="ca-item" key={j}>
                      <Icon name="target" size={12} /> {describeAction(a)}
                    </div>
                  ))}
                  {!m.undone && m.undo && (
                    <button
                      type="button"
                      className="ca-undo"
                      onClick={() => undo(i, m.undo!)}
                    >
                      <Icon name="reset" size={14} /> Rückgängig
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-msg ai typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frag deinen Coach…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
        />
        <button
          type="button"
          className="composer-send"
          aria-label="Senden"
          disabled={!input.trim() || loading}
          onClick={() => send(input)}
        >
          <Icon name="chevron" size={20} />
        </button>
      </div>
    </>
  );
}
