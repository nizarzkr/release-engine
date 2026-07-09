import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { formatDateFr } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReleasesPage() {
  await getUserOrRedirect();
  const supabase = await createClient();
  const { data: releases } = await supabase
    .from("release")
    .select("id, title, type, release_date, window_template, status")
    .order("release_date", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Releases</h1>
          <p className="text-muted-foreground">
            Tes sorties et leurs fenêtres de promo.
          </p>
        </div>
        <Link href="/releases/new" className={buttonVariants()}>
          Nouvelle release
        </Link>
      </div>

      {!releases || releases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune release pour l&apos;instant.
            </p>
            <Link
              href="/releases/new"
              className={buttonVariants({ variant: "outline" })}
            >
              Créer ma première release
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {releases.map((r) => (
            <li key={r.id}>
              <Link href={`/releases/${r.id}`} className="block">
                <Card className="transition-colors hover:border-foreground/30">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{r.title}</span>
                      <span className="text-xs text-muted-foreground">
                        Sortie le {formatDateFr(r.release_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {r.type === "EP" ? "EP" : "Single"}
                      </Badge>
                      <Badge variant="outline">{r.window_template}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
