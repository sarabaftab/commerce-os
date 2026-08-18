export type ImportCategory = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

/** Match by slug first, then unique name. Does not create categories. */
export function matchCategory(
  categories: ImportCategory[],
  raw: string,
): { id: string } | { error: string } {
  const key = normalizeKey(raw);
  if (!key) {
    return { error: "Category is required" };
  }

  const bySlug = categories.filter((category) => category.slug.toLowerCase() === key);
  if (bySlug.length > 1) {
    return { error: `Category "${raw}" matches more than one category` };
  }
  if (bySlug.length === 1) {
    if (!bySlug[0]!.isActive) {
      return { error: `Category "${raw}" is inactive` };
    }
    return { id: bySlug[0]!.id };
  }

  const byName = categories.filter((category) => category.name.toLowerCase() === key);
  if (byName.length > 1) {
    return { error: `Category "${raw}" matches more than one category` };
  }
  if (byName.length === 1) {
    if (!byName[0]!.isActive) {
      return { error: `Category "${raw}" is inactive` };
    }
    return { id: byName[0]!.id };
  }

  return { error: `Category "${raw}" was not found` };
}

export function reserveImportSlug(
  slug: string,
  takenSlugs: Set<string>,
  seenInFile: Set<string>,
): string | null {
  if (takenSlugs.has(slug)) {
    return "A product with this slug already exists";
  }
  if (seenInFile.has(slug)) {
    return "Duplicate slug in this CSV";
  }
  seenInFile.add(slug);
  return null;
}
