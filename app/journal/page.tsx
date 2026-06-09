"use client";

import { useEffect, useState } from "react";
import { Session, SessionType, SESSION_LABELS } from "@/lib/types";
import { getSessions, addSession, deleteSession } from "@/lib/storage";
import { uid } from "@/lib/store";
import { BALL_BUCKETS } from "@/lib/seed";

const TYPES: SessionType[] = ["range", "course", "gym", "stretch"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function Journal() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<SessionType>("range");
  const [balls, setBalls] = useState("");
  const [score, setScore] = useState("");
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setSessions(await getSessions());
  }
  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    setSaving(true);
    const s: Session = {
      id: uid("s"),
      date,
      type,
      rating,
      drills: [],
      balls: balls ? Number(balls) : undefined,
      score: score ? Number(score) : undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      user_id: null,
    };
    try {
      await addSession(s);
      setBalls("");
      setScore("");
      setNotes("");
      setRating(3);
      await refresh();
    } catch (e) {
      alert("Speichern fehlgeschlagen: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await deleteSession(id);
    await refresh();
  }

  function addBucket(size: number) {
    setBalls((prev) => String((Number(prev) || 0) + size));
  }

  return (
    <>
      <header className="topbar">
        <h1>Journal</h1>
        <div className="tag">Session loggen</div>
      </header>

      <div className="container">
        <div className="card">
          <h2>Neue Session</h2>

          <label className="field">Art</label>
          <div className="seg">
            {TYPES.map((t) => (
              <button
                key={t}
                className={type === t ? "active" : ""}
                onClick={() => setType(t)}
              >
                {SESSION_LABELS[t]}
              </button>
            ))}
          </div>

          <label className="field">Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {type === "range" && (
            <>
              <label className="field">Bälle (Buckets: 30 / 60)</label>
              <input
                type="number"
                inputMode="numeric"
                value={balls}
                onChange={(e) => setBalls(e.target.value)}
                placeholder="0"
              />
              <div className="bucket-row">
                {BALL_BUCKETS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="bucket-btn"
                    onClick={() => addBucket(size)}
                  >
                    + {size} Bälle
                  </button>
                ))}
                <button
                  type="button"
                  className="bucket-clear"
                  onClick={() => setBalls("")}
                >
                  Reset
                </button>
              </div>
            </>
          )}

          {type === "course" && (
            <>
              <label className="field">Punkte / Schläge</label>
              <input
                type="number"
                inputMode="numeric"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Stableford-Punkte"
              />
            </>
          )}

          <label className="field">Gefühl</label>
          <div className="rating">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                className={rating === r ? "active" : ""}
                onClick={() => setRating(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <label className="field">Notizen</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Was lief gut? Woran arbeiten?"
          />

          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>

        <div className="card">
          <h2>Alle Sessions ({sessions.length})</h2>
          {sessions.length === 0 ? (
            <div className="empty">Noch keine Einträge.</div>
          ) : (
            sessions.map((s) => (
              <div className="session-item" key={s.id}>
                <div>
                  <span className="s-type">{SESSION_LABELS[s.type]}</span>
                  <div className="s-notes">{s.notes || "—"}</div>
                  <div className="s-meta">
                    {s.balls ? `${s.balls} Bälle` : ""}
                    {s.score ? ` · ${s.score} Pkt` : ""}
                    {s.drills.length ? ` · ${s.drills.length} Drills` : ""}
                    {" · "}
                    {"★".repeat(s.rating)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="s-date">{s.date}</div>
                  <button className="btn-ghost" onClick={() => remove(s.id)}>
                    löschen
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
