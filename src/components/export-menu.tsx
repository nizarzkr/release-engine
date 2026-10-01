"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  FORMATS_BY_SCOPE,
  type ExportFormat,
  type ExportScope,
} from "@/lib/domain/export";

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  csv: "CSV",
  xlsx: "Excel",
};

export function exportHref(
  releaseId: string,
  scope: ExportScope,
  format: ExportFormat,
) {
  return `/releases/${releaseId}/export?scope=${scope}&format=${format}`;
}

export function ExportFormatIcon({ format }: { format: ExportFormat }) {
  const Icon = format === "pdf" ? FileText : FileSpreadsheet;
  return <Icon className="h-4 w-4 text-muted-foreground" />;
}

// Bouton « Exporter » → choix du format. Le téléchargement est un simple lien
// vers la route d'export (Content-Disposition: attachment).
export function ExportMenu({
  releaseId,
  scope,
}: {
  releaseId: string;
  scope: ExportScope;
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
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Download className="h-4 w-4" />
        Exporter
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 min-w-40 rounded-xl border bg-popover p-1.5 shadow-lg">
          {FORMATS_BY_SCOPE[scope].map((format) => (
            <a
              key={format}
              href={exportHref(releaseId, scope, format)}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ExportFormatIcon format={format} />
              {EXPORT_FORMAT_LABELS[format]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
