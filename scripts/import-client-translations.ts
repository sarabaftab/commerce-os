/**
 * Idempotent import of Billion client Khmer translations into content fields.
 *
 * Usage:
 *   npx tsx scripts/import-client-translations.ts            # dry run (default)
 *   npx tsx scripts/import-client-translations.ts --write    # apply updates
 *
 * Never creates/deletes products. Never overwrites English. Never touches prices/SKU/stock.
 * Refuses ambiguous matches. Tenant-scoped via scripts/data/billion-client-translations.json.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

type ProductEntry = {
  clientKey: string;
  nameKm: string;
  descriptionKm: string;
  matchNameContainsAll: string[];
  confidence: "high" | "medium" | "low";
  note?: string;
};

type TranslationFile = {
  tenantSlug: string;
  categories: Array<{ matchNameExact: string; nameKm: string; note?: string }>;
  faqs: Array<{
    matchQuestionExact: string;
    questionKm: string;
    answerKm: string;
  }>;
  products: ProductEntry[];
};

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArgs(argv: string[]) {
  return {
    write: argv.includes("--write"),
  };
}

async function main() {
  const { write } = parseArgs(process.argv.slice(2));
  const dataPath = resolve(
    process.cwd(),
    "scripts/data/billion-client-translations.json",
  );
  const data = JSON.parse(readFileSync(dataPath, "utf8")) as TranslationFile;
  const prisma = new PrismaClient();

  console.log(write ? "MODE: WRITE" : "MODE: DRY RUN (no writes)");
  console.log(`Tenant slug: ${data.tenantSlug}`);

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug },
      select: { id: true, slug: true, name: true },
    });
    if (!tenant) {
      throw new Error(`Tenant not found: ${data.tenantSlug}`);
    }

    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        nameKm: true,
        descriptionKm: true,
        slug: true,
      },
      orderBy: { name: "asc" },
    });
    const categories = await prisma.category.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: { id: true, name: true, nameKm: true, slug: true },
    });
    const faqs = await prisma.faq.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        question: true,
        questionKm: true,
        answer: true,
        answerKm: true,
      },
    });

    const matchedProductIds = new Set<string>();
    let updates = 0;

    console.log("\n=== PRODUCTS ===");
    for (const entry of data.products) {
      if (entry.confidence !== "high") {
        console.log(`AMBIGUOUS/SKIP (${entry.confidence}): ${entry.clientKey}`);
        continue;
      }
      const needles = entry.matchNameContainsAll.map(normalizeName);
      const matches = products.filter((p) => {
        const n = normalizeName(p.name);
        return needles.every((needle) => n.includes(needle));
      });

      if (matches.length === 0) {
        console.log(`UNMATCHED: ${entry.clientKey}`);
        continue;
      }

      // Guard: each matched product must not already be claimed by another entry
      for (const match of matches) {
        if (matchedProductIds.has(match.id)) {
          console.log(
            `AMBIGUOUS: ${entry.clientKey} overlaps already-matched product "${match.name}"`,
          );
          continue;
        }
        matchedProductIds.add(match.id);
        console.log("MATCHED:");
        console.log(`  English: ${match.name}`);
        console.log(`  Product/SKU slug: ${match.slug}`);
        console.log(`  Khmer name to set: ${entry.nameKm}`);
        console.log(`  Khmer description to set: ${entry.descriptionKm.slice(0, 80)}…`);
        if (entry.note) console.log(`  Note: ${entry.note}`);

        if (write) {
          await prisma.product.update({
            where: { id: match.id },
            data: {
              nameKm: entry.nameKm,
              descriptionKm: entry.descriptionKm,
            },
          });
          updates += 1;
        }
      }
    }

    const unmatchedProducts = products.filter((p) => !matchedProductIds.has(p.id));
    if (unmatchedProducts.length) {
      console.log("\nDB products without client translation:");
      for (const p of unmatchedProducts) {
        console.log(`  - ${p.name}`);
      }
    }

    console.log("\n=== CATEGORIES ===");
    for (const entry of data.categories) {
      const match = categories.find(
        (c) => normalizeName(c.name) === normalizeName(entry.matchNameExact),
      );
      if (!match) {
        console.log(`UNMATCHED category: ${entry.matchNameExact}`);
        continue;
      }
      console.log("MATCHED:");
      console.log(`  English: ${match.name}`);
      console.log(`  Khmer field to set: nameKm = ${entry.nameKm}`);
      if (write) {
        await prisma.category.update({
          where: { id: match.id },
          data: { nameKm: entry.nameKm },
        });
        updates += 1;
      }
    }

    console.log("\n=== FAQS ===");
    for (const entry of data.faqs) {
      const match = faqs.find(
        (f) => normalizeName(f.question) === normalizeName(entry.matchQuestionExact),
      );
      if (!match) {
        console.log(`UNMATCHED FAQ: ${entry.matchQuestionExact}`);
        continue;
      }
      console.log("MATCHED:");
      console.log(`  English Q: ${match.question}`);
      console.log(`  Khmer question to set: ${entry.questionKm}`);
      console.log(`  Khmer answer to set: ${entry.answerKm.slice(0, 80)}…`);
      if (write) {
        await prisma.faq.update({
          where: { id: match.id },
          data: {
            questionKm: entry.questionKm,
            answerKm: entry.answerKm,
          },
        });
        updates += 1;
      }
    }

    console.log(
      write
        ? `\nDone. Applied ${updates} record updates.

Cache (existing architecture — no redesign):
  Catalog TTL: 60s via unstable_cache revalidate
  FAQ TTL:     60s via unstable_cache revalidate
  Tags:        catalog:${tenant.id}
               catalog:${tenant.id}:categories
               catalog:${tenant.id}:product:<slug>
               faq:${tenant.id}
  This CLI cannot call Next.js revalidateTag (server-runtime only).
  Khmer content appears after the 60s TTL on the next storefront request,
  after a new deploy (fresh data cache), or immediately if Admin saves any
  product/category/FAQ (those actions already revalidate the tags above).`
        : "\nDry run complete. Re-run with --write to apply.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
