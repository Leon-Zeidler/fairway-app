"use client";

import { Club, EquipItem } from "@/lib/types";
import { useCollection, uid } from "@/lib/store";
import { CLUBS, EQUIPMENT } from "@/lib/seed";
import {
  EditableText,
  StatusButton,
  ResetButton,
} from "@/app/components/ui";
import Icon from "@/app/components/Icon";

export default function Bag() {
  const clubs = useCollection<Club>("clubs", CLUBS);
  const equip = useCollection<EquipItem>("equipment", EQUIPMENT);

  return (
    <>
      <header className="topbar">
        <h1>Bag</h1>
        <div className="tag">Distanzen & Equipment</div>
      </header>

      <div className="container">
        <div className="card">
          <h2>Distanzen</h2>
          <div className="sub">Wert antippen zum Ändern.</div>
          {clubs.items.map((c) => (
            <div className="kv-row" key={c.id}>
              <span className="k">
                <EditableText
                  value={c.name}
                  onChange={(v) => clubs.update(c.id, { name: v })}
                />
              </span>
              <span className="v" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <EditableText
                  value={c.distance}
                  onChange={(v) => clubs.update(c.id, { distance: v })}
                />
                <button
                  className="del"
                  type="button"
                  aria-label="Löschen"
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
            <ResetButton onReset={clubs.reset} />
          </div>
        </div>

        <div className="card">
          <h2>Equipment-Status</h2>
          <div className="sub">Status antippen zum Wechseln (Passt → Beobachten → Handlungsbedarf).</div>
          {equip.items.map((e) => (
            <div className="equip-item" key={e.id}>
              <div className="equip-head">
                <div style={{ flex: 1 }}>
                  <div className="equip-cat">
                    <EditableText
                      value={e.category}
                      onChange={(v) => equip.update(e.id, { category: v })}
                    />
                  </div>
                  <div className="equip-name">
                    <EditableText
                      value={e.name}
                      onChange={(v) => equip.update(e.id, { name: v })}
                    />
                  </div>
                </div>
                <StatusButton
                  status={e.status}
                  onChange={(s) => equip.update(e.id, { status: s })}
                />
              </div>
              <div className="equip-note">
                <EditableText
                  value={e.note}
                  multiline
                  onChange={(v) => equip.update(e.id, { note: v })}
                />
              </div>
              <button
                className="btn-ghost"
                type="button"
                style={{ marginTop: 8 }}
                onClick={() => equip.remove(e.id)}
              >
                löschen
              </button>
            </div>
          ))}
          <div className="row-actions">
            <button
              className="btn-outline"
              type="button"
              onClick={() =>
                equip.add({
                  id: uid("e"),
                  category: "Kategorie",
                  name: "Neues Equipment",
                  status: "watch",
                  note: "Notiz…",
                })
              }
            >
              <Icon name="plus" size={15} /> Eintrag
            </button>
            <ResetButton onReset={equip.reset} />
          </div>
        </div>
      </div>
    </>
  );
}
