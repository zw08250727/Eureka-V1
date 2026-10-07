import type { SVGProps } from "react";
const paths = {
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-3 0h6",
  task: "m3 5 2 2 3-4M11 5h10M3 12l2 2 3-4M11 12h10M3 19l2 2 3-4M11 19h10",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",
  chevron: "m7 10 5 5 5-5",
  close: "m6 6 12 12M6 18 18 6",
  panel: "M3 4h18v16H3zM9 4v16",
  spark: "m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z",
  upload: "M12 16V3M7 8l5-5 5 5M4 16v5h16v-5",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6",
  calendar: "M4 5h16v16H4zM8 3v4m8-4v4M4 11h16",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  book: "M4 3h14a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3m0 14h16M8 7h8M8 11h8",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
  send: "m3 3 18 9-18 9 4-9-4-9m4 9h14",
  edit: "m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6m8-16H3v17h17v-9",
  phone: "M7 2h10v20H7zM10 18h4",
  chat: "M3 4h18v13H8l-5 4V4",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2",
};
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
