import Link from "next/link";

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
    <div className="bg-card ring-border rounded-2xl p-8 text-center shadow-sm ring-1">
      <h2 className="text-navy text-xl font-bold">{title}</h2>
      <p className="text-slate mt-2 text-sm font-medium">{description}</p>
      {actionHref && actionLabel ? (
        <p className="mt-6">
          <Link
            href={actionHref}
            className="bg-orange text-navy inline-flex h-11 items-center rounded-xl px-6 text-sm font-bold"
          >
            {actionLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
