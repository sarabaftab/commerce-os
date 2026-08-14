import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Cap Prisma's *client-side* pool. Supabase session mode is limited to
 * pool_size=15 for the whole project (Vercel + local + migrate).
 * Default Prisma limit is ~num_cpus*2+1 per process, which exhausts the pooler.
 */
function withServerlessPoolParams(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    const isProd = process.env.NODE_ENV === "production";
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", isProd ? "1" : "2");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "10");
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
