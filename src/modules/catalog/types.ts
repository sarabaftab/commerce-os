import type { Category, Product, ProductMedia, SellingUnit } from "@prisma/client";

export type ProductWithRelations = Product & {
  category: Category | null;
  media: ProductMedia[];
};

export type CreateProductInput = {
  tenantId: string;
  name: string;
  nameKm?: string | null;
  slug: string;
  description?: string | null;
  descriptionKm?: string | null;
  brand?: string | null;
  volume?: string | null;
  sellingUnit?: SellingUnit;
  priceMinor: number;
  currency: string;
  categoryId?: string | null;
  isAvailable: boolean;
  isFeatured?: boolean;
  stockNote?: string | null;
  stockQuantity?: number | null;
  sortOrder?: number;
  mediaUrl?: string | null;
};

export type UpdateProductInput = {
  tenantId: string;
  productId: string;
  name: string;
  nameKm?: string | null;
  slug: string;
  description?: string | null;
  descriptionKm?: string | null;
  brand?: string | null;
  volume?: string | null;
  sellingUnit?: SellingUnit;
  priceMinor: number;
  currency: string;
  categoryId?: string | null;
  isAvailable: boolean;
  isFeatured?: boolean;
  stockNote?: string | null;
  stockQuantity?: number | null;
  sortOrder?: number;
  mediaUrl?: string | null;
};
