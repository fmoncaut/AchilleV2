import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <BuyerMain>
      <BuyerSection className="grid gap-6 py-6 lg:grid-cols-2" aria-busy="true">
        <p className="sr-only">Chargement de l’offre</p>
        <Skeleton className="aspect-square w-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </BuyerSection>
    </BuyerMain>
  );
}
