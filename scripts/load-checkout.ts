/**
 * Staging-only checkout hold-time + concurrency probe.
 *
 * Uses real `placeGuestOrder` against the DB in DATABASE_URL.
 * Creates tagged fake pickup+COD orders (referralCode=LOADTEST) and can clean them up.
 *
 * Usage:
 *   LOAD_TEST_ENV=staging \
 *   LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION \
 *   LOAD_ALLOW_CHECKOUT=1 \
 *   npm run load:checkout
 *
 * Optional:
 *   LOAD_TENANT_SLUG=kin-a2
 *   LOAD_CHECKOUT_SERIAL=10
 *   LOAD_CHECKOUT_LEVELS=1,3,5,8,10
 *   LOAD_CHECKOUT_POOL=15
 *   LOAD_CHECKOUT_CLEANUP=1
 */
import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const ACK_VALUE = "I_CONFIRM_NON_PRODUCTION";
const ALLOWED_ENVS = new Set(["local", "staging"]);
const TAG = "LOADTEST";

const LOAD_TEST_ENV = (process.env.LOAD_TEST_ENV ?? "").trim().toLowerCase();
const LOAD_TEST_ACK = (process.env.LOAD_TEST_ACK ?? "").trim();
const LOAD_ALLOW_CHECKOUT = (process.env.LOAD_ALLOW_CHECKOUT ?? "").trim();
const TENANT = process.env.LOAD_TENANT_SLUG ?? "kin-a2";
const SERIAL_N = Number(process.env.LOAD_CHECKOUT_SERIAL ?? 10);
const LEVELS = (process.env.LOAD_CHECKOUT_LEVELS ?? "1,3,5,8,10")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const POOL = Number(process.env.LOAD_CHECKOUT_POOL ?? 15);
const DO_CLEANUP = (process.env.LOAD_CHECKOUT_CLEANUP ?? "1").trim() !== "0";

function assertSafeToRun(): void {
  if (!ALLOWED_ENVS.has(LOAD_TEST_ENV)) {
    console.error("Refusing: set LOAD_TEST_ENV=local or LOAD_TEST_ENV=staging");
    process.exit(1);
  }
  if (LOAD_TEST_ACK !== ACK_VALUE) {
    console.error(`Refusing: set LOAD_TEST_ACK=${ACK_VALUE}`);
    process.exit(1);
  }
  if (LOAD_ALLOW_CHECKOUT !== "1") {
    console.error("Refusing: set LOAD_ALLOW_CHECKOUT=1 (checkout writes)");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
}

function bumpPoolLimit(url: string, limit: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("connection_limit", String(limit));
    parsed.searchParams.set("pool_timeout", "20");
    return parsed.toString();
  } catch {
    return url;
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, idx)]!);
}

function summarize(label: string, times: number[], fails: number) {
  const sorted = [...times].sort((a, b) => a - b);
  const ok = times.length;
  const total = ok + fails;
  const elapsedSec =
    sorted.length > 0 ? (sorted.reduce((a, b) => a + b, 0) / 1000) : 0;
  // wall throughput reported by caller; here per-call stats
  return {
    label,
    ok,
    fail: fails,
    total,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted.length ? Math.round(sorted[sorted.length - 1]!) : 0,
    mean: sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0,
    sumSec: Math.round(elapsedSec * 10) / 10,
  };
}

