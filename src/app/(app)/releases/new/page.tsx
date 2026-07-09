import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { listTemplates } from "@/lib/templates";
import { ReleaseForm } from "@/components/release-form";
import { createRelease } from "../actions";

export default async function NewReleasePage() {
  await getUserOrRedirect();
  const supabase = await createClient();
  const [{ data: eps }, templates] = await Promise.all([
    supabase
      .from("release")
      .select("id, title")
      .eq("type", "EP")
      .order("title", { ascending: true }),
    listTemplates(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/releases"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Releases
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouvelle release
        </h1>
      </div>

      <ReleaseForm
        initial={null}
        parents={eps ?? []}
        templates={templates}
        action={createRelease}
        submitLabel="Créer la release"
      />
    </div>
  );
}
