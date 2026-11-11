import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const getBucket = vi.fn();
const updateBucket = vi.fn();
const createBucket = vi.fn();

vi.mock("@/shared/config/env", () => ({
  env: () => ({ SUPABASE_SERVICE_ROLE_KEY: "service-role" }),
  publicEnv: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      getBucket,
      updateBucket,
      createBucket,
      from: () => ({
        upload: vi.fn(),
        download: vi.fn(),
      }),
    },
  }),
}));

/**
 * AUD-011: payment-proofs must stay private; no public URL helper in this module.
 */
describe("AUD-011 payment-proof bucket privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("source never builds a public Storage URL for proofs", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/shared/storage/payment-proof-storage.ts"),
      "utf8",
    );
    expect(source).not.toContain("getPublicUrl");
    expect(source).toContain("public: false");
  });

  it("migration forces the bucket private and drops public policies", () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        "prisma/migrations/20261109040000_private_payment_proofs_bucket/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("SET public = false");
    expect(sql).toContain("payment-proofs");
    expect(sql).toContain("DROP POLICY IF EXISTS");
  });

  it("ensurePrivatePaymentProofBucket flips a public bucket to private", async () => {
    getBucket.mockResolvedValue({ data: { public: true, name: "payment-proofs" } });
    updateBucket.mockResolvedValue({ error: null });

    const { ensurePrivatePaymentProofBucket } = await import(
      "@/shared/storage/payment-proof-storage"
    );
    await ensurePrivatePaymentProofBucket();

    expect(updateBucket).toHaveBeenCalledWith("payment-proofs", { public: false });
    expect(createBucket).not.toHaveBeenCalled();
  });

  it("ensurePrivatePaymentProofBucket creates a private bucket when missing", async () => {
    getBucket.mockResolvedValue({ data: null });
    createBucket.mockResolvedValue({ error: null });

    const { ensurePrivatePaymentProofBucket, PAYMENT_PROOF_MAX_BYTES } = await import(
      "@/shared/storage/payment-proof-storage"
    );
    await ensurePrivatePaymentProofBucket();

    expect(createBucket).toHaveBeenCalledWith("payment-proofs", {
      public: false,
      fileSizeLimit: PAYMENT_PROOF_MAX_BYTES,
    });
  });
});
