import { z } from "zod";

/** Telegram Bot API hard limit for sendMessage text. */
export const TELEGRAM_MESSAGE_MAX_LENGTH = 4096;

export const broadcastInputSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(
        TELEGRAM_MESSAGE_MAX_LENGTH,
        `Message must be at most ${TELEGRAM_MESSAGE_MAX_LENGTH} characters`,
      ),
    buttonLabel: z.string().trim().max(64, "Button label must be at most 64 characters").default(""),
    buttonDestination: z
      .string()
      .trim()
      .max(2048, "Button destination is too long")
      .default(""),
  })
  .superRefine((value, ctx) => {
    if (!value.buttonLabel && value.buttonDestination) {
      ctx.addIssue({
        code: "custom",
        path: ["buttonLabel"],
        message: "Add a button label when providing a destination",
      });
    }
  });

export type BroadcastInput = z.infer<typeof broadcastInputSchema>;

export function broadcastFormDataToObject(formData: FormData) {
  return {
    message: String(formData.get("message") ?? ""),
    buttonLabel: String(formData.get("buttonLabel") ?? ""),
    buttonDestination: String(formData.get("buttonDestination") ?? ""),
  };
}
