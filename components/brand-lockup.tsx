import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandLockupProps = {
  href?: string;
  className?: string;
  /** Pied de page : mark mono (currentColor). */
  mono?: boolean;
};

function BrandMark({ mono }: { mono?: boolean }) {
  if (mono) {
    return (
      <svg
        viewBox="0 0 64 80"
        width={24}
        height={30}
        aria-hidden="true"
        className="text-primary-container shrink-0"
      >
        <path
          fillRule="evenodd"
          fill="currentColor"
          d="M32 5C18.75 5 8 15.52 8 28.5c0 15.5 18.6 39.1 21.9 43.2a2.7 2.7 0 0 0 4.2 0C37.4 67.6 56 44 56 28.5 56 15.52 45.25 5 32 5ZM32 38.5a10.5 10.5 0 1 0 0-21 10.5 10.5 0 0 0 0 21Z"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 64 80"
      width={24}
      height={30}
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M32 5C18.75 5 8 15.52 8 28.5c0 15.5 18.6 39.1 21.9 43.2a2.7 2.7 0 0 0 4.2 0C37.4 67.6 56 44 56 28.5 56 15.52 45.25 5 32 5Z"
        fill="#13263F"
      />
      <circle cx="32" cy="28" r="10.5" fill="#F7A325" />
    </svg>
  );
}

export function BrandLockup({
  href = "/",
  className,
  mono = false,
}: BrandLockupProps) {
  const inner = (
    <>
      <BrandMark mono={mono} />
      <span className="brand-wordmark">akwire</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Akwire — accueil"
        className={cn("inline-flex items-center gap-2", className)}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {inner}
    </span>
  );
}
