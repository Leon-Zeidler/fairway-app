"use client";

import { useEffect, useMemo, useState } from "react";
import { Focus, Profile, Session, SessionType, SESSION_LABELS, HoleScore } from "@/lib/types";
import { getSessions, addSession, deleteSession, computeStreak } from "@/lib/storage";
import { useObject, uid } from "@/lib/store";
import { BALL_BUCKETS, FOCUS, PROFILE } from "@/lib/seed";
import { PLAN, isoLocal, mondayOf } from "@/lib/plan";
import { roundStats, hasRoundStats, deriveRoundFields } from "@/lib/golf";
import { COURSES, courseById } from "@/lib/courses";
import { roundInsightsFrom, CoachAction, CoachResponse } from "@/lib/coach";
import Icon from "@/app/components/Icon";
import ScratchCard from "@/app/components/ScratchCard";

const TYPES: SessionType[] = ["range", "course", "gym", "stretch"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Freitext-Zahl → number | undefined (leer = nicht erfasst). */
function numOr(v: string): number | undefined {
  return v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined;
}

/** Runden-Meta-Zeile (z.B. „+12 zu Par · FW 57% · GIR 50% · 32 Putts"). */
function roundMeta(s: Session): string {
  const r = roundStats(s);
  return [
    r.toPar != null ? `${r.toPar >= 0 ? "+" : ""}${r.toPar} zu Par` : null,
    r.fairwayPct != null ? `FW ${Math.round(r.fairwayPct * 100)}%` : null,
    r.girPct != null ? `GIR ${Math.round(r.girPct * 100)}%` : null,
    r.putts != null ? `${r.putts} Putts` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

type Tab = "log" | "stats";

export default function Journal() {
  // Stores für KI-Autoanpassung
  const focus = useObject<Focus>("focus", FOCUS);
  const plan = useObject<Record<string, number[]>>("plan", PLAN);
  const profile = useObject<Profile>("profile", PROFILE);
  const [autoUndo, setAutoUndo] = useState<
    { focus: Focus; plan: Record<string, number[]> } | null
  >(null);

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

  // Ullersdorf-Scorecard (Loch-für-Loch)
  const [scorecard, setScorecard] = useState(false);
  const [courseId, setCourseId] = useState("ullersdorf");
  const [teeId] = useState("schwarz");
  const [holeScores, setHoleScores] = useState<Record<number, HoleScore>>({});

  // Runden-Statistik (optional, nur Platz)
  const [showStats, setShowStats] = useState(false);
  const [holes, setHoles] = useState<9 | 18>(18);
  const [strokes, setStrokes] = useState("");
  const [coursePar, setCoursePar] = useState("");
  const [fwHit, setFwHit] = useState("");
  const [fwOf, setFwOf] = useState("");
  const [girHit, setGirHit] = useState("");
  const [putts, setPutts] = useState("");
  const [scrMade, setScrMade] = useState("");
  const [scrTries, setScrTries] = useState("");
  const [penalties, setPenalties] = useState("");

  async function refresh() {
    setSessions(await getSessions());
  }
  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setBalls("");
    setScore("");
    setCourse("");
    setNotes("");
    setRating(3);
    setScorecard(false);
    setHoleScores({});
    setShowStats(false);
    setHoles(18);
    setStrokes("");
    setCoursePar("");
    setFwHit("");
    setFwOf("");
    setGirHit("");
    setPutts("");
    setScrMade("");
    setScrTries("");
    setPenalties("");
  }

  /** Ruft den Coach im Hintergrund auf und passt Fokus/Plan automatisch an. */
  async function autoAdaptPlan(allSessions: Session[]) {
    const insights = roundInsightsFrom(
      allSessions,
      COURSES,
      parseFloat(profile.value.hcp)
    );
    if (!insights) return; // keine auswertbaren Runden → nichts zu tun

    const context = {
      focus: focus.value,
      plan: plan.value,
      profile: profile.value,
      roundInsights: insights,
      today: new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    };

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "Ich habe gerade eine Runde gespeichert. Passe meinen Fokus und Wochenplan an die Runden-Auswertung an. Antworte knapp.",
            },
          ],
          context,
        }),
      });
      const data: CoachResponse = await res.json();
      if (data.notConfigured || data.error) return; // kein Key / Fehler → still überspringen
      const actions = (data.actions ?? []).filter(
        (a): a is Extract<CoachAction, { type: "set_focus" | "set_plan" }> =>
          a.type === "set_focus" || a.type === "set_plan"
      );
      if (!actions.length) return;

      // Snapshot für Undo speichern, dann Aktionen anwenden
      const snap = { focus: focus.value, plan: plan.value };
      for (const a of actions) {
        if (a.type === "set_focus") {
          focus.set({
            ...(a.title !== undefined ? { title: a.title } : {}),
            ...(a.why !== undefined ? { why: a.why } : {}),
            ...(a.cues !== undefined ? { cues: a.cues } : {}),
          });
        } else if (a.type === "set_plan") {
          plan.set({ [a.activity]: a.days });
        }
      }
      setAutoUndo(snap);
    } catch {
      // Offline oder Netzfehler → Runde bleibt gespeichert, kein Banner
    }
  }

  async function save() {
    setSaving(true);
    const noteParts = [
      type === "course" && course.trim() ? course.trim() : "",
      notes.trim(),
    ].filter(Boolean);

    // Loch-für-Loch-Modus: abgeleitete Felder berechnen
    let derived: Partial<Session> = {};
    let holesArr: HoleScore[] | undefined;
    if (type === "course" && scorecard) {
      const c = courseById(COURSES, courseId)!;
      holesArr = Object.values(holeScores).filter((h) => h.strokes > 0);
      derived = {
        courseId,
        teeId,
        holes: holesArr,
        ...deriveRoundFields(c, holesArr),
      };
    }

    const roundFields =
      type === "course" && showStats && !scorecard
        ? {
            holesPlayed: holes,
            strokes: numOr(strokes),
            coursePar: numOr(coursePar),
            fairwaysHit: numOr(fwHit),
            fairwaysPossible: numOr(fwOf),
            girHit: numOr(girHit),
            putts: numOr(putts),
            scramblingMade: numOr(scrMade),
            scramblingTries: numOr(scrTries),
            penalties: numOr(penalties),
          }
        : {};
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
      ...roundFields,
      ...derived,
    };
    try {
      await addSession(s);
      resetForm();
      await refresh();
      // Nur bei Platz-Runden: KI-Anpassung im Hintergrund anstoßen (kein await)
      if (type === "course") {
        const all = await getSessions();
        void autoAdaptPlan(all);
      }
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

  // Ullersdorf-Runden aufsteigend nach Datum (für Trendansicht)
  const ullersdorfRounds = useMemo(
    () =>
      sessions
        .filter((s) => s.courseId === "ullersdorf")
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [sessions]
  );

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

      {autoUndo && (
        <div className="auto-undo">
          <span>Plan an deine Runden angepasst.</span>
          <button
            type="button"
            onClick={() => {
              focus.replace(autoUndo.focus);
              plan.replace(autoUndo.plan);
              setAutoUndo(null);
            }}
          >
            Rückgängig
          </button>
        </div>
      )}

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

                  {/* Ullersdorf-Scorecard-Umschalter */}
                  <label className="row-toggle" style={{ marginTop: 14 }}>
                    <input
                      type="checkbox"
                      checked={scorecard}
                      onChange={(e) => setScorecard(e.target.checked)}
                    />
                    Ullersdorf-Scorecard (Loch für Loch)
                  </label>

                  {/* Loch-für-Loch-Eingabe */}
                  {scorecard && (() => {
                    const c = courseById(COURSES, courseId)!;
                    const setHole = (holeNum: number, patch: Partial<HoleScore>) =>
                      setHoleScores((prev) => {
                        const existing: HoleScore = prev[holeNum] ?? { hole: holeNum, strokes: 0 };
                        return { ...prev, [holeNum]: { ...existing, ...patch } };
                      });
                    return (
                      <div className="scorecard">
                        {c.holes.map((h) => {
                          const sc = holeScores[h.hole];
                          const toPar =
                            sc && sc.strokes ? sc.strokes - h.par : null;
                          return (
                            <div className="sc-row" key={h.hole}>
                              <span className="sc-hole">{h.hole}</span>
                              <span className="sc-par">Par {h.par} · SI {h.si}</span>
                              <input
                                className="sc-strokes"
                                inputMode="numeric"
                                placeholder="–"
                                value={sc?.strokes || ""}
                                onChange={(e) =>
                                  setHole(h.hole, { strokes: Number(e.target.value) || 0 })
                                }
                              />
                              <input
                                className="sc-putts"
                                inputMode="numeric"
                                placeholder="Putts"
                                value={sc?.putts ?? ""}
                                onChange={(e) =>
                                  setHole(h.hole, {
                                    putts: e.target.value === "" ? undefined : Number(e.target.value),
                                  })
                                }
                              />
                              <button
                                type="button"
                                className={`sc-gir ${sc?.gir ? "on" : ""}`}
                                onClick={() => setHole(h.hole, { gir: !sc?.gir })}
                              >
                                GIR
                              </button>
                              {h.par >= 4 && (
                                <button
                                  type="button"
                                  className={`sc-fw ${sc?.fairway ? "on" : ""}`}
                                  onClick={() => setHole(h.hole, { fairway: !sc?.fairway })}
                                >
                                  FW
                                </button>
                              )}
                              <span className="sc-topar">
                                {toPar == null ? "" : toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : toPar}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    className="btn-outline"
                    style={{ marginTop: 14 }}
                    onClick={() => setShowStats((v) => !v)}
                  >
                    <Icon name={showStats ? "reset" : "plus"} size={15} />
                    {showStats
                      ? "Runden-Statistik ausblenden"
                      : "Runden-Statistik erfassen"}
                  </button>

                  {showStats && (
                    <div className="round-stats">
                      <label className="field">Löcher</label>
                      <div className="seg">
                        <button
                          type="button"
                          className={holes === 9 ? "active" : ""}
                          onClick={() => setHoles(9)}
                        >
                          9 Löcher
                        </button>
                        <button
                          type="button"
                          className={holes === 18 ? "active" : ""}
                          onClick={() => setHoles(18)}
                        >
                          18 Löcher
                        </button>
                      </div>

                      <div className="tee-grid" style={{ marginTop: 10 }}>
                        <div>
                          <label className="field">Schläge (Score)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={strokes}
                            onChange={(e) => setStrokes(e.target.value)}
                            placeholder={holes === 18 ? "z.B. 84" : "z.B. 42"}
                          />
                        </div>
                        <div>
                          <label className="field">Par</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={coursePar}
                            onChange={(e) => setCoursePar(e.target.value)}
                            placeholder={holes === 18 ? "72" : "36"}
                          />
                        </div>
                      </div>

                      <div className="tee-grid" style={{ marginTop: 10 }}>
                        <div>
                          <label className="field">Fairways getroffen</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={fwHit}
                            onChange={(e) => setFwHit(e.target.value)}
                            placeholder="z.B. 8"
                          />
                        </div>
                        <div>
                          <label className="field">von</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={fwOf}
                            onChange={(e) => setFwOf(e.target.value)}
                            placeholder={holes === 18 ? "14" : "7"}
                          />
                        </div>
                      </div>

                      <div className="tee-grid" style={{ marginTop: 10 }}>
                        <div>
                          <label className="field">Grüns in Reg. (GIR)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={girHit}
                            onChange={(e) => setGirHit(e.target.value)}
                            placeholder="z.B. 9"
                          />
                        </div>
                        <div>
                          <label className="field">Putts gesamt</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={putts}
                            onChange={(e) => setPutts(e.target.value)}
                            placeholder={holes === 18 ? "z.B. 32" : "z.B. 16"}
                          />
                        </div>
                      </div>

                      <div className="tee-grid" style={{ marginTop: 10 }}>
                        <div>
                          <label className="field">Up&amp;Down ✓</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={scrMade}
                            onChange={(e) => setScrMade(e.target.value)}
                            placeholder="z.B. 4"
                          />
                        </div>
                        <div>
                          <label className="field">Up&amp;Down-Versuche</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={scrTries}
                            onChange={(e) => setScrTries(e.target.value)}
                            placeholder="z.B. 7"
                          />
                        </div>
                      </div>

                      <label className="field">Strafschläge</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={penalties}
                        onChange={(e) => setPenalties(e.target.value)}
                        placeholder="z.B. 2"
                      />

                      <div className="sub" style={{ margin: "12px 0 0" }}>
                        Alles optional — was du einträgst, fließt in „Weg zu
                        Scratch" (Verlauf) ein.
                      </div>
                    </div>
                  )}
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
                sessions.map((s) => {
                  const meta = hasRoundStats(s) ? roundMeta(s) : "";
                  return (
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
                        {meta && <div className="s-meta">{meta}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="s-date">{s.date}</div>
                        <button className="btn-ghost" onClick={() => remove(s.id)}>
                          löschen
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            {/* Weg zu Scratch (nur wenn Runden-Stats vorhanden) */}
            <ScratchCard sessions={sessions} />

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
                    {stats.rounds.map((r) => {
                      const meta = hasRoundStats(r) ? roundMeta(r) : "";
                      return (
                        <div className="session-item" key={r.id}>
                          <div>
                            <span className="s-type">
                              {r.score ? `${r.score} Punkte` : "Runde"}
                            </span>
                            <div className="s-notes">{r.notes || "—"}</div>
                            {meta && <div className="s-meta">{meta}</div>}
                          </div>
                          <div className="s-date">{r.date}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {/* Ullersdorf-Verlauf */}
            {ullersdorfRounds.length > 0 && (
              <div className="card">
                <section className="ull-trend">
                  <h2>Ullersdorf — Verlauf</h2>
                  <ul>
                    {ullersdorfRounds.map((s) => {
                      const r = roundStats(s);
                      return (
                        <li key={s.id}>
                          <span>{s.date}</span>
                          <span>
                            {r.holes} Löcher ·{" "}
                            {r.toPar == null
                              ? "—"
                              : r.toPar === 0
                              ? "E"
                              : r.toPar > 0
                              ? `+${r.toPar}`
                              : r.toPar}{" "}
                            zu Par
                          </span>
                          <span>{r.putts != null ? `${r.putts} Putts` : ""}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
