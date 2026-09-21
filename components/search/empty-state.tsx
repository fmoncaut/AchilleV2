import Link from "next/link";

import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="bg-surface-container-lowest shadow-navy-soft rounded-2xl px-6 py-10 text-center">
      <div className="bg-secondary-fixed text-secondary-container mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
        <MaterialIcon name="search_off" className="text-[24px]" />
      </div>
      <h2 className="font-headline-sm text-headline-sm text-primary-container">
        {title}
      </h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant mx-auto mt-2 max-w-md">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <p className="mt-6">
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </p>
      ) : null}
    </div>
  );
}
