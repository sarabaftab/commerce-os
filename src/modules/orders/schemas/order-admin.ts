import { z } from "zod";

import { fulfillmentMethodSchema } from "./checkout";
import { orderStatusSchema, paymentMethodSchema } from "./order-status";

export const orderAdminListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().or(z.literal("")),
  status: orderStatusSchema.optional().or(z.literal("")),
  paymentMethod: paymentMethodSchema.optional().or(z.literal("")),
  fulfillmentMethod: fulfillmentMethodSchema.optional().or(z.literal("")),
  from: z.string().trim().optional().or(z.literal("")),
  to: z.string().trim().optional().or(z.literal("")),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type OrderAdminListQueryInput = z.infer<typeof orderAdminListQuerySchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  toStatus: orderStatusSchema,
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export function parseOrderAdminListSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): OrderAdminListQueryInput {
  const pick = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const parsed = orderAdminListQuerySchema.safeParse({
    q: pick("q") ?? "",
    status: pick("status") ?? "",
    paymentMethod: pick("paymentMethod") ?? "",
    fulfillmentMethod: pick("fulfillmentMethod") ?? "",
    from: pick("from") ?? "",
    to: pick("to") ?? "",
    page: pick("page") ?? "1",
    pageSize: pick("pageSize") ?? "20",
  });

  if (parsed.success) {
    return parsed.data;
  }

  return orderAdminListQuerySchema.parse({
    q: "",
    status: "",
    paymentMethod: "",
    fulfillmentMethod: "",
    from: "",
    to: "",
    page: 1,
    pageSize: 20,
  });
}
