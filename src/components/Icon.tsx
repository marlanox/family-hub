import type { IconKey } from "@/lib/types";

interface IconProps {
  name: IconKey;
  className?: string;
}

// A small, consistent line-icon set (stroke = currentColor, 1.8 weight,
// rounded joins) so custom tasks never need a bespoke icon — see
// docs/ARCHITECTURE.md "Icon system".
const paths: Record<IconKey, React.ReactNode> = {
  cat: (
    <path d="M5 9 7 4l2 4h6l2-4 2 5v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Zm3 6h.01M15 15h.01M9 18c1 1 5 1 6 0" />
  ),
  book: (
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Zm0 0V19M8 7h8M8 11h8" />
  ),
  homework: (
    <path d="M4 4h11l5 5v11H4Zm11 0v5h5M8 13h8M8 17h5" />
  ),
  shower: (
    <path d="M6 9h12M9 3c0 2-2 2-2 4M13 3c0 2-2 2-2 4M17 3c0 2-2 2-2 4M8 13v.01M12 13v.01M16 13v.01M8 17v.01M12 17v.01M16 17v.01" />
  ),
  alarm: (
    <path d="M12 21a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM12 10v4l3 2M5 5 3 7M19 5l2 2M9 2h6" />
  ),
  sun: (
    <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />,
  bed: (
    <path d="M3 19v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 15h18M7 11V7h4v4" />
  ),
  dishes: (
    <path d="M4 12a8 8 0 0 0 16 0Zm8-9v3M6 6l1.5 2M18 6l-1.5 2M4 19h16" />
  ),
  kitchen: (
    <>
      <path d="M5 10h14M7 10v6a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-6M3 10h2M19 10h2M12 7V4" />
      <circle cx="12" cy="3.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  vacuum: (
    <path d="M8 21h5l2-9a3 3 0 0 0-3-4H9a3 3 0 0 0-3 3v2M6 21v-3M16 12h3a2 2 0 0 1 2 2v2M5 8l3-4 4 2" />
  ),
  broom: <path d="M14 3 5 21m4-6 3-9 5 2-3 9Zm0 0L4 21" />,
  mop: <path d="M12 3v9m0 0-5 9m5-9 5 9M8 5h8" />,
  laundry: (
    <path d="M5 3h14v18H5ZM12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM8 6h.01" />
  ),
  shirt: <path d="M8 4 4 7v3h3v10h10V10h3V7l-4-3-3 2h-2Z" />,
  trash: (
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  ),
  bedroom: <path d="M3 21V9l9-6 9 6v12M9 21v-7h6v7M3 21h18" />,
  house: <path d="M4 11 12 4l8 7v9H4Zm5 9v-6h6v6" />,
  "phone-off": (
    <path d="M3 3l18 18M8 5h8v14h-3M12 17h.01M8 5v6" />
  ),
  heart: <path d="M12 20s-7-4.4-9.5-8.8C1 8 2.6 4.8 6 4.4c2-.3 3.6.7 6 3.1 2.4-2.4 4-3.4 6-3.1 3.4.4 5 3.6 3.5 6.8C19 15.6 12 20 12 20Z" />,
  family: (
    <path d="M9 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M15 21v-1.5a3.5 3.5 0 0 1 3.5-3.5H19a3 3 0 0 1 3 3V21" />
  ),
  star: <path d="m12 3 2.7 5.9 6.3.6-4.8 4.2 1.4 6.3L12 16.9 6.4 20l1.4-6.3-4.8-4.2 6.3-.6Z" />,
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0Zm0 0H4v2a4 4 0 0 0 4 3.5M16 4h4v2a4 4 0 0 1-4 3.5M10 15v3h4v-3M8 21h8" />
  ),
  gift: (
    <path d="M4 9h16v11H4Zm8 0V21M4 9V6h16v3M12 6C11 2 7 2 7 5c0 1.5 2 1.5 5 1ZM12 6c1-4 5-4 5-1 0 1.5-2 1.5-5 1Z" />
  ),
  exercise: <path d="M4 12h4m8 0h4M8 12V8m0 4v4m8-8v8M8 8h8M8 16h8" />,
  reading: <path d="M4 5s3-2 8-2v16c-5 0-8 2-8 2ZM20 5s-3-2-8-2v16c5 0 8 2 8 2Z" />,
  school: <path d="m12 3 10 5-10 5L2 8Zm-6 6.5V15c0 1.7 2.7 4 6 4s6-2.3 6-4V9.5" />,
  checklist: <path d="M4 4h16v16H4Zm3 5 2 2 4-4m-6 9 2 2 4-4" />,
  food: <path d="M6 3v7a3 3 0 0 0 6 0V3M9 10v11M17 3c-2 2-2 5-2 7s1 3 2 3v8" />,
  plus: <path d="M12 5v14M5 12h14" />,
  calendar: (
    <path d="M4 5h16v16H4Zm0 5h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
  ),
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2" />,
  settings: (
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z" />
  ),
  back: <path d="M15 5 7 12l8 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
};

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
