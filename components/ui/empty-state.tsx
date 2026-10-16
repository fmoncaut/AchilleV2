import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function EmptyState({
  icon = "search_off",
  kicker,
  title,
  description,
  action,
  secondaryAction,
  heading = "h2",
  className,
}: {
  icon?: string;
  kicker?: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  heading?: "h1" | "h2";
  className?: string;
}) {
  const Title = heading;

  return (
    <div className={cn("px-6 py-10 text-center", className)}>
      <div className="bg-secondary-fixed text-secondary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
        <MaterialIcon name={icon} />
      </div>
      {kicker ? (
        <p className="font-label-xs text-label-xs text-secondary font-bold tracking-wider uppercase">
          {kicker}
        </p>
      ) : null}
      <Title className="font-headline-sm text-headline-sm text-primary-container mt-2">
        {title}
      </Title>
      <p className="font-body-md text-body-md text-on-surface-variant mx-auto mt-2 max-w-md">
        {description}
      </p>
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button asChild variant="outline">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { EmptyState };
