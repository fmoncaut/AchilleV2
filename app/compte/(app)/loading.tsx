import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <BuyerMain>
      <BuyerSection className="flex flex-col gap-3 py-6" aria-busy="true">
        <p className="sr-only">Chargement du compte</p>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </BuyerSection>
    </BuyerMain>
  );
}
