import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminSession, uploadProductImageObject } = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  uploadProductImageObject: vi.fn(),
}));

vi.mock("@/shared/auth/admin-session", () => ({
  requireAdminSession,
}));

vi.mock("@/shared/storage/product-image-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/storage/product-image-storage")>();
  return {
    ...actual,
    uploadProductImageObject,
  };
});

import { AppError } from "@/shared/errors/app-error";
import {
  buildProductImageObjectPath,
  detectProductImageMime,
  PRODUCT_IMAGE_MAX_BYTES,
  validateProductImageBytes,
} from "@/shared/storage/product-image-storage";
import { uploadProductImageAction } from "@/modules/catalog/actions/product-image-actions";
import { productFormSchema } from "@/modules/catalog/schemas/product";

const pngHeader = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpegHeader = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("product image validation", () => {
  it("accepts PNG and JPEG magic bytes", () => {
    expect(detectProductImageMime(pngHeader)).toBe("image/png");
    expect(detectProductImageMime(jpegHeader)).toBe("image/jpeg");
    expect(validateProductImageBytes(pngHeader)).toEqual({ mime: "image/png", ext: "png" });
  });

  it("rejects empty, unsupported, and oversized files", () => {
    expect(() => validateProductImageBytes(new Uint8Array())).toThrow(AppError);
    expect(() =>
      validateProductImageBytes(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
    ).toThrow(AppError);

    const oversize = new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1);
    oversize[0] = 0xff;
    oversize[1] = 0xd8;
    oversize[2] = 0xff;
    expect(() => validateProductImageBytes(oversize)).toThrow(/5 MB/i);
  });

  it("builds tenant-scoped unique product paths", () => {
    const path = buildProductImageObjectPath("tenant-a", "jpg");
    expect(path.startsWith("tenants/tenant-a/products/")).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
    expect(path.includes("..")).toBe(false);
  });
});

describe("uploadProductImageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when admin session is missing", async () => {
    requireAdminSession.mockRejectedValue(new Error("redirect"));

    await expect(uploadProductImageAction({}, new FormData())).rejects.toThrow("redirect");
    expect(uploadProductImageObject).not.toHaveBeenCalled();
  });

  it("uploads for the authenticated tenant and returns a public URL", async () => {
    requireAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    uploadProductImageObject.mockResolvedValue({
      url: "https://cdn.example/tenants/tenant-a/products/abc.jpg",
      path: "tenants/tenant-a/products/abc.jpg",
      contentType: "image/jpeg",
    });

    const formData = new FormData();
    formData.set("productImage", new File([pngHeader], "item.png", { type: "image/png" }));

    const result = await uploadProductImageAction({}, formData);

    expect(result.url).toBe("https://cdn.example/tenants/tenant-a/products/abc.jpg");
    expect(uploadProductImageObject).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      bytes: expect.any(Uint8Array),
    });
  });

  it("never passes a client-supplied tenant id to storage", async () => {
    requireAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    uploadProductImageObject.mockResolvedValue({
      url: "https://cdn.example/ok.jpg",
      path: "tenants/tenant-a/products/ok.jpg",
      contentType: "image/png",
    });

    const formData = new FormData();
    formData.set("productImage", new File([pngHeader], "item.png", { type: "image/png" }));
    formData.set("tenantId", "tenant-b");

    await uploadProductImageAction({}, formData);

    expect(uploadProductImageObject).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      bytes: expect.any(Uint8Array),
    });
  });

  it("returns a clear error for empty files without calling storage", async () => {
    requireAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });

    const formData = new FormData();
    formData.set("productImage", new File([], "empty.png", { type: "image/png" }));

    const result = await uploadProductImageAction({}, formData);
    expect(result.error).toMatch(/choose a product image/i);
    expect(uploadProductImageObject).not.toHaveBeenCalled();
  });
});

describe("product form mediaUrl compatibility", () => {
  it("still accepts an existing HTTPS media URL", () => {
    const parsed = productFormSchema.safeParse({
      name: "Serum",
      slug: "serum",
      sellingUnit: "item",
      priceMajor: 10,
      currency: "USD",
      isAvailable: true,
      sortOrder: 0,
      mediaUrl: "https://cdn.example/legacy.jpg",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.mediaUrl).toBe("https://cdn.example/legacy.jpg");
    }
  });
});
