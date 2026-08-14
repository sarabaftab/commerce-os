import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  href?: string;
  actionLabel?: string;
};

export function SectionHeader({
  title,
  href,
  actionLabel = "See all",
}: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-[family-name:var(--font-shop-display)] text-2xl tracking-tight text-[color:var(--shop-ink)]">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="pb-1 text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
