"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

/** Schwebender Coach-Button — app-weit erreichbar, außer auf der Coach-Seite. */
export default function CoachFab() {
  const path = usePathname();
  if (path === "/coach") return null;
  return (
    <Link href="/coach" className="coach-fab" aria-label="Coach fragen">
      <Icon name="coach" size={24} />
    </Link>
  );
}
