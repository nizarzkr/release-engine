"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { FORMATS_BY_SCOPE } from "@/lib/domain/export";
import {
  EXPORT_FORMAT_LABELS,
  ExportFormatIcon,
  exportHref,
} from "@/components/export-menu";

// Menu « ⋯ » de la page détail : Modifier / Exporter / Supprimer.
// `deleteAction` est une server action déjà liée à l'id de la release.
export function ReleaseActionsMenu({
  releaseId,
  editHref,
  deleteAction,
}: {
  releaseId: string;
  editHref: string;
  deleteAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 min-w-48 rounded-xl border bg-popover p-1.5 shadow-lg">
          <Link
            href={editHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
            Modifier la release
          </Link>
          <div className="my-1 h-px bg-border" />
          {/* Plan de sortie complet : checklist + jalons + contenus. */}
          {FORMATS_BY_SCOPE.all.map((format) => (
            <a
              key={format}
              href={exportHref(releaseId, "all", format)}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ExportFormatIcon format={format} />
              Exporter en {EXPORT_FORMAT_LABELS[format]}
            </a>
          ))}
          <div className="my-1 h-px bg-border" />
          <form action={deleteAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
