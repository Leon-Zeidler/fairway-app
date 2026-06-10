"use client";

import { useState } from "react";
import Link from "next/link";
import { useObject } from "@/lib/store";
import Icon from "@/app/components/Icon";
import {
  ACTIVITIES,
  PLAN,
  WEEKDAYS,
  isoLocal,
  mondayOf,
  dayTasks,
} from "@/lib/plan";

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

  // Wochensumme pro Aktivität (für die Fortschrittsbalken).
  const counts = ACTIVITIES.map((a) => ({
    ...a,
    done: days.filter((d) => done(isoLocal(d), a.key)).length,
    plan: PLAN[a.key]?.length ?? 0,
  }));
  const totalDone = counts.reduce((s, c) => s + c.done, 0);
  const totalPlan = counts.reduce((s, c) => s + c.plan, 0);

  const rangeLabel = `${days[0].getDate()}.${days[0].getMonth() + 1}. – ${days[6].getDate()}.${days[6].getMonth() + 1}.`;

  return (
    <>
      <header className="topbar">
        <h1>Woche</h1>
        <div className="tag">Dein Plan — Tag für Tag, einfach abhaken</div>
      </header>

      <div className="container">
        {/* Wochen-Navigation + Fortschritt */}
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
                {offset === 0
                  ? "Diese Woche"
                  : offset === -1
                    ? "Letzte Woche"
                    : offset === 1
                      ? "Nächste Woche"
                      : rangeLabel}
              </div>
              <div className="wn-sub">{rangeLabel}</div>
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

          {counts.map((c) => {
            const pct = c.plan ? Math.min(100, (c.done / c.plan) * 100) : 0;
            return (
              <div className="prog-row" key={c.key}>
                <div className="prog-label">{c.label}</div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="prog-val">
                  {c.done}/{c.plan}
                </div>
              </div>
            );
          })}
          <div className="warm-total">
            <span className="n">
              {totalDone}/{totalPlan}
            </span>
            <span className="hint">Einheiten diese Woche</span>
          </div>
        </div>

        {/* Tages-Agenda */}
        {days.map((d, i) => {
          const iso = isoLocal(d);
          const isToday = iso === todayIso;
          const isPast = iso < todayIso;
          const tasks = dayTasks(i);
          const openCount = tasks.filter((t) => !done(iso, t.key)).length;
          return (
            <div
              className={`card day-card ${isToday ? "today" : ""} ${
                isPast ? "past" : ""
              }`}
              key={iso}
            >
              <div className="day-head">
                <span className="day-title">
                  {WEEKDAYS[i]} · {d.getDate()}.{d.getMonth() + 1}.
                  {isToday && <span className="tag-today">Heute</span>}
                </span>
                <span className="day-state">
                  {openCount === 0
                    ? "✓ alles erledigt"
                    : isPast
                      ? `${tasks.length - openCount}/${tasks.length} geschafft`
                      : `${tasks.length} Einheit${tasks.length > 1 ? "en" : ""}`}
                </span>
              </div>
              {tasks.map((task) => {
                const on = done(iso, task.key);
                return (
                  <div className={`task-row ${on ? "done" : ""}`} key={task.key}>
                    <div className="task-info">
                      <div className="task-name">{task.title}</div>
                      <div className="task-desc">{task.desc}</div>
                      {task.href && !on && (
                        <Link href={task.href} className="demo-link">
                          Zur Anleitung <Icon name="chevron" size={12} />
                        </Link>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`day-check ${on ? "on" : ""}`}
                      aria-label={`${task.title} erledigt`}
                      onClick={() => toggle(iso, task.key)}
                    >
                      ✓
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="note-box">
          Der Plan: Mobility jeden Tag (rotiert automatisch durch die Bereiche),
          Range Mo/Mi/Fr, Kurzspiel Mi/Sa, Gym Mo/Do, Platz am Wochenende.
          Verpasst ist egal — einfach beim nächsten Tag weitermachen.
        </div>
      </div>
    </>
  );
}
