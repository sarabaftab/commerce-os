/**
 * Simple performance baseline (no APM).
 *
 * Usage:
 *   npm run perf:baseline
 *   PERF_BASE_URL=http://localhost:3000 npm run perf:baseline
 *   PERF_TENANT_SLUG=kin-a2 npm run perf:baseline
 *
 * Measures:
 * - DB-side catalog/cart/admin query timings
 * - Optional HTTP TTFB when PERF_BASE_URL is set (requires running server)
 */
import { config as loadEnv } from "dotenv";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing after loading .env / .env.local");
  process.exit(1);
}

const TENANT_SLUG = process.env.PERF_TENANT_SLUG ?? "kin-a2";
const BASE_URL = process.env.PERF_BASE_URL?.replace(/\/$/, "");

type Sample = { label: string; p50: number; min: number; max: number };

async function timedSamples(
  label: string,
  fn: () => Promise<void>,
  rounds = 5,
): Promise<Sample> {
  const times: number[] = [];
  for (let i = 0; i < rounds; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return {
    label,
    p50: Math.round(times[Math.floor(times.length / 2)]!),
    min: Math.round(times[0]!),
    max: Math.round(times[times.length - 1]!),
  };
}

async function measureDb() {
  const prisma = new PrismaClient();

  const tenant = await prisma.tenant.findFirst({
    where: { slug: TENANT_SLUG, isActive: true },
  });
  if (!tenant) {
    console.error(`Tenant not found: ${TENANT_SLUG}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const samples: Sample[] = [];

  samples.push(
    await timedSamples("db.homepage_catalog", async () => {
      await Promise.all([
        prisma.category.findMany({
          where: { tenantId: tenant.id, deletedAt: null, isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        }),
        prisma.product.findMany({
          where: { tenantId: tenant.id, deletedAt: null, isAvailable: true },
          include: {
            category: true,
            media: { orderBy: { sortOrder: "asc" }, take: 1 },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          take: 6,
        }),
      ]);
    }),
  );

  samples.push(
    await timedSamples("db.products_list", async () => {
      await prisma.product.findMany({
        where: { tenantId: tenant.id, deletedAt: null, isAvailable: true },
        include: {
          category: true,
          media: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    }),
  );

  const product = await prisma.product.findFirst({
    where: { tenantId: tenant.id, deletedAt: null, isAvailable: true },
    select: { slug: true },
  });
  if (product) {
    samples.push(
      await timedSamples("db.product_detail", async () => {
        await prisma.product.findFirst({
          where: {
            tenantId: tenant.id,
            slug: product.slug,
            deletedAt: null,
            isAvailable: true,
          },
          include: {
            category: true,
            media: { orderBy: { sortOrder: "asc" }, take: 1 },
          },
        });
      }),
    );
  }

  samples.push(
    await timedSamples("db.open_cart_lean", async () => {
      await prisma.cart.findFirst({
        where: { tenantId: tenant.id, status: "open" },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  priceMinor: true,
                  isAvailable: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      });
    }),
  );

  samples.push(
    await timedSamples("db.admin_product_list_lean", async () => {
      await Promise.all([
        prisma.product.findMany({
          where: { tenantId: tenant.id, deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            priceMinor: true,
            currency: true,
            isAvailable: true,
            category: { select: { id: true, name: true } },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          take: 50,
        }),
        prisma.product.count({ where: { tenantId: tenant.id, deletedAt: null } }),
      ]);
    }),
  );

  samples.push(
    await timedSamples("db.admin_dashboard_counts", async () => {
      await Promise.all([
        prisma.product.count({ where: { tenantId: tenant.id, deletedAt: null } }),
        prisma.product.count({
          where: { tenantId: tenant.id, deletedAt: null, isAvailable: true },
        }),
        prisma.order.count({ where: { tenantId: tenant.id } }),
        prisma.order.count({
          where: {
            tenantId: tenant.id,
            status: {
              in: [
                "pending",
                "confirmed",
                "processing",
                "ready_for_pickup",
                "out_for_delivery",
              ],
            },
          },
        }),
      ]);
    }),
  );

  await prisma.$disconnect();
  return samples;
}

async function measureHttp(): Promise<Sample[]> {
  if (!BASE_URL) {
    return [];
  }

  const paths = [
    `/${TENANT_SLUG}`,
    `/${TENANT_SLUG}/products`,
    `/${TENANT_SLUG}/cart`,
    `/${TENANT_SLUG}/checkout`,
    `/admin`,
  ];

  const productSlug = process.env.PERF_PRODUCT_SLUG;
  if (productSlug) {
    paths.splice(2, 0, `/${TENANT_SLUG}/products/${productSlug}`);
  }

  const samples: Sample[] = [];
  for (const path of paths) {
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      const res = await fetch(`${BASE_URL}${path}`, {
        redirect: "manual",
        headers: { Accept: "text/html" },
      });
      await res.arrayBuffer();
      times.push(performance.now() - t0);
      if (!res.ok && res.status !== 307 && res.status !== 302) {
        console.warn(`HTTP ${res.status} for ${path}`);
      }
    }
    times.sort((a, b) => a - b);
    samples.push({
      label: `http${path}`,
      p50: Math.round(times[1]!),
      min: Math.round(times[0]!),
      max: Math.round(times[2]!),
    });
  }
  return samples;
}

async function main() {
  console.log(`Performance baseline · tenant=${TENANT_SLUG}`);
  if (BASE_URL) {
    console.log(`HTTP base: ${BASE_URL}`);
  } else {
    console.log("HTTP skipped (set PERF_BASE_URL to measure TTFB against a running server)");
  }

  const db = await measureDb();
  const http = await measureHttp();

  console.log("\nResults (ms):");
  console.table([...db, ...http]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
