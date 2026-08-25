import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isServerlessRuntime(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * Cap Prisma's *client-side* pool. Supabase session mode is limited to
 * pool_size=15 for the whole project (Vercel + local + migrate).
 * Default Prisma limit is ~num_cpus*2+1 per process, which exhausts the pooler.
 */
function withServerlessPoolParams(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    const serverless = isServerlessRuntime();
    // Always force a single slot on Vercel — NODE_ENV is sometimes set to
    // "development" in project env and would otherwise allow 2 connections.
    if (serverless) {
      parsed.searchParams.set("connection_limit", "1");
    } else if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "2");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", serverless ? "20" : "10");
    }
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

const databaseUrl = process.env.DATABASE_URL
  ? withServerlessPoolParams(process.env.DATABASE_URL)
  : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

// Always reuse across HMR *and* warm serverless isolates.
globalForPrisma.prisma = prisma;
