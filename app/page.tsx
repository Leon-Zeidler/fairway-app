"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Session, SESSION_LABELS, TeeTime } from "@/lib/types";
import { getSessions, computeStreak } from "@/lib/storage";
import { isCloudEnabled } from "@/lib/supabaseClient";
import { useObject } from "@/lib/store";
import { EditableText } from "@/app/components/ui";
import Icon from "@/app/components/Icon";
import { FOCUS, PROFILE, NEXT_STEPS, TEE_TIME } from "@/lib/seed";
import { dayTasks, isoLocal, dowIndex } from "@/lib/plan";

function isThisWeek(dateIso: string): boolean {
  const diff = (Date.now() - new Date(dateIso).getTime()) / 86400000;
  return diff <= 7;
}

function daysUntil(dateIso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function countdownLabel(days: number): string {
  if (days < 0) return "vorbei";
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  return `in ${days} Tagen`;
}

type WeekLog = Record<string, string[]>;

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const profile = useObject("profile", PROFILE);
  const tee = useObject<TeeTime>("teeTime", TEE_TIME);
  const log = useObject<WeekLog>("weekLog", {});

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const streak = computeStreak(sessions);
  const week = sessions.filter((s) => isThisWeek(s.date));
  const ballsWeek = week.reduce((sum, s) => sum + (s.balls || 0), 0);

  // Heutiger Plan aus dem Wochenplan.
  const now = new Date();
  const todayIso = isoLocal(now);
  const todayDow = dowIndex(now);
  const todays = dayTasks(todayDow);
  const doneToday = log.value[todayIso] || [];

  function toggleToday(key: string) {
    const next = doneToday.includes(key)
      ? doneToday.filter((k) => k !== key)
      : [...doneToday, key];
    log.set({ [todayIso]: next });
  }

  const teeDays = daysUntil(tee.value.date);

  return (
    <>
      <header className="topbar">
        <span className={`cloud-pill right ${isCloudEnabled ? "cloud-on" : "cloud-off"}`}>
          {isCloudEnabled ? "Sync aktiv" : "Lokal"}
        </span>
        <h1>Fairway</h1>
        <div className="tag">
          {now.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </header>

      <div className="container">
        {/* Aktueller Fokus */}
        <div className="mantra">
          <div className="small">Dein Fokus</div>
          <div className="big">{FOCUS.title}</div>
          <div className="why">{FOCUS.why}</div>
          {FOCUS.cues.map((c) => (
            <div className="cue" key={c}>
              {c}
            </div>
          ))}
        </div>

        {/* Heute dran */}
        <div className="card">
          <h2>Heute dran</h2>
          <div className="sub">
            Dein Plan für heute — abhaken, wenn erledigt. Zählt automatisch in
            der Wochen-Übersicht.
          </div>
          {todays.map((a) => {
            const on = doneToday.includes(a.key);
            return (
              <div className={`task-row ${on ? "done" : ""}`} key={a.key}>
                <div className="task-info">
                  <div className="task-name">{a.title}</div>
                  <div className="task-desc">{a.desc}</div>
                  {a.href && !on && (
                    <Link href={a.href} className="demo-link">
                      Zum Programm <Icon name="chevron" size={12} />
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  className={`day-check ${on ? "on" : ""}`}
                  aria-label={`${a.title} erledigt`}
                  onClick={() => toggleToday(a.key)}
                >
                  ✓
                </button>
              </div>
            );
          })}
          <Link href="/training" className="btn btn-cta">
            Zum Training
            <span className="btn-icon">
              <Icon name="chevron" size={16} />
            </span>
          </Link>
        </div>

        {/* Turnier-Countdown */}
        {(tee.value.date || tee.value.name) && (
          <Link
            href="/turnier"
            className="card"
            style={{ display: "block", textDecoration: "none" }}
          >
            <h2>Nächstes Turnier</h2>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>
                  {tee.value.name || "Turnier"}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {tee.value.date}
                  {tee.value.time ? ` · Tee Time ${tee.value.time} Uhr` : ""}
                </div>
              </div>
              {teeDays != null && teeDays >= 0 && (
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>
                  {countdownLabel(teeDays)}
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Wochen-Stats */}
        <div className="card">
          <h2>Diese Woche</h2>
          <div className="stats-row">
            <div className="stat">
              <div className="num">{streak}</div>
              <div className="lbl">Tage Streak</div>
            </div>
            <div className="stat">
              <div className="num">{week.length}</div>
              <div className="lbl">Sessions</div>
            </div>
            <div className="stat">
              <div className="num">{ballsWeek}</div>
              <div className="lbl">Bälle</div>
            </div>
          </div>
        </div>

        {/* Letzte Sessions */}
        <div className="card">
          <h2>Letzte Sessions</h2>
          {loading ? (
            <div className="empty">Lädt…</div>
          ) : sessions.length === 0 ? (
            <div className="empty">
              Noch nichts geloggt.
              <br />
              Range, Runde oder Gym — log es im Journal.
            </div>
          ) : (
            sessions.slice(0, 3).map((s) => (
              <div className="session-item" key={s.id}>
                <div>
                  <span className="s-type">{SESSION_LABELS[s.type]}</span>
                  <div className="s-notes">{s.notes || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="s-date">{s.date}</div>
                  <div className="s-meta">
                    {s.balls ? `${s.balls} Bälle` : ""}
                    {s.score ? ` · ${s.score}` : ""}
                    {" · "}
                    {"★".repeat(s.rating)}
                  </div>
                </div>
              </div>
            ))
          )}
          <Link href="/journal" className="btn btn-cta">
            Session loggen
            <span className="btn-icon">
              <Icon name="chevron" size={16} />
            </span>
          </Link>
        </div>

        {/* Profil */}
        <div className="card">
          <h2>Profil</h2>
          <div className="profile-grid">
            <div>
              <div className="k">Handicap</div>
              <div className="v">
                <EditableText
                  value={profile.value.hcp}
                  onChange={(v) => profile.set({ hcp: v })}
                />
              </div>
            </div>
            <div>
              <div className="k">Ziel</div>
              <div className="v">
                <EditableText
                  value={profile.value.hcpGoal}
                  onChange={(v) => profile.set({ hcpGoal: v })}
                />
              </div>
            </div>
            <div>
              <div className="k">Schwung</div>
              <div className="v">
                <EditableText
                  value={profile.value.swingSpeed}
                  onChange={(v) => profile.set({ swingSpeed: v })}
                />
              </div>
            </div>
            <div>
              <div className="k">Niveau</div>
              <div className="v">
                <EditableText
                  value={profile.value.level}
                  onChange={(v) => profile.set({ level: v })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Nächste Schritte (kuratiert) */}
        <div className="card">
          <h2>Nächste Schritte</h2>
          {NEXT_STEPS.map((s) => (
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
