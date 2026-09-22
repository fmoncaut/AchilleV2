import {
  saveFeeRateAction,
  startOnboardingAction,
} from "@/app/admin/paiement-actions";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
  adminFieldClass,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireDashboardActor } from "@/lib/admin/actor";
import { prisma } from "@/lib/db";
import { syncConnectAccount } from "@/lib/payments/connect";
import { PaymentError } from "@/lib/payments/types";

export const metadata = {
  title: "Paiements | Back-office Achille",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function connectLabel(merchant: {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
}): string {
  if (merchant.chargesEnabled && merchant.stripeAccountId) {
    return "Activé";
  }
  if (merchant.stripeAccountId) {
    return "À compléter";
  }
  return "Non commencé";
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const actor = await requireDashboardActor();
  const query = await searchParams;
  const focus = first(query.merchant);
  const shouldSync = first(query.retour) === "1" || first(query.refresh) === "1";
  let syncError: string | null = null;
  if (
    shouldSync &&
    focus &&
    (actor.role === "ADMIN" || actor.merchantId === focus)
  ) {
    try {
      await syncConnectAccount(focus);
    } catch (error) {
      if (error instanceof PaymentError) {
        syncError = error.message;
      } else {
        throw error;
      }
    }
  }

  const merchants = await prisma.merchant.findMany({
    where: actor.role === "ADMIN" ? undefined : { id: actor.merchantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      stripeAccountId: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      feeRate: true,
      isActive: true,
    },
  });
  const error = syncError ?? first(query.erreur);

  return (
    <AdminMain>
      <div>
        <AdminKicker>
          {actor.role === "ADMIN" ? "Console Achille" : actor.merchantName}
        </AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Paiements
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Compte Stripe Connect de l’enseigne. Sans compte activé, les
          réservations en retrait payées sont refusées.
        </p>
      </div>
      {error ? (
        <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
          {error}
        </p>
      ) : null}
      {first(query.enregistre) === "1" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Commission enregistrée.
        </p>
      ) : null}
      {merchants.length === 0 ? (
        <AdminCard>
          <p className="font-body-sm text-on-surface-variant">
            Aucune enseigne à configurer.
          </p>
        </AdminCard>
      ) : (
        <AdminTable className="min-w-[40rem]">
          <AdminThead>
            <tr>
              <th className="px-4 py-3">Enseigne</th>
              <th className="px-4 py-3">Connect</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </AdminThead>
          <tbody>
            {merchants.map((merchant) => (
              <tr
                key={merchant.id}
                className="border-surface-container-high border-t"
              >
                <td className="font-body-sm text-primary-container px-4 py-3">
                  {merchant.name}
                  {merchant.isActive ? null : (
                    <span className="text-on-surface-variant block text-xs">
                      Enseigne inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-label-xs text-label-xs bg-primary-container text-on-primary rounded-full px-2.5 py-1 font-bold">
                    {connectLabel(merchant)}
                  </span>
                  {merchant.detailsSubmitted ? (
                    <span className="font-body-sm text-on-surface-variant mt-1 block">
                      Dossier envoyé
                      {merchant.payoutsEnabled ? " · virements actifs" : ""}
                    </span>
                  ) : null}
                </td>
                <td className="font-body-sm text-on-surface-variant px-4 py-3">
                  {merchant.feeRate == null
                    ? "Défaut (STRIPE_DEFAULT_FEE_RATE)"
                    : `${merchant.feeRate.mul(100).toString()} %`}
                  {actor.role === "ADMIN" ? (
                    <form action={saveFeeRateAction} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="merchantId" value={merchant.id} />
                      <div className="w-24">
                        <input
                          name="feePercent"
                          inputMode="decimal"
                          placeholder="8"
                          aria-label={`Commission ${merchant.name} en pourcent`}
                          className={adminFieldClass}
                        />
                      </div>
                      <Button type="submit" size="sm" variant="outline">
                        Enregistrer
                      </Button>
                    </form>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <form action={startOnboardingAction}>
                    <input type="hidden" name="merchantId" value={merchant.id} />
                    <Button type="submit" size="sm">
                      {merchant.stripeAccountId
                        ? "Continuer l’onboarding"
                        : "Activer l’encaissement"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
