"use client";

import { useState } from "react";
import { TeeTime, WarmupStep } from "@/lib/types";
import { useCollection, useObject, useStringList, uid } from "@/lib/store";
import {
  WARMUP,
  WARMUP_RULE,
  WARMUP_BALL_TARGET,
  WARMUP_MINUTES,
  MENTAL_CHECK,
  INSIGHTS,
  TEE_TIME,
} from "@/lib/seed";
import { EditableText, EditableList, ResetButton } from "@/app/components/ui";
import Icon from "@/app/components/Icon";

/** Uhrzeit (HH:MM) minus Minuten zurückrechnen. */
function clockMinus(time: string, minutesBefore: number): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  let total = Number(m[1]) * 60 + Number(m[2]) - minutesBefore;
  total = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export default function Turnier() {
  const tee = useObject<TeeTime>("teeTime", TEE_TIME);
  // Key v2: neues ball-basiertes Modell (altes "warmup" hatte ein anderes Schema).
  const warmup = useCollection<WarmupStep>("warmup60", WARMUP);
  const mental = useStringList("mentalCheck", MENTAL_CHECK);
  const insights = useStringList("insights", INSIGHTS);
  const [done, setDone] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasTime = /^\d{1,2}:\d{2}$/.test(tee.value.time.trim());
  const warmupStart = hasTime ? clockMinus(tee.value.time, WARMUP_MINUTES) : null;
  const totalBalls = warmup.items.reduce((sum, w) => sum + (Number(w.balls) || 0), 0);
  const onTarget = totalBalls === WARMUP_BALL_TARGET;

  return (
    <>
      <header className="topbar">
        <h1>Turnier</h1>
        <div className="tag">Tee Time, Warmup & Strategie</div>
      </header>

      <div className="container">
        <div className="card">
          <h2>Nächstes Turnier</h2>
          <label className="field">Turnier</label>
          <input
            className="full"
            type="text"
            value={tee.value.name}
            placeholder="z.B. Clubmeisterschaft"
            onChange={(e) => tee.set({ name: e.target.value })}
          />
          <div className="tee-grid" style={{ marginTop: 12 }}>
            <div>
              <label className="field">Datum</label>
              <input
                type="date"
                value={tee.value.date}
                onChange={(e) => tee.set({ date: e.target.value })}
              />
            </div>
            <div>
              <label className="field">Tee Time</label>
              <input
                type="time"
                value={tee.value.time}
                onChange={(e) => tee.set({ time: e.target.value })}
              />
            </div>
          </div>

          {hasTime && (
            <div className="tee-banner">
              <span>
                <div className="lbl">Warmup-Start</div>
                <div className="val">{warmupStart} Uhr</div>
              </span>
              <span style={{ textAlign: "right" }}>
                <div className="lbl">Abschlag</div>
                <div className="val">{tee.value.time} Uhr</div>
              </span>
            </div>
          )}

          {(tee.value.name || tee.value.date || tee.value.time) && (
            <div className="row-actions">
              <button
                className="btn-outline muted"
                type="button"
                onClick={tee.reset}
              >
                <Icon name="reset" size={15} /> Tee Time leeren
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Warmup · 60-Ball-Plan</h2>
          <div className="sub">
            Aufbau kurz → lang, Abschluss mit Wedges. Bälle-Zahl antippen zum
            Anpassen. Putten mit eigenem Ball (zählt nicht).
          </div>
          <div className="timeline">
            {warmup.items.map((w) => {
              const checked = done.has(w.id);
              const zero = (Number(w.balls) || 0) === 0;
              return (
                <div className={`warm-row ${checked ? "checked" : ""}`} key={w.id}>
                  <input
                    type="checkbox"
                    className="warm-check"
                    checked={checked}
                    onChange={() => toggle(w.id)}
                  />
                  <span className={`balls ${zero ? "zero" : ""}`}>
                    <EditableText
                      value={zero ? "–" : String(w.balls)}
                      onChange={(v) =>
                        warmup.update(w.id, { balls: Number(v.replace(/\D/g, "")) || 0 })
                      }
                    />
                  </span>
                  <span className="lbl">
                    <span className="warm-club">
                      <EditableText
                        value={w.club}
                        onChange={(v) => warmup.update(w.id, { club: v })}
                      />
                    </span>
                    <div className="warm-detail">
                      <EditableText
                        value={w.detail}
                        multiline
                        onChange={(v) => warmup.update(w.id, { detail: v })}
                      />
                    </div>
                  </span>
                  <button
                    className="del"
                    type="button"
                    aria-label="Löschen"
                    onClick={() => warmup.remove(w.id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div className={`warm-total ${onTarget ? "" : "off"}`}>
            <span className="n">{totalBalls} Bälle</span>
            <span className="hint">
              {onTarget
                ? "= 1 Bucket · Putten eigener Ball"
                : `Ziel ${WARMUP_BALL_TARGET} (${
                    totalBalls > WARMUP_BALL_TARGET ? "+" : ""
                  }${totalBalls - WARMUP_BALL_TARGET})`}
            </span>
          </div>

          <div className="note-box">{WARMUP_RULE}</div>
          <div className="row-actions">
            <button
              className="btn-outline"
              type="button"
              onClick={() =>
                warmup.add({
                  id: uid("w"),
                  club: "Neuer Schritt",
                  detail: "Hinweis…",
                  balls: 0,
                })
              }
            >
              <Icon name="plus" size={15} /> Schritt
            </button>
            <button
              className="btn-outline muted"
              type="button"
              onClick={() => setDone(new Set())}
            >
              <Icon name="reset" size={15} /> Haken zurück
            </button>
            <ResetButton onReset={warmup.reset} />
          </div>
        </div>

        <div className="card">
          <h2>Mental-Check & Strategie</h2>
          <EditableList list={mental} addLabel="Punkt" />
        </div>

        <div className="card">
          <h2>Swing-Insights</h2>
          <EditableList list={insights} addLabel="Insight" />
        </div>
      </div>
    </>
  );
}
