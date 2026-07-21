import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DEFAULT_TENANT_SLUG: z.string().min(1).default("kin-a2"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_DEFAULT_TENANT_SLUG: z.string().min(1).default("kin-a2"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DEFAULT_TENANT_SLUG: process.env.DEFAULT_TENANT_SLUG,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid server environment: ${message}`);
  }

  return parsed.data;
}

function getPublicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEFAULT_TENANT_SLUG: process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid public environment: ${message}`);
  }

  return parsed.data;
}

let cachedServerEnv: ServerEnv | undefined;
let cachedPublicEnv: PublicEnv | undefined;

/** Validated server env. Call only from server code. */
export function env(): ServerEnv & PublicEnv {
  cachedServerEnv ??= getServerEnv();
  cachedPublicEnv ??= getPublicEnv();
  return { ...cachedServerEnv, ...cachedPublicEnv };
}

/** Validated public env safe for client bundles. */
export function publicEnv(): PublicEnv {
  cachedPublicEnv ??= getPublicEnv();
  return cachedPublicEnv;
}
