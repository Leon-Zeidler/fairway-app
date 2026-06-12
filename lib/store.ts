"use client";

import { useCallback, useEffect, useReducer } from "react";
import { cloudGet, cloudSet } from "./cloud";

/* ── Reaktiver, app-weiter Store ─────────────────────────────────────
 *
 * EINE Quelle der Wahrheit im Modul-Speicher (mem). Alle Seiten teilen
 * sich denselben Wert pro Key — ändert der Coach den Plan, sehen Heute
 * und Woche das sofort. Offline-first: localStorage-Cache + Cloud-Sync.
 *
 * Wichtig gegen den alten Bug: sobald ein Key lokal geschrieben wurde
 * (dirty), überschreibt ihn ein verspäteter Cloud-Load NICHT mehr.
 * ------------------------------------------------------------------- */

const NS = "fairway.";

const mem = new Map<string, unknown>();
const subs = new Map<string, Set<() => void>>();
const cloudLoaded = new Set<string>();
const dirty = new Set<string>();

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
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* Quota o.ä. — ignorieren */
  }
}

function emit(key: string) {
  subs.get(key)?.forEach((fn) => fn());
}

function subscribe(key: string, fn: () => void): () => void {
  let set = subs.get(key);
  if (!set) {
    set = new Set();
    subs.set(key, set);
  }
  set.add(fn);
  return () => set!.delete(fn);
}

/** Beim ersten Zugriff aus localStorage hydrieren und Cloud-Load anstoßen. */
function ensureHydrated<T>(key: string, seed: T) {
  if (!mem.has(key)) {
    const cached = lsGet<T>(key);
    mem.set(key, cached != null ? cached : seed);
  }
  if (!cloudLoaded.has(key)) {
    cloudLoaded.add(key);
    cloudGet<T>(key)
      .then((remote) => {
        if (remote != null && !dirty.has(key)) {
          mem.set(key, remote);
          lsSet(key, remote);
          emit(key);
        }
      })
      .catch(() => {});
  }
}

function writeKey<T>(key: string, value: T) {
  mem.set(key, value);
  dirty.add(key);
  lsSet(key, value);
  void cloudSet(key, value);
  emit(key);
}

function current<T>(key: string, seed: T): T {
  return (mem.has(key) ? (mem.get(key) as T) : seed);
}

interface Persisted<T> {
  value: T;
  ready: boolean;
  set: (value: T) => void;
  mutate: (fn: (prev: T) => T) => void;
  reset: () => void;
}

function usePersisted<T>(key: string, seed: T): Persisted<T> {
  const [, force] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    ensureHydrated(key, seed);
    force(); // initialen mem-Wert übernehmen
    const unsub = subscribe(key, force);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const value = current(key, seed);
  const set = useCallback((v: T) => writeKey(key, v), [key]);
  const mutate = useCallback(
    (fn: (prev: T) => T) => writeKey(key, fn(current(key, seed))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  const reset = useCallback(() => writeKey(key, seed), [key, seed]);

  return { value, ready: true, set, mutate, reset };
}

export function uid(prefix = "id"): string {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ── Sammlung von Objekten mit id ───────────────────────────────── */

export interface Collection<T> {
  items: T[];
  ready: boolean;
  add: (item: T) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  setAll: (items: T[]) => void;
  reset: () => void;
}

export function useCollection<T extends { id: string }>(
  key: string,
  seed: T[]
): Collection<T> {
  const { value, mutate, reset, ready } = usePersisted<T[]>(key, seed);
  return {
    items: value,
    ready,
    add: (item) => mutate((v) => [...v, item]),
    update: (id, patch) =>
      mutate((v) => v.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    remove: (id) => mutate((v) => v.filter((i) => i.id !== id)),
    setAll: (items) => mutate(() => items),
    reset,
  };
}

/* ── Einzelnes Objekt (Profil, Fokus, Plan, Tee Time …) ─────────── */

export interface ObjectStore<T> {
  value: T;
  ready: boolean;
  set: (patch: Partial<T>) => void;
  replace: (value: T) => void;
  reset: () => void;
}

export function useObject<T extends object>(key: string, seed: T): ObjectStore<T> {
  const { value, mutate, set, reset, ready } = usePersisted<T>(key, seed);
  return {
    value,
    ready,
    set: (patch) => mutate((v) => ({ ...v, ...patch })),
    replace: (v) => set(v),
    reset,
  };
}

/* ── Liste einfacher Strings ────────────────────────────────────── */

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
  const { value, mutate, reset, ready } = usePersisted<string[]>(key, seed);
  return {
    items: value,
    ready,
    add: (v) => mutate((list) => [...list, v]),
    update: (index, v) =>
      mutate((list) => list.map((x, i) => (i === index ? v : x))),
    remove: (index) => mutate((list) => list.filter((_, i) => i !== index)),
    setAll: (items) => mutate(() => items),
    reset,
  };
}
