"use server";

import { revalidatePath } from "next/cache";

import { getTenantBySlug } from "@/modules/identity";
import { isAppError } from "@/shared/errors/app-error";

import {
  addressFormDataToObject,
  customerAddressInputSchema,
  customerProfileUpdateSchema,
  profileFormDataToObject,
} from "../schemas/profile";
import { requireCustomerSession } from "../services/customer-auth";
import {
  createCustomerAddress,
  deactivateCustomerAddress,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "../services/customer-address-service";
import { updateCustomerProfile } from "../services/customer-profile-service";

export type CustomerActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

function zodFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function updateProfileAction(
  tenantSlug: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  try {
    const tenant = await getTenantBySlug(tenantSlug);
    const session = await requireCustomerSession(tenant.id);
    const parsed = customerProfileUpdateSchema.safeParse(profileFormDataToObject(formData));
    if (!parsed.success) {
      return {
        error: "Please fix the highlighted fields",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    await updateCustomerProfile(session.tenantId, session.customerId, parsed.data);
    revalidatePath(`/${tenantSlug}/account`);
    revalidatePath(`/${tenantSlug}/account/profile`);
    revalidatePath(`/${tenantSlug}/checkout`);
    return { success: "Profile saved" };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createAddressAction(
  tenantSlug: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  try {
    const tenant = await getTenantBySlug(tenantSlug);
    const session = await requireCustomerSession(tenant.id);
    const parsed = customerAddressInputSchema.safeParse(addressFormDataToObject(formData));
    if (!parsed.success) {
      return {
        error: "Please fix the highlighted fields",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    await createCustomerAddress(session.tenantId, session.customerId, parsed.data);
    revalidatePath(`/${tenantSlug}/account/addresses`);
    revalidatePath(`/${tenantSlug}/checkout`);
    return { success: "Address saved" };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateAddressAction(
  tenantSlug: string,
  addressId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  try {
    const tenant = await getTenantBySlug(tenantSlug);
    const session = await requireCustomerSession(tenant.id);
    const parsed = customerAddressInputSchema.safeParse(addressFormDataToObject(formData));
    if (!parsed.success) {
      return {
        error: "Please fix the highlighted fields",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    await updateCustomerAddress(
      session.tenantId,
      session.customerId,
      addressId,
      parsed.data,
    );
    revalidatePath(`/${tenantSlug}/account/addresses`);
    revalidatePath(`/${tenantSlug}/checkout`);
    return { success: "Address updated" };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function setDefaultAddressAction(tenantSlug: string, addressId: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  const session = await requireCustomerSession(tenant.id);
  await setDefaultCustomerAddress(session.tenantId, session.customerId, addressId);
  revalidatePath(`/${tenantSlug}/account/addresses`);
  revalidatePath(`/${tenantSlug}/checkout`);
}

export async function deleteAddressAction(tenantSlug: string, addressId: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  const session = await requireCustomerSession(tenant.id);
  await deactivateCustomerAddress(session.tenantId, session.customerId, addressId);
  revalidatePath(`/${tenantSlug}/account/addresses`);
  revalidatePath(`/${tenantSlug}/checkout`);
}
