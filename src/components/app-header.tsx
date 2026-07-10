"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/releases", label: "Releases" },
  { href: "/studio", label: "Studio" },
  { href: "/calendar", label: "Calendrier" },
  { href: "/settings", label: "Réglages" },
];

export function AppHeader({ artistName }: { artistName: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="relative border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="font-semibold tracking-tight"
            onClick={() => setOpen(false)}
          >
            Release&nbsp;Engine
          </Link>
          {/* Nav desktop */}
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "hover:text-foreground",
                  isActive(l.href) && "font-medium text-foreground",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {artistName && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {artistName}
            </span>
          )}
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Déconnexion
            </Button>
          </form>
          {/* Bouton menu mobile */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground sm:hidden"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Panneau nav mobile */}
      {open && (
        <div className="absolute inset-x-0 top-14 z-40 border-b bg-background shadow-sm sm:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-2 py-2 hover:bg-muted",
                  isActive(l.href)
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
