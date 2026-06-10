"use client";

import { useState } from "react";
import { EquipItem, TeeTime } from "@/lib/types";
import { useCollection, useObject } from "@/lib/store";
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

// Range-Plan-Zeiten (statisch aus dem kuratierten Plan).
const ballMinutes = WARMUP.reduce((s, w) => s + w.minutes, 0);
const pitchOffset = ballMinutes + PITCHING_MINUTES;
const totalMinutes = pitchOffset + ACTIVATION_MINUTES;
const startBefore: number[] = (() => {
  const arr: number[] = [];
  let acc = 0;
  for (let i = WARMUP.length - 1; i >= 0; i--) {
    acc += WARMUP[i].minutes;
    arr[i] = acc;
  }
  return arr;
})();
const totalBalls = WARMUP.reduce((s, w) => s + w.balls, 0);

export default function Turnier() {
  const tee = useObject<TeeTime>("teeTime", TEE_TIME);
  const equip = useCollection<EquipItem>("equipment2", EQUIPMENT);
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
  const t = tee.value.time;

  // Fehlende Schläger laut Bag.
  const unavailableTags = equip.items
    .filter((e) => e.available === false && e.routineTag)
    .map((e) => e.routineTag as string);
  const missingIn = (text: string) =>
    unavailableTags.filter((tag) => text.includes(tag));

  function windowLabel(fromBefore: number, toBefore: number, mins: number) {
    if (!hasTime) return `${mins} Min`;
    return `${clockMinus(t, fromBefore)} – ${clockMinus(t, toBefore)} Uhr · ${mins} Min`;
  }

  const pitchingMissing = unavailableTags.filter((tag) =>
    PITCHING.some((s) => s.includes(tag))
  );

  return (
    <>
      <header className="topbar">
        <h1>Turnier</h1>
        <div className="tag">Dein kompletter Ablauf vor dem Abschlag</div>
      </header>

      <div className="container">
        {/* Tee Time */}
        <div className="card">
          <h2>Nächstes Turnier</h2>
          <div className="sub">
            Tee Time eintragen — alle Zeiten unten rechnen sich automatisch.
          </div>
          <label className="field">Turnier</label>
          <input
            type="text"
            value={tee.value.name}
            placeholder="z.B. Clubmeisterschaft"
            onChange={(e) => tee.set({ name: e.target.value })}
          />
          <div className="tee-grid" style={{ marginTop: 10 }}>
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
                <div className="lbl">Ankommen & los</div>
                <div className="val">{clockMinus(t, totalMinutes)} Uhr</div>
              </span>
              <span style={{ textAlign: "right" }}>
                <div className="lbl">Abschlag</div>
                <div className="val">{t} Uhr</div>
              </span>
            </div>
          )}
        </div>

        {/* 1 · Aktivierung */}
        <div className="card">
          <h2>
            <span className="step-num">1</span> Aktivierung · 10 Min
          </h2>
          <div className="sub">
            {windowLabel(totalMinutes, pitchOffset, ACTIVATION_MINUTES)} — Körper
            wecken, bevor der erste Ball fliegt. Einfach von oben nach unten.
          </div>
          {ACTIVATION.map((s, i) => {
            const id = `a${i}`;
            const on = done.has(id);
            return (
              <div className={`drill ${on ? "done" : ""}`} key={id}>
                <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                <span style={{ flex: 1 }}>
                  <span className="d-detail" style={{ marginTop: 0 }}>
                    {s}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* 2 · Pitching */}
        <div className="card">
          <h2>
            <span className="step-num">2</span> Kurzspiel · 15 Min
          </h2>
          <div className="sub">
            {windowLabel(pitchOffset, ballMinutes, PITCHING_MINUTES)} — Gefühl
            fürs Grün holen. Eigene Bälle, nicht der Bucket.
          </div>
          {pitchingMissing.length > 0 && (
            <div className="warn-box">
              Noch nicht im Bag: {pitchingMissing.join(", ")} — diese Schläge
              solange mit dem PW spielen.
            </div>
          )}
          {PITCHING.map((s, i) => {
            const id = `p${i}`;
            const on = done.has(id);
            return (
              <div className={`drill ${on ? "done" : ""}`} key={id}>
                <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                <span style={{ flex: 1 }}>
                  <span className="d-detail" style={{ marginTop: 0 }}>
                    {s}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* 3 · Range */}
        <div className="card">
          <h2>
            <span className="step-num">3</span> Range · genau {WARMUP_BALL_TARGET}{" "}
            Bälle
          </h2>
          <div className="sub">
            Ein 60er-Bucket reicht exakt. Kurz → lang, Abschluss mit Wedges.
            {hasTime
              ? " Die Uhrzeit zeigt, wann du bei welchem Schläger sein solltest."
              : " Trag oben die Tee Time ein für die Uhrzeiten."}
          </div>
          {WARMUP.map((w, i) => {
            const on = done.has(w.id);
            const zero = w.balls === 0;
            const clock = hasTime
              ? clockMinus(t, startBefore[i])
              : `−${startBefore[i]}′`;
            const rowMissing = missingIn(`${w.club} ${w.detail}`);
            return (
              <div className={`warm-row ${on ? "checked" : ""}`} key={w.id}>
                <input
                  type="checkbox"
                  className="warm-check"
                  checked={on}
                  onChange={() => toggle(w.id)}
                />
                <span className={`balls ${zero ? "zero" : ""}`}>
                  {zero ? "–" : w.balls}
                </span>
                <span className="lbl">
                  <span className="warm-club">
                    {w.club}
                    {rowMissing.length > 0 && (
                      <span className="tag-missing">
                        {rowMissing.join(", ")} fehlt
                      </span>
                    )}
                  </span>
                  <div className="warm-detail">{w.detail}</div>
                </span>
                <span className="clock">{clock}</span>
              </div>
            );
          })}

          <div className="warm-total">
            <span className="n">{totalBalls} Bälle</span>
            <span className="hint">= 1 Bucket · Putten mit eigenem Ball</span>
          </div>

          <div className="note-box">{WARMUP_RULE}</div>
          <div className="row-actions">
            <button
              className="btn-outline muted"
              type="button"
              onClick={() => setDone(new Set())}
            >
              <Icon name="reset" size={15} /> Alle Haken zurücksetzen
            </button>
          </div>
        </div>

        {/* Strategie */}
        <div className="card">
          <h2>Auf der Runde · Strategie</h2>
          <div className="sub">Vor der Runde einmal lesen — mehr nicht.</div>
          {MENTAL_CHECK.map((s) => (
            <div className="list-row" key={s}>
              <Icon name="target" size={13} className="bullet" />
              <span className="body">{s}</span>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div className="card">
          <h2>Merksätze</h2>
          {INSIGHTS.map((s) => (
            <div className="list-row" key={s}>
              <Icon name="target" size={13} className="bullet" />
              <span className="body">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
