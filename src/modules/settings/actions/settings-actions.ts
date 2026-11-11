"use server";

import { revalidatePath } from "next/cache";

import {
  getSettingsForAdmin,
  removePickupLocationForTenant,
  updateBrandingSettings,
  updateDeliverySettings,
  updateGeneralSettings,
  updatePaymentSettings,
  upsertPickupLocationForTenant,
} from "@/modules/settings";
import {
  ADMIN_MANAGER_ROLES,
  assertAdminRole,
  requireAdminSession,
} from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";
import {
  removeAbaQrObjectByUrl,
  uploadAbaQrObject,
} from "@/shared/storage/aba-qr-storage";

export type SettingsActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

async function requireSettingsAdmin() {
  const session = await requireAdminSession();
  assertAdminRole(session, ADMIN_MANAGER_ROLES);
  return session;
}

function boolFromForm(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

export async function saveGeneralSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const session = await requireSettingsAdmin();
    await updateGeneralSettings(session.tenantId, {
      displayName: String(formData.get("displayName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      timezone: String(formData.get("timezone") ?? "Asia/Phnom_Penh"),
      businessHours: String(formData.get("businessHours") ?? ""),
      currency: String(formData.get("currency") ?? "USD"),
    });
    revalidatePath("/admin/settings");
    revalidatePath(`/${session.tenantSlug}`, "layout");
    return { success: true };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "Failed to save" };
  }
}

export async function saveDeliverySettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const session = await requireSettingsAdmin();
    const { toMinor } = await import("@/shared/money/money");
    const currency = session.tenantCurrency;
    const feeMajor = Number(formData.get("deliveryFeeMajor") ?? 0);
    const thresholdRaw = String(formData.get("freeDeliveryThresholdMajor") ?? "").trim();

    await updateDeliverySettings(session.tenantId, {
      deliveryEnabled: boolFromForm(formData, "deliveryEnabled"),
      pickupEnabled: boolFromForm(formData, "pickupEnabled"),
      deliveryFeeMinor: toMinor(Number.isFinite(feeMajor) ? feeMajor : 0, currency),
      freeDeliveryThresholdMinor:
        thresholdRaw === "" ? "" : toMinor(Number(thresholdRaw), currency),
      deliveryNotes: String(formData.get("deliveryNotes") ?? ""),
    });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "Failed to save" };
  }
}

export async function savePaymentSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  let uploadedQrUrl: string | undefined;
  try {
    const session = await requireSettingsAdmin();
    const current = await getSettingsForAdmin(session.tenantId);
    const currentQrUrl = current.settings.abaQrImageUrl;
    const qrFile = formData.get("abaQrImage");
    const removeQr = boolFromForm(formData, "removeAbaQrImage");
    let abaQrImageUrl = String(formData.get("abaQrImageUrl") ?? "").trim();

    if (qrFile instanceof File && qrFile.size > 0) {
      const uploaded = await uploadAbaQrObject({
        tenantId: session.tenantId,
        bytes: new Uint8Array(await qrFile.arrayBuffer()),
      });
      uploadedQrUrl = uploaded.url;
      abaQrImageUrl = uploaded.url;
    } else if (removeQr) {
      abaQrImageUrl = "";
    } else if (!abaQrImageUrl) {
      // Preserve a configured image when the admin only changes text settings.
      abaQrImageUrl = currentQrUrl ?? "";
    }

    await updatePaymentSettings(session.tenantId, {
      codEnabled: boolFromForm(formData, "codEnabled"),
      abaEnabled: boolFromForm(formData, "abaEnabled"),
      abaAccountName: String(formData.get("abaAccountName") ?? ""),
      abaAccountNumber: String(formData.get("abaAccountNumber") ?? ""),
      abaInstructions: String(formData.get("abaInstructions") ?? ""),
      abaQrImageUrl,
      abaCustomerNote: String(formData.get("abaCustomerNote") ?? ""),
    });

    if (currentQrUrl && currentQrUrl !== abaQrImageUrl) {
      await removeAbaQrObjectByUrl(currentQrUrl);
    }
    revalidatePath("/admin/settings");
    revalidatePath(`/${session.tenantSlug}`, "layout");
    return { success: true };
  } catch (error) {
    if (uploadedQrUrl) {
      await removeAbaQrObjectByUrl(uploadedQrUrl);
    }
    if (isAppError(error)) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "Failed to save" };
  }
}

export async function saveBrandingSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const session = await requireSettingsAdmin();
    await updateBrandingSettings(session.tenantId, {
      displayName: String(formData.get("displayName") ?? ""),
      logoUrl: String(formData.get("logoUrl") ?? ""),
      primaryColor: String(formData.get("primaryColor") ?? ""),
    });
    revalidatePath("/admin/settings");
    revalidatePath(`/${session.tenantSlug}`, "layout");
    return { success: true };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "Failed to save" };
  }
}

export async function savePickupLocationAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const session = await requireSettingsAdmin();
    const id = String(formData.get("id") ?? "").trim();
    await upsertPickupLocationForTenant(session.tenantId, {
      id: id || undefined,
      name: String(formData.get("name") ?? ""),
      address: String(formData.get("address") ?? ""),
      instructions: String(formData.get("instructions") ?? ""),
      isActive: boolFromForm(formData, "isActive"),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "Failed to save location" };
  }
}

export async function deletePickupLocationAction(locationId: string) {
  try {
    const session = await requireSettingsAdmin();
    await removePickupLocationForTenant(session.tenantId, locationId);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    return { error: isAppError(error) ? error.message : "Failed to delete" };
  }
}
