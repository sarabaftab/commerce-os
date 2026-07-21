export type AppErrorCode =
  | "NOT_FOUND"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status =
      status ??
      (
        {
          NOT_FOUND: 404,
          VALIDATION: 400,
          UNAUTHORIZED: 401,
          FORBIDDEN: 403,
          CONFLICT: 409,
          INTERNAL: 500,
        } as const
      )[code];
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
