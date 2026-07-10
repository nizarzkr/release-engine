import { createClient } from "@/lib/supabase/server";
import { formatDateFr } from "@/lib/format";
import {
  CHECKLIST_PHASES,
  CHECKLIST_PHASE_LABELS,
} from "@/lib/domain/checklist";
import {
  seedChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/app/(app)/releases/[id]/checklist-actions";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export async function ChecklistSection({
  releaseId,
}: {
  releaseId: string;
}) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("checklist_item")
    .select("*")
    .eq("release_id", releaseId)
    .order("due_date", { ascending: true, nullsFirst: false });

  const all = items ?? [];
  const doneCount = all.filter((i) => i.is_done).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Checklist</h2>
          <p className="text-sm text-muted-foreground">
            Logistique de sortie — 0 étape oubliée.
          </p>
        </div>
        {all.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {doneCount}/{all.length} fait{doneCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {all.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune tâche. Ajoute la checklist type pour démarrer.
          </p>
          <form action={seedChecklist.bind(null, releaseId)}>
            <Button type="submit">Ajouter la checklist type</Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {CHECKLIST_PHASES.map((phase) => {
            const group = all.filter((i) => i.phase === phase);
            if (group.length === 0) return null;
            return (
              <div key={phase} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">
                  {CHECKLIST_PHASE_LABELS[phase]}
                </h3>
                <ul className="flex flex-col gap-1">
                  {group.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2"
                    >
                      <form
                        action={toggleChecklistItem.bind(
                          null,
                          item.id,
                          releaseId,
                          !item.is_done,
                        )}
                        className="flex"
                      >
                        <button
                          type="submit"
                          aria-label={item.is_done ? "Décocher" : "Cocher"}
                          className={cn(
                            "flex h-[19px] w-[19px] items-center justify-center rounded-[6px] border-2 transition-colors",
                            item.is_done
                              ? "border-primary bg-primary text-white"
                              : "border-input text-transparent hover:border-primary",
                          )}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </button>
                      </form>
                      <span
                        className={`flex-1 text-sm ${
                          item.is_done
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {formatDateFr(item.due_date)}
                        </span>
                      )}
                      <form
                        action={deleteChecklistItem.bind(
                          null,
                          item.id,
                          releaseId,
                        )}
                        className="flex"
                      >
                        <button
                          type="submit"
                          className="flex text-muted-foreground hover:text-destructive"
                          aria-label="Supprimer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <form
            action={addChecklistItem.bind(null, releaseId)}
            className="flex flex-wrap items-center gap-2 border-t pt-3"
          >
            <Input
              name="label"
              placeholder="Nouvelle tâche…"
              required
              className="h-8 min-w-44 flex-1 text-sm"
            />
            <select name="phase" defaultValue="PRE" className={selectClass}>
              {CHECKLIST_PHASES.map((p) => (
                <option key={p} value={p}>
                  {CHECKLIST_PHASE_LABELS[p]}
                </option>
              ))}
            </select>
            <Input name="due_date" type="date" className="h-8 text-sm" />
            <Button type="submit" size="sm" variant="secondary">
              + Ajouter
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
