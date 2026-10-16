import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { OfferListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <BuyerMain>
      <BuyerSection className="flex flex-col gap-4 py-6" aria-busy="true">
        <p className="sr-only">Chargement de la recherche</p>
        <Skeleton className="h-12 w-full rounded-full" />
        <OfferListSkeleton />
      </BuyerSection>
    </BuyerMain>
  );
}
