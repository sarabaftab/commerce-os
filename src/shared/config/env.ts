import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DEFAULT_TENANT_SLUG: z.string().min(1).default("kin-a2"),
  /** Phase 1: single bot mapped to one tenant slug. Optional until Telegram is used. */
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_TENANT_SLUG: z.string().min(1).default("kin-a2"),
  TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(300),
  CUSTOMER_SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),
  PHOTON_BASE_URL: z.string().url().default("https://photon.komoot.io/api"),
  PHOTON_COUNTRY_CODE: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Za-z]{2}$/)
    .default("KH"),
  PHOTON_BIAS_CITY: z.string().trim().max(120).default("Phnom Penh"),
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
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    TELEGRAM_TENANT_SLUG: process.env.TELEGRAM_TENANT_SLUG,
    TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
    CUSTOMER_SESSION_TTL_SECONDS: process.env.CUSTOMER_SESSION_TTL_SECONDS,
    PHOTON_BASE_URL: process.env.PHOTON_BASE_URL,
    PHOTON_COUNTRY_CODE: process.env.PHOTON_COUNTRY_CODE,
    PHOTON_BIAS_CITY: process.env.PHOTON_BIAS_CITY,
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
