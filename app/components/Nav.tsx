"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { IconName } from "./Icon";

const items: { href: string; label: string; ico: IconName }[] = [
  { href: "/", label: "Heute", ico: "today" },
  { href: "/woche", label: "Woche", ico: "calendar" },
  { href: "/training", label: "Training", ico: "training" },
  { href: "/coach", label: "Coach", ico: "coach" },
  { href: "/bag", label: "Bag", ico: "bag" },
  { href: "/turnier", label: "Turnier", ico: "trophy" },
  { href: "/journal", label: "Journal", ico: "journal" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {items.map((it) => {
        const active =
          it.href === "/"
            ? path === "/"
            : path.startsWith(it.href) ||
              (it.href === "/training" && path.startsWith("/programm"));
        return (
          <Link key={it.href} href={it.href} className={active ? "active" : ""}>
            <Icon name={it.ico} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
