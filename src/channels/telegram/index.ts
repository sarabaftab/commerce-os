export { TelegramProvider, useTelegram, useTelegramHaptics } from "./client/telegram-provider";
export {
  validateTelegramInitData,
  telegramDisplayName,
} from "./server/validate-init-data";
export type { TelegramWebAppUser, ValidatedTelegramInitData } from "./server/validate-init-data";
export { authenticateTelegramInitData } from "./server/auth-service";
