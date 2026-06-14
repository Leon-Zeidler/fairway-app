"use client";

import Link from "next/link";
import { Focus, GearItem } from "@/lib/types";
import { useObject, useCollection } from "@/lib/store";
import { FOCUS, GEAR, RORY_NOTE } from "@/lib/seed";
import { PROGRAMS, applyOverride, ProgramOverrides } from "@/lib/programs";
import Icon from "@/app/components/Icon";

const GROUPS: { key: "golf" | "mobility" | "gym"; label: string }[] = [
  { key: "golf", label: "Range & Golf" },
  { key: "mobility", label: "Mobility" },
  { key: "gym", label: "Gym" },
];

const GEAR_GROUPS: { key: "mobility" | "gym"; label: string }[] = [
  { key: "mobility", label: "Mobility" },
  { key: "gym", label: "Gym" },
];

export default function Training() {
  const focus = useObject<Focus>("focus", FOCUS);
  const overrides = useObject<ProgramOverrides>("programOverrides", {});
  const gear = useCollection<GearItem>("gear", GEAR);

  return (
    <>
      <header className="topbar">
        <h1>Training</h1>
        <div className="tag">Wähle ein Programm — es führt dich durch</div>
      </header>

      <div className="container">
        <div className="mantra">
          <div className="small">Dein Fokus</div>
          <div className="big">{focus.value.title}</div>
          {focus.value.cues.map((c) => (
            <div className="cue" key={c}>
              {c}
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Mein Material</h2>
          <div className="sub">
            Was hast du da? Fehlt etwas, zeigt dein Plan automatisch eine
            Alternative ohne Gerät.
          </div>
          {GEAR_GROUPS.map((g) => (
            <div key={g.key} style={{ marginTop: 6 }}>
              <div className="gear-group-label">{g.label}</div>
              <div className="gear-grid">
                {gear.items
                  .filter((it) => it.group === g.key)
                  .map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      className={`avail-toggle ${it.available ? "on" : "off"}`}
                      onClick={() =>
                        gear.update(it.id, { available: !it.available })
                      }
                    >
                      {it.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="note-box">{RORY_NOTE}</div>

        {GROUPS.map((g) => {
          const list = PROGRAMS.filter((p) => p.group === g.key);
          return (
            <div key={g.key}>
              <div className="group-label">{g.label}</div>
              <div className="card">
                {list.map((base) => {
                  const p = applyOverride(base, overrides.value[base.id]);
                  const steps = p.sections.reduce((n, s) => n + s.steps.length, 0);
                  return (
                    <Link href={`/programm/${p.id}`} className="pcard" key={p.id}>
                      <span className="pcard-info">
                        <span className="pcard-title">
                          {p.title}
                          {p.current && <span className="tag-current">Fokus</span>}
                        </span>
                        <span className="pcard-focus">{p.focus}</span>
                      </span>
                      <span className="pcard-meta">{steps} Übungen</span>
                      <Icon name="chevron" size={17} className="pcard-chev" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="note-box">
          Jedes Programm ist eine geführte Checkliste: durchgehen, abhaken,
          abschließen — das loggt automatisch deine Session und hakt den Tag im
          Wochenplan ab.
        </div>
      </div>
    </>
  );
}
