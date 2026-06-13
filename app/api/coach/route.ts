import { NextResponse } from "next/server";
import {
  buildSystemPrompt,
  sanitizeActions,
  ChatMessage,
  CoachContext,
  CoachResponse,
} from "@/lib/coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// GPT-5 / o-Serie sind Reasoning-Modelle: kein temperature-Override,
// max_completion_tokens statt max_tokens.
function isReasoning(model: string): boolean {
  return /^(gpt-5|o\d)/i.test(model);
}

function buildBody(
  model: string,
  system: string,
  history: { role: string; content: string }[]
) {
  const body: Record<string, unknown> = {
    model,
    response_format: { type: "json_object" },
    max_completion_tokens: 6000,
    messages: [{ role: "system", content: system }, ...history],
  };
  if (!isReasoning(model)) body.temperature = 0.4;
  return body;
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json<CoachResponse>({
      reply:
        "Der KI-Coach ist noch nicht eingerichtet. Hinterlege den OPENAI_API_KEY (serverseitig, in Vercel → Settings → Environment Variables), dann bin ich da.",
      actions: [],
      notConfigured: true,
    });
  }

  let body: { messages?: ChatMessage[]; context?: CoachContext };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<CoachResponse>(
      { reply: "Ungültige Anfrage.", actions: [], error: "bad_request" },
      { status: 400 }
    );
  }

  const context = body.context;
  const history = (body.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-14)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 5000) }));

  if (!context || history.length === 0) {
    return NextResponse.json<CoachResponse>(
      { reply: "Mir fehlt der Kontext.", actions: [], error: "no_context" },
      { status: 400 }
    );
  }

  const system = buildSystemPrompt(context);
  // Bestes Modell zuerst, mit Fallback falls nicht freigeschaltet.
  const preferred = process.env.OPENAI_MODEL || "gpt-5";
  const candidates =
    preferred === "gpt-4o" ? ["gpt-4o"] : [preferred, "gpt-4o"];

  let lastStatus = 0;
  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(buildBody(model, system, history)),
      });

      if (!res.ok) {
        lastStatus = res.status;
        const detail = await res.text();
        console.error("[coach] OpenAI", model, res.status, detail.slice(0, 300));
        // Modell nicht verfügbar / falscher Parameter → nächsten Kandidaten testen
        const retriable =
          (res.status === 400 || res.status === 404) && i < candidates.length - 1;
        if (retriable) continue;
        if (res.status === 401)
          return NextResponse.json<CoachResponse>(
            { reply: "Der OPENAI_API_KEY scheint ungültig zu sein.", actions: [], error: "openai_401" },
            { status: 200 }
          );
        if (res.status === 429)
          return NextResponse.json<CoachResponse>(
            { reply: "OpenAI ist gerade ausgelastet oder dein Kontingent ist erschöpft. Gleich nochmal.", actions: [], error: "openai_429" },
            { status: 200 }
          );
        continue; // letzter Kandidat fehlgeschlagen → unten Fehler
      }

      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "{}";
      let reply = "…";
      let actions = sanitizeActions([]);
      try {
        const obj = JSON.parse(content);
        if (typeof obj.reply === "string") reply = obj.reply;
        actions = sanitizeActions(obj.actions);
      } catch {
        reply = content || "…";
      }
      return NextResponse.json<CoachResponse>({ reply, actions });
    } catch (e) {
      console.error("[coach] fetch failed", model, (e as Error).message);
      lastStatus = -1;
    }
  }

  return NextResponse.json<CoachResponse>(
    {
      reply:
        lastStatus === -1
          ? "Verbindung zum Coach fehlgeschlagen. Bist du online?"
          : "Der Coach konnte gerade nicht antworten. Versuch es nochmal.",
      actions: [],
      error: `openai_${lastStatus}`,
    },
    { status: 200 }
  );
}
