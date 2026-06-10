"use client";

import { useState } from "react";
import { Routine, RoutineGroup, ROUTINE_GROUP_LABELS, Session } from "@/lib/types";
import { addSession } from "@/lib/storage";
import { uid } from "@/lib/store";
import { DRILLS, FOCUS, ROUTINES } from "@/lib/seed";
import { Accordion } from "@/app/components/ui";
import Icon from "@/app/components/Icon";

/* ── Bild-Link zur Übung (öffnet Bildersuche, keine Fremdbilder) ── */

function exerciseName(text: string): string {
  const head = text.split(/[—·(]/)[0].replace(/^[\d:.\s–-]+/, "").trim();
  return head || text;
}

const SUFFIX: Record<RoutineGroup, string> = {
  mobility: "stretch dehnübung",
  golf: "golf drill",
  gym: "übung exercise",
};

function DemoLink({ query }: { query: string }) {
  const url =
    "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(query);
  return (
    <a className="demo-link" href={url} target="_blank" rel="noopener noreferrer">
      <Icon name="image" size={13} /> Bild ansehen
    </a>
  );
}

/* ── Geführte Range-Blöcke (aus den Fokus-Routinen) ─────────────── */

const pathRoutine = ROUTINES.find((r) => r.id === "golf2");
const driverRoutine = ROUTINES.find((r) => r.id === "golf3");

interface Block {
  key: string;
  title: string;
  sub: string;
  steps: { id: string; text: string }[];
}

const BLOCKS: Block[] = [
  {
    key: "path",
    title: "1 · Swing Path",
    sub: "Der wichtigste Block. Von innen schwingen — Schritt für Schritt durchgehen.",
    steps: (pathRoutine?.steps ?? []).map((s, i) => ({ id: `p${i}`, text: s })),
  },
  {
    key: "driver",
    title: "2 · Driver — Topping & Haltung",
    sub: "Erst wenn der Path-Block sitzt. Sauberer Treffer vor Weite.",
    steps: (driverRoutine?.steps ?? []).map((s, i) => ({ id: `d${i}`, text: s })),
  },
];

type Tab = "drills" | "routinen";

export default function Training() {
  const [tab, setTab] = useState<Tab>("drills");

  return (
    <>
      <header className="topbar">
        <h1>Training</h1>
        <div className="tag">Geführtes Range-Programm & Routinen</div>
      </header>

      <div className="subtabs">
        <button
          className={tab === "drills" ? "active" : ""}
          onClick={() => setTab("drills")}
        >
          Range-Programm
        </button>
        <button
          className={tab === "routinen" ? "active" : ""}
          onClick={() => setTab("routinen")}
        >
          Routinen
        </button>
      </div>

      <div className="container">
        {tab === "drills" ? <GuidedTab /> : <RoutinesTab />}
      </div>
    </>
  );
}

/* ── Geführtes Range-Programm ───────────────────────────────────── */

function GuidedTab() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  const allSteps =
    BLOCKS.reduce((n, b) => n + b.steps.length, 0) + DRILLS.length;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function logSession() {
    const s: Session = {
      id: uid("s"),
      date: new Date().toISOString().slice(0, 10),
      type: "range",
      rating: 3,
      drills: Array.from(checked),
      notes: `Range-Programm (${checked.size}/${allSteps} Drills)`,
      createdAt: new Date().toISOString(),
      user_id: null,
    };
    await addSession(s);
    setSaved(true);
  }

  return (
    <>
      <div className="mantra">
        <div className="small">Dein Fokus</div>
        <div className="big">{FOCUS.title}</div>
        {FOCUS.cues.map((c) => (
          <div className="cue" key={c}>
            {c}
          </div>
        ))}
      </div>

      {BLOCKS.map((b) => (
        <div className="card" key={b.key}>
          <h2>{b.title}</h2>
          <div className="sub">{b.sub}</div>
          {b.steps.map((st) => {
            const on = checked.has(st.id);
            const [name, ...rest] = st.text.split(" — ");
            return (
              <div className={`drill ${on ? "done" : ""}`} key={st.id}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(st.id)}
                />
                <span style={{ flex: 1 }}>
                  <span className="d-name">{name}</span>
                  {rest.length > 0 && (
                    <div className="d-detail">{rest.join(" — ")}</div>
                  )}
                  <DemoLink query={`${exerciseName(name)} golf drill`} />
                </span>
              </div>
            );
          })}
        </div>
      ))}

      <div className="card">
        <h2>Basics · Reverse Pivot</h2>
        <div className="sub">
          Deine Grundlage vom Trainer. 2–3 davon als Aufwärmen vor dem
          Path-Block — nicht alle auf einmal.
        </div>
        {DRILLS.map((d) => {
          const on = checked.has(d.id);
          return (
            <div className={`drill ${on ? "done" : ""}`} key={d.id}>
              <input type="checkbox" checked={on} onChange={() => toggle(d.id)} />
              <span style={{ flex: 1 }}>
                <span className="d-name">{d.name}</span>
                <div className="d-detail">{d.detail}</div>
                <DemoLink query={`${d.name} golf drill`} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>Fertig?</h2>
        <div className="sub">
          {checked.size} von {allSteps} Drills abgehakt. Als Range-Session ins
          Journal speichern.
        </div>
        <button
          className="btn"
          onClick={logSession}
          disabled={checked.size === 0 || saved}
        >
          {saved ? "✓ Gespeichert" : "Als Session loggen"}
        </button>
      </div>

      <div className="note-box">
        Merksätze: Pausieren am Top ist ein Drill, kein Schwunggedanke auf dem
        Platz. Tempo vor Power — lass den Schläger fallen. Ein Gedanke pro
        Schwung reicht.
      </div>
    </>
  );
}

/* ── Routinen-Bibliothek ────────────────────────────────────────── */

const GROUPS: RoutineGroup[] = ["mobility", "golf", "gym"];

function RoutinesTab() {
  return (
    <>
      {GROUPS.map((group) => {
        const list = ROUTINES.filter((r) => r.group === group);
        return (
          <div key={group}>
            <div className="group-label">{ROUTINE_GROUP_LABELS[group]}</div>
            <div className="card">
              {list.map((r) => (
                <Accordion
                  key={r.id}
                  title={r.title}
                  focus={r.focus}
                  current={r.current}
                >
                  <RoutineSteps routine={r} />
                </Accordion>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function RoutineSteps({ routine }: { routine: Routine }) {
  return (
    <>
      {routine.steps.map((step, i) => (
        <div className="list-row" key={i}>
          <Icon name="target" size={13} className="bullet" />
          <span className="body">
            {step}
            <br />
            <DemoLink query={`${exerciseName(step)} ${SUFFIX[routine.group]}`} />
          </span>
        </div>
      ))}
    </>
  );
}
