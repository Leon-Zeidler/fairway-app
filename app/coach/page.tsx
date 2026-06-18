"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Club,
  EquipItem,
  Focus,
  GearItem,
  Profile,
  Session,
  Step,
  TeeTime,
} from "@/lib/types";
import { useCollection, useObject, useStringList, uid } from "@/lib/store";
import { getSessions, addSession, deleteSession } from "@/lib/storage";
import {
  CLUBS,
  EQUIPMENT,
  FOCUS,
  GEAR,
  NEXT_STEPS,
  PROFILE,
  TEE_TIME,
  WARMUP,
  INSIGHTS,
  MENTAL_CHECK,
} from "@/lib/seed";
import { PLAN, isoLocal, mondayOf } from "@/lib/plan";
import {
  programsForContext,
  resolveProgram,
  ProgramOverrides,
} from "@/lib/programs";
import {
  ChatMessage,
  CoachAction,
  CoachContext,
  CoachResponse,
  ClubProposal,
  TrackmanHistoryEntry,
  describeAction,
  roundInsightsFrom,
} from "@/lib/coach";
import { COURSES } from "@/lib/courses";
import {
  parseTrackmanCsv,
  summarizeSession,
  normalizeClubName,
  buildExtractedSummary,
  TrackmanSummary,
  TrackmanSession,
  ExtractedClub,
} from "@/lib/trackman";
import Icon from "@/app/components/Icon";

interface UndoToken {
  snapshot: {
    focus: Focus;
    plan: Record<string, number[]>;
    profile: Profile;
    tee: TeeTime;
    nextSteps: string[];
    clubs: Club[];
    equip: EquipItem[];
    weekLog: Record<string, string[]>;
    overrides: ProgramOverrides;
    gear: GearItem[];
  };
  createdSessions: string[];
}

interface Msg extends ChatMessage {
  actions?: CoachAction[];
  undo?: UndoToken;
  undone?: boolean;
  clubProposals?: ClubProposal[]; // Trackman: zur Bestätigung
  trackman?: boolean;             // markiert eine Trackman-Antwort
  applied?: boolean;              // Karte bereits übernommen
}

const SUGGESTIONS = [
  "Wie fühlt sich mein Training gerade an? Woran soll ich arbeiten?",
  "Mein Slice war heute schlimm — was tun?",
  "Pass meinen Wochenplan an, ich hab nur 3 Tage Zeit.",
  "Welchen Schläger nehme ich vom engen Tee?",
];

/** Globalen (über alle Sections fortlaufenden) Step-Index lokalisieren. */
function locateStep(
  sections: { steps: unknown[] }[],
  index: number
): { si: number; i: number } | null {
  let n = index;
  for (let si = 0; si < sections.length; si++) {
    if (n < sections[si].steps.length) return { si, i: n };
    n -= sections[si].steps.length;
  }
  return null;
}

/** Liest eine Datei als Data-URL (base64). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Verkleinert ein Bild (längste Kante <= maxDim) als JPEG, um Upload/Kosten zu senken. */
async function downscaleImage(dataUrl: string, maxDim = 1600): Promise<string> {
  try {
    const img = document.createElement("img");
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("img load failed"));
      img.src = dataUrl;
    });
    const longest = Math.max(img.width, img.height);
    const scale = longest > maxDim ? maxDim / longest : 1;
    if (scale >= 1) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return dataUrl;
  }
}

