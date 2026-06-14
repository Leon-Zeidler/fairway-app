"use client";

import { useState } from "react";
import { useObject } from "@/lib/store";
import Icon from "./Icon";

/** „Video ansehen" — öffnet ein Inline-Overlay mit dem passenden YouTube-Clip.
 *  Mit YOUTUBE_API_KEY läuft das Video direkt auf der Seite; ohne Key (oder
 *  ohne Treffer) erscheint ein „Auf YouTube öffnen"-Fallback. */
export function ExerciseVideo({ query }: { query: string }) {
  const cache = useObject<Record<string, string>>("videoCache", {});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  const searchUrl =
    "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);

  async function openModal() {
    setOpen(true);
    const cached = cache.value[query];
    if (cached) {
      setVideoId(cached);
      setFallback(false);
      return;
    }
    setLoading(true);
    setVideoId(null);
    setFallback(false);
    try {
      const res = await fetch("/api/video?q=" + encodeURIComponent(query));
      const data = await res.json();
      if (data?.videoId) {
        setVideoId(data.videoId);
        cache.set({ [query]: data.videoId });
      } else {
        setFallback(true);
      }
    } catch {
      setFallback(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="demo-link" onClick={openModal}>
        <Icon name="play" size={14} /> Video ansehen
      </button>

      {open && (
        <div className="video-overlay" onClick={() => setOpen(false)}>
          <div className="video-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="video-close"
              aria-label="Schließen"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            {loading && <div className="video-loading">Suche Video…</div>}
            {videoId && (
              <div className="video-frame">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="Übungsvideo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {fallback && (
              <div className="video-fallback">
                <p>Kein eingebettetes Video verfügbar.</p>
                <a
                  className="btn"
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Auf YouTube öffnen
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
