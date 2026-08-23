export const SELLING_UNITS = ["item", "pack", "case"] as const;

export type SellingUnit = (typeof SELLING_UNITS)[number];

export function isSellingUnit(value: string): value is SellingUnit {
  return (SELLING_UNITS as readonly string[]).includes(value);
}

export function coerceSellingUnit(value: string | null | undefined): SellingUnit {
  if (value && isSellingUnit(value)) {
    return value;
  }
  return "item";
}

function unitNoun(unit: SellingUnit): string {
  return unit;
}

function unitNounPlural(unit: SellingUnit, quantity: number): string {
  if (quantity === 1) {
    return unitNoun(unit);
  }
  if (unit === "item") {
    return "items";
  }
  if (unit === "pack") {
    return "packs";
  }
  return "cases";
}

export function formatUnitPriceLabel(formattedMoney: string, unit: SellingUnit): string {
  return `${formattedMoney} / ${unitNoun(unit)}`;
}

export function formatPackSizeLine(
  volume: string | null | undefined,
  unit: SellingUnit,
): string | null {
  const trimmed = volume?.trim();
  if (!trimmed) {
    return null;
  }
  return `${trimmed} per ${unitNoun(unit)}`;
}

export function formatPriceTimesQuantity(
  formattedMoney: string,
  quantity: number,
  unit: SellingUnit,
): string {
  return `${formattedMoney} × ${quantity} ${unitNounPlural(unit, quantity)}`;
}
