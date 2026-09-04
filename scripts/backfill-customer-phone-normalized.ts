/**
 * Backfill Customer.phoneNormalized and report same-tenant duplicate groups.
 *
 * Dry-run by default (no writes). Explicitly pass --apply to persist
 * phoneNormalized values. Never merges/deletes customers.
 *
 * Usage:
 *   npx tsx scripts/backfill-customer-phone-normalized.ts
 *   npx tsx scripts/backfill-customer-phone-normalized.ts --apply
 *   npx tsx scripts/backfill-customer-phone-normalized.ts --tenant=<tenantId>
 */

import "dotenv/config";

import { prisma } from "../src/shared/db/prisma";
import { normalizePhoneToE164 } from "../src/shared/phone/normalize-phone";

type Args = {
  apply: boolean;
  tenantId: string | null;
};

function parseArgs(argv: string[]): Args {
  return {
    apply: argv.includes("--apply"),
    tenantId:
      argv.find((a) => a.startsWith("--tenant="))?.slice("--tenant=".length) || null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.apply ? "APPLY" : "DRY-RUN";

  console.log(`[phone-backfill] mode=${mode} tenant=${args.tenantId ?? "all"}`);

  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      phone: { not: null },
      ...(args.tenantId ? { tenantId: args.tenantId } : {}),
    },
    select: {
      id: true,
      tenantId: true,
      phone: true,
      phoneNormalized: true,
      displayName: true,
      createdAt: true,
      _count: { select: { orders: true, identities: true } },
    },
    orderBy: [{ tenantId: "asc" }, { createdAt: "asc" }],
  });

  let updated = 0;
  let unparseable = 0;
  let alreadySet = 0;
  const byTenantNormalized = new Map<string, typeof customers>();

  for (const customer of customers) {
    const phone = customer.phone ?? "";
    const e164 = normalizePhoneToE164(phone);

    if (!e164) {
      unparseable += 1;
      console.log(
        JSON.stringify({
          event: "phone_unparseable",
          tenantId: customer.tenantId,
          customerId: customer.id,
          phone,
        }),
      );
      continue;
    }

    const groupKey = `${customer.tenantId}::${e164}`;
    const group = byTenantNormalized.get(groupKey) ?? [];
    group.push(customer);
    byTenantNormalized.set(groupKey, group);

    if (customer.phoneNormalized === e164) {
      alreadySet += 1;
      continue;
    }

    if (args.apply) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { phoneNormalized: e164 },
      });
    }

    updated += 1;
    console.log(
      JSON.stringify({
        event: args.apply ? "phone_normalized_applied" : "phone_normalized_would_apply",
        tenantId: customer.tenantId,
        customerId: customer.id,
        phone,
        phoneNormalized: e164,
      }),
    );
  }

  const duplicateGroups = [...byTenantNormalized.entries()].filter(
    ([, group]) => group.length > 1,
  );

  console.log("\n=== Duplicate groups (same tenant + normalized phone) ===");
  if (duplicateGroups.length === 0) {
    console.log("None detected.");
  }

  for (const [key, group] of duplicateGroups) {
    const [tenantId, phoneNormalized] = key.split("::");
    console.log(
      JSON.stringify({
        event: "phone_duplicate_group",
        tenantId,
        phoneNormalized,
        count: group.length,
        customers: group.map((c) => ({
          id: c.id,
          phone: c.phone,
          displayName: c.displayName,
          orderCount: c._count.orders,
          identityCount: c._count.identities,
          createdAt: c.createdAt.toISOString(),
        })),
      }),
    );
  }

  console.log("\n=== Summary ===");
  console.log(
    JSON.stringify({
      mode,
      scanned: customers.length,
      wouldUpdateOrUpdated: updated,
      alreadySet,
      unparseable,
      duplicateGroups: duplicateGroups.length,
      merged: 0,
      note: "No customers were merged. Review duplicate groups before any future merge.",
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
