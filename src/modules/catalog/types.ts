import type { Category, Product, ProductMedia, SellingUnit } from "@prisma/client";

export type ProductWithRelations = Product & {
  category: Category | null;
  media: ProductMedia[];
};

export type CreateProductInput = {
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  volume?: string | null;
  sellingUnit?: SellingUnit;
  priceMinor: number;
  currency: string;
  categoryId?: string | null;
  isAvailable: boolean;
  stockNote?: string | null;
  sortOrder?: number;
  mediaUrl?: string | null;
};

export type UpdateProductInput = {
  tenantId: string;
  productId: string;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  volume?: string | null;
  sellingUnit?: SellingUnit;
  priceMinor: number;
  currency: string;
  categoryId?: string | null;
  isAvailable: boolean;
  stockNote?: string | null;
  sortOrder?: number;
  mediaUrl?: string | null;
};
