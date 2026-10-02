import { redirect } from "next/navigation";

export const metadata = {
  title: "Réglages — Achille",
};

export default function ReglagesIndexPage() {
  redirect("/compte/reglages/profil");
}
