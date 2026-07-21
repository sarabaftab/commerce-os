import { z } from "zod";

const pickupLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
});

const checkoutConfigSchema = z.object({
  deliveryFeeMinor: z.number().int().nonnegative().default(0),
  abaInstructions: z.string().default(""),
  pickupLocations: z.array(pickupLocationSchema).default([]),
});

export type PickupLocation = z.infer<typeof pickupLocationSchema>;
export type CheckoutConfig = z.infer<typeof checkoutConfigSchema>;

type TenantConfig = {
  checkout?: unknown;
  orderSequence?: unknown;
};

export function parseCheckoutConfig(config: unknown): CheckoutConfig {
  const raw = (config ?? {}) as TenantConfig;
  const parsed = checkoutConfigSchema.safeParse(raw.checkout ?? {});
  if (parsed.success) {
    return parsed.data;
  }
  return checkoutConfigSchema.parse({});
}

export function readOrderSequence(config: unknown): number {
  const raw = (config ?? {}) as TenantConfig;
  const seq = raw.orderSequence;
  return typeof seq === "number" && Number.isInteger(seq) && seq > 0 ? seq : 1;
}
