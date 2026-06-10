"use client";

import { useState } from "react";
import { useObject } from "@/lib/store";
import Icon from "@/app/components/Icon";
import { ACTIVITIES, PLAN, WEEKDAYS, isoLocal, mondayOf } from "@/lib/plan";

type WeekLog = Record<string, string[]>;

export default function Woche() {
  const log = useObject<WeekLog>("weekLog", {});
  const [offset, setOffset] = useState(0);

  const monday = mondayOf(offset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const todayIso = isoLocal(new Date());

  function done(dateIso: string, key: string): boolean {
    return (log.value[dateIso] || []).includes(key);
  }

  function toggle(dateIso: string, key: string) {
    const cur = log.value[dateIso] || [];
    const next = cur.includes(key)
      ? cur.filter((k) => k !== key)
      : [...cur, key];
    log.set({ [dateIso]: next });
  }

  // Wochensumme pro Aktivität.
  const counts = ACTIVITIES.map((a) => ({
    ...a,
    done: days.filter((d) => done(isoLocal(d), a.key)).length,
    plan: PLAN[a.key]?.length ?? 0,
  }));
  const totalDone = counts.reduce((s, c) => s + c.done, 0);

  const rangeLabel = `${days[0].getDate()}.${days[0].getMonth() + 1}. – ${days[6].getDate()}.${days[6].getMonth() + 1}.`;

  return (
    <>
      <header className="topbar">
        <h1>Woche</h1>
        <div className="tag">Planen, loggen & tracken</div>
      </header>

      <div className="container">
        <div className="card">
          <div className="week-nav">
            <button
              type="button"
              className="wn-btn"
              aria-label="Vorige Woche"
              onClick={() => setOffset((o) => o - 1)}
            >
              <Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} />
            </button>
            <div className="wn-label">
              <div className="wn-main">
                {offset === 0 ? "Diese Woche" : rangeLabel}
              </div>
              {offset === 0 ? <div className="wn-sub">{rangeLabel}</div> : null}
            </div>
            <button
              type="button"
              className="wn-btn"
              aria-label="Nächste Woche"
              onClick={() => setOffset((o) => o + 1)}
            >
              <Icon name="chevron" size={18} />
            </button>
          </div>

          <div className="grid-track">
            {/* Kopfzeile */}
            <div className="gt-corner" />
            {ACTIVITIES.map((a) => (
              <div className="gt-head" key={a.key}>
                {a.short}
              </div>
            ))}

            {/* Tageszeilen */}
            {days.map((d, i) => {
              const iso = isoLocal(d);
              const isToday = iso === todayIso;
              return (
                <div key={iso} style={{ display: "contents" }}>
                  <div className={`gt-day ${isToday ? "today" : ""}`}>
                    <span className="gt-dow">{WEEKDAYS[i]}</span>
                    <span className="gt-date">{d.getDate()}.</span>
                  </div>
                  {ACTIVITIES.map((a) => {
                    const isDone = done(iso, a.key);
                    const planned = PLAN[a.key]?.includes(i);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        aria-label={`${a.label} ${WEEKDAYS[i]}`}
                        className={`gt-cell ${isDone ? "done" : ""} ${
                          planned ? "planned" : ""
                        } ${isToday ? "today" : ""}`}
                        onClick={() => toggle(iso, a.key)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="legend">
            {ACTIVITIES.map((a) => (
              <span key={a.key} className="legend-item">
                <b>{a.short}</b> {a.label}
              </span>
            ))}
            <span className="legend-item muted">
              ◌ Ring = empfohlen · ● grün = erledigt
            </span>
          </div>
        </div>

        <div className="card">
          <h2>Diese Woche</h2>
          <div className="sub">{totalDone} Einheiten erledigt.</div>
          {counts.map((c) => {
            const pct = c.plan ? Math.min(100, (c.done / c.plan) * 100) : c.done ? 100 : 0;
            return (
              <div className="prog-row" key={c.key}>
                <div className="prog-label">{c.label}</div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="prog-val">
                  {c.done}
                  {c.plan ? `/${c.plan}` : ""}
                </div>
              </div>
            );
          })}
        </div>

        <div className="note-box">
          Tippe eine Zelle, um die Einheit als erledigt zu markieren. Der Ring
          zeigt die Empfehlung des Wochenplans — Mobility täglich, Technik Mo/Mi/Fr,
          Kurzspiel Mi/Sa, Gym Mo/Do, Platz am Wochenende.
        </div>
      </div>
    </>
  );
}
