import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { OfferListSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <BuyerMain>
      <BuyerSection className="py-6" aria-busy="true">
        <p className="sr-only">Chargement</p>
        <OfferListSkeleton />
      </BuyerSection>
    </BuyerMain>
  );
}
