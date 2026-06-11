"use client";

import { ReactNode, useState } from "react";
import Icon from "./Icon";
import { EquipStatus, STATUS_LABELS } from "@/lib/types";
import { StringList } from "@/lib/store";

/* ── Inline editierbarer Text ───────────────────────────────────── */

export function EditableText({
  value,
  onChange,
  placeholder = "—",
  multiline = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft.trim());
  }

  if (editing) {
    const common = {
      autoFocus: true,
      value: draft,
      className: "edit-input",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
    };
    return multiline ? (
      <textarea {...common} />
    ) : (
      <input
        {...common}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className={`editable ${className}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value || <span className="muted">{placeholder}</span>}
    </span>
  );
}

/* ── Status-Punkt + zyklischer Button ───────────────────────────── */

const STATUS_ORDER: EquipStatus[] = ["good", "watch", "issue"];

export function StatusDot({ status }: { status: EquipStatus }) {
  return <span className={`status-dot ${status}`} />;
}

export function StatusButton({
  status,
  onChange,
}: {
  status: EquipStatus;
  onChange: (s: EquipStatus) => void;
}) {
  function cycle() {
    const i = STATUS_ORDER.indexOf(status);
    onChange(STATUS_ORDER[(i + 1) % STATUS_ORDER.length]);
  }
  return (
    <button className="status-btn" onClick={cycle} type="button">
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </button>
  );
}

/* ── Accordion-Eintrag ──────────────────────────────────────────── */

export function Accordion({
  title,
  focus,
  current,
  defaultOpen = false,
  children,
}: {
  title: string;
  focus?: string;
  current?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`acc ${open ? "open" : ""}`}>
      <button className="acc-head" onClick={() => setOpen((o) => !o)} type="button">
        <span>
          <span className="acc-title">
            {title}
            {current && <span className="tag-current">Fokus</span>}
          </span>
          {focus && <div className="acc-focus">{focus}</div>}
        </span>
        <Icon name="chevron" size={18} className="chev" />
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  );
}

/* ── Editierbare String-Liste ───────────────────────────────────── */

export function EditableList({
  list,
  addLabel = "Hinzufügen",
  showReset = true,
}: {
  list: StringList;
  addLabel?: string;
  showReset?: boolean;
}) {
  return (
    <>
      {list.items.map((item, i) => (
        <div className="list-row" key={i}>
          <Icon name="target" size={14} className="bullet" />
          <span className="body">
            <EditableText
              value={item}
              multiline
              onChange={(v) => (v ? list.update(i, v) : list.remove(i))}
            />
          </span>
          <button
            className="del"
            onClick={() => list.remove(i)}
            aria-label="Löschen"
            type="button"
          >
            ×
          </button>
        </div>
      ))}
      <div className="row-actions">
        <button
          className="btn-outline"
          type="button"
          onClick={() => list.add("Neuer Eintrag")}
        >
          <Icon name="plus" size={15} /> {addLabel}
        </button>
        {showReset && (
          <button className="btn-outline muted" type="button" onClick={list.reset}>
            <Icon name="reset" size={15} /> Zurücksetzen
          </button>
        )}
      </div>
    </>
  );
}

/* ── Bild-Link zur Übung (öffnet Bildersuche, keine Fremdbilder) ── */

export function exerciseName(text: string): string {
  const head = text.split(/[—·(]/)[0].replace(/^[\d:.\s–-]+/, "").trim();
  return head || text;
}

export function DemoLink({ query }: { query: string }) {
  const url =
    "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(query);
  return (
    <a className="demo-link" href={url} target="_blank" rel="noopener noreferrer">
      <Icon name="image" size={13} /> Bild ansehen
    </a>
  );
}

/* ── Reset-Button (für Objekt-Sammlungen) ───────────────────────── */

export function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button className="btn-outline muted" type="button" onClick={onReset}>
      <Icon name="reset" size={15} /> Zurücksetzen
    </button>
  );
}
