import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { formatDateFr } from "@/lib/format";
import { TEMPLATE_META, type WindowTemplate } from "@/lib/domain/timeline";
import { DSP_LABELS, type DspKey } from "@/lib/domain/release";
import { TimelineView } from "@/components/timeline-view";
import { SourceBlocksSection } from "@/components/source-blocks-section";
import { deleteRelease } from "../actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getUserOrRedirect();
  const supabase = await createClient();

  const { data: release } = await supabase
    .from("release")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!release) {
    notFound();
  }

  // Contexte EP : enfants (si EP) ou parent (si single rattaché).
  const { data: children } =
    release.type === "EP"
      ? await supabase
          .from("release")
          .select("id, title, release_date")
          .eq("parent_release_id", id)
          .order("release_date", { ascending: true })
      : { data: null };

  const parent = release.parent_release_id
    ? (
        await supabase
          .from("release")
          .select("id, title")
          .eq("id", release.parent_release_id)
          .maybeSingle()
      ).data
    : null;

  const dsp = (release.dsp_links ?? {}) as Record<string, string>;
  const dspEntries = Object.entries(dsp).filter(([, v]) => v);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href="/releases"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Releases
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {release.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {release.type === "EP" ? "EP" : "Single"}
            </Badge>
            <Badge variant="outline">
              {TEMPLATE_META[release.window_template as WindowTemplate]?.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Sortie le {formatDateFr(release.release_date)}
            </span>
            {parent && (
              <span className="text-sm text-muted-foreground">
                · extrait de{" "}
                <Link
                  href={`/releases/${parent.id}`}
                  className="underline underline-offset-2"
                >
                  {parent.title}
                </Link>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/releases/${id}/board`}
            className={buttonVariants({ size: "sm" })}
          >
            Ouvrir le pipeline
          </Link>
          <Link
            href={`/releases/${id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Modifier
          </Link>
          <form action={deleteRelease.bind(null, id)}>
            <Button type="submit" variant="ghost" size="sm">
              Supprimer
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline de promo</CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineView
              template={release.window_template as WindowTemplate}
              releaseDate={release.release_date}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="BPM" value={release.bpm?.toString() ?? "—"} />
              <Row label="Mood" value={release.mood ?? "—"} />
              <Row label="Statut" value={release.status ?? "—"} />
              <div className="pt-2">
                <span className="text-muted-foreground">Liens DSP</span>
                {dspEntries.length === 0 ? (
                  <p className="text-muted-foreground">—</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1">
                    {dspEntries.map(([key, url]) => (
                      <li key={key}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          {DSP_LABELS[key as DspKey] ?? key}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {release.type === "EP" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Singles de l&apos;EP</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {!children || children.length === 0 ? (
                  <p className="text-muted-foreground">
                    Aucun single rattaché pour l&apos;instant.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {children.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/releases/${c.id}`}
                          className="underline underline-offset-2"
                        >
                          {c.title}
                        </Link>{" "}
                        <span className="text-muted-foreground">
                          — {formatDateFr(c.release_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SourceBlocksSection releaseId={id} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
