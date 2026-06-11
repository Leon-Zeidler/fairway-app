import { NextResponse } from "next/server";
import {
  buildSystemPrompt,
  ChatMessage,
  CoachContext,
  CoachResponse,
} from "@/lib/coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

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
    .slice(-12)
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4000),
    }));

  if (!context || history.length === 0) {
    return NextResponse.json<CoachResponse>(
      { reply: "Mir fehlt der Kontext.", actions: [], error: "no_context" },
      { status: 400 }
    );
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(context) },
          ...history,
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[coach] OpenAI error", res.status, detail.slice(0, 300));
      const msg =
        res.status === 401
          ? "Der OPENAI_API_KEY scheint ungültig zu sein."
          : res.status === 429
            ? "OpenAI ist gerade ausgelastet oder das Kontingent ist erschöpft. Versuch's gleich nochmal."
            : "Der Coach konnte gerade nicht antworten. Versuch es nochmal.";
      return NextResponse.json<CoachResponse>(
        { reply: msg, actions: [], error: `openai_${res.status}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";

    let parsed: CoachResponse;
    try {
      const obj = JSON.parse(content);
      parsed = {
        reply: typeof obj.reply === "string" ? obj.reply : "…",
        actions: Array.isArray(obj.actions) ? obj.actions : [],
      };
    } catch {
      parsed = { reply: content || "…", actions: [] };
    }

    return NextResponse.json<CoachResponse>(parsed);
  } catch (e) {
    console.error("[coach] fetch failed", (e as Error).message);
    return NextResponse.json<CoachResponse>(
      {
        reply: "Verbindung zum Coach fehlgeschlagen. Bist du online?",
        actions: [],
        error: "network",
      },
      { status: 200 }
    );
  }
}
