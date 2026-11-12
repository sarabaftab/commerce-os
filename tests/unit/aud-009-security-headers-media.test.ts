import { describe, expect, it } from "vitest";

import { productFormSchema } from "@/modules/catalog/schemas/product";
import {
  isAllowedProductMediaUrl,
  isOptimizableMediaSrc,
} from "@/shared/media/allowed-media-url";
import nextConfig from "../../next.config";

function baseProduct(mediaUrl: string) {
  return {
    name: "Milk",
    slug: "milk",
    sellingUnit: "item" as const,
    priceMajor: 1,
    currency: "USD",
    isAvailable: true,
    isFeatured: false,
    stockQuantity: null,
    sortOrder: 0,
    mediaUrl,
  };
}

/**
 * AUD-009: security headers + restrict Next image optimizer / product media hosts.
 */
describe("AUD-009 security headers and media host lockdown", () => {
  it("sends clickjacking and content-type headers on all routes", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const headerGroups = await nextConfig.headers!();
    const flat = headerGroups.flatMap((group) => group.headers);
    expect(flat).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ]),
    );
  });

  it("does not allow the Next image optimizer to fetch any HTTPS host", () => {
    const patterns = nextConfig.images?.remotePatterns ?? [];
    expect(patterns.some((p) => p.hostname === "**")).toBe(false);
    expect(
      patterns.some(
        (p) => p.protocol === "https" && p.hostname === "**.supabase.co",
      ),
    ).toBe(true);
  });

  it("accepts https Supabase product media URLs and empty values", () => {
    expect(
      isAllowedProductMediaUrl(
        "https://proj.supabase.co/storage/v1/object/public/tenant-assets/a.png",
      ),
    ).toBe(true);
    expect(isAllowedProductMediaUrl("")).toBe(true);
    expect(productFormSchema.safeParse(baseProduct("")).success).toBe(true);
    expect(
      productFormSchema.safeParse(
        baseProduct(
          "https://proj.supabase.co/storage/v1/object/public/tenant-assets/a.png",
        ),
      ).success,
    ).toBe(true);
  });

  it("rejects http and non-Supabase product media URLs", () => {
    expect(isAllowedProductMediaUrl("http://127.0.0.1/x.jpg")).toBe(false);
    expect(isAllowedProductMediaUrl("https://cdn.example/legacy.jpg")).toBe(
      false,
    );
    expect(isAllowedProductMediaUrl("javascript:alert(1)")).toBe(false);

    expect(
      productFormSchema.safeParse(baseProduct("https://cdn.example/x.jpg"))
        .success,
    ).toBe(false);
    expect(
      productFormSchema.safeParse(baseProduct("http://evil.test/x.jpg")).success,
    ).toBe(false);
  });

  it("only optimizes relative paths and allowed hosts in ProductImage helper", () => {
    expect(isOptimizableMediaSrc("/local.png")).toBe(true);
    expect(
      isOptimizableMediaSrc("https://proj.supabase.co/storage/v1/object/x.png"),
    ).toBe(true);
    expect(isOptimizableMediaSrc("http://localhost:3000/x.png")).toBe(true);
    expect(isOptimizableMediaSrc("https://cdn.example/x.png")).toBe(false);
    expect(isOptimizableMediaSrc("http://169.254.169.254/latest")).toBe(false);
  });
});
