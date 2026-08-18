import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";
import { toMinor } from "@/shared/money/money";

import {
  PRODUCT_IMPORT_MAX_BYTES,
  PRODUCT_IMPORT_MAX_ROWS,
  csvRowsToRecords,
  parseImportRecords,
  type ParsedImportRow,
} from "../import/csv";
import { productImportPayloadSchema } from "../import/payload";
import { matchCategory, reserveImportSlug } from "../import/validate";
import { listCategories } from "../repositories/category-repository";
import type { CreateProductInput } from "../types";

export type ProductImportPreviewRow = {
  lineNumber: number;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  categoryId: string | null;
  brand: string | null;
  volume: string | null;
  priceMajor: number;
  priceMinor: number;
  active: boolean;
  valid: boolean;
  errors: string[];
};

export type ProductImportPreview = {
  rows: ProductImportPreviewRow[];
  validCount: number;
  invalidCount: number;
};

export type { ProductImportPayloadItem } from "../import/payload";

export async function previewProductImport(input: {
  tenantId: string;
  currency: string;
  csvText: string;
}): Promise<ProductImportPreview> {
  if (Buffer.byteLength(input.csvText, "utf8") > PRODUCT_IMPORT_MAX_BYTES) {
    throw new AppError("VALIDATION", "CSV file is larger than 1MB");
  }

  let records;
  try {
    records = csvRowsToRecords(input.csvText);
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Could not parse CSV",
    );
  }

  if (records.length === 0) {
    throw new AppError("VALIDATION", "CSV has no product rows");
  }
  if (records.length > PRODUCT_IMPORT_MAX_ROWS) {
    throw new AppError(
      "VALIDATION",
      `CSV has too many rows (max ${PRODUCT_IMPORT_MAX_ROWS})`,
    );
  }

  const parsed = parseImportRecords(records);
  const categories = await listCategories(input.tenantId);
  const existing = await prisma.product.findMany({
    where: { tenantId: input.tenantId },
    select: { slug: true },
  });
  const takenSlugs = new Set(existing.map((row) => row.slug));
  const seenInFile = new Set<string>();

  const rows: ProductImportPreviewRow[] = parsed.map((result) => {
    if (!result.ok) {
      return {
        lineNumber: result.lineNumber,
        name: result.name,
        slug: "",
        description: null,
        category: "",
        categoryId: null,
        brand: null,
        volume: null,
        priceMajor: 0,
        priceMinor: 0,
        active: false,
        valid: false,
        errors: result.errors,
      };
    }
    return decorateParsedRow(result.row, {
      currency: input.currency,
      categories,
      takenSlugs,
      seenInFile,
    });
  });

  return {
    rows,
    validCount: rows.filter((row) => row.valid).length,
    invalidCount: rows.filter((row) => !row.valid).length,
  };
}

function decorateParsedRow(
  row: ParsedImportRow,
  ctx: {
    currency: string;
    categories: { id: string; name: string; slug: string; isActive: boolean }[];
    takenSlugs: Set<string>;
    seenInFile: Set<string>;
  },
): ProductImportPreviewRow {
  const errors: string[] = [];
  const categoryMatch = matchCategory(ctx.categories, row.category);
  let categoryId: string | null = null;
  if ("error" in categoryMatch) {
    errors.push(categoryMatch.error);
  } else {
    categoryId = categoryMatch.id;
  }

  const slugError = reserveImportSlug(row.slug, ctx.takenSlugs, ctx.seenInFile);
  if (slugError) {
    errors.push(slugError);
  }

  const priceMinor = toMinor(row.priceMajor, ctx.currency);

  return {
    lineNumber: row.lineNumber,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    categoryId,
    brand: row.brand,
    volume: row.volume,
    priceMajor: row.priceMajor,
    priceMinor,
    active: row.active,
    valid: errors.length === 0,
    errors,
  };
}

export async function importValidProductsForTenant(input: {
  tenantId: string;
  currency: string;
  items: unknown;
}): Promise<{ importedCount: number }> {
  const parsed = productImportPayloadSchema.safeParse(input.items);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Import payload is invalid");
  }

  const categories = await listCategories(input.tenantId);
  const allowedCategoryIds = new Set(categories.filter((c) => c.isActive).map((c) => c.id));
  const existing = await prisma.product.findMany({
    where: { tenantId: input.tenantId },
    select: { slug: true },
  });
  const takenSlugs = new Set(existing.map((row) => row.slug));
  const seen = new Set<string>();

  const toCreate: CreateProductInput[] = [];
  for (const item of parsed.data) {
    if (!allowedCategoryIds.has(item.categoryId)) {
      throw new AppError(
        "VALIDATION",
        `Category is not valid for this store (${item.slug})`,
      );
    }
    const slugError = reserveImportSlug(item.slug, takenSlugs, seen);
    if (slugError) {
      throw new AppError("CONFLICT", `Duplicate slug: ${item.slug}`);
    }
    toCreate.push({
      tenantId: input.tenantId,
      name: item.name,
      slug: item.slug,
      description: item.description,
      brand: item.brand,
      volume: item.volume,
      priceMinor: item.priceMinor,
      currency: input.currency,
      categoryId: item.categoryId,
      isAvailable: item.isAvailable,
      sortOrder: 0,
    });
  }

  await prisma.$transaction(
    toCreate.map((product) =>
      prisma.product.create({
        data: {
          tenantId: product.tenantId,
          name: product.name,
          slug: product.slug,
          description: product.description,
          brand: product.brand,
          volume: product.volume,
          priceMinor: product.priceMinor,
          currency: product.currency,
          categoryId: product.categoryId,
          isAvailable: product.isAvailable,
          sortOrder: product.sortOrder ?? 0,
        },
      }),
    ),
  );

  return { importedCount: toCreate.length };
}
