"use client";

import { useEffect, useState } from "react";

/* ── localStorage-Helfer ────────────────────────────────────────── */

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

function lsRemove(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(NS + key);
}

export function uid(prefix = "id"): string {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ── Generische Sammlung von Objekten mit id ────────────────────── */

export interface Collection<T> {
  items: T[];
  ready: boolean; // true sobald aus localStorage geladen (verhindert Hydration-Flackern)
  add: (item: T) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  setAll: (items: T[]) => void;
  reset: () => void; // zurück auf Seed
}

export function useCollection<T extends { id: string }>(
  key: string,
  seed: T[]
): Collection<T> {
  const [items, setItems] = useState<T[]>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = lsGet<T[]>(key);
    if (stored) setItems(stored);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function persist(next: T[]) {
    setItems(next);
    lsSet(key, next);
  }

  return {
    items,
    ready,
    add: (item) => persist([...items, item]),
    update: (id, patch) =>
      persist(items.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    remove: (id) => persist(items.filter((i) => i.id !== id)),
    setAll: (next) => persist(next),
    reset: () => {
      lsRemove(key);
      setItems(seed);
    },
  };
}

/* ── Einzelnes Objekt (z.B. Profil) ─────────────────────────────── */

export interface ObjectStore<T> {
  value: T;
  ready: boolean;
  set: (patch: Partial<T>) => void;
  reset: () => void;
}

export function useObject<T extends object>(key: string, seed: T): ObjectStore<T> {
  const [value, setValue] = useState<T>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = lsGet<T>(key);
    if (stored) setValue({ ...seed, ...stored });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    value,
    ready,
    set: (patch) => {
      const next = { ...value, ...patch };
      setValue(next);
      lsSet(key, next);
    },
    reset: () => {
      lsRemove(key);
      setValue(seed);
    },
  };
}

/* ── Liste einfacher Strings (Insights, Mental-Check, …) ────────── */

export interface StringList {
  items: string[];
  ready: boolean;
  add: (value: string) => void;
  update: (index: number, value: string) => void;
  remove: (index: number) => void;
  reset: () => void;
}

export function useStringList(key: string, seed: string[]): StringList {
  const [items, setItems] = useState<string[]>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = lsGet<string[]>(key);
    if (stored) setItems(stored);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function persist(next: string[]) {
    setItems(next);
    lsSet(key, next);
  }

  return {
    items,
    ready,
    add: (value) => persist([...items, value]),
    update: (index, value) =>
      persist(items.map((v, i) => (i === index ? value : v))),
    remove: (index) => persist(items.filter((_, i) => i !== index)),
    reset: () => {
      lsRemove(key);
      setItems(seed);
    },
  };
}
