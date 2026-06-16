"use client";

import Link from "next/link";
import { Session } from "@/lib/types";
import { aggregate, benchmarkRows, topFocus } from "@/lib/golf";
import Icon from "./Icon";

/** „Weg zu Scratch" — Schnittwerte vs. Scratch-Richtwerte + größter Hebel. */
export default function ScratchCard({ sessions }: { sessions: Session[] }) {
  const agg = aggregate(sessions);
  const rows = benchmarkRows(agg).filter((r) => r.value != null);
  if (!rows.length) return null; // noch keine Runden-Stats erfasst

  const focus = topFocus(agg);

  return (
    <div className="card">
      <h2>Weg zu Scratch</h2>
      <div className="sub">
        Schnitt aus {agg.rounds} {agg.rounds === 1 ? "Runde" : "Runden"} vs.
        Scratch-Richtwerte (pro 18 Löcher).
      </div>

      {focus && (
        <Link href={focus.href} className="focus-box">
          <span className="focus-icon">
            <Icon name="target" size={15} />
          </span>
          <span className="focus-body">
            <span className="focus-title">Größter Hebel: {focus.label}</span>
            <span className="focus-advice">{focus.advice}</span>
          </span>
          <Icon name="chevron" size={16} className="focus-chev" />
        </Link>
      )}

      <div className="bench-list">
        {rows.map((r) => (
          <div className="bench-row" key={r.key}>
            <div className="bench-head">
              <span className="bench-label">{r.label}</span>
              <span className="bench-val">
                <b className={r.onTrack ? "ok" : "miss"}>{r.valueText}</b>
                <span className="bench-target">Ziel {r.targetText}</span>
              </span>
            </div>
            <div className="prog-bar">
              <div
                className={`prog-fill ${r.onTrack ? "" : "warn"}`}
                style={{ width: `${Math.round(r.progress * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
