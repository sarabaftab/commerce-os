import { prisma } from "@/shared/db/prisma";

import {
  customerSourceKindLabel,
  parseTelegramStartParam,
  type CustomerSourceKind,
} from "../source";

export type CustomerSourceBreakdown = {
  kind: CustomerSourceKind | null;
  label: string;
  count: number;
};

/**
 * First-touch attribution. Writes only when a reliable source is present and
 * the customer has no source key yet. A later visit cannot overwrite it, and
 * a missing/invalid param never replaces a known source.
 * Scoped to the tenant that authenticated the customer.
 */
export async function recordFirstTouchCustomerSource(input: {
  tenantId: string;
  customerId: string;
  startParam?: string | null;
}): Promise<boolean> {
  const parsed = parseTelegramStartParam(input.startParam);
  if (!parsed) {
    return false;
  }

  const result = await prisma.customer.updateMany({
    where: {
      id: input.customerId,
      tenantId: input.tenantId,
      deletedAt: null,
      sourceKey: null,
    },
    data: {
      sourceKind: parsed.kind,
      sourceKey: parsed.key,
      sourceAttributedAt: new Date(),
    },
  });

  return result.count > 0;
}

/** Tenant-scoped counts for the admin customer list. One grouped query. */
export async function summarizeCustomerSources(
  tenantId: string,
): Promise<CustomerSourceBreakdown[]> {
  const rows = await prisma.customer.groupBy({
    by: ["sourceKind"],
    where: { tenantId, deletedAt: null },
    _count: { _all: true },
  });

  return rows
    .map((row) => ({
      kind: (row.sourceKind as CustomerSourceKind | null) ?? null,
      label: customerSourceKindLabel(row.sourceKind),
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
