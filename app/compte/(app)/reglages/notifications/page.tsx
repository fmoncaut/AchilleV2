import { redirect } from "next/navigation";

import { updateDealAlertsAction } from "@/app/compte/settings-actions";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { getGlobalNotificationPreference } from "@/lib/account/notifications";

export const metadata = {
  title: "Notifications — Réglages — Akwire",
};

type PageProps = {
  searchParams: Promise<{ ok?: string }>;
};

export default async function NotificationsSettingsPage({
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte/reglages/notifications");
  }

  const [orderUpdates, dealAlerts] = await Promise.all([
    getGlobalNotificationPreference(session.user.id, "ORDER_UPDATES"),
    getGlobalNotificationPreference(session.user.id, "DEAL_ALERTS"),
  ]);
  const dealOn = dealAlerts?.emailEnabled === true;
  const params = await searchParams;

  return (
    <section className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-5 rounded-2xl p-5">
      <div>
        <h2 className="font-headline-sm text-primary-container">
          Notifications
        </h2>
        <p className="font-body-sm text-on-surface-variant mt-1">
          Choisissez les e-mails que vous souhaitez recevoir.
        </p>
      </div>

      {params.ok === "1" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Préférences enregistrées.
        </p>
      ) : null}

      <ul className="flex flex-col gap-4">
        <li className="border-surface-container-high flex flex-col gap-1 border-b pb-4">
          <label className="flex items-start gap-3 opacity-80">
            <input
              type="checkbox"
              checked
              disabled
              readOnly
              className="border-outline mt-1 size-4 rounded"
              aria-label="E-mails essentiels de commande (toujours activés)"
            />
            <span>
              <span className="font-label-md text-primary-container font-bold">
                E-mails essentiels de commande
              </span>
              <span className="font-body-sm text-on-surface-variant mt-1 block">
                Confirmation, prêt au retrait, annulation, expiration — toujours
                activés
                {orderUpdates?.emailEnabled === false
                  ? " (réglage technique réparé à l’enregistrement onboarding)."
                  : "."}
              </span>
            </span>
          </label>
        </li>

        <li className="border-surface-container-high flex flex-col gap-3 border-b pb-4">
          <form action={updateDealAlertsAction} className="flex flex-col gap-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="dealAlerts"
                value="1"
                defaultChecked={dealOn}
                className="border-outline mt-1 size-4 rounded"
              />
              <span>
                <span className="font-label-md text-primary-container font-bold">
                  Alertes bonnes affaires
                </span>
                <span className="font-body-sm text-on-surface-variant mt-1 block">
                  Offres et déstockages près de chez vous (facultatif).
                </span>
              </span>
            </label>
            <Button type="submit" size="sm" className="w-fit">
              Enregistrer
            </Button>
          </form>
        </li>

        <li className="flex flex-col gap-1 opacity-70">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              disabled
              className="border-outline mt-1 size-4 rounded"
              aria-label="Notifications push (bientôt)"
            />
            <span>
              <span className="font-label-md text-primary-container font-bold">
                Notifications push
              </span>
              <span className="font-body-sm text-on-surface-variant mt-1 block">
                Bientôt (application mobile).
              </span>
            </span>
          </label>
        </li>
      </ul>
    </section>
  );
}
