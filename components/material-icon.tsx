import { cn } from "@/lib/utils";

type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

export function MaterialIcon({
  name,
  className,
  filled = false,
}: MaterialIconProps) {
  return (
    <span
      className={cn(
        "material-symbols-outlined",
        filled && "material-symbols-filled",
        className,
      )}
      aria-hidden
    >
      {name}
    </span>
  );
}
