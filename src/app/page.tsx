import { redirect } from "next/navigation";

// La racine renvoie vers le dashboard. Les visiteurs non connectés sont
// interceptés en amont par le proxy (src/proxy.ts) et envoyés vers /login.
export default function Home() {
  redirect("/dashboard");
}
