"use client";

import { useState } from "react";
import { EquipItem, TeeTime, WarmupStep } from "@/lib/types";
import { useCollection, useObject, useStringList, uid } from "@/lib/store";
import {
  WARMUP,
  WARMUP_RULE,
  WARMUP_BALL_TARGET,
  ACTIVATION,
  ACTIVATION_MINUTES,
  PITCHING,
  PITCHING_MINUTES,
  MENTAL_CHECK,
  INSIGHTS,
  TEE_TIME,
  EQUIPMENT,
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
  const activation = useStringList("activation", ACTIVATION);
  const pitching = useStringList("pitching", PITCHING);
  const warmup = useCollection<WarmupStep>("warmupPlan", WARMUP);
  const mental = useStringList("mentalCheck", MENTAL_CHECK);
  const insights = useStringList("insights", INSIGHTS);
  const equip = useCollection<EquipItem>("equipment2", EQUIPMENT);
  const [done, setDone] = useState<Set<string>>(new Set());

  // Schläger, die laut Bag noch nicht da sind → Routine-Schritte markieren.
  const unavailableTags = equip.items
    .filter((e) => e.available === false && e.routineTag)
    .map((e) => e.routineTag as string);
  const missingIn = (text: string) =>
    unavailableTags.filter((tag) => text.includes(tag));

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasTime = /^\d{1,2}:\d{2}$/.test(tee.value.time.trim());
  const t = tee.value.time;

  // Range-Plan-Dauer und Offsets (Minuten vor dem Abschlag).
  const ballMinutes = warmup.items.reduce((s, w) => s + (Number(w.minutes) || 0), 0);
  const pitchOffset = ballMinutes + PITCHING_MINUTES; // Start Pitching
  const totalMinutes = pitchOffset + ACTIVATION_MINUTES; // Start Aktivierung

  // Pro Range-Schritt: Minuten vor Abschlag beim Start (Suffix-Summe).
  const startBefore: number[] = [];
  let acc = 0;
  for (let i = warmup.items.length - 1; i >= 0; i--) {
    acc += Number(warmup.items[i].minutes) || 0;
    startBefore[i] = acc;
  }

  const totalBalls = warmup.items.reduce((s, w) => s + (Number(w.balls) || 0), 0);
  const onTarget = totalBalls === WARMUP_BALL_TARGET;

  function windowLabel(fromBefore: number, toBefore: number, mins: number) {
    if (!hasTime) return `${mins} Min`;
    return `${clockMinus(t, fromBefore)} – ${clockMinus(t, toBefore)} Uhr · ${mins} Min`;
  }

  return (
    <>
      <header className="topbar">
        <h1>Turnier</h1>
        <div className="tag">Ablauf, Warmup & Strategie</div>
      </header>

      <div className="container">
        <div className="card">
          <h2>Nächstes Turnier</h2>
          <label className="field">Turnier</label>
          <input
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
                <div className="lbl">Aufwärmen ab</div>
                <div className="val">{clockMinus(t, totalMinutes)} Uhr</div>
              </span>
              <span style={{ textAlign: "right" }}>
                <div className="lbl">Abschlag</div>
                <div className="val">{t} Uhr</div>
              </span>
            </div>
          )}

          {(tee.value.name || tee.value.date || tee.value.time) && (
            <div className="row-actions">
              <button className="btn-outline muted" type="button" onClick={tee.reset}>
                <Icon name="reset" size={15} /> Tee Time leeren
              </button>
            </div>
          )}
        </div>

        {/* 1 · Aktivierung */}
        <div className="card">
          <h2>1 · Aktivierung · 10 Min</h2>
          <div className="sub">
            {windowLabel(totalMinutes, pitchOffset, ACTIVATION_MINUTES)} — vor dem ersten Ball.
          </div>
          <EditableList list={activation} addLabel="Schritt" />
        </div>

        {/* 2 · Pitching / Chipping */}
        <div className="card">
          <h2>2 · Pitching & Chipping · 15 Min</h2>
          <div className="sub">
            {windowLabel(pitchOffset, ballMinutes, PITCHING_MINUTES)} — Kurzspiel & Gefühl.
          </div>
          {(() => {
            const miss = unavailableTags.filter((tag) =>
              pitching.items.some((s) => s.includes(tag))
            );
            return miss.length ? (
              <div className="warn-box">
                Noch nicht im Bag: {miss.join(", ")} — solange mit PW spielen.
              </div>
            ) : null;
          })()}
          <EditableList list={pitching} addLabel="Schritt" />
        </div>

        {/* 3 · Range-Plan */}
        <div className="card">
          <h2>3 · Range · 60-Ball-Plan</h2>
          <div className="sub">
            {hasTime
              ? "Ziel-Uhrzeiten aus deiner Tee Time. Bälle-Zahl antippen zum Anpassen. Putten mit eigenem Ball."
              : "Trag oben die Tee Time ein, dann erscheinen die Ziel-Uhrzeiten. Putten mit eigenem Ball."}
          </div>
          <div className="timeline">
            {warmup.items.map((w, i) => {
              const checked = done.has(w.id);
              const zero = (Number(w.balls) || 0) === 0;
              const clock = hasTime
                ? clockMinus(t, startBefore[i])
                : `−${startBefore[i]}′`;
              const rowMissing = missingIn(`${w.club} ${w.detail}`);
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
                      {rowMissing.length > 0 && (
                        <span className="tag-missing">{rowMissing.join(", ")} fehlt</span>
                      )}
                    </span>
                    <div className="warm-detail">
                      <EditableText
                        value={w.detail}
                        multiline
                        onChange={(v) => warmup.update(w.id, { detail: v })}
                      />
                    </div>
                  </span>
                  <span className="clock">{clock}</span>
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
                  minutes: 5,
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
