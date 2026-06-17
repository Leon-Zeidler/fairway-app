import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

interface ExtractBody {
  image?: string; // data URL
  pdf?: string;   // data URL
  text?: string;  // CSV/Klartext
}

interface ExtractResult {
  clubs: unknown[];
  sourceUnit: "m" | "yd";
  warnings: string[];
}

const SYSTEM = `Du extrahierst Golf-Launch-Monitor-Daten (Trackman) aus dem Material des Nutzers (Foto/Screenshot, PDF-Report oder CSV-Text).
Gib pro Schläger die DURCHSCHNITTSWERTE zurück, die der Report zeigt. Ist es eine rohe Schussliste, bilde je Schläger den Durchschnitt.
Antworte AUSSCHLIESSLICH als JSON in genau dieser Form:
{"clubs":[{"club":"7 Iron","carry":146,"shots":12,"clubSpeed":86,"ballSpeed":118,"smash":1.37,"launch":18.2,"spin":6500,"attackAngle":-2.1,"clubPath":3.4,"faceAngle":1.1,"faceToPath":-2.3}],"sourceUnit":"m","warnings":[]}
Regeln:
- "carry": Carry-Distanz als Zahl in der Einheit des Reports. Setze "sourceUnit" auf "m" oder "yd" je nach Report (Yards bei US-Reports). Rechne NICHT selbst um.
- Nur Felder angeben, die wirklich ablesbar sind; unbekannte weglassen. "club" und "carry" sind Pflicht — Schläger ohne Carry weglassen.
- "shots": Anzahl Schüsse, falls ablesbar, sonst weglassen.
- Findest du nichts Verwertbares: {"clubs":[],"sourceUnit":"m","warnings":["kurzer Grund"]}.
Kein Text außerhalb des JSON.`;

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json<ExtractResult>({ clubs: [], sourceUnit: "m", warnings: ["KI nicht eingerichtet (OPENAI_API_KEY fehlt)"] });
  }

  let body: ExtractBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ExtractResult>({ clubs: [], sourceUnit: "m", warnings: ["Ungültige Anfrage"] }, { status: 400 });
  }

  const { image, pdf, text } = body;
  if (!image && !pdf && !text) {
    return NextResponse.json<ExtractResult>({ clubs: [], sourceUnit: "m", warnings: ["Keine Daten erhalten"] }, { status: 400 });
  }

  const content: Part[] = [{ type: "text", text: "Extrahiere die Schläger-Daten aus dem Folgenden." }];
  if (image) content.push({ type: "image_url", image_url: { url: image } });
  if (pdf) content.push({ type: "file", file: { filename: "report.pdf", file_data: pdf } });
  if (text) content.push({ type: "text", text: "CSV/Text:\n" + text.slice(0, 20000) });

  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o";

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0,
        max_completion_tokens: 2000,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[trackman-extract] OpenAI", res.status, detail.slice(0, 300));
      return NextResponse.json<ExtractResult>({ clubs: [], sourceUnit: "m", warnings: [`KI-Fehler (${res.status})`] });
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "{}";
    let obj: Record<string, unknown> = {};
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = {};
    }
    const clubs = Array.isArray(obj.clubs) ? (obj.clubs as unknown[]) : [];
    const sourceUnit = obj.sourceUnit === "yd" ? "yd" : "m";
    const warnings = Array.isArray(obj.warnings)
      ? (obj.warnings as unknown[]).filter((w): w is string => typeof w === "string")
      : [];
    return NextResponse.json<ExtractResult>({ clubs, sourceUnit, warnings });
  } catch (e) {
    console.error("[trackman-extract] fetch failed", (e as Error).message);
    return NextResponse.json<ExtractResult>({ clubs: [], sourceUnit: "m", warnings: ["Verbindung zur KI fehlgeschlagen"] });
  }
}
