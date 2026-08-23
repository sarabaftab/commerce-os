export const PRODUCT_IMPORT_COLUMNS = [
  "name",
  "slug",
  "description",
  "category",
  "brand",
  "volume",
  "price",
  "active",
] as const;

export type ProductImportColumn = (typeof PRODUCT_IMPORT_COLUMNS)[number];

export const PRODUCT_IMPORT_TEMPLATE_CSV = `${PRODUCT_IMPORT_COLUMNS.join(",")}
KIN A2 Fresh Milk 1L,kin-a2-fresh-milk-1l,"Grass-fed A2 protein milk, 1 litre bottle.",Fresh Milk,KIN A2,1L,3.50,true
KIN A2 Fresh Milk 500ml,,A2 protein milk in a 500ml bottle,fresh-milk,KIN A2,500ml,2.00,true
`;

export const PRODUCT_IMPORT_MAX_ROWS = 500;
export const PRODUCT_IMPORT_MAX_BYTES = 1_000_000;

export function generateProductSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return slug;
}

export function parseCsvPrice(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "").trim();
  if (!cleaned) {
    throw new Error("Price is required");
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Price must be a number zero or greater");
  }
  return value;
}

export function parseCsvActive(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y", "active"].includes(value)) {
    return true;
  }
  if (["false", "0", "no", "n", "inactive"].includes(value)) {
    return false;
  }
  throw new Error("Active must be true/false, yes/no, 1/0, or active/inactive");
}

type CsvRecord = Record<string, string>;

/** Minimal RFC 4180-style parser (quoted fields, commas, newlines). */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    field += ch;
  }
  pushField();
  if (row.some((value) => value !== "") || rows.length === 0) {
    pushRow();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = rows[0]!.map((h) => h.trim().toLowerCase());
  return { headers, rows: rows.slice(1) };
}

export function csvRowsToRecords(text: string): CsvRecord[] {
  const { headers, rows } = parseCsv(text);
  if (headers.length === 0) {
    throw new Error("CSV is empty");
  }
  const missing = PRODUCT_IMPORT_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`CSV is missing columns: ${missing.join(", ")}`);
  }
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const record: CsvRecord = {};
      for (const column of PRODUCT_IMPORT_COLUMNS) {
        const index = headers.indexOf(column);
        record[column] = (row[index] ?? "").trim();
      }
      const sellingUnitIndex = headers.findIndex(
        (header) => header === "sellingunit" || header === "selling_unit",
      );
      if (sellingUnitIndex >= 0) {
        record.sellingunit = (row[sellingUnitIndex] ?? "").trim();
      }
      return record;
    });
}

export type ParsedImportRow = {
  lineNumber: number;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  brand: string | null;
  volume: string | null;
  sellingUnit: "item" | "pack" | "case";
  priceMajor: number;
  active: boolean;
};

export type ImportRowParseResult =
  | { ok: true; lineNumber: number; row: ParsedImportRow }
  | { ok: false; lineNumber: number; name: string; errors: string[] };

export function parseImportRecords(records: CsvRecord[]): ImportRowParseResult[] {
  return records.map((record, index) => {
    const lineNumber = index + 2;
    const errors: string[] = [];
    const name = record.name?.trim() ?? "";
    if (!name) {
      errors.push("Name is required");
    } else if (name.length > 120) {
      errors.push("Name must be 120 characters or fewer");
    }

    let slug = (record.slug ?? "").trim().toLowerCase();
    if (!slug && name) {
      slug = generateProductSlug(name);
    }
    if (!slug) {
      errors.push("Slug is required (or provide a name to generate one)");
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push("Slug must be lowercase kebab-case");
    } else if (slug.length > 140) {
      errors.push("Slug must be 140 characters or fewer");
    }

    const descriptionRaw = (record.description ?? "").trim();
    if (descriptionRaw.length > 2000) {
      errors.push("Description must be 2000 characters or fewer");
    }

    const category = (record.category ?? "").trim();
    if (!category) {
      errors.push("Category is required");
    }

    const brandRaw = (record.brand ?? "").trim();
    if (brandRaw.length > 80) {
      errors.push("Brand must be 80 characters or fewer");
    }
    const volumeRaw = (record.volume ?? "").trim();
    if (volumeRaw.length > 40) {
      errors.push("Volume must be 40 characters or fewer");
    }

    const sellingUnitRaw = (record.sellingunit ?? "").trim().toLowerCase();
    let sellingUnit: "item" | "pack" | "case" = "item";
    if (sellingUnitRaw) {
      if (sellingUnitRaw === "item" || sellingUnitRaw === "pack" || sellingUnitRaw === "case") {
        sellingUnit = sellingUnitRaw;
      } else {
        errors.push("Selling unit must be item, pack, or case");
      }
    }

    let priceMajor = 0;
    try {
      priceMajor = parseCsvPrice(record.price ?? "");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid price");
    }

    let active = true;
    try {
      active = parseCsvActive(record.active ?? "true");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid active value");
    }

    if (errors.length > 0) {
      return { ok: false, lineNumber, name: name || `(row ${lineNumber})`, errors };
    }

    return {
      ok: true,
      lineNumber,
      row: {
        lineNumber,
        name,
        slug,
        description: descriptionRaw || null,
        category,
        brand: brandRaw || null,
        volume: volumeRaw || null,
        sellingUnit,
        priceMajor,
        active,
      },
    };
  });
}
