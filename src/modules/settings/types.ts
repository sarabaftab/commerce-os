import type { PickupLocation, TenantSettings } from "@prisma/client";

export type { PickupLocation, TenantSettings };

export type TenantSettingsBundle = {
  tenantId: string;
  tenantName: string;
  currency: string;
  settings: TenantSettings;
  pickupLocations: PickupLocation[];
};

export type StorefrontSettings = {
  tenantId: string;
  tenantSlug: string;
  currency: string;
  displayName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
};

export type CheckoutPickupLocation = {
  id: string;
  name: string;
  address: string;
  instructions: string | null;
};

export type CheckoutSettings = {
  tenantId: string;
  currency: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFeeMinor: number;
  freeDeliveryThresholdMinor: number | null;
  deliveryNotes: string | null;
  activePickupLocations: CheckoutPickupLocation[];
  codEnabled: boolean;
  abaEnabled: boolean;
  /** ABA is offered only when enabled and required fields are complete. */
  abaAvailable: boolean;
  abaAccountName: string | null;
  abaAccountNumber: string | null;
  abaInstructions: string | null;
  abaQrImageUrl: string | null;
  abaCustomerNote: string | null;
  checkoutBlockedReason: string | null;
};

export type DeliveryFeeInput = {
  fulfillmentMethod: "delivery" | "pickup";
  subtotalMinor: number;
  deliveryEnabled: boolean;
  deliveryFeeMinor: number;
  freeDeliveryThresholdMinor: number | null;
};
