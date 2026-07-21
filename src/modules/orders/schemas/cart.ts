import { z } from "zod";

import { MAX_CART_QUANTITY } from "../types";

export const addCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(MAX_CART_QUANTITY).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(MAX_CART_QUANTITY),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
