"use client";

import { useState } from "react";
import {
  Drill,
  Routine,
  RoutineGroup,
  ROUTINE_GROUP_LABELS,
  Session,
} from "@/lib/types";
import { addSession } from "@/lib/storage";
import { useCollection, uid, Collection } from "@/lib/store";
import { DRILLS, ROUTINES } from "@/lib/seed";
import { EditableText, Accordion, ResetButton } from "@/app/components/ui";
import Icon from "@/app/components/Icon";

type Tab = "drills" | "routinen";

export default function Training() {
  const [tab, setTab] = useState<Tab>("drills");
  const drills = useCollection<Drill>("drills", DRILLS);
  const routines = useCollection<Routine>("routines", ROUTINES);

  return (
    <>
      <header className="topbar">
        <h1>Training</h1>
        <div className="tag">Drills & Routinen</div>
      </header>

      <div className="subtabs">
        <button
          className={tab === "drills" ? "active" : ""}
          onClick={() => setTab("drills")}
        >
          Drills
        </button>
        <button
          className={tab === "routinen" ? "active" : ""}
          onClick={() => setTab("routinen")}
        >
          Routinen
        </button>
      </div>

      <div className="container">
        {tab === "drills" ? (
          <DrillsTab drills={drills} />
        ) : (
          <RoutinesTab routines={routines} />
        )}
      </div>
    </>
  );
}

/* ── Drills ─────────────────────────────────────────────────────── */

function DrillsTab({ drills }: { drills: Collection<Drill> }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

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
      notes: `Reverse-Pivot Drills (${checked.size}/${drills.items.length})`,
      createdAt: new Date().toISOString(),
      user_id: null,
    };
    await addSession(s);
    setSaved(true);
  }

  return (
    <>
      <div className="mantra">
        <div className="small">FOKUS-PHASE 1 · REVERSE PIVOT</div>
        <div className="big">Kopf höher · Schulter frei unter Kinn · Gewicht rechts</div>
      </div>

      <div className="card">
        <h2>
          Checkliste ({checked.size}/{drills.items.length})
        </h2>
        {drills.items.map((d) => {
          const on = checked.has(d.id);
          return (
            <div className={`drill ${on ? "done" : ""}`} key={d.id}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(d.id)}
              />
              <span style={{ flex: 1 }}>
                <span className="d-name">
                  <EditableText
                    value={d.name}
                    onChange={(v) => drills.update(d.id, { name: v })}
                  />
                </span>
                <div className="d-detail">
                  <EditableText
                    value={d.detail}
                    onChange={(v) => drills.update(d.id, { detail: v })}
                  />
                </div>
              </span>
              <button
                className="del"
                type="button"
                aria-label="Löschen"
                onClick={() => drills.remove(d.id)}
              >
                ×
              </button>
            </div>
          );
        })}

        <div className="row-actions">
          <button
            className="btn-outline"
            type="button"
            onClick={() =>
              drills.add({ id: uid("rp"), name: "Neuer Drill", detail: "Details…" })
            }
          >
            <Icon name="plus" size={15} /> Drill
          </button>
          <ResetButton onReset={drills.reset} />
        </div>

        <button
          className="btn"
          onClick={logSession}
          disabled={checked.size === 0 || saved}
        >
          {saved ? "✓ Als Session gespeichert" : "Als Session loggen"}
        </button>
      </div>

      <div className="note-box">
        Squat-Move kommt erst NACH dem Reverse-Pivot-Fix (Phase 2). Pausieren am
        Top ist Drill, kein Schwunggedanke. Tempo vor Power — lass den Schläger
        fallen.
      </div>
    </>
  );
}

/* ── Routinen ───────────────────────────────────────────────────── */

const GROUPS: RoutineGroup[] = ["mobility", "golf", "gym"];

function RoutinesTab({ routines }: { routines: Collection<Routine> }) {
  return (
    <>
      {GROUPS.map((group) => {
        const list = routines.items.filter((r) => r.group === group);
        return (
          <div key={group}>
            <div className="group-label">{ROUTINE_GROUP_LABELS[group]}</div>
            <div className="card">
              {list.length === 0 && (
                <div className="empty">Keine Routinen.</div>
              )}
              {list.map((r) => (
                <Accordion
                  key={r.id}
                  title={r.title}
                  focus={r.focus}
                  current={r.current}
                >
                  <RoutineSteps routine={r} routines={routines} />
                </Accordion>
              ))}
              <div className="row-actions">
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() =>
                    routines.add({
                      id: uid("r"),
                      group,
                      title: "Neue Routine",
                      focus: "Fokus…",
                      steps: ["Erster Schritt"],
                    })
                  }
                >
                  <Icon name="plus" size={15} /> Routine
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="row-actions" style={{ justifyContent: "center" }}>
        <ResetButton onReset={routines.reset} />
      </div>
    </>
  );
}

function RoutineSteps({
  routine,
  routines,
}: {
  routine: Routine;
  routines: Collection<Routine>;
}) {
  function setSteps(steps: string[]) {
    routines.update(routine.id, { steps });
  }

  return (
    <>
      <label className="field">Titel</label>
      <EditableText
        value={routine.title}
        onChange={(v) => routines.update(routine.id, { title: v })}
      />
      <label className="field">Fokus</label>
      <EditableText
        value={routine.focus}
        multiline
        onChange={(v) => routines.update(routine.id, { focus: v })}
      />

      <label className="field">Schritte</label>
      {routine.steps.map((step, i) => (
        <div className="list-row" key={i}>
          <Icon name="target" size={14} className="bullet" />
          <span className="body">
            <EditableText
              value={step}
              multiline
              onChange={(v) =>
                setSteps(
                  v
                    ? routine.steps.map((s, j) => (j === i ? v : s))
                    : routine.steps.filter((_, j) => j !== i)
                )
              }
            />
          </span>
          <button
            className="del"
            type="button"
            aria-label="Löschen"
            onClick={() => setSteps(routine.steps.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}

      <div className="row-actions">
        <button
          className="btn-outline"
          type="button"
          onClick={() => setSteps([...routine.steps, "Neuer Schritt"])}
        >
          <Icon name="plus" size={15} /> Schritt
        </button>
        <button
          className="btn-ghost"
          type="button"
          onClick={() => routines.remove(routine.id)}
        >
          Routine löschen
        </button>
      </div>
    </>
  );
}
