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
import { useCollection, useObject, useStringList } from "@/lib/store";
import { getSessions } from "@/lib/storage";
import {
  CLUBS,
  EQUIPMENT,
  FOCUS,
  NEXT_STEPS,
  PROFILE,
  TEE_TIME,
} from "@/lib/seed";
import { PLAN, WEEKDAYS, isoLocal, mondayOf } from "@/lib/plan";
import {
  ChatMessage,
  CoachAction,
  CoachContext,
  CoachResponse,
  describeAction,
} from "@/lib/coach";
import Icon from "@/app/components/Icon";

interface Msg extends ChatMessage {
  actions?: CoachAction[];
  applied?: boolean;
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
      recentSessions: sessions.slice(0, 6).map((s) => ({
        date: s.date,
        type: s.type,
        balls: s.balls,
        score: s.score,
        rating: s.rating,
        notes: s.notes,
      })),
      weekDone,
      teeTime: tee.value,
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
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply,
          actions: data.actions?.length ? data.actions : undefined,
        },
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

  function applyActions(index: number, actions: CoachAction[]) {
    actions.forEach((a) => applyOne(a));
    setMsgs((m) => m.map((x, i) => (i === index ? { ...x, applied: true } : x)));
  }

  function applyOne(a: CoachAction) {
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
                <div className="chat-actions">
                  <div className="ca-title">Vorgeschlagene Änderungen</div>
                  {m.actions.map((a, j) => (
                    <div className="ca-item" key={j}>
                      <Icon name="target" size={12} /> {describeAction(a)}
                    </div>
                  ))}
                  {m.applied ? (
                    <div className="ca-applied">✓ Übernommen</div>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      style={{ marginTop: 10 }}
                      onClick={() => applyActions(i, m.actions!)}
                    >
                      Übernehmen
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
