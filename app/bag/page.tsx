"use client";

import { Club, EquipItem } from "@/lib/types";
import { useCollection, uid } from "@/lib/store";
import { CLUBS, EQUIPMENT } from "@/lib/seed";
import { EditableText, StatusButton } from "@/app/components/ui";
import Icon from "@/app/components/Icon";

export default function Bag() {
  const clubs = useCollection<Club>("clubs", CLUBS);
  // Key v2: EquipItem um available/routineTag erweitert (Routine-Sync).
  const equip = useCollection<EquipItem>("equipment2", EQUIPMENT);

  return (
    <>
      <header className="topbar">
        <h1>Bag</h1>
        <div className="tag">Deine Distanzen & dein Equipment</div>
      </header>

      <div className="container">
        <div className="card">
          <h2>Distanzen</h2>
          <div className="sub">
            Deine Carry-Distanzen — Wert antippen und anpassen, wenn sich was
            ändert.
          </div>
          {clubs.items.map((c) => (
            <div className="kv-row" key={c.id}>
              <span className="k">
                <EditableText
                  value={c.name}
                  onChange={(v) => clubs.update(c.id, { name: v })}
                />
              </span>
              <span
                className="v"
                style={{ display: "flex", gap: 10, alignItems: "center" }}
              >
                <EditableText
                  value={c.distance}
                  onChange={(v) => clubs.update(c.id, { distance: v })}
                />
                <button
                  className="del"
                  type="button"
                  aria-label="Löschen"
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--faint)",
                    fontSize: 18,
                    cursor: "pointer",
                    padding: "0 2px",
                  }}
                  onClick={() => clubs.remove(c.id)}
                >
                  ×
                </button>
              </span>
            </div>
          ))}
          <div className="row-actions">
            <button
              className="btn-outline"
              type="button"
              onClick={() =>
                clubs.add({ id: uid("c"), name: "Neuer Schläger", distance: "— m" })
              }
            >
              <Icon name="plus" size={15} /> Schläger
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Equipment</h2>
          <div className="sub">
            Status antippen zum Wechseln. „Im Bag / Noch nicht da" steuert
            automatisch, was die Turnier-Routine dir empfiehlt.
          </div>
          {equip.items.map((e) => {
            const notHere = e.available === false;
            return (
              <div
                className={`equip-item ${notHere ? "unavailable" : ""}`}
                key={e.id}
              >
                <div className="equip-head">
                  <div style={{ flex: 1 }}>
                    <div className="equip-cat">{e.category}</div>
                    <div className="equip-name">{e.name}</div>
                  </div>
                  <StatusButton
                    status={e.status}
                    onChange={(s) => equip.update(e.id, { status: s })}
                  />
                </div>
                <div className="equip-note">{e.note}</div>
                <div className="equip-actions">
                  <button
                    type="button"
                    className={`avail-toggle ${notHere ? "off" : "on"}`}
                    onClick={() => equip.update(e.id, { available: notHere })}
                  >
                    {notHere ? "Noch nicht da" : "Im Bag"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
