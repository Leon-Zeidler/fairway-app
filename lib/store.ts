"use client";

import { useEffect, useRef, useState } from "react";
import { cloudGet, cloudSet } from "./cloud";

/* ── localStorage-Helfer (Offline-Cache) ────────────────────────── */

const NS = "fairway.";

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NS + key, JSON.stringify(value));
}

export function uid(prefix = "id"): string {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ── Kern: persistierter State (Offline-Cache + Cloud-Sync) ─────────
 *
 * 1. localStorage-Cache wird sofort gesetzt (kein Flackern, offline ok)
 * 2. Cloud-Wert wird nachgeladen und überschreibt, falls vorhanden
 * 3. Jede Änderung schreibt sofort lokal + (fire-and-forget) in die Cloud
 * ----------------------------------------------------------------- */

function usePersistedState<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(seed);
  const [ready, setReady] = useState(false);
  const seedRef = useRef(seed);

  useEffect(() => {
    let cancelled = false;
    const cached = lsGet<T>(key);
    if (cached != null) setValue(cached);

    (async () => {
      const remote = await cloudGet<T>(key);
      if (cancelled) return;
      if (remote != null) {
        setValue(remote);
        lsSet(key, remote);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function persist(next: T) {
    setValue(next);
    lsSet(key, next);
    void cloudSet(key, next);
  }

  function reset() {
    persist(seedRef.current);
  }

  return { value, setValue: persist, reset, ready };
}

/* ── Generische Sammlung von Objekten mit id ────────────────────── */

export interface Collection<T> {
  items: T[];
  ready: boolean;
  add: (item: T) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  setAll: (items: T[]) => void;
  reset: () => void; // zurück auf Seed (auch in der Cloud)
}

export function useCollection<T extends { id: string }>(
  key: string,
  seed: T[]
): Collection<T> {
  const { value, setValue, reset, ready } = usePersistedState<T[]>(key, seed);
  return {
    items: value,
    ready,
    add: (item) => setValue([...value, item]),
    update: (id, patch) =>
      setValue(value.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    remove: (id) => setValue(value.filter((i) => i.id !== id)),
    setAll: (next) => setValue(next),
    reset,
  };
}

/* ── Einzelnes Objekt (z.B. Profil, Tee Time) ───────────────────── */

export interface ObjectStore<T> {
  value: T;
  ready: boolean;
  set: (patch: Partial<T>) => void;
  reset: () => void;
}

export function useObject<T extends object>(key: string, seed: T): ObjectStore<T> {
  const { value, setValue, reset, ready } = usePersistedState<T>(key, seed);
  return {
    value,
    ready,
    set: (patch) => setValue({ ...value, ...patch }),
    reset,
  };
}

/* ── Liste einfacher Strings (Insights, Mental-Check, …) ────────── */

export interface StringList {
  items: string[];
  ready: boolean;
  add: (value: string) => void;
  update: (index: number, value: string) => void;
  remove: (index: number) => void;
  setAll: (items: string[]) => void;
  reset: () => void;
}

export function useStringList(key: string, seed: string[]): StringList {
  const { value, setValue, reset, ready } = usePersistedState<string[]>(key, seed);
  return {
    items: value,
    ready,
    add: (v) => setValue([...value, v]),
    update: (index, v) => setValue(value.map((x, i) => (i === index ? v : x))),
    remove: (index) => setValue(value.filter((_, i) => i !== index)),
    setAll: (items) => setValue(items),
    reset,
  };
}
