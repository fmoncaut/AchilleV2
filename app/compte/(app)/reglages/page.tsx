import { redirect } from "next/navigation";

export const metadata = {
  title: "Réglages — Akwire",
};

export default function ReglagesIndexPage() {
  redirect("/compte/reglages/profil");
}
