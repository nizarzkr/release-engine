"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsNav({
  sections,
  panels,
}: {
  sections: { key: string; label: string; icon: ReactNode }[];
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(sections[0]?.key);

  return (
    <div className="grid gap-7 md:grid-cols-[210px_1fr]">
      <nav className="flex gap-1.5 overflow-x-auto md:sticky md:top-6 md:flex-col md:self-start md:overflow-visible">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActive(s.key)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm font-medium transition-colors",
              active === s.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            <span className="[&_svg]:h-4 [&_svg]:w-4">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </nav>
      <div>{panels[active]}</div>
    </div>
  );
}
