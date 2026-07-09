import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// État vide réutilisable : icône, titre, sous-texte et action optionnelle.
// Uniformise le rendu « rien à afficher » sur toute l'app.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="max-w-sm text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className={buttonVariants({ variant: "outline" })}
          >
            {action.label}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
