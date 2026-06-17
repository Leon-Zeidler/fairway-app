// Trackman-CSV einlesen & pro Schläger verdichten.
// Reine Funktionen (kein React, keine Seiteneffekte) → voll unit-testbar.

const YARD_TO_M = 0.9144;

/** Bringt Trackman- und Bag-Namen auf einen kanonischen Schlüssel zusammen,
 *  damit derselbe Schläger über Sessions/Quellen hinweg zusammenfindet. */
export function normalizeClubName(name: string): string {
  const s = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (/\bdriver\b|\bdr\b/.test(s)) return "driver";

  // Grad-Wedges (48–64°), wenn nicht klar Eisen/Holz/Hybrid
  const deg = s.match(/\b(4[89]|5[0-9]|6[0-4])\b/);
  if (deg && !/(iron|eisen|wood|holz|hybrid)/.test(s)) return deg[1];

  if (/pitching|(^|\s)pw(\s|$)/.test(s)) return "pw";
  if (/gap ?wedge|(^|\s)gw(\s|$)|(^|\s)aw(\s|$)/.test(s)) return "gw";
  if (/sand ?wedge|(^|\s)sw(\s|$)/.test(s)) return "sw";
  if (/lob ?wedge|(^|\s)lw(\s|$)/.test(s)) return "lw";

  const wood = s.match(/(\d+) ?(?:wood|w|holz)\b/);
  if (wood) return `${wood[1]}w`;
  const hybrid = s.match(/(\d+) ?(?:hybrid|hy)\b/);
  if (hybrid) return `${hybrid[1]}h`;
  const iron = s.match(/(\d+) ?(?:iron|eisen|i)\b/);
  if (iron) return `${iron[1]}i`;

  return s;
}
