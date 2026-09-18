"use client";

import type { MessageKey } from "@/shared/i18n";
import { useLocale } from "@/shared/i18n";

type LocalizedTextProps = {
  messageKey: MessageKey;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  className?: string;
  prefix?: string;
  suffix?: string;
};

export function LocalizedText({
  messageKey,
  as: Tag = "span",
  className,
  prefix = "",
  suffix = "",
}: LocalizedTextProps) {
  const { t } = useLocale();
  return <Tag className={className}>{`${prefix}${t(messageKey)}${suffix}`}</Tag>;
}

export function LocalizedFaqHeading({ tenantName }: { tenantName: string }) {
  const { t } = useLocale();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
        {t("faqTitle")}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
        {t("faqAnswersFor")} {tenantName}
      </p>
    </div>
  );
}
