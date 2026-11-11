"use client";

import { usePathname } from "next/navigation";
import { PillLinks } from "./PillLinks";

const sections = [
  { key: "profile", text: "Profile", href: "/settings" },
  { key: "sessions", text: "Sessions", href: "/settings/sessions" },
] as const;

/** The Settings sections as pills; the current one follows the path. */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <PillLinks
      label="Settings sections"
      items={sections.map((section) => ({
        ...section,
        current: pathname === section.href,
      }))}
    />
  );
}
