"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Session, SESSION_LABELS } from "@/lib/types";
import { getSessions, computeStreak } from "@/lib/storage";
import { isCloudEnabled } from "@/lib/supabaseClient";
import { useObject, useStringList } from "@/lib/store";
import { EditableText, EditableList } from "@/app/components/ui";
import Icon from "@/app/components/Icon";
import { TeeTime } from "@/lib/types";
import { MANTRA, PROFILE, NEXT_STEPS, TEE_TIME } from "@/lib/seed";

function isThisWeek(dateIso: string): boolean {
  const diff = (Date.now() - new Date(dateIso).getTime()) / 86400000;
  return diff <= 7;
}

/** Tage bis zum Turnier (heute = 0), oder null wenn kein/ungültiges Datum. */
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

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const profile = useObject("profile", PROFILE);
  const nextSteps = useStringList("nextSteps", NEXT_STEPS);
  const tee = useObject<TeeTime>("teeTime", TEE_TIME);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const streak = computeStreak(sessions);
  const week = sessions.filter((s) => isThisWeek(s.date));
  const ballsWeek = week.reduce((sum, s) => sum + (s.balls || 0), 0);

  return (
    <>
      <header className="topbar">
        <span
          className={`cloud-pill right ${isCloudEnabled ? "cloud-on" : "cloud-off"}`}
        >
          {isCloudEnabled ? "Cloud-Sync aktiv" : "Lokal gespeichert"}
        </span>
        <h1>Fairway</h1>
        <div className="tag">Golf-Training & Turnier-Tracking</div>
      </header>

      <div className="container">
        <div className="mantra">
          <div className="small">AKTUELLER FOKUS</div>
          <div className="big">{MANTRA}</div>
        </div>

        {(tee.value.date || tee.value.name) &&
          (() => {
            const days = daysUntil(tee.value.date);
            return (
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
                    <div style={{ fontSize: 17, fontWeight: 700 }}>
                      {tee.value.name || "Turnier"}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      {tee.value.date}
                      {tee.value.time ? ` · Tee Time ${tee.value.time} Uhr` : ""}
                    </div>
                  </div>
                  {days != null && (
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}
                      >
                        {days < 0 ? "—" : countdownLabel(days)}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })()}

        <div className="card">
          <h2>Diese Woche</h2>
          <div className="stats-row">
            <div className="stat">
              <div className="num">{streak}</div>
              <div className="lbl">Tage Streak</div>
            </div>
            <div className="stat">
              <div className="num">{week.length}</div>
              <div className="lbl">Sessions (7T)</div>
            </div>
            <div className="stat">
              <div className="num">{ballsWeek}</div>
              <div className="lbl">Bälle (7T)</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Spieler-Profil</h2>
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
              <div className="k">Ziel-HCP</div>
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

        <div className="card">
          <h2>Letzte Sessions</h2>
          {loading ? (
            <div className="empty">Lädt…</div>
          ) : sessions.length === 0 ? (
            <div className="empty">
              Noch nichts geloggt.
              <br />
              Starte mit deiner ersten Session.
            </div>
          ) : (
            sessions.slice(0, 4).map((s) => (
              <div className="session-item" key={s.id}>
                <div>
                  <span className="s-type">{SESSION_LABELS[s.type]}</span>
                  <div className="s-notes">{s.notes || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="s-date">{s.date}</div>
                  <div className="s-meta">
                    {s.balls ? `${s.balls} Bälle` : ""}
                    {s.score ? ` · ${s.score} Pkt` : ""}
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

        <div className="card">
          <h2>Nächste Schritte</h2>
          <EditableList list={nextSteps} addLabel="Schritt" />
        </div>

        <div className="row-actions" style={{ justifyContent: "center" }}>
          <Link href="/training" className="btn-outline">
            <Icon name="training" size={16} /> Training
          </Link>
          <Link href="/bag" className="btn-outline">
            <Icon name="bag" size={16} /> Bag
          </Link>
          <Link href="/turnier" className="btn-outline">
            <Icon name="trophy" size={16} /> Turnier
          </Link>
        </div>
      </div>
    </>
  );
}
