"use client";

import { useEffect, useMemo, useState } from "react";
import { Session, SessionType, SESSION_LABELS } from "@/lib/types";
import { getSessions, addSession, deleteSession, computeStreak } from "@/lib/storage";
import { uid } from "@/lib/store";
import { BALL_BUCKETS } from "@/lib/seed";
import { isoLocal, mondayOf } from "@/lib/plan";

const TYPES: SessionType[] = ["range", "course", "gym", "stretch"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type Tab = "log" | "stats";

export default function Journal() {
  const [tab, setTab] = useState<Tab>("log");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<SessionType>("range");
  const [balls, setBalls] = useState("");
  const [score, setScore] = useState("");
  const [course, setCourse] = useState("");
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
    const noteParts = [
      type === "course" && course.trim() ? course.trim() : "",
      notes.trim(),
    ].filter(Boolean);
    const s: Session = {
      id: uid("s"),
      date,
      type,
      rating,
      drills: [],
      balls: balls ? Number(balls) : undefined,
      score: score ? Number(score) : undefined,
      notes: noteParts.join(" — ") || undefined,
      createdAt: new Date().toISOString(),
      user_id: null,
    };
    try {
      await addSession(s);
      setBalls("");
      setScore("");
      setCourse("");
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

  /* ── Verlauf/Stats ────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const totalBalls = sessions.reduce((n, s) => n + (s.balls || 0), 0);
    const streak = computeStreak(sessions);
    const byType: Record<SessionType, number> = {
      range: 0,
      course: 0,
      gym: 0,
      stretch: 0,
    };
    sessions.forEach((s) => (byType[s.type] += 1));

    // Sessions pro Woche (letzte 8 Wochen, Mo-basiert)
    const weeks = [] as { label: string; count: number }[];
    for (let off = -7; off <= 0; off++) {
      const start = mondayOf(off);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const sIso = isoLocal(start);
      const eIso = isoLocal(end);
      weeks.push({
        label: `${start.getDate()}.`,
        count: sessions.filter((x) => x.date >= sIso && x.date < eIso).length,
      });
    }

    const rounds = sessions.filter((s) => s.type === "course");
    const roundTrend = [...rounds]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-8);
    const scores = rounds.map((r) => r.score || 0).filter((n) => n > 0);
    const bestScore = scores.length ? Math.max(...scores) : 0;
    const lastScore = rounds[0]?.score; // sessions sind nach Datum absteigend

    return {
      totalSessions: sessions.length,
      totalBalls,
      streak,
      byType,
      weeks,
      rounds,
      roundTrend,
      bestScore,
      lastScore,
    };
  }, [sessions]);

  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.count));
  const maxScore = Math.max(1, ...stats.roundTrend.map((r) => r.score || 0));

  return (
    <>
      <header className="topbar">
        <h1>Journal</h1>
        <div className="tag">Sessions loggen & dein Verlauf</div>
      </header>

      <div className="subtabs">
        <button
          className={tab === "log" ? "active" : ""}
          onClick={() => setTab("log")}
        >
          Loggen
        </button>
        <button
          className={tab === "stats" ? "active" : ""}
          onClick={() => setTab("stats")}
        >
          Verlauf
        </button>
      </div>

      <div className="container">
        {tab === "log" ? (
          <>
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
                  <label className="field">Platz</label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="z.B. GC Dresden"
                  />
                  <label className="field">Stableford-Punkte</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="z.B. 28"
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
          </>
        ) : (
          <>
            {/* Kennzahlen */}
            <div className="card">
              <h2>Überblick</h2>
              <div className="stats-row">
                <div className="stat">
                  <div className="num">{stats.streak}</div>
                  <div className="lbl">Tage Streak</div>
                </div>
                <div className="stat">
                  <div className="num">{stats.totalSessions}</div>
                  <div className="lbl">Sessions gesamt</div>
                </div>
                <div className="stat">
                  <div className="num">{stats.totalBalls}</div>
                  <div className="lbl">Bälle gesamt</div>
                </div>
              </div>
            </div>

            {/* Sessions pro Woche */}
            <div className="card">
              <h2>Sessions pro Woche</h2>
              <div className="sub">Letzte 8 Wochen.</div>
              <div className="bars">
                {stats.weeks.map((w, i) => (
                  <div className="bar-col" key={i}>
                    <div className="bar-val">{w.count || ""}</div>
                    <div
                      className="bar"
                      style={{ height: `${(w.count / maxWeek) * 100}%` }}
                    />
                    <div className="bar-lbl">{w.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verteilung */}
            <div className="card">
              <h2>Verteilung</h2>
              {TYPES.map((t) => {
                const c = stats.byType[t];
                const pct = stats.totalSessions
                  ? (c / stats.totalSessions) * 100
                  : 0;
                return (
                  <div className="prog-row" key={t}>
                    <div className="prog-label">{SESSION_LABELS[t]}</div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="prog-val">{c}</div>
                  </div>
                );
              })}
            </div>

            {/* Runden */}
            <div className="card">
              <h2>Runden ({stats.rounds.length})</h2>
              {stats.rounds.length === 0 ? (
                <div className="empty">
                  Noch keine Runde geloggt.
                  <br />
                  Log eine Runde unter „Loggen → Platz".
                </div>
              ) : (
                <>
                  <div className="stats-row" style={{ marginBottom: 4 }}>
                    <div className="stat">
                      <div className="num">{stats.lastScore ?? "—"}</div>
                      <div className="lbl">Letzte (Pkt)</div>
                    </div>
                    <div className="stat">
                      <div className="num">{stats.bestScore || "—"}</div>
                      <div className="lbl">Beste (Pkt)</div>
                    </div>
                    <div className="stat">
                      <div className="num">{stats.rounds.length}</div>
                      <div className="lbl">Runden</div>
                    </div>
                  </div>
                  {stats.roundTrend.length > 1 && (
                    <div className="bars" style={{ marginTop: 8 }}>
                      {stats.roundTrend.map((r, i) => (
                        <div className="bar-col" key={i}>
                          <div className="bar-val">{r.score || ""}</div>
                          <div
                            className="bar"
                            style={{
                              height: `${((r.score || 0) / maxScore) * 100}%`,
                            }}
                          />
                          <div className="bar-lbl">
                            {r.date.slice(8, 10)}.{r.date.slice(5, 7)}.
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    {stats.rounds.map((r) => (
                      <div className="session-item" key={r.id}>
                        <div>
                          <span className="s-type">
                            {r.score ? `${r.score} Punkte` : "Runde"}
                          </span>
                          <div className="s-notes">{r.notes || "—"}</div>
                        </div>
                        <div className="s-date">{r.date}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
