import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrRedirect } from "@/lib/auth";
import { ReleaseForm } from "@/components/release-form";
import { updateRelease } from "../../actions";

export default async function EditReleasePage({
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

  // EP candidats comme parent, en excluant la release elle-même.
  const { data: eps } = await supabase
    .from("release")
    .select("id, title")
    .eq("type", "EP")
    .neq("id", id)
    .order("title", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/releases/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {release.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Modifier la release
        </h1>
      </div>

      <ReleaseForm
        initial={release}
        parents={eps ?? []}
        action={updateRelease.bind(null, id)}
        submitLabel="Enregistrer les modifications"
      />
    </div>
  );
}
