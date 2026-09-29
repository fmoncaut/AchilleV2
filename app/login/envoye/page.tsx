import { redirect } from "next/navigation";

/** Ancien écran magic-link — redirige vers la saisie OTP. */
export default function LoginLinkSentPage() {
  redirect("/login/otp");
}