async function main() {
  assertSafeToRun();

  // Allow enough client slots for parallel checkouts in this one process.
  // Shared prisma only keeps an existing connection_limit if already set.
  process.env.DATABASE_URL = bumpPoolLimit(process.env.DATABASE_URL!, POOL);
  if (process.env.DIRECT_URL) {
    process.env.DIRECT_URL = bumpPoolLimit(process.env.DIRECT_URL, POOL);
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const checkoutMod = await import(
    "../src/modules/orders/services/checkout-service.ts"
  );
  const placeGuestOrder =
    checkoutMod.placeGuestOrder ?? checkoutMod.default?.placeGuestOrder;
  if (typeof placeGuestOrder !== "function") {
    console.error("Could not import placeGuestOrder");
    process.exit(1);
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: TENANT, isActive: true },
    include: { pickupLocations: { where: { isActive: true }, take: 1 } },
  });
  if (!tenant) {
    console.error(`Tenant not found: ${TENANT}`);
    process.exit(1);
  }

  const product = await prisma.product.findFirst({
    where: { tenantId: tenant.id, deletedAt: null, isAvailable: true },
    select: { id: true, name: true, priceMinor: true },
  });
  if (!product) {
    console.error("No available product to checkout");
    process.exit(1);
  }

  const pickup = tenant.pickupLocations[0];
  if (!pickup) {
    console.error("No active pickup location — seed staging first");
    process.exit(1);
  }

  // Avoid Telegram side-effects during load (safe no-op path).
  await prisma.tenantSettings.update({
    where: { tenantId: tenant.id },
    data: { telegramOrderNotificationsEnabled: false },
  });

  const dbHost = (() => {
    try {
      return new URL(process.env.DATABASE_URL!).hostname;
    } catch {
      return "(unparsed)";
    }
  })();

  console.log(`Checkout load · env=${LOAD_TEST_ENV} · tenant=${TENANT}`);
  console.log(`DB host=${dbHost} · client_pool=${POOL}`);
  console.log(`Product=${product.name} · pickup=${pickup.id}`);
  console.log(`Serial=${SERIAL_N} · levels=${LEVELS.join(",")}`);
  console.log("");

  type Prepared = { guestToken: string; phone: string; index: number };

  async function prepareCart(index: number): Promise<Prepared> {
    const guestToken = randomUUID();
    // Unique valid KH mobiles for upsertCustomerByPhone
    const phone = `+85597${String(1000000 + (Date.now() % 100000) + index).slice(-7)}`;
    const cart = await prisma.cart.create({
      data: {
        tenantId: tenant!.id,
        guestToken,
        status: "open",
        items: {
          create: {
            tenantId: tenant!.id,
            productId: product!.id,
            quantity: 1,
          },
        },
      },
    });
    void cart;
    return { guestToken, phone, index };
  }

  async function oneCheckout(prepared: Prepared): Promise<{ ok: boolean; ms: number; err?: string }> {
    const t0 = performance.now();
    try {
      await placeGuestOrder(
        {
          tenantId: tenant!.id,
          tenantSlug: tenant!.slug,
          currency: tenant!.currency,
          cartIdentity: { tenantId: tenant!.id, guestToken: prepared.guestToken },
          channel: "web",
          referralCode: TAG,
        },
        {
          idempotencyKey: randomUUID(),
          displayName: `${TAG}-${prepared.index}`,
          phone: prepared.phone,
          fulfillmentMethod: "pickup",
          pickupLocationKey: pickup!.id,
          paymentMethod: "cod",
          addressMode: "new",
          saveAddress: false,
          setAddressAsDefault: false,
        },
      );
      return { ok: true, ms: performance.now() - t0 };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { ok: false, ms: performance.now() - t0, err: msg.slice(0, 160) };
    }
  }

  // --- Serial hold-time ---
  console.log(`Preparing ${SERIAL_N} carts for serial hold-time…`);
  const serialCarts = [];
  for (let i = 0; i < SERIAL_N; i++) {
    serialCarts.push(await prepareCart(i));
  }

  const serialTimes: number[] = [];
  let serialFails = 0;
  const serialErrors: string[] = [];
  for (const cart of serialCarts) {
    const result = await oneCheckout(cart);
    if (result.ok) serialTimes.push(result.ms);
    else {
      serialFails += 1;
      if (result.err) serialErrors.push(result.err);
    }
  }
  const serial = summarize("serial_hold", serialTimes, serialFails);
  console.log(
    `Serial hold-time (placeGuestOrder wall ms): p50=${serial.p50} p95=${serial.p95} max=${serial.max} mean=${serial.mean} ok=${serial.ok} fail=${serial.fail}`,
  );
  if (serialErrors[0]) {
    console.log(`  first error: ${serialErrors[0]}`);
  }

  // Throughput estimate from serial hold (idealized, no queueing):
  // usable_slots / (p50_hold_seconds)
  const holdSec = serial.p50 / 1000;
  if (holdSec > 0) {
    const est = Math.round((POOL / holdSec) * 10) / 10;
    console.log(
      `Idealized checkouts/sec ≈ pool(${POOL}) / hold_p50(${holdSec}s) = ${est}/s (hypothesis, not measured concurrency)`,
    );
  }
  console.log("");

  // --- Parallel levels ---
  const parallelRows: Array<ReturnType<typeof summarize> & { vu: number; wallMs: number; rps: number }> =
    [];

  for (const vu of LEVELS) {
    process.stdout.write(`Parallel ${vu}… `);
    const carts = [];
    for (let i = 0; i < vu; i++) {
      carts.push(await prepareCart(10_000 + vu * 100 + i));
    }
    const times: number[] = [];
    let fails = 0;
    const errors: string[] = [];
    const wall0 = performance.now();
    const results = await Promise.all(carts.map((c) => oneCheckout(c)));
    const wallMs = performance.now() - wall0;
    for (const r of results) {
      if (r.ok) times.push(r.ms);
      else {
        fails += 1;
        if (r.err) errors.push(r.err);
      }
    }
    const row = {
      ...summarize(`parallel_${vu}`, times, fails),
      vu,
      wallMs: Math.round(wallMs),
      rps: wallMs > 0 ? Math.round((times.length / (wallMs / 1000)) * 10) / 10 : 0,
    };
    parallelRows.push(row);
    console.log(
      `ok=${row.ok} fail=${row.fail} p50=${row.p50}ms p95=${row.p95}ms wall=${row.wallMs}ms rps=${row.rps}`,
    );
    if (errors[0]) console.log(`  first error: ${errors[0]}`);
  }

  console.log("\nParallel summary:");
  console.table(
    parallelRows.map((r) => ({
      vu: r.vu,
      ok: r.ok,
      fail: r.fail,
      p50: r.p50,
      p95: r.p95,
      max: r.max,
      wallMs: r.wallMs,
      rps: r.rps,
    })),
  );

  if (DO_CLEANUP) {
    console.log("\nCleaning LOADTEST orders…");
    const orders = await prisma.order.findMany({
      where: { tenantId: tenant.id, referralCode: TAG },
      select: { id: true, customerId: true },
    });
    const orderIds = orders.map((o) => o.id);
    const customerIds = [...new Set(orders.map((o) => o.customerId))];

    if (orderIds.length) {
      await prisma.customerNotification.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    // Converted carts left over from LOADTEST guests (guestToken carts already converted)
    await prisma.cartItem.deleteMany({
      where: {
        cart: { tenantId: tenant.id, customerId: { in: customerIds } },
      },
    });
    await prisma.cart.deleteMany({
      where: { tenantId: tenant.id, customerId: { in: customerIds } },
    });

    // Customers created only for this tag (displayName prefix)
    await prisma.customer.deleteMany({
      where: {
        tenantId: tenant.id,
        id: { in: customerIds },
        displayName: { startsWith: TAG },
      },
    });

    console.log(`Removed ${orderIds.length} tagged orders (and related rows).`);
  } else {
    console.log("\nSkipped cleanup (LOAD_CHECKOUT_CLEANUP=0).");
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
