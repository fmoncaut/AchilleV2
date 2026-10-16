import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { OfferListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <BuyerMain>
      <BuyerSection className="flex flex-col gap-6 py-6" aria-busy="true">
        <p className="sr-only">Chargement du magasin</p>
        <Skeleton className="h-36 w-full" />
        <OfferListSkeleton count={3} />
      </BuyerSection>
    </BuyerMain>
  );
}
