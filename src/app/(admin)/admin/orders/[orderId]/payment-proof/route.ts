import { NextResponse } from "next/server";

import { getAdminPaymentProofFile } from "@/modules/orders/services/payment-proof-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  const { orderId } = await context.params;

  try {
    const file = await getAdminPaymentProofFile({
      tenantId: session.tenantId,
      orderId,
    });

    return new NextResponse(Buffer.from(file.bytes), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      console.error("[admin.payment-proof]", {
        orderId,
        tenantId: session.tenantId,
        code: error.code,
        message: error.message,
      });
      return new NextResponse(error.message, {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    console.error("[admin.payment-proof]", { orderId, tenantId: session.tenantId, error });
    return new NextResponse("Could not load the payment proof", {
      status: 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
