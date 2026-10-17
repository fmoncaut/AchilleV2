import { EmptyState } from "@/components/ui/empty-state";

export function SearchStatus({
  title,
  description,
  icon = "search_off",
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  icon?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div
      role="status"
      className="bg-surface-container-lowest shadow-sm rounded-2xl"
    >
      <EmptyState
        heading="h2"
        icon={icon}
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
