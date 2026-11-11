import Link from "next/link";

type AccountLoadErrorProps = {
  tenantSlug: string;
};

/**
 * Soft recovery when Account hits a transient DB pool timeout (P2024).
 * Session may be valid — do not treat this as "logged out".
 */
export function AccountLoadError({ tenantSlug }: AccountLoadErrorProps) {
  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-[family-name:var(--font-shop-display)] text-2xl tracking-tight">
        Account is busy
      </h1>
      <p className="text-sm text-[color:var(--shop-ink-muted)]">
        We could not load your account details just now. Your login is still active — please try
        again in a moment.
      </p>
      <Link
        href={`/${tenantSlug}/account`}
        prefetch={false}
        className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--shop-primary)] px-4 text-sm font-semibold text-[color:var(--shop-on-primary)]"
      >
        Try again
      </Link>
    </div>
  );
}
