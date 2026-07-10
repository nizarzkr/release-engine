"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  List,
  LayoutGrid,
  ChevronDown,
  Check,
  ArrowDownUp,
  CheckSquare,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  PIPELINE_STATUSES,
  PIPELINE_LABELS,
  CONTENT_FORMATS,
  FORMAT_LABELS,
  cardTitle,
  type PipelineStatus,
} from "@/lib/domain/content";
import { deleteContentBulk } from "@/app/(app)/releases/[id]/content-actions";
import { KanbanBoard } from "@/components/kanban-board";
import { BoardList } from "@/components/board-list";
import type { BoardItem } from "@/components/content-card";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<PipelineStatus, string> = {
  BACKLOG: "#B0AB9F",
  A_TOURNER: "#C08A2E",
  A_MONTER: "#3E6DAE",
  READY: "#1E8A5F",
};

type SortKey = "date" | "title" | "status";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "title", label: "Titre" },
  { key: "status", label: "Statut" },
];

export function BoardView({
  releaseId,
  items,
  sourceBlocks,
  enableQuickAdd = true,
  releases = [],
  showReleaseFilter = false,
  enableBulkDelete = false,
}: {
  releaseId?: string;
  items: BoardItem[];
  sourceBlocks: { id: string; label: string }[];
  enableQuickAdd?: boolean;
  releases?: { id: string; title: string }[];
  showReleaseFilter?: boolean;
  enableBulkDelete?: boolean;
}) {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [relF, setRelF] = useState<string[]>([]);
  const [platF, setPlatF] = useState<string[]>([]);
  const [fmtF, setFmtF] = useState<string[]>([]);
  const [statF, setStatF] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("date");

  // Sélection groupée (suppression multiple).
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();

  const platformOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((i) => i.platform)
            .filter((p): p is string => !!p && p.trim() !== ""),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const filtered = useMemo(() => {
    const arr = items.filter(
      (it) =>
        (relF.length === 0 || relF.includes(it.release_id)) &&
        (platF.length === 0 || (it.platform != null && platF.includes(it.platform))) &&
        (fmtF.length === 0 || (it.format != null && fmtF.includes(it.format))) &&
        (statF.length === 0 ||
          statF.includes(it.pipeline_status ?? "BACKLOG")),
    );
    const sorted = [...arr];
    if (sort === "title") {
      sorted.sort((a, b) => cardTitle(a).localeCompare(cardTitle(b)));
    } else if (sort === "status") {
      sorted.sort(
        (a, b) =>
          PIPELINE_STATUSES.indexOf((a.pipeline_status ?? "BACKLOG") as PipelineStatus) -
          PIPELINE_STATUSES.indexOf((b.pipeline_status ?? "BACKLOG") as PipelineStatus),
      );
    } else {
      sorted.sort((a, b) => {
        const da = a.scheduled_date;
        const db = b.scheduled_date;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.localeCompare(db);
      });
    }
    return sorted;
  }, [items, relF, platF, fmtF, statF, sort]);

  const activeCount = relF.length + platF.length + fmtF.length + statF.length;
  const clearAll = () => {
    setRelF([]);
    setPlatF([]);
    setFmtF([]);
    setStatF([]);
  };
  const toggle = (
    arr: string[],
    set: (v: string[]) => void,
    v: string,
  ) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Purge les ids disparus (après suppression) pour ne jamais viser une carte
  // qui n'existe plus.
  useEffect(() => {
    setSelected((prev) => {
      const live = new Set(items.map((i) => i.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (live.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [items]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Coche/décoche un lot d'un coup (une colonne entière du kanban).
  const toggleMany = (ids: string[]) =>
    setSelected((prev) => {
      const allIn = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const filteredIds = useMemo(() => filtered.map((i) => i.id), [filtered]);
  const allSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filteredIds));

  const exitSelection = () => {
    setSelecting(false);
    setSelected(new Set());
    setConfirming(false);
  };

  const runDelete = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    startDelete(async () => {
      await deleteContentBulk(ids);
      toast.success(
        `${ids.length} carte${ids.length > 1 ? "s" : ""} supprimée${
          ids.length > 1 ? "s" : ""
        }.`,
      );
      exitSelection();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* BARRE D'OUTILS */}
      <div className="flex flex-wrap items-center gap-2.5">
        {showReleaseFilter && releases.length > 0 && (
          <Dropdown label="Release" count={relF.length}>
            {releases.map((r) => (
              <CheckOption
                key={r.id}
                checked={relF.includes(r.id)}
                onClick={() => toggle(relF, setRelF, r.id)}
              >
                {r.title}
              </CheckOption>
            ))}
          </Dropdown>
        )}

        {platformOptions.length > 0 && (
          <Dropdown label="Plateforme" count={platF.length}>
            {platformOptions.map((p) => (
              <CheckOption
                key={p}
                checked={platF.includes(p)}
                onClick={() => toggle(platF, setPlatF, p)}
              >
                {p}
              </CheckOption>
            ))}
          </Dropdown>
        )}

        <Dropdown label="Format" count={fmtF.length}>
          {CONTENT_FORMATS.map((f) => (
            <CheckOption
              key={f}
              checked={fmtF.includes(f)}
              onClick={() => toggle(fmtF, setFmtF, f)}
            >
              {FORMAT_LABELS[f]}
            </CheckOption>
          ))}
        </Dropdown>

        <Dropdown label="Statut" count={statF.length}>
          {PIPELINE_STATUSES.map((s) => (
            <CheckOption
              key={s}
              checked={statF.includes(s)}
              onClick={() => toggle(statF, setStatF, s)}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_DOT[s] }}
              />
              {PIPELINE_LABELS[s]}
            </CheckOption>
          ))}
        </Dropdown>

        {activeCount > 0 && (
          <>
            <button
              type="button"
              onClick={clearAll}
              className="text-[12.5px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Effacer
            </button>
            <span className="text-[12.5px] text-muted-foreground">
              {filtered.length} sur {items.length}
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          {enableBulkDelete && !selecting && items.length > 0 && (
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-secondary"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Sélectionner
            </button>
          )}
          <Dropdown
            label={`Trier : ${SORTS.find((s) => s.key === sort)?.label}`}
            icon={<ArrowDownUp className="h-3.5 w-3.5" />}
          >
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-secondary"
              >
                <span className="flex h-4 w-4 items-center justify-center text-primary">
                  {sort === s.key && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                {s.label}
              </button>
            ))}
          </Dropdown>

          <div className="inline-flex rounded-lg border bg-secondary p-0.5">
            <SegButton
              active={view === "kanban"}
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </SegButton>
            <SegButton active={view === "list"} onClick={() => setView("list")}>
              <List className="h-3.5 w-3.5" />
              Liste
            </SegButton>
          </div>
        </div>
      </div>

      {/* BARRE DE SÉLECTION */}
      {selecting && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/5 px-3.5 py-2.5">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[13px] font-medium text-primary underline underline-offset-2"
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
          <span className="text-[13px] text-muted-foreground">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>

          <div className="ml-auto flex items-center gap-2.5">
            {confirming ? (
              <>
                <span className="text-[13px] text-foreground">
                  Supprimer {selected.size} carte
                  {selected.size > 1 ? "s" : ""} ?
                </span>
                <button
                  type="button"
                  onClick={runDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-[13px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Suppression…" : "Confirmer"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={selected.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-[13px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={exitSelection}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-secondary"
                >
                  <X className="h-3.5 w-3.5" />
                  Quitter
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {view === "kanban" ? (
        <KanbanBoard
          releaseId={releaseId}
          items={filtered}
          sourceBlocks={sourceBlocks}
          enableQuickAdd={enableQuickAdd}
          selecting={selecting}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onToggleColumn={toggleMany}
        />
      ) : (
        <BoardList
          items={filtered}
          sourceBlocks={sourceBlocks}
          showRelease={showReleaseFilter}
          selecting={selecting}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          allSelected={allSelected}
        />
      )}
    </div>
  );
}

function Dropdown({
  label,
  count,
  icon,
  children,
}: {
  label: string;
  count?: number;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = !!count && count > 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
          active
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-input bg-card text-foreground/80 hover:bg-secondary",
        )}
      >
        {icon}
        {label}
        {active && (
          <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
            {count}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-20 min-w-52 rounded-xl border bg-popover p-1.5 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

function CheckOption({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-secondary"
    >
      <span
        className={cn(
          "flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors",
          checked
            ? "border-primary bg-primary text-white"
            : "border-input text-transparent",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      {children}
    </button>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
