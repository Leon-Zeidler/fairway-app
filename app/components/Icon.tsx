// Minimalistische SVG-Line-Icons (stroke-basiert, erben currentColor).

import type { SVGProps } from "react";

export type IconName =
  | "today"
  | "training"
  | "bag"
  | "trophy"
  | "journal"
  | "chevron"
  | "plus"
  | "reset"
  | "target";

const PATHS: Record<IconName, JSX.Element> = {
  // Haus / Heute
  today: (
    <>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9.5 20v-5h5v5" />
    </>
  ),
  // Zielscheibe / Training
  training: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </>
  ),
  // Golftasche / Bag
  bag: (
    <>
      <rect x="6" y="7" width="9" height="14" rx="3" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h0A1.5 1.5 0 0 1 12 5.5V7" />
      <path d="M15 9h2.2a1.8 1.8 0 0 1 1.8 1.8V18" />
      <path d="M9 4.5 8 2M11 4.5 12 2M13 4.7 14 2.3" />
    </>
  ),
  // Pokal / Turnier
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5C3 9.5 4.5 11 7 11" />
      <path d="M17 6h2.5A1.5 1.5 0 0 1 21 7.5C21 9.5 19.5 11 17 11" />
      <path d="M12 14v3M9 21h6M10 21c0-1.5 1-2 2-2s2 .5 2 2" />
    </>
  ),
  // Notizbuch / Journal
  journal: (
    <>
      <path d="M6 3h11a2 2 0 0 1 2 2v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M4 17h15" />
      <path d="M9 7h6M9 10.5h6" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 22, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
