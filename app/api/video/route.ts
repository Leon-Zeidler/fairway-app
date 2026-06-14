import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://www.googleapis.com/youtube/v3/search";

interface VideoResult {
  videoId?: string;
  title?: string;
  notConfigured?: boolean;
  error?: string;
}

// Findet das beste, einbettbare Video zu einer Übung über die offizielle
// YouTube Data API. Der Key bleibt serverseitig (YOUTUBE_API_KEY).
export async function GET(req: Request) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json<VideoResult>({ notConfigured: true });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json<VideoResult>({ error: "no_query" }, { status: 400 });
  }

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    safeSearch: "strict",
    maxResults: "1",
    q,
    key,
  });

  try {
    const res = await fetch(`${API}?${params.toString()}`);
    if (!res.ok) {
      const detail = await res.text();
      console.error("[video] YouTube API", res.status, detail.slice(0, 200));
      return NextResponse.json<VideoResult>(
        { error: `youtube_${res.status}` },
        { status: 200 }
      );
    }
    const data = await res.json();
    const item = data?.items?.[0];
    const videoId: string | undefined = item?.id?.videoId;
    if (!videoId) {
      return NextResponse.json<VideoResult>({ error: "no_result" });
    }
    return NextResponse.json<VideoResult>({
      videoId,
      title: item?.snippet?.title,
    });
  } catch (e) {
    console.error("[video] fetch failed", (e as Error).message);
    return NextResponse.json<VideoResult>({ error: "network" }, { status: 200 });
  }
}
