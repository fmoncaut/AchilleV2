import { EmptyState as EmptyStateView } from "@/components/ui/empty-state";

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
    <div className="bg-surface-container-lowest shadow-sm rounded-2xl">
      <EmptyStateView
        title={title}
        description={description}
        action={
          actionHref && actionLabel
            ? { href: actionHref, label: actionLabel }
            : undefined
        }
      />
    </div>
  );
}
