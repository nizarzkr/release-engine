"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabCtxValue = { setTab: (key: string) => void };
const TabCtx = createContext<TabCtxValue | null>(null);

/** Bouton qui bascule vers un autre onglet depuis l'intérieur d'un panneau. */
export function TabLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabCtx);
  return (
    <button type="button" onClick={() => ctx?.setTab(to)} className={className}>
      {children}
    </button>
  );
}

export function ReleaseTabs({
  tabs,
  panels,
  initial,
}: {
  tabs: { key: string; label: string; badge?: number }[];
  panels: Record<string, ReactNode>;
  initial?: string;
}) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);

  return (
    <TabCtx.Provider value={{ setTab: setActive }}>
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "relative -mb-px px-3.5 py-2.5 text-sm font-medium transition-colors",
              active === t.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {typeof t.badge === "number" && (
              <span className="ml-1.5 rounded-full border bg-secondary px-1.5 py-px text-[11px] font-semibold text-muted-foreground">
                {t.badge}
              </span>
            )}
            {active === t.key && (
              <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded bg-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-6">{panels[active]}</div>
    </TabCtx.Provider>
  );
}
