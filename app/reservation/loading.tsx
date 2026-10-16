import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <BuyerMain>
      <BuyerSection className="grid gap-4 py-6 lg:grid-cols-12" aria-busy="true">
        <p className="sr-only">Chargement de la réservation</p>
        <Skeleton className="h-48 lg:col-span-7" />
        <Skeleton className="h-48 lg:col-span-5" />
      </BuyerSection>
    </BuyerMain>
  );
}
