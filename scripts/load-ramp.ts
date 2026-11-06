/**
 * Concurrent HTTP ramp for capacity checks (browse + cart GET).
 *
 * Read-only GETs only. Requires explicit non-production acknowledgement.
 *
 * Usage:
 *   LOAD_TEST_ENV=local \
 *   LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION \
 *   LOAD_BASE_URL=http://localhost:3000 \
 *   npm run load:ramp
 *
 * See docs/capacity-testing.md and docs/performance-runbook.md.
 */
import { performance } from "node:perf_hooks";

const ACK_VALUE = "I_CONFIRM_NON_PRODUCTION";
const ALLOWED_ENVS = new Set(["local", "staging"]);

const BASE_URL = (process.env.LOAD_BASE_URL ?? "").replace(/\/$/, "");
const TENANT = process.env.LOAD_TENANT_SLUG ?? "kin-a2";
const LOAD_TEST_ENV = (process.env.LOAD_TEST_ENV ?? "").trim().toLowerCase();
const LOAD_TEST_ACK = (process.env.LOAD_TEST_ACK ?? "").trim();
const LEVELS = (process.env.LOAD_LEVELS ?? "1,5,10,20")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const DURATION_MS = Number(process.env.LOAD_DURATION_MS ?? 8_000);
const PATHS = [
  `/${TENANT}`,
  `/${TENANT}/products`,
  `/${TENANT}/cart`,
  `/api/v1/health`,
];

type Stat = {
  vu: number;
  requests: number;
  ok: number;
  fail: number;
  p50: number;
  p95: number;
  max: number;
  rps: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, idx)]!);
}

async function oneRequest(path: string): Promise<{ ok: boolean; ms: number; status: number }> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      redirect: "manual",
      headers: { Accept: "text/html, application/json" },
    });
    await res.arrayBuffer();
    const ms = performance.now() - t0;
    const ok = res.ok || res.status === 302 || res.status === 307;
    return { ok, ms, status: res.status };
  } catch {
    return { ok: false, ms: performance.now() - t0, status: 0 };
  }
}

async function runLevel(vu: number): Promise<Stat> {
  const times: number[] = [];
  let ok = 0;
  let fail = 0;
  const end = Date.now() + DURATION_MS;

  async function worker() {
    let i = 0;
    while (Date.now() < end) {
      const path = PATHS[i % PATHS.length]!;
      i += 1;
      const result = await oneRequest(path);
      times.push(result.ms);
      if (result.ok) ok += 1;
      else fail += 1;
    }
  }

  const started = performance.now();
  await Promise.all(Array.from({ length: vu }, () => worker()));
  const elapsedSec = (performance.now() - started) / 1000;
  times.sort((a, b) => a - b);

  return {
    vu,
    requests: times.length,
    ok,
    fail,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    max: times.length ? Math.round(times[times.length - 1]!) : 0,
    rps: elapsedSec > 0 ? Math.round((times.length / elapsedSec) * 10) / 10 : 0,
  };
}

function assertSafeToRun(): void {
  if (!ALLOWED_ENVS.has(LOAD_TEST_ENV)) {
    console.error(
      "Refusing to run: set LOAD_TEST_ENV=local or LOAD_TEST_ENV=staging",
    );
    console.error("Preview/production URLs are not enough — confirm DB isolation first.");
    process.exit(1);
  }
  if (LOAD_TEST_ACK !== ACK_VALUE) {
    console.error(
      `Refusing to run: set LOAD_TEST_ACK=${ACK_VALUE}`,
    );
    console.error("See docs/performance-runbook.md §1.");
    process.exit(1);
  }
}

async function main() {
  assertSafeToRun();

  if (!BASE_URL) {
    console.error("Set LOAD_BASE_URL (e.g. http://localhost:3000 or your staging URL)");
    process.exit(1);
  }
  if (LEVELS.length === 0) {
    console.error("LOAD_LEVELS must list positive integers, e.g. 1,5,10,20");
    process.exit(1);
  }

  console.log(`Load ramp · env=${LOAD_TEST_ENV} · base=${BASE_URL} · tenant=${TENANT}`);
  console.log(`Levels=${LEVELS.join(",")} · duration/level=${DURATION_MS}ms`);
  console.log(`Paths: ${PATHS.join(", ")}`);
  console.log("");

  const rows: Stat[] = [];
  for (const vu of LEVELS) {
    process.stdout.write(`Running ${vu} VU… `);
    const stat = await runLevel(vu);
    rows.push(stat);
    console.log(
      `req=${stat.requests} ok=${stat.ok} fail=${stat.fail} p50=${stat.p50}ms p95=${stat.p95}ms rps=${stat.rps}`,
    );
  }

  console.log("\nSummary:");
  console.table(rows);

  const firstBad = rows.find((r) => r.fail / Math.max(1, r.requests) > 0.05);
  if (firstBad) {
    console.log(
      `\nFirst level with >5% failures: ${firstBad.vu} VU (fail=${firstBad.fail}/${firstBad.requests}).`,
    );
    console.log("Check app logs / Supabase for pool exhaustion if failures cluster here.");
  } else {
    console.log("\nNo level exceeded 5% failures. Raise LOAD_LEVELS or duration for a harder test.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
