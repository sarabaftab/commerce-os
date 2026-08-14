import { cache } from "react";

import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import {
  getCachedSettings,
  invalidateSettingsCache,
  setCachedSettings,
} from "../cache";
import {
  createPickupLocation,
  deletePickupLocation,
  ensureSettingsRow,
  findPickupLocation,
  findTenantWithSettings,
  listPickupLocations,
  updatePickupLocation,
  updateSettings,
  updateTenantCurrency,
} from "../repositories/settings-repository";
import {
  brandingSettingsSchema,
  deliverySettingsSchema,
  generalSettingsSchema,
  normalizeOptionalString,
  paymentSettingsSchema,
  pickupLocationInputSchema,
  type BrandingSettingsInput,
  type GeneralSettingsInput,
  type PaymentSettingsInput,
  type PickupLocationInput,
} from "../schemas/settings";
import type { z } from "zod";
import type {
  CheckoutSettings,
  StorefrontSettings,
  TenantSettingsBundle,
} from "../types";
import { computeDeliveryFeeMinor } from "./delivery-fee";

function isAbaComplete(settings: {
  abaAccountName: string | null;
  abaAccountNumber: string | null;
  abaInstructions: string | null;
}) {
  return Boolean(
    settings.abaAccountName?.trim() &&
      settings.abaAccountNumber?.trim() &&
      settings.abaInstructions?.trim(),
  );
}

async function loadBundle(
  tenantId: string,
  options?: { fresh?: boolean },
): Promise<TenantSettingsBundle> {
  if (!options?.fresh) {
    const cached = getCachedSettings<TenantSettingsBundle>(tenantId);
    if (cached) {
      return cached;
    }
  }

  let tenant = await findTenantWithSettings(tenantId);
  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant not found");
  }

  if (!tenant.settings) {
    await ensureSettingsRow(tenantId, {
      displayName: tenant.name,
    });
    tenant = await findTenantWithSettings(tenantId);
    if (!tenant?.settings) {
      throw new AppError("INTERNAL", "Failed to initialize tenant settings");
    }
  }

  const bundle: TenantSettingsBundle = {
    tenantId: tenant.id,
    tenantName: tenant.name,
    currency: tenant.currency,
    settings: tenant.settings,
    pickupLocations: tenant.pickupLocations,
  };

  setCachedSettings(tenantId, bundle);
  return bundle;
}

export async function getSettingsForAdmin(tenantId: string): Promise<TenantSettingsBundle> {
  return loadBundle(tenantId, { fresh: true });
}

export async function getStorefrontSettings(
  tenantId: string,
  tenantSlug: string,
): Promise<StorefrontSettings> {
  return getStorefrontSettingsCached(tenantId, tenantSlug);
}

const getStorefrontSettingsCached = cache(
  async (tenantId: string, tenantSlug: string): Promise<StorefrontSettings> => {
    const bundle = await loadBundle(tenantId);
    const s = bundle.settings;
    return {
      tenantId,
      tenantSlug,
      currency: bundle.currency,
      displayName: s.displayName?.trim() || bundle.tenantName,
      logoUrl: s.logoUrl,
      primaryColor: s.primaryColor,
      phone: s.phone,
      email: s.email,
      address: s.address,
      businessHours: s.businessHours,
    };
  },
);

export async function getCheckoutSettings(
  tenantId: string,
  options?: { fresh?: boolean },
): Promise<CheckoutSettings> {
  const bundle = await loadBundle(tenantId, options);
  const s = bundle.settings;
  const activePickups = bundle.pickupLocations
    .filter((loc) => loc.isActive)
    .map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      instructions: loc.instructions,
    }));

  const pickupOffered = s.pickupEnabled && activePickups.length > 0;
  const deliveryOffered = s.deliveryEnabled;
  const abaAvailable = s.abaEnabled && isAbaComplete(s);
  const codOffered = s.codEnabled;
  const paymentOffered = codOffered || abaAvailable;

  let checkoutBlockedReason: string | null = null;
  if (!deliveryOffered && !pickupOffered) {
    checkoutBlockedReason =
      "This store has no available fulfillment methods. Please contact the store.";
  } else if (!paymentOffered) {
    checkoutBlockedReason =
      "This store has no available payment methods. Please contact the store.";
  }

  return {
    tenantId,
    currency: bundle.currency,
    deliveryEnabled: deliveryOffered,
    pickupEnabled: pickupOffered,
    deliveryFeeMinor: s.deliveryFeeMinor,
    freeDeliveryThresholdMinor: s.freeDeliveryThresholdMinor,
    deliveryNotes: s.deliveryNotes,
    activePickupLocations: activePickups,
    codEnabled: codOffered,
    abaEnabled: s.abaEnabled,
    abaAvailable,
    abaAccountName: s.abaAccountName,
    abaAccountNumber: s.abaAccountNumber,
    abaInstructions: s.abaInstructions,
    abaQrImageUrl: s.abaQrImageUrl,
    abaCustomerNote: s.abaCustomerNote,
    checkoutBlockedReason,
  };
}

export type CheckoutOptionInput = {
  fulfillmentMethod: "delivery" | "pickup";
  paymentMethod: "cod" | "aba_transfer";
  pickupLocationKey?: string;
  subtotalMinor: number;
};

