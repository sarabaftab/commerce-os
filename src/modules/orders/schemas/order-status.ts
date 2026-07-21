import { z } from "zod";

export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
]);

export const paymentMethodSchema = z.enum(["cod", "aba_transfer"]);
