import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-surface-container animate-pulse rounded-xl", className)}
      aria-hidden
    />
  );
}

function OfferCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest border-outline-variant overflow-hidden rounded-2xl border">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  );
}

function OfferListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <OfferCardSkeleton key={index} />
      ))}
    </div>
  );
}

export { OfferCardSkeleton, OfferListSkeleton, Skeleton };
