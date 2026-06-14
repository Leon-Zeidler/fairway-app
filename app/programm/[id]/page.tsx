"use client";

import { useState } from "react";
import Link from "next/link";
import { Session } from "@/lib/types";
import { addSession } from "@/lib/storage";
import { uid, useObject } from "@/lib/store";
import {
  resolveProgram,
  DEMO_SUFFIX,
  ProgramOverrides,
} from "@/lib/programs";
import { isoLocal } from "@/lib/plan";
import { exerciseName } from "@/app/components/ui";
import { ExerciseVideo } from "@/app/components/ExerciseVideo";
import Icon from "@/app/components/Icon";

type WeekLog = Record<string, string[]>;

export default function ProgramPage({ params }: { params: { id: string } }) {
  const overrides = useObject<ProgramOverrides>("programOverrides", {});
  const program = resolveProgram(params.id, overrides.value);
  const log = useObject<WeekLog>("weekLog", {});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  if (!program) {
    return (
      <>
        <header className="topbar">
          <h1>Programm</h1>
          <div className="tag">Nicht gefunden</div>
        </header>
        <div className="container">
          <div className="card">
            <div className="empty">Dieses Programm gibt es nicht (mehr).</div>
            <Link href="/training" className="btn">
              Zur Programm-Übersicht
            </Link>
          </div>
        </div>
      </>
    );
  }

  const total = program.sections.reduce((n, s) => n + s.steps.length, 0);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function finish() {
    const today = isoLocal(new Date());
    // 1) Session ins Journal
    const s: Session = {
      id: uid("s"),
      date: today,
      type: program!.sessionType,
      rating: 3,
      drills: Array.from(checked),
      notes: `${program!.title} (${checked.size}/${total} Übungen)`,
      createdAt: new Date().toISOString(),
      user_id: null,
    };
    await addSession(s);
    // 2) Heute im Wochenplan abhaken
    const cur = log.value[today] || [];
    if (!cur.includes(program!.activityKey)) {
      log.set({ [today]: [...cur, program!.activityKey] });
    }
    setSaved(true);
  }

  return (
    <>
      <header className="topbar">
        <Link href="/training" className="back-btn" aria-label="Zurück">
          <Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} />
        </Link>
        <h1>{program.title}</h1>
        <div className="tag">{program.focus}</div>
      </header>

      <div className="container">
        {program.sections.map((sec, si) => (
          <div className="card" key={si}>
            {sec.title && <h2>{sec.title}</h2>}
            {sec.steps.map((step, i) => {
              const id = `${si}-${i}`;
              const on = checked.has(id);
              const [name, ...rest] = step.split(" — ");
              return (
                <div className={`drill ${on ? "done" : ""}`} key={id}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(id)}
                  />
                  <span style={{ flex: 1 }}>
                    <span className="d-name">{name}</span>
                    {rest.length > 0 && (
                      <div className="d-detail">{rest.join(" — ")}</div>
                    )}
                    <ExerciseVideo
                      query={`${exerciseName(name)} ${DEMO_SUFFIX[program.group]}`}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        <div className="card">
          <h2>Fertig?</h2>
          <div className="sub">
            {checked.size} von {total} erledigt. Abschließen speichert die
            Session im Journal und hakt heute im Wochenplan ab.
          </div>
          <button
            className="btn"
            onClick={finish}
            disabled={checked.size === 0 || saved}
          >
            {saved ? "✓ Gespeichert & abgehakt" : "Programm abschließen"}
          </button>
          {saved && (
            <Link
              href="/"
              className="btn-outline"
              style={{ marginTop: 10, justifyContent: "center", display: "flex" }}
            >
              Zurück zu Heute
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
