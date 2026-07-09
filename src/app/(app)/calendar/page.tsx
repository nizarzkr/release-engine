import Link from "next/link";
import { getUserOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildCalendarModel } from "@/lib/domain/calendar";
import { ReleaseCalendar } from "@/components/release-calendar";
import { Card, CardContent } from "@/components/ui/card";

export default async function CalendarPage() {
  await getUserOrRedirect();
  const supabase = await createClient();

  const { data: releases } = await supabase
    .from("release")
    .select("id, title, type, window_template, release_date")
    .order("release_date", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const model = buildCalendarModel(releases ?? [], today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendrier</h1>
        <p className="text-muted-foreground">
          Fenêtres de promo de toutes tes releases — repère les chevauchements
          en un coup d&apos;œil.
        </p>
      </div>

      {model.rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucune release à afficher.{" "}
            <Link href="/releases/new" className="underline underline-offset-2">
              Créer une release
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ReleaseCalendar model={model} />
      )}
    </div>
  );
}
