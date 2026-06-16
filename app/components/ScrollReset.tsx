"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Setzt den App-Shell-Scrollcontainer bei jedem Routenwechsel auf 0 zurück.
 * Nötig, weil im App-Shell <body> gesperrt ist (overflow: hidden) und Next.js
 * sonst nur `window` scrollt — was hier nichts mehr bewegt.
 */
export default function ScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    document.getElementById("scroll-root")?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
