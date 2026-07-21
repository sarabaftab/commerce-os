import { NextResponse } from "next/server";

import { AppError, isAppError } from "@/shared/errors/app-error";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function jsonError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error(error);
  const fallback = new AppError("INTERNAL", "Internal server error");
  return NextResponse.json(
    { error: { code: fallback.code, message: fallback.message } },
    { status: fallback.status },
  );
}
