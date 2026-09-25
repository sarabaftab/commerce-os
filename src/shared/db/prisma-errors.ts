import { Prisma } from "@prisma/client";

/** Supabase/Prisma client pool exhausted (common on Vercel with connection_limit=1). */
export function isPrismaPoolTimeout(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2024"
  );
}
