"use client";

import { useActionState, useState } from "react";
import { Disc3 } from "lucide-react";
import { login, signup, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : signup,
    {},
  );

  const isLogin = mode === "login";

  return (
    <main
      className="flex flex-1 items-center justify-center px-6 py-16"
      style={{
        backgroundImage:
          "radial-gradient(600px 340px at 50% -5%, rgba(30,138,95,0.10), transparent 70%)",
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* Marque */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
            <Disc3 className="h-6 w-6" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight">
              Release Engine
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              De la date de sortie au plan de contenu.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {isLogin ? "Connexion" : "Créer un compte"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Connecte-toi pour accéder à tes sorties."
                : "Crée ton compte pour démarrer."}
            </CardDescription>
          </CardHeader>

          <form action={formAction}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="toi@exemple.com"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  placeholder="8 caractères minimum"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              {state?.message && (
                <p className="text-sm font-medium text-primary">
                  {state.message}
                </p>
              )}
            </CardContent>

            <CardFooter className="mt-2 flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "…" : isLogin ? "Se connecter" : "Créer mon compte"}
              </Button>
              <button
                type="button"
                onClick={() => setMode(isLogin ? "signup" : "login")}
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                {isLogin
                  ? "Pas encore de compte ? Créer un compte"
                  : "Déjà un compte ? Se connecter"}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
