import { redirect } from "next/navigation";

// Le profil artiste vit désormais dans Réglages › Profil artiste.
export default function ProfilePage() {
  redirect("/settings");
}