/** Ruft /api/trackman auf und baut eine TrackmanSummary; null nur bei Netz-/Parsefehler. */
async function extractViaApi(payload: {
  image?: string;
  pdf?: string;
  text?: string;
}): Promise<TrackmanSummary | null> {
  try {
    const res = await fetch("/api/trackman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data || !Array.isArray(data.clubs)) return null;
    const sourceUnit = data.sourceUnit === "yd" ? "yd" : "m";
    const warnings = Array.isArray(data.warnings) ? (data.warnings as string[]) : [];
    return buildExtractedSummary(data.clubs as ExtractedClub[], sourceUnit, warnings);
  } catch {
    return null;
  }
}

function TrackmanCard({
  msg,
  index,
  currentDistance,
  trendFor,
  onApply,
  onUndo,
}: {
  msg: Msg;
  index: number;
  currentDistance: (name: string) => string;
  trendFor: (name: string) => number[];
  onApply: (index: number, picks: ClubProposal[], acts: CoachAction[]) => void;
  onUndo: (index: number, token: UndoToken) => void;
}) {
  const proposals = msg.clubProposals ?? [];
  const acts = msg.actions ?? [];
  const [pick, setPick] = useState<boolean[]>(() => proposals.map(() => true));
  const [pickAct, setPickAct] = useState<boolean[]>(() => acts.map(() => true));
  if (!proposals.length && !acts.length) return null;

  if (msg.applied) {
    return (
      <div className="tm-card done">
        <div className="ca-title">{msg.undone ? "Rückgängig gemacht" : "✓ Übernommen"}</div>
        {msg.undo && (
          <button className="ca-undo" type="button" onClick={() => onUndo(index, msg.undo!)}>
            <Icon name="reset" size={14} /> Rückgängig
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="tm-card">
      <div className="ca-title">Vorschlag — du bestätigst</div>
      {proposals.map((p, i) => {
        const trend = trendFor(p.name);
        return (
          <label className="tm-row" key={i}>
            <input
              type="checkbox"
              checked={pick[i]}
              onChange={() => setPick((a) => a.map((v, j) => (j === i ? !v : v)))}
            />
            <span className="tm-club">{p.name}</span>
            <span className="tm-delta">
              {currentDistance(p.name)} → <b>{p.newDistance}</b>
            </span>
            {p.reason && <span className="tm-reason">{p.reason}</span>}
            {trend.length > 1 && (
              <span className="tm-trend">{trend.join(" → ")} m</span>
            )}
          </label>
        );
      })}
      {acts.map((a, i) => (
        <label className="tm-row" key={`a${i}`}>
          <input
            type="checkbox"
            checked={pickAct[i]}
            onChange={() => setPickAct((x) => x.map((v, j) => (j === i ? !v : v)))}
          />
          <span className="tm-act">
            <Icon name="target" size={12} /> {describeAction(a)}
          </span>
        </label>
      ))}
      <button
        className="tm-apply"
        type="button"
        onClick={() =>
          onApply(
            index,
            proposals.filter((_, i) => pick[i]),
            acts.filter((_, i) => pickAct[i])
          )
        }
      >
        Übernehmen
      </button>
    </div>
  );
}

export default function Coach() {
  const focus = useObject<Focus>("focus", FOCUS);
  const plan = useObject<Record<string, number[]>>("plan", PLAN);
  const profile = useObject<Profile>("profile", PROFILE);
  const tee = useObject<TeeTime>("teeTime", TEE_TIME);
  const equip = useCollection<EquipItem>("equipment2", EQUIPMENT);
  const clubs = useCollection<Club>("clubs", CLUBS);
  const nextSteps = useStringList("nextSteps", NEXT_STEPS);
  const weekLog = useObject<Record<string, string[]>>("weekLog", {});
  const overrides = useObject<ProgramOverrides>("programOverrides", {});
  const gear = useCollection<GearItem>("gear", GEAR);
  const trackman = useCollection<TrackmanSession>("trackmanSessions", []);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSessions().then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  function buildContext(): CoachContext {
    const monday = mondayOf(0);
    const weekIsos = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return isoLocal(d);
    });
    const weekDone: Record<string, number> = {};
    weekIsos.forEach((iso) => {
      (weekLog.value[iso] || []).forEach((k) => {
        weekDone[k] = (weekDone[k] || 0) + 1;
      });
    });

    return {
      profile: profile.value,
      focus: focus.value,
      plan: plan.value,
      clubs: clubs.items.map((c) => ({ name: c.name, distance: c.distance })),
      equipment: equip.items.map((e) => ({
        category: e.category,
        name: e.name,
        status: e.status,
        available: e.available !== false,
      })),
      gear: gear.items.map((g) => ({
        id: g.id,
        label: g.label,
        group: g.group,
        available: g.available,
      })),
      nextSteps: nextSteps.items,
      recentSessions: sessions.slice(0, 12).map((s) => ({
        date: s.date,
        type: s.type,
        balls: s.balls,
        score: s.score,
        rating: s.rating,
        notes: s.notes,
      })),
      weekDone,
      teeTime: tee.value,
      programs: programsForContext(overrides.value),
      warmup: WARMUP.map((w) => ({
        club: w.club,
        balls: w.balls,
        detail: w.detail,
      })),
      insights: INSIGHTS,
      mentalCheck: MENTAL_CHECK,
      today: new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      roundInsights: roundInsightsFrom(
        sessions,
        COURSES,
        parseFloat(profile.value.hcp)
      ),
    };
  }

  async function send(
    text: string,
    tm?: { upload: TrackmanSummary; history: TrackmanHistoryEntry[] }
  ) {
    const clean = text.trim();
    if ((!clean && !tm) || loading) return;
    const userContent =
      clean ||
      "📊 Trackman-Session hochgeladen — analysier sie und pass meine Distanzen an.";
    const next: Msg[] = [...msgs, { role: "user", content: userContent }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: {
            ...buildContext(),
            ...(tm ? { trackmanUpload: tm.upload, trackmanHistory: tm.history } : {}),
          },
        }),
      });
      const data: CoachResponse = await res.json();
      const acts = data.actions?.length ? data.actions : undefined;
      const proposals = data.clubProposals?.length ? data.clubProposals : undefined;
      if (tm) {
        // Trackman: nichts auto-übernehmen — alles wandert in die Bestätigungs-Karte
        setMsgs((m) => [
          ...m,
          { role: "assistant", content: data.reply, clubProposals: proposals, actions: acts, trackman: true },
        ]);
      } else {
        const undo = acts ? applyNow(acts) : undefined;
        setMsgs((m) => [
          ...m,
          { role: "assistant", content: data.reply, actions: acts, undo },
        ]);
      }
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Verbindung fehlgeschlagen — nochmal?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /** Baut die kompakte Verlauf-Historie (kanonische Schlüssel) für den KI-Kontext. */
  function buildTrackmanHistory(): TrackmanHistoryEntry[] {
    return trackman.items.slice(-6).map((s) => {
      const carryByClub: Record<string, number> = {};
      for (const c of s.summary.clubs) carryByClub[normalizeClubName(c.club)] = c.carryAvg;
      const speeds = s.summary.clubs
        .map((c) => c.clubSpeed)
        .filter((v): v is number => typeof v === "number");
      return {
        date: s.date,
        carryByClub,
        clubSpeedAvg: speeds.length
          ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10
          : undefined,
      };
    });
  }

  /** Datei-Upload: CSV/PDF/Bild lesen, Daten extrahieren, Session speichern, Analyse anstoßen. */
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // gleiche Datei erneut wählbar
    if (!file || loading || extracting) return;

    const name = file.name.toLowerCase();
    const isCsv = file.type.includes("csv") || name.endsWith(".csv");
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isCsv && !isPdf && !isImage) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Dieses Format kann ich nicht lesen — nimm eine CSV, ein PDF oder einen Screenshot/Foto." },
      ]);
      return;
    }
    if (isPdf && file.size > 3.6 * 1024 * 1024) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Das PDF ist zu groß (über ~3,5 MB). Mach am besten einen Screenshot der Trackman-Übersicht — das liest sich zuverlässiger." },
      ]);
      return;
    }

    setExtracting(true);
    let summary: TrackmanSummary | null = null;
    try {
      if (isCsv) {
        const text = await file.text();
        const parsed = summarizeSession(parseTrackmanCsv(text));
        // Parser zuerst (präzise/gratis); findet er nichts → KI liest den CSV-Text.
        summary = parsed.clubs.length ? parsed : await extractViaApi({ text: text.slice(0, 20000) });
      } else if (isImage) {
        const dataUrl = await downscaleImage(await fileToDataUrl(file));
        summary = await extractViaApi({ image: dataUrl });
      } else {
        const dataUrl = await fileToDataUrl(file);
        summary = await extractViaApi({ pdf: dataUrl });
      }
    } catch {
      summary = null;
    } finally {
      setExtracting(false);
    }

    if (!summary || !summary.clubs.length) {
      const warn = summary?.warnings?.length ? " (" + summary.warnings.join("; ") + ")" : "";
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Ich konnte daraus keine Schläger-Daten lesen." + warn + " Tipp: ein scharfer Screenshot der Trackman-Übersicht klappt am besten." },
      ]);
      return;
    }

    const history = buildTrackmanHistory(); // VOR dem Speichern → ohne die neue Session
    trackman.add({
      id: uid("tm"),
      date: isoLocal(new Date()),
      summary,
      createdAt: new Date().toISOString(),
    });
    void send(input, { upload: summary, history });
  }

  function snapshot(): UndoToken["snapshot"] {
    return {
      focus: focus.value,
      plan: plan.value,
      profile: profile.value,
      tee: tee.value,
      nextSteps: nextSteps.items,
      clubs: clubs.items,
      equip: equip.items,
      weekLog: weekLog.value,
      overrides: overrides.value,
      gear: gear.items,
    };
  }

  function applyNow(actions: CoachAction[]): UndoToken {
    const snap = snapshot();
    const createdSessions: string[] = [];
    actions.forEach((a) => applyOne(a, createdSessions));
    return { snapshot: snap, createdSessions };
  }

  /** Übernimmt die abgehakten Distanz-Vorschläge + Aktionen einer Trackman-Karte. */
  function applyProposals(index: number, picks: ClubProposal[], acts: CoachAction[]) {
    const snap = snapshot();
    const created: string[] = [];
    for (const p of picks) {
      const needle = normalizeClubName(p.name);
      const club = clubs.items.find((c) => normalizeClubName(c.name) === needle);
      if (club) clubs.update(club.id, { distance: p.newDistance });
    }
    acts.forEach((a) => applyOne(a, created));
    const token: UndoToken = { snapshot: snap, createdSessions: created };
    setMsgs((m) =>
      m.map((x, i) => (i === index ? { ...x, applied: true, undo: token } : x))
    );
  }

  function undo(index: number, token: UndoToken) {
    const s = token.snapshot;
    focus.replace(s.focus);
    plan.replace(s.plan);
    profile.replace(s.profile);
    tee.replace(s.tee);
    nextSteps.setAll(s.nextSteps);
    clubs.setAll(s.clubs);
    equip.setAll(s.equip);
    weekLog.replace(s.weekLog);
    overrides.replace(s.overrides);
    gear.setAll(s.gear);
    token.createdSessions.forEach((id) => void deleteSession(id));
    setMsgs((m) =>
      m.map((x, i) => (i === index ? { ...x, undone: true, undo: undefined } : x))
    );
  }

  function applyOne(a: CoachAction, created: string[]) {
    switch (a.type) {
      case "set_focus":
        focus.set({
          ...(a.title !== undefined ? { title: a.title } : {}),
          ...(a.why !== undefined ? { why: a.why } : {}),
          ...(a.cues !== undefined ? { cues: a.cues } : {}),
        });
        break;
      case "set_plan":
        plan.set({ [a.activity]: a.days });
        break;
      case "set_equipment": {
        const needle = a.match.toLowerCase();
        const item = equip.items.find(
          (e) =>
            e.category.toLowerCase().includes(needle) ||
            e.name.toLowerCase().includes(needle) ||
            (e.routineTag ?? "").toLowerCase().includes(needle)
        );
        if (item) {
          equip.update(item.id, {
            ...(a.status !== undefined ? { status: a.status } : {}),
            ...(a.available !== undefined ? { available: a.available } : {}),
            ...(a.note !== undefined ? { note: a.note } : {}),
          });
        }
        break;
      }
      case "set_profile":
        profile.set({
          ...(a.hcp !== undefined ? { hcp: a.hcp } : {}),
          ...(a.hcpGoal !== undefined ? { hcpGoal: a.hcpGoal } : {}),
          ...(a.swingSpeed !== undefined ? { swingSpeed: a.swingSpeed } : {}),
          ...(a.level !== undefined ? { level: a.level } : {}),
        });
        break;
      case "set_tee_time":
        tee.set({
          ...(a.name !== undefined ? { name: a.name } : {}),
          ...(a.date !== undefined ? { date: a.date } : {}),
          ...(a.time !== undefined ? { time: a.time } : {}),
        });
        break;
      case "set_next_steps":
        nextSteps.setAll(a.items);
        break;
      case "add_next_step":
        nextSteps.setAll([...nextSteps.items, a.item]);
        break;
      case "set_club": {
        const needle = a.name.toLowerCase();
        const club = clubs.items.find((c) =>
          c.name.toLowerCase().includes(needle)
        );
        if (club) clubs.update(club.id, { distance: a.distance });
        break;
      }
      case "log_session": {
        const id = uid("s");
        created.push(id);
        void addSession({
          id,
          date: isoLocal(new Date()),
          type: a.sessionType,
          rating: a.rating ?? 3,
          drills: [],
          balls: a.balls,
          score: a.score,
          notes: a.notes,
          createdAt: new Date().toISOString(),
          user_id: null,
        });
        break;
      }
      case "complete_today": {
        const today = isoLocal(new Date());
        const cur = weekLog.value[today] || [];
        const merged = Array.from(new Set([...cur, ...a.activities]));
        weekLog.set({ [today]: merged });
        break;
      }
      case "set_program":
        overrides.set({
          [a.id]: {
            title: a.title,
            focus: a.focus,
            sections: a.sections.map((s) => ({ title: s.title, steps: [...s.steps] })),
          },
        });
        break;
      case "add_program_step": {
        const resolved = resolveProgram(a.id, overrides.value);
        if (resolved) {
          const sections = resolved.sections.map((s) => ({
            ...s,
            steps: [...s.steps],
          }));
          if (sections.length) sections[sections.length - 1].steps.push(a.step);
          else sections.push({ steps: [a.step] });
          overrides.set({ [a.id]: { ...overrides.value[a.id], sections } });
        }
        break;
      }
      case "edit_program_step": {
        const resolved = resolveProgram(a.id, overrides.value);
        if (resolved) {
          const sections = resolved.sections.map((s) => ({
            ...s,
            steps: [...s.steps],
          }));
          const loc = locateStep(sections, a.index);
          if (loc) {
            const cur = sections[loc.si].steps[loc.i];
            const patch: Step = { ...cur };
            if (a.name !== undefined) patch.name = a.name;
            if (a.detail !== undefined) patch.detail = a.detail;
            if (a.club !== undefined) patch.club = a.club;
            if (a.dose !== undefined) patch.dose = a.dose;
            if (a.gear !== undefined) patch.gear = a.gear;
            sections[loc.si].steps[loc.i] = patch;
            overrides.set({ [a.id]: { ...overrides.value[a.id], sections } });
          }
        }
        break;
      }
      case "remove_program_step": {
        const resolved = resolveProgram(a.id, overrides.value);
        if (resolved) {
          const sections = resolved.sections.map((s) => ({
            ...s,
            steps: [...s.steps],
          }));
          const loc = locateStep(sections, a.index);
          if (loc) {
            sections[loc.si].steps.splice(loc.i, 1);
            overrides.set({ [a.id]: { ...overrides.value[a.id], sections } });
          }
        }
        break;
      }
      case "set_gear": {
        const needle = a.match.toLowerCase();
        const item = gear.items.find(
          (g) =>
            g.id.toLowerCase().includes(needle) ||
            g.label.toLowerCase().includes(needle)
        );
        if (item) gear.update(item.id, { available: a.available });
        break;
      }
    }
  }

  return (
    <>
      <header className="topbar">
        <h1>Coach</h1>
        <div className="tag">Dein KI-Golfcoach — frag alles</div>
      </header>

      <div className="container coach-pad">
        {msgs.length === 0 && (
          <div className="card">
            <h2>Wie kann ich helfen?</h2>
            <div className="sub">
              Erzähl mir, wie's läuft oder was du brauchst. Ich kenne dein Bag,
              deinen Plan und deine letzten Sessions — und passe sie auf Wunsch
              direkt an. Tipp: 📎 lädt Trackman-Daten hoch — CSV, PDF oder ein
              Screenshot/Foto deiner Range-Übersicht. Ich lese die Distanzen aus
              und passe deine Bag an.
            </div>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="suggest"
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="chat">
          {msgs.map((m, i) => (
            <div key={i} className="chat-block">
              <div className={`chat-msg ${m.role === "user" ? "user" : "ai"}`}>
                {m.content}
              </div>
              {m.actions && !m.trackman && (
                <div className={`chat-actions ${m.undone ? "undone" : ""}`}>
                  <div className="ca-title">
                    {m.undone ? "Rückgängig gemacht" : "✓ Automatisch übernommen"}
                  </div>
                  {m.actions.map((a, j) => (
                    <div className="ca-item" key={j}>
                      <Icon name="target" size={12} /> {describeAction(a)}
                    </div>
                  ))}
                  {!m.undone && m.undo && (
                    <button
                      type="button"
                      className="ca-undo"
                      onClick={() => undo(i, m.undo!)}
                    >
                      <Icon name="reset" size={14} /> Rückgängig
                    </button>
                  )}
                </div>
              )}
              {m.trackman && (
                <TrackmanCard
                  msg={m}
                  index={i}
                  currentDistance={(n) =>
                    clubs.items.find(
                      (c) => normalizeClubName(c.name) === normalizeClubName(n)
                    )?.distance ?? "—"
                  }
                  trendFor={(n) => {
                    const key = normalizeClubName(n);
                    return trackman.items
                      .map((s) => s.summary.clubs.find((c) => normalizeClubName(c.club) === key)?.carryAvg)
                      .filter((v): v is number => typeof v === "number")
                      .slice(-4);
                  }}
                  onApply={applyProposals}
                  onUndo={undo}
                />
              )}
            </div>
          ))}
          {(loading || extracting) && (
            <div className="chat-msg ai typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="composer">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,image/*,application/pdf"
          hidden
          onChange={onFile}
        />
        <button
          type="button"
          className="composer-attach"
          aria-label="Trackman-Daten hochladen (CSV, PDF oder Foto)"
          disabled={loading || extracting}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="upload" size={20} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frag deinen Coach…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
        />
        <button
          type="button"
          className="composer-send"
          aria-label="Senden"
          disabled={!input.trim() || loading || extracting}
          onClick={() => send(input)}
        >
          <Icon name="chevron" size={20} />
        </button>
      </div>
    </>
  );
}
