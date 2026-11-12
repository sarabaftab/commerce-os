import { NextResponse } from "next/server";

import { prisma } from "@/shared/db/prisma";
import { jsonOk } from "@/shared/http/json";

export async function GET() {
  const time = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({
      status: "ok",
      service: "commerce-os",
      database: "ok",
      time,
    });
  } catch {
    return NextResponse.json(
      {
        data: {
          status: "degraded",
          service: "commerce-os",
          database: "unavailable",
          time,
        },
      },
      { status: 503 },
    );
  }
}