export async function assertCheckoutOptions(
  tenantId: string,
  input: CheckoutOptionInput,
) {
  const settings = await getCheckoutSettings(tenantId, { fresh: true });

  if (settings.checkoutBlockedReason) {
    throw new AppError("VALIDATION", settings.checkoutBlockedReason);
  }

  if (input.fulfillmentMethod === "delivery" && !settings.deliveryEnabled) {
    throw new AppError("VALIDATION", "Delivery is not available");
  }
  if (input.fulfillmentMethod === "pickup" && !settings.pickupEnabled) {
    throw new AppError("VALIDATION", "Pickup is not available");
  }

  let pickup:
    | { id: string; name: string; address: string; instructions: string | null }
    | undefined;

  if (input.fulfillmentMethod === "pickup") {
    pickup = settings.activePickupLocations.find(
      (loc) => loc.id === input.pickupLocationKey,
    );
    if (!pickup) {
      throw new AppError("VALIDATION", "Invalid or inactive pickup location");
    }
  }

  if (input.paymentMethod === "cod" && !settings.codEnabled) {
    throw new AppError("VALIDATION", "Cash on Delivery is not available");
  }
  if (input.paymentMethod === "aba_transfer" && !settings.abaAvailable) {
    throw new AppError("VALIDATION", "ABA Transfer is not available");
  }

  const deliveryFeeMinor = computeDeliveryFeeMinor({
    fulfillmentMethod: input.fulfillmentMethod,
    subtotalMinor: input.subtotalMinor,
    deliveryEnabled: settings.deliveryEnabled,
    deliveryFeeMinor: settings.deliveryFeeMinor,
    freeDeliveryThresholdMinor: settings.freeDeliveryThresholdMinor,
  });

  return { settings, deliveryFeeMinor, pickup };
}

export async function updateGeneralSettings(
  tenantId: string,
  raw: GeneralSettingsInput,
) {
  const parsed = generalSettingsSchema.parse(raw);
  await prisma.$transaction(async () => {
    await updateTenantCurrency(tenantId, parsed.currency);
    await updateSettings(tenantId, {
      displayName: normalizeOptionalString(parsed.displayName),
      phone: normalizeOptionalString(parsed.phone),
      email: normalizeOptionalString(parsed.email),
      address: normalizeOptionalString(parsed.address),
      timezone: parsed.timezone,
      businessHours: normalizeOptionalString(parsed.businessHours),
    });
  });
  invalidateSettingsCache(tenantId);
}

export async function updateDeliverySettings(
  tenantId: string,
  raw: z.input<typeof deliverySettingsSchema>,
) {
  const parsed = deliverySettingsSchema.parse(raw);
  await updateSettings(tenantId, {
    deliveryEnabled: parsed.deliveryEnabled,
    deliveryFeeMinor: parsed.deliveryFeeMinor,
    freeDeliveryThresholdMinor: parsed.freeDeliveryThresholdMinor,
    deliveryNotes: normalizeOptionalString(parsed.deliveryNotes),
    pickupEnabled: parsed.pickupEnabled,
  });
  invalidateSettingsCache(tenantId);
}

export async function updatePaymentSettings(
  tenantId: string,
  raw: PaymentSettingsInput,
) {
  const parsed = paymentSettingsSchema.parse(raw);
  await updateSettings(tenantId, {
    codEnabled: parsed.codEnabled,
    abaEnabled: parsed.abaEnabled,
    abaAccountName: normalizeOptionalString(parsed.abaAccountName),
    abaAccountNumber: normalizeOptionalString(parsed.abaAccountNumber),
    abaInstructions: normalizeOptionalString(parsed.abaInstructions),
    abaQrImageUrl: normalizeOptionalString(parsed.abaQrImageUrl ?? undefined),
    abaCustomerNote: normalizeOptionalString(parsed.abaCustomerNote),
  });
  invalidateSettingsCache(tenantId);
}

export async function updateBrandingSettings(
  tenantId: string,
  raw: BrandingSettingsInput,
) {
  const parsed = brandingSettingsSchema.parse(raw);
  await updateSettings(tenantId, {
    displayName: normalizeOptionalString(parsed.displayName),
    logoUrl: normalizeOptionalString(parsed.logoUrl ?? undefined),
    primaryColor: normalizeOptionalString(parsed.primaryColor ?? undefined),
  });
  invalidateSettingsCache(tenantId);
}

export async function upsertPickupLocationForTenant(
  tenantId: string,
  raw: PickupLocationInput,
) {
  const parsed = pickupLocationInputSchema.parse(raw);
  const data = {
    name: parsed.name,
    address: parsed.address,
    instructions: normalizeOptionalString(parsed.instructions),
    isActive: parsed.isActive,
    sortOrder: parsed.sortOrder,
  };

  if (parsed.id) {
    const existing = await findPickupLocation(tenantId, parsed.id);
    if (!existing) {
      throw new AppError("NOT_FOUND", "Pickup location not found");
    }
    await updatePickupLocation(tenantId, parsed.id, data);
  } else {
    await createPickupLocation({ tenantId, ...data });
  }
  invalidateSettingsCache(tenantId);
}

export async function removePickupLocationForTenant(tenantId: string, id: string) {
  const result = await deletePickupLocation(tenantId, id);
  if (result.count === 0) {
    throw new AppError("NOT_FOUND", "Pickup location not found");
  }
  invalidateSettingsCache(tenantId);
}

export async function listPickupLocationsForAdmin(tenantId: string) {
  return listPickupLocations(tenantId);
}

export { computeDeliveryFeeMinor, invalidateSettingsCache };
